import { PageDocument, TranscribedItem } from '../types';
import { DEFAULT_FILING_CODES } from './defaults';
import { generateObsidianMarkdown } from './markdown';
import { DEFAULT_SYMBOLS } from './defaults';

/**
 * Renders a realistic handwritten paper note onto a canvas and returns its dataURL
 */
function createSampleNoteImage(
  title: string,
  code: string,
  lines: { symbol: string; text: string; sub?: string }[],
  hasBrackets = true
): string {
  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 1600;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Background - off-white warm paper with subtle texture and faint grid/ruled lines
  ctx.fillStyle = '#fbf9f4';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Faint ruled notebook lines
  ctx.strokeStyle = '#e6e2d8';
  ctx.lineWidth = 1.5;
  for (let y = 180; y < canvas.height - 80; y += 46) {
    ctx.beginPath();
    ctx.moveTo(80, y);
    ctx.lineTo(canvas.width - 80, y);
    ctx.stroke();
  }

  // Faint red margin line on left
  ctx.strokeStyle = '#f3cfcf';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(180, 60);
  ctx.lineTo(180, canvas.height - 60);
  ctx.stroke();

  // If hasBrackets, draw hand-drawn L-shaped corner brackets (⌜ ⌝ ⌞ ⌟)
  if (hasBrackets) {
    ctx.strokeStyle = '#2b2d42';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    const insetX = 60;
    const insetY = 60;
    const arm = 55;

    // Top-Left ⌜
    ctx.beginPath();
    ctx.moveTo(insetX, insetY + arm);
    ctx.lineTo(insetX, insetY);
    ctx.lineTo(insetX + arm, insetY);
    ctx.stroke();

    // Top-Left DOT inside bracket indicating upright orientation!
    ctx.fillStyle = '#2b2d42';
    ctx.beginPath();
    ctx.arc(insetX + 22, insetY + 22, 6, 0, Math.PI * 2);
    ctx.fill();

    // Top-Right ⌝
    const trX = canvas.width - insetX;
    ctx.beginPath();
    ctx.moveTo(trX - arm, insetY);
    ctx.lineTo(trX, insetY);
    ctx.lineTo(trX, insetY + arm);
    ctx.stroke();

    // Bottom-Left ⌞
    const blY = canvas.height - insetY;
    ctx.beginPath();
    ctx.moveTo(insetX, blY - arm);
    ctx.lineTo(insetX, blY);
    ctx.lineTo(insetX + arm, blY);
    ctx.stroke();

    // Bottom-Right ⌟
    ctx.beginPath();
    ctx.moveTo(trX, blY - arm);
    ctx.lineTo(trX, blY);
    ctx.lineTo(trX - arm, blY);
    ctx.stroke();
  }

  // Top-Right Hand-drawn Filing Code Box e.g. [A145]
  const boxX = canvas.width - 290;
  const boxY = 85;
  ctx.strokeStyle = '#1d3557';
  ctx.lineWidth = 3.5;
  ctx.fillStyle = '#f0f4f8';
  ctx.beginPath();
  ctx.roundRect(boxX, boxY, 170, 64, 8);
  ctx.fill();
  ctx.stroke();

  // Code text inside box
  ctx.fillStyle = '#1d3557';
  ctx.font = 'bold 34px "Comic Sans MS", "Caveat", "Segoe Print", cursive, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`[${code}]`, boxX + 85, boxY + 32);

  // Note Title - Underlined
  ctx.fillStyle = '#111827';
  ctx.font = 'bold 42px "Caveat", "Comic Sans MS", cursive, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(title, 200, 130);

  // Handwritten underline
  ctx.strokeStyle = '#111827';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(200, 146);
  ctx.quadraticCurveTo(360, 149, 200 + ctx.measureText(title).width + 10, 145);
  ctx.stroke();

  // Render note lines with handwritten ink style
  let currentY = 220;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';

  for (const item of lines) {
    // Draw symbol in margin / line start
    ctx.font = '32px "Caveat", "Comic Sans MS", sans-serif';
    ctx.fillStyle = '#0f172a';

    const symX = 135;
    ctx.fillText(item.symbol, symX, currentY);

    // Draw main text
    ctx.font = '31px "Caveat", "Comic Sans MS", cursive, sans-serif';
    ctx.fillText(item.text, 200, currentY);

    if (item.sub) {
      currentY += 46;
      ctx.fillStyle = '#475569';
      ctx.fillText(item.sub, 220, currentY);
    }

    currentY += 56;
    if (currentY > canvas.height - 100) break;
  }

  return canvas.toDataURL('image/jpeg', 0.9);
}

/**
 * Pre-builds 2 rich sample documents
 */
export function generateSampleDocuments(): PageDocument[] {
  const scanDate = new Date().toISOString().split('T')[0];

  // Sample 1: ANTH 145 Kinship Systems
  const sample1Lines = [
    { symbol: '●', text: 'Descent groups regulate property inheritance & alliances' },
    { symbol: '★', text: "Morgan's 6 kinship classification systems will be on midterm" },
    { symbol: '▲', text: "Patrilineal :: Lineage traced strictly through father's line" },
    { symbol: '▲', text: 'Matrilineal = Descent traced through mother and maternal uncle' },
    { symbol: '□', text: 'Read chapter 4 in Kottak textbook by next Fri' },
    { symbol: '?', text: 'Ask Prof if Trobriand avunculate is universally practiced?' },
    { symbol: '"', text: 'Kinship is the idiom of social relations in agrarian societies (p. 114)' },
    { symbol: '~', text: 'Corporate kinship lineages mimic modern LLC asset shielding' },
    { symbol: '→', text: 'Structural Functionalism' },
    { symbol: '◇', text: 'Midterm review session Oct 12 at 4pm in Hall 102' },
  ];

  const sample1Img = createSampleNoteImage(
    'Kinship Systems & Lineages',
    'A145',
    sample1Lines,
    true
  );

  const sample1Items: TranscribedItem[] = [
    {
      id: 's1-1',
      type: 'heading',
      text: 'Kinship Systems & Lineages',
      confidence: 0.98,
    },
    {
      id: 's1-2',
      type: 'bullet',
      rawSymbol: '●',
      text: 'Descent groups regulate property inheritance & alliances',
      confidence: 0.96,
    },
    {
      id: 's1-3',
      type: 'important',
      rawSymbol: '★',
      text: "Morgan's 6 kinship classification systems will be on midterm",
      confidence: 0.95,
    },
    {
      id: 's1-4',
      type: 'flashcard',
      rawSymbol: '▲',
      text: "Patrilineal :: Lineage traced strictly through father's line",
      confidence: 0.94,
    },
    {
      id: 's1-5',
      type: 'flashcard',
      rawSymbol: '▲',
      text: 'Matrilineal = Descent traced through mother and maternal uncle',
      confidence: 0.94,
    },
    {
      id: 's1-6',
      type: 'task',
      rawSymbol: '□',
      text: 'Read chapter 4 in Kottak textbook',
      date: '2026-10-02', // next Fri
      confidence: 0.92,
    },
    {
      id: 's1-7',
      type: 'question',
      rawSymbol: '?',
      text: 'Ask Prof if Trobriand avunculate is universally practiced?',
      confidence: 0.91,
    },
    {
      id: 's1-8',
      type: 'quote',
      rawSymbol: '"',
      text: 'Kinship is the idiom of social relations in agrarian societies',
      page: '114',
      confidence: 0.93,
    },
    {
      id: 's1-9',
      type: 'idea',
      rawSymbol: '~',
      text: 'Corporate kinship lineages mimic modern LLC asset shielding',
      confidence: 0.89,
    },
    {
      id: 's1-10',
      type: 'link',
      rawSymbol: '→',
      text: 'Structural Functionalism',
      confidence: 0.97,
    },
    {
      id: 's1-11',
      type: 'event',
      rawSymbol: '◇',
      text: 'Midterm review session in Hall 102',
      date: '2026-10-12',
      confidence: 0.94,
    },
  ];

  const matchedCode1 = DEFAULT_FILING_CODES.find((c) => c.code === 'A145') || null;
  const markdown1 = generateObsidianMarkdown({
    title: 'Kinship Systems & Lineages',
    scanDate,
    filingCode: matchedCode1,
    items: sample1Items,
    symbols: DEFAULT_SYMBOLS,
    lowConfidenceThreshold: 0.8,
  });

  const doc1: PageDocument = {
    id: 'sample-doc-1',
    originalImage: sample1Img,
    processedImage: sample1Img,
    thumbnail: sample1Img,
    filename: '2026-09-25 ANTH 145 Kinship Systems.jpg',
    scanDate,
    mode: 'bracket',
    corners: {
      topLeft: { x: 60, y: 60 },
      topRight: { x: 1140, y: 60 },
      bottomRight: { x: 1140, y: 1540 },
      bottomLeft: { x: 60, y: 1540 },
    },
    rotation: 0,
    filterMode: 'clean',
    status: 'ready',
    filingCodeDetected: 'A145',
    filingCodeMatched: matchedCode1,
    suggestedTitle: 'Kinship Systems & Lineages',
    items: sample1Items,
    markdown: markdown1,
    createdAt: Date.now() - 3600000,
    updatedAt: Date.now() - 3600000,
  };

  // Sample 2: [TODO] Tasks & Actions
  const sample2Lines = [
    { symbol: '□', text: 'Submit revised ethics clearance application 10/12' },
    { symbol: '☑', text: 'Email TA regarding office hours location change' },
    { symbol: '□', text: 'Draft section 2 policy memo comparison by Friday' },
    { symbol: '?', text: 'Check if library has digital copy of Geertz 1973' },
    { symbol: '★', text: 'Final exam room change: Pacific Hall 101' },
    { symbol: '◇', text: 'Grant submission deadline 2026-11-01' },
  ];

  const sample2Img = createSampleNoteImage(
    'Weekly Research & Task Queue',
    'TODO',
    sample2Lines,
    false
  );

  const sample2Items: TranscribedItem[] = [
    {
      id: 's2-1',
      type: 'heading',
      text: 'Weekly Research & Task Queue',
      confidence: 0.99,
    },
    {
      id: 's2-2',
      type: 'task',
      rawSymbol: '□',
      text: 'Submit revised ethics clearance application',
      date: '2026-10-12',
      confidence: 0.95,
    },
    {
      id: 's2-3',
      type: 'done_task',
      rawSymbol: '☑',
      text: 'Email TA regarding office hours location change',
      confidence: 0.98,
    },
    {
      id: 's2-4',
      type: 'task',
      rawSymbol: '□',
      text: 'Draft section 2 policy memo comparison',
      date: '2026-10-02',
      confidence: 0.92,
    },
    {
      id: 's2-5',
      type: 'question',
      rawSymbol: '?',
      text: 'Check if library has digital copy of Geertz 1973',
      confidence: 0.91,
    },
    {
      id: 's2-6',
      type: 'important',
      rawSymbol: '★',
      text: 'Final exam room change: Pacific Hall 101',
      confidence: 0.96,
    },
    {
      id: 's2-7',
      type: 'event',
      rawSymbol: '◇',
      text: 'Grant submission deadline',
      date: '2026-11-01',
      confidence: 0.97,
    },
  ];

  const matchedCode2 = DEFAULT_FILING_CODES.find((c) => c.code === 'TODO') || null;
  const markdown2 = generateObsidianMarkdown({
    title: 'Weekly Research & Task Queue',
    scanDate,
    filingCode: matchedCode2,
    items: sample2Items,
    symbols: DEFAULT_SYMBOLS,
    lowConfidenceThreshold: 0.8,
  });

  const doc2: PageDocument = {
    id: 'sample-doc-2',
    originalImage: sample2Img,
    processedImage: sample2Img,
    thumbnail: sample2Img,
    filename: '2026-09-25 Task Inbox.jpg',
    scanDate,
    mode: 'auto',
    corners: {
      topLeft: { x: 48, y: 64 },
      topRight: { x: 1152, y: 64 },
      bottomRight: { x: 1152, y: 1536 },
      bottomLeft: { x: 48, y: 1536 },
    },
    rotation: 0,
    filterMode: 'clean',
    status: 'ready',
    filingCodeDetected: 'TODO',
    filingCodeMatched: matchedCode2,
    suggestedTitle: 'Weekly Research & Task Queue',
    items: sample2Items,
    markdown: markdown2,
    createdAt: Date.now() - 1800000,
    updatedAt: Date.now() - 1800000,
  };

  return [doc1, doc2];
}
