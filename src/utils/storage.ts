import { AppSettings, PageDocument } from '../types';
import { INITIAL_SETTINGS } from './defaults';

const SETTINGS_KEY = 'pagemark_settings_v1';
const DOCUMENTS_KEY = 'pagemark_documents_v1';

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return INITIAL_SETTINGS;
    const parsed = JSON.parse(raw);
    return {
      ...INITIAL_SETTINGS,
      ...parsed,
      filingCodes: parsed.filingCodes || INITIAL_SETTINGS.filingCodes,
      symbols: parsed.symbols || INITIAL_SETTINGS.symbols,
      handwritingReferences: parsed.handwritingReferences || [],
      abbreviations: parsed.abbreviations || INITIAL_SETTINGS.abbreviations,
    };
  } catch (err) {
    console.warn('Failed to load settings from localStorage, using defaults', err);
    return INITIAL_SETTINGS;
  }
}

export function saveSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (err) {
    console.error('Failed to save settings to localStorage', err);
  }
}

export function exportSettingsJSON(settings: AppSettings): string {
  return JSON.stringify(settings, null, 2);
}

export function importSettingsJSON(jsonStr: string): AppSettings {
  const parsed = JSON.parse(jsonStr);
  if (!parsed.filingCodes || !parsed.symbols) {
    throw new Error('Invalid settings JSON format');
  }
  const merged: AppSettings = {
    ...INITIAL_SETTINGS,
    ...parsed,
  };
  saveSettings(merged);
  return merged;
}

export function loadDocuments(): PageDocument[] {
  try {
    const raw = localStorage.getItem(DOCUMENTS_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (err) {
    console.warn('Failed to load documents from localStorage', err);
    return [];
  }
}

export function saveDocuments(docs: PageDocument[]): void {
  try {
    // Keep up to 20 documents to avoid quota limits
    const trimmed = docs.slice(0, 20);
    localStorage.setItem(DOCUMENTS_KEY, JSON.stringify(trimmed));
  } catch (err) {
    console.error('Failed to save documents to localStorage', err);
  }
}
