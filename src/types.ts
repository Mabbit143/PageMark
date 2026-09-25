/**
 * PageMark Types
 */

export type SymbolType =
  | 'heading'
  | 'bullet'
  | 'task'
  | 'done_task'
  | 'flashcard'
  | 'question'
  | 'important'
  | 'quote'
  | 'link'
  | 'idea'
  | 'event'
  | 'text'
  | 'custom';

export interface SymbolDefinition {
  id: string;
  char: string; // Visual symbol representation, e.g. "▲", "□", "★"
  name: string;
  type: SymbolType;
  markdownPattern: string; // e.g. "- [ ] {text} 📅 {date}", "> [!important] {text}"
  description: string;
  exampleImage?: string; // base64 or sample drawing
  isDefault?: boolean;
}

export interface FilingCode {
  id: string;
  code: string; // e.g. "A145", "TODO"
  name: string; // e.g. "ANTH 145"
  tags: string[]; // e.g. ["anthropology", "anth145"]
  folder: string; // e.g. "Courses/ANTH 145"
  description?: string;
  exampleImage?: string; // sample handwriting of the boxed code
}

export interface HandwritingReference {
  id: string;
  targetId: string; // symbol id, filing code id, or "brackets"
  targetName: string;
  type: 'symbol' | 'code' | 'bracket';
  label: string;
  imageData: string; // base64
  notes?: string;
  createdAt: string;
}

export interface Abbreviation {
  id: string;
  abbr: string; // e.g. "w/"
  expansion: string; // e.g. "with"
}

export interface Point {
  x: number;
  y: number;
}

export interface CornerPoints {
  topLeft: Point;
  topRight: Point;
  bottomRight: Point;
  bottomLeft: Point;
}

export interface TranscribedItem {
  id: string;
  type: SymbolType;
  rawSymbol?: string;
  text: string;
  date?: string | null; // YYYY-MM-DD
  page?: string | null; // For quotes, e.g. "42"
  confidence: number; // 0.0 to 1.0
  lowConfidenceWords?: string[];
}

export interface PageDocument {
  id: string;
  originalImage: string; // base64
  processedImage?: string; // base64 after perspective & cleanup
  thumbnail: string;
  filename: string;
  scanDate: string; // YYYY-MM-DD
  mode: 'auto' | 'bracket' | 'manual';
  corners: CornerPoints;
  rotation: number; // 0, 90, 180, 270
  filterMode: 'clean' | 'contrast' | 'original';
  
  // Results
  status: 'pending' | 'processing' | 'ready' | 'error';
  errorMessage?: string;
  filingCodeDetected?: string | null;
  filingCodeMatched?: FilingCode | null;
  suggestedTitle: string;
  items: TranscribedItem[];
  markdown: string;
  
  createdAt: number;
  updatedAt: number;
}

export interface AppSettings {
  filingCodes: FilingCode[];
  symbols: SymbolDefinition[];
  handwritingReferences: HandwritingReference[];
  abbreviations: Abbreviation[];
  theme: 'dark' | 'light' | 'system';
  lowConfidenceThreshold: number; // default 0.8
  autoCleanPaper: boolean;
  contrastBoost: number; // 1.0 - 2.5
}
