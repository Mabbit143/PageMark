import { FilingCode, SymbolDefinition, TranscribedItem } from '../types';
import { INBOX_FILING_CODE } from './defaults';

export interface MarkdownGenerationOptions {
  title: string;
  scanDate: string; // YYYY-MM-DD
  filingCode?: FilingCode | null;
  items: TranscribedItem[];
  symbols: SymbolDefinition[];
  lowConfidenceThreshold?: number; // default 0.8
}

/**
 * Wraps low confidence words or phrases in ==word== for Obsidian highlight
 */
export function formatConfidenceText(
  text: string,
  confidence: number,
  lowConfidenceWords?: string[],
  threshold = 0.8
): string {
  if (!text) return '';

  // If entire item has low confidence and no specific words flagged
  if (confidence < 0.6 && (!lowConfidenceWords || lowConfidenceWords.length === 0)) {
    // Avoid double highlighting
    if (text.startsWith('==') && text.endsWith('==')) return text;
    return `==${text}==`;
  }

  // If specific words flagged
  if (lowConfidenceWords && lowConfidenceWords.length > 0) {
    let result = text;
    for (const word of lowConfidenceWords) {
      if (word.trim().length > 1) {
        const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`\\b${escaped}\\b`, 'gi');
        result = result.replace(regex, `==$&==`);
      }
    }
    return result;
  }

  return text;
}

/**
 * Compiles transcribed structured JSON into clean, Obsidian-ready Markdown
 */
export function generateObsidianMarkdown({
  title,
  scanDate,
  filingCode,
  items,
  symbols,
  lowConfidenceThreshold = 0.8,
}: MarkdownGenerationOptions): string {
  const activeFilingCode = filingCode || INBOX_FILING_CODE;

  // Track counts & collections
  let taskCount = 0;
  let doneCount = 0;
  let questionCount = 0;
  let flashcardCount = 0;
  let eventCount = 0;
  const eventsList: { date: string; text: string }[] = [];
  const flashcardsList: { front: string; back: string }[] = [];
  const relatedLinksList: string[] = [];

  // Collect tags
  const tagsSet = new Set<string>();
  (activeFilingCode.tags || []).forEach((t) => tagsSet.add(t.replace(/^#/, '')));

  // Pre-scan items for summary and sections
  for (const item of items) {
    const formattedText = formatConfidenceText(
      item.text,
      item.confidence,
      item.lowConfidenceWords,
      lowConfidenceThreshold
    );

    if (item.type === 'task') {
      taskCount++;
    } else if (item.type === 'done_task') {
      taskCount++;
      doneCount++;
    } else if (item.type === 'question') {
      questionCount++;
      tagsSet.add('question');
    } else if (item.type === 'flashcard') {
      flashcardCount++;
      tagsSet.add('flashcards');
      // Parse front :: back or front = back
      const parts = item.text.split(/::|=/);
      if (parts.length >= 2) {
        flashcardsList.push({
          front: parts[0].trim(),
          back: parts.slice(1).join('=').trim(),
        });
      } else {
        flashcardsList.push({ front: item.text.trim(), back: '' });
      }
    } else if (item.type === 'event') {
      eventCount++;
      tagsSet.add('event');
      eventsList.push({
        date: item.date || scanDate,
        text: item.text,
      });
    } else if (item.type === 'quote') {
      tagsSet.add('quote');
    } else if (item.type === 'idea') {
      tagsSet.add('idea');
    } else if (item.type === 'link') {
      // Obsidian [[Topic]] wikilink extraction
      const match = item.text.match(/\[\[(.*?)\]\]/) || [null, item.text];
      const linkTarget = match[1] || item.text;
      if (linkTarget.trim()) {
        relatedLinksList.push(linkTarget.trim());
      }
    }
  }

  // 1. Frontmatter
  const tagsArray = Array.from(tagsSet);
  const frontmatter = [
    '---',
    `title: "${title.replace(/"/g, '\\"')}"`,
    `date: ${scanDate}`,
    `course: "${activeFilingCode.name}"`,
    'tags:',
    ...tagsArray.map((t) => `  - ${t}`),
    `folder: "${activeFilingCode.folder}"`,
    'source: handwritten',
    '---',
  ].join('\n');

  // 2. Summary Block
  const taskSummary = `${taskCount} task${taskCount === 1 ? '' : 's'}${
    doneCount > 0 ? ` (${doneCount} completed)` : ''
  }`;
  const questionSummary = `${questionCount} question${questionCount === 1 ? '' : 's'}`;
  const flashcardSummary = `${flashcardCount} flashcard${flashcardCount === 1 ? '' : 's'}`;
  const eventSummary = `${eventCount} event${eventCount === 1 ? '' : 's'}`;

  const summaryLines = [
    `> [!summary] Summary`,
    `> - ${taskSummary}, ${questionSummary}, ${flashcardSummary}, ${eventSummary}`,
  ];

  if (eventsList.length > 0) {
    summaryLines.push(`> - **Events:**`);
    eventsList.forEach((ev) => {
      summaryLines.push(`>   - 📅 ${ev.date} ${ev.text}`);
    });
  }

  const summaryBlock = summaryLines.join('\n');

  // 3. Body lines
  const bodyLines: string[] = [];

  for (const item of items) {
    const formattedText = formatConfidenceText(
      item.text,
      item.confidence,
      item.lowConfidenceWords,
      lowConfidenceThreshold
    );

    // Check custom symbols first
    const customSym = symbols.find((s) => s.type === 'custom' && (s.name.toLowerCase() === item.type.toLowerCase() || s.char === item.rawSymbol));
    if (customSym) {
      let out = customSym.markdownPattern
        .replace('{text}', formattedText)
        .replace('{date}', item.date || scanDate);
      bodyLines.push(out);
      continue;
    }

    switch (item.type) {
      case 'heading': {
        // Heading with ##
        const cleanHeading = formattedText.replace(/^#+\s*/, '');
        bodyLines.push(`## ${cleanHeading}`);
        break;
      }

      case 'bullet': {
        bodyLines.push(`- ${formattedText}`);
        break;
      }

      case 'task': {
        const dateSuffix = item.date ? ` 📅 ${item.date}` : '';
        bodyLines.push(`- [ ] ${formattedText}${dateSuffix}`);
        break;
      }

      case 'done_task': {
        bodyLines.push(`- [x] ${formattedText}`);
        break;
      }

      case 'flashcard': {
        // Flashcards are primarily collected at the bottom, but also represented inline
        const parts = formattedText.split(/::|=/);
        if (parts.length >= 2) {
          bodyLines.push(`${parts[0].trim()}::${parts.slice(1).join('=').trim()}`);
        } else {
          bodyLines.push(`${formattedText}`);
        }
        break;
      }

      case 'question': {
        bodyLines.push(`- [ ] ❓ ${formattedText} #question`);
        break;
      }

      case 'important': {
        bodyLines.push(`> [!important]\n> ${formattedText}`);
        break;
      }

      case 'quote': {
        const pageStr = item.page ? ` (p. ${item.page})` : ' (p. ?)';
        bodyLines.push(`> "${formattedText}"${pageStr} #quote`);
        break;
      }

      case 'link': {
        const topic = formattedText.replace(/\[\[|\]\]/g, '').trim();
        bodyLines.push(`→ [[${topic}]]`);
        break;
      }

      case 'idea': {
        bodyLines.push(`> [!idea]\n> ${formattedText} #idea`);
        break;
      }

      case 'event': {
        const evDate = item.date || scanDate;
        bodyLines.push(`- 📅 ${evDate} ${formattedText} #event`);
        break;
      }

      case 'text':
      default: {
        bodyLines.push(formattedText);
        break;
      }
    }
  }

  // 4. Extra Sections
  const extraSections: string[] = [];

  // ## Flashcards
  if (flashcardsList.length > 0) {
    const fcLines = ['## Flashcards'];
    flashcardsList.forEach((fc) => {
      fcLines.push(`- ${fc.front}::${fc.back || '...'}`);
    });
    extraSections.push(fcLines.join('\n'));
  }

  // ## Related
  if (relatedLinksList.length > 0) {
    const relLines = ['## Related'];
    // Deduplicate related links
    const uniqueLinks = Array.from(new Set(relatedLinksList));
    uniqueLinks.forEach((link) => {
      relLines.push(`- [[${link}]]`);
    });
    extraSections.push(relLines.join('\n'));
  }

  // Combine full document
  const sections = [frontmatter, '', summaryBlock, '', bodyLines.join('\n\n')];
  if (extraSections.length > 0) {
    sections.push('', extraSections.join('\n\n'));
  }

  return sections.join('\n');
}
