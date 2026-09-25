import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Generous payload limit for high-resolution photo uploads & reference images
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Helper to extract base64 data and mimeType
function parseDataUrl(dataUrl: string): { mimeType: string; base64: string } {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (match) {
    return { mimeType: match[1], base64: match[2] };
  }
  return { mimeType: 'image/jpeg', base64: dataUrl };
}

// Gemini Vision Transcription Endpoint
app.post('/api/transcribe', async (req, res) => {
  try {
    const {
      image,
      scanDate = new Date().toISOString().split('T')[0],
      filingCodes = [],
      symbols = [],
      handwritingReferences = [],
      abbreviations = [],
    } = req.body;

    if (!image) {
      return res.status(400).json({ error: 'Missing image data' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        error: 'GEMINI_API_KEY is not configured on the server. Please check the Secrets panel.',
      });
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    // Build system instructions with all filing codes, symbols, and abbreviations
    const filingCodesPrompt = filingCodes
      .map(
        (fc: any) =>
          `- [${fc.code}]: maps to course/folder "${fc.name}" (${fc.folder}), tags: ${JSON.stringify(
            fc.tags
          )}`
      )
      .join('\n');

    const symbolsPrompt = symbols
      .map(
        (s: any) =>
          `- Symbol "${s.char}" (${s.name}, type: "${s.type}"): ${s.description}. Markdown format: "${s.markdownPattern}"`
      )
      .join('\n');

    const abbreviationsPrompt = abbreviations
      .map((a: any) => `- "${a.abbr}" stands for "${a.expansion}"`)
      .join('\n');

    const systemInstruction = `You are PageMark Vision, an expert handwriting recognition and document intelligence engine.
You convert photos of handwritten notes on any paper into structured Obsidian Markdown data.

TODAY'S SCAN DATE: ${scanDate}

YOUR RULES:
1. FILING CODE: Look specifically in the top-right corner of the page for a hand-drawn box containing a short code like [A145], [E428], [P280], [TODO], etc.
Known filing codes:
${filingCodesPrompt}
If you see a boxed code, extract the exact code without brackets (e.g. "A145"). If no boxed code is found, return null.

2. TITLE: Invert or read the main page title. Usually underlined or written larger at the top.

3. SYMBOLS AT START OF LINES:
Symbols are drawn at the START of a line, slightly larger than normal handwriting.
${symbolsPrompt}

Special Symbol Handling:
- Bullet (●): normal bullet point.
- Task (□): Unchecked square box. If a date is written (e.g. "Oct 12", "10/12", "next Fri", "tomorrow"), resolve the relative date from ${scanDate} into exact format YYYY-MM-DD.
- Done Task (☑): Checked or crossed square box.
- Flashcard (▲): Triangle symbol. Usually written "front :: back" or "front = back".
- Question (? in circle): Question to ask or look up.
- Important (★): Star symbol for key concepts or exam topics.
- Quote ("): Quote marks at start of line, with page number written at the end like "(p. 42)" or "p. 114".
- Link (→): Arrow pointing to a topic name to wikilink.
- Idea (~): Wavy line for personal thoughts/insights.
- Event (◇): Diamond symbol for dates/events to remember. Extract the date as YYYY-MM-DD.
- Heading: Underlined text or distinctly larger text at the start of a section.
- Text: Plain line with no symbol.
- Custom symbols: match against any user-defined symbols provided.

4. TRANSCRIBE EXACT WORDS:
Transcribe exactly what is written, without summarizing, omitting, or correcting wording.
User's common abbreviations guide:
${abbreviationsPrompt}
Do not replace the user's words unless necessary for transcription clarity; transcribe their exact written text.

5. CONFIDENCE & LOW-CONFIDENCE WORDS:
For each line item, assign a confidence score between 0.0 and 1.0. If any specific words were messy or hard to read, list them in low_confidence_words.`;

    const parts: any[] = [];

    // Add few-shot handwriting reference images if provided by user
    if (Array.isArray(handwritingReferences) && handwritingReferences.length > 0) {
      for (const ref of handwritingReferences) {
        if (ref.imageData) {
          const parsedRef = parseDataUrl(ref.imageData);
          parts.push({
            inlineData: {
              mimeType: parsedRef.mimeType,
              data: parsedRef.base64,
            },
          });
          parts.push({
            text: `[FEW-SHOT USER REFERENCE HANDWRITING]
Target: "${ref.targetName || ref.label}" (Category: ${ref.type})
Label: "${ref.label}".
Note: This is how THIS SPECIFIC USER draws this glyph/symbol/bracket/code. Use this visual example to accurately recognize their personal handwriting style.`,
          });
        }
      }
    }

    // Add symbol custom example images if available
    for (const sym of symbols) {
      if (sym.exampleImage && !handwritingReferences.some((r: any) => r.targetId === sym.id)) {
        const parsedSym = parseDataUrl(sym.exampleImage);
        parts.push({
          inlineData: {
            mimeType: parsedSym.mimeType,
            data: parsedSym.base64,
          },
        });
        parts.push({
          text: `[USER REFERENCE FOR SYMBOL "${sym.char}" - ${sym.name}]: This is how the user draws this symbol.`,
        });
      }
    }

    // Add main page photo
    const parsedPage = parseDataUrl(image);
    parts.push({
      inlineData: {
        mimeType: parsedPage.mimeType,
        data: parsedPage.base64,
      },
    });

    parts.push({
      text: `Transcribe this handwritten page. Scan date is ${scanDate}. Return the structured JSON according to the schema.`,
    });

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: { parts },
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            filing_code: {
              type: Type.STRING,
              description: 'The code found in the hand-drawn box in the top-right corner, or null if none',
            },
            title: {
              type: Type.STRING,
              description: 'The inferred or underlined page title',
            },
            items: {
              type: Type.ARRAY,
              description: 'Sequential lines transcribed from the handwritten page',
              items: {
                type: Type.OBJECT,
                properties: {
                  type: {
                    type: Type.STRING,
                    description:
                      'One of: heading, bullet, task, done_task, flashcard, question, important, quote, link, idea, event, text, or custom symbol name',
                  },
                  raw_symbol: {
                    type: Type.STRING,
                    description: 'The visual symbol drawn at line start, e.g. "▲", "□", "★", "●"',
                  },
                  text: {
                    type: Type.STRING,
                    description: 'The transcribed text of the line',
                  },
                  date: {
                    type: Type.STRING,
                    description: 'Resolved date in YYYY-MM-DD format for tasks/events, or null',
                  },
                  page: {
                    type: Type.STRING,
                    description: 'Page number for quotes, or null',
                  },
                  confidence: {
                    type: Type.NUMBER,
                    description: 'Recognition confidence from 0.0 to 1.0',
                  },
                  low_confidence_words: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: 'Specific words in this line that had low confidence',
                  },
                },
                required: ['type', 'text', 'confidence'],
              },
            },
          },
          required: ['title', 'items'],
        },
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error('Empty response received from vision model');
    }

    const parsedJson = JSON.parse(text);
    return res.json({
      success: true,
      data: parsedJson,
    });
  } catch (error: any) {
    console.error('Error during transcription:', error);
    return res.status(500).json({
      success: false,
      error: error?.message || 'Failed to transcribe note page',
    });
  }
});

// Start Server with Vite Middleware
async function start() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static('dist'));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve('dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`PageMark Server running on http://0.0.0.0:${PORT}`);
  });
}

start();
