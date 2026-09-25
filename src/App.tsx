/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Camera,
  Folder,
  Settings as SettingsIcon,
  Bookmark,
  Archive,
  Sun,
  Moon,
  Plus,
  Trash2,
  FileText,
  CheckCircle2,
  HelpCircle,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { AppSettings, PageDocument, HandwritingReference } from './types';
import { loadSettings, saveSettings, loadDocuments, saveDocuments } from './utils/storage';
import { generateSampleDocuments } from './utils/samples';
import { PageScanner } from './components/PageScanner';
import { ReviewEditor } from './components/ReviewEditor';
import { SettingsModal } from './components/SettingsModal';
import { CheatSheetModal } from './components/CheatSheetModal';
import { BatchExportModal } from './components/BatchExportModal';

export default function App() {
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());
  const [documents, setDocuments] = useState<PageDocument[]>(() => {
    const saved = loadDocuments();
    if (saved && saved.length > 0) return saved;
    // Seed with realistic sample handwritten notes on first turn!
    const samples = generateSampleDocuments();
    saveDocuments(samples);
    return samples;
  });

  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isCheatSheetOpen, setIsCheatSheetOpen] = useState<boolean>(false);
  const [isBatchExportOpen, setIsBatchExportOpen] = useState<boolean>(false);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  // Sync dark mode class on document element
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Persist settings
  const handleUpdateSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
    saveSettings(newSettings);
  };

  // Persist documents
  const handleUpdateDocument = (updatedDoc: PageDocument) => {
    const updated = documents.map((d) => (d.id === updatedDoc.id ? updatedDoc : d));
    setDocuments(updated);
    saveDocuments(updated);
  };

  const handleAddNewDocument = (newDoc: PageDocument) => {
    const updated = [newDoc, ...documents];
    setDocuments(updated);
    saveDocuments(updated);
    setSelectedDocId(newDoc.id);
    setIsScannerOpen(false);
  };

  const handleDeleteDocument = (docId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Delete this processed note?')) {
      const updated = documents.filter((d) => d.id !== docId);
      setDocuments(updated);
      saveDocuments(updated);
      if (selectedDocId === docId) {
        setSelectedDocId(null);
      }
    }
  };

  const handleSaveHandwritingRef = (ref: HandwritingReference) => {
    const existingIdx = settings.handwritingReferences.findIndex((r) => r.targetId === ref.targetId);
    let updatedRefs: HandwritingReference[];
    if (existingIdx >= 0) {
      updatedRefs = [...settings.handwritingReferences];
      updatedRefs[existingIdx] = ref;
    } else {
      updatedRefs = [...settings.handwritingReferences, ref];
    }
    handleUpdateSettings({
      ...settings,
      handwritingReferences: updatedRefs,
    });
  };

  const handleLoadSample = () => {
    const samples = generateSampleDocuments();
    const newDoc = {
      ...samples[0],
      id: `sample-loaded-${Date.now()}`,
      scanDate: new Date().toISOString().split('T')[0],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    handleAddNewDocument(newDoc);
  };

  const selectedDocument = documents.find((d) => d.id === selectedDocId) || null;

  return (
    <div className="min-h-screen bg-stone-100 dark:bg-stone-950 text-stone-900 dark:text-stone-100 flex flex-col font-sans transition-colors duration-200">
      {/* Top Application Bar */}
      <header className="sticky top-0 z-40 bg-white/90 dark:bg-stone-900/90 backdrop-blur-md border-b border-stone-200 dark:border-stone-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-15 flex items-center justify-between gap-3">
          {/* Logo & Identity */}
          <div
            onClick={() => {
              setSelectedDocId(null);
              setIsScannerOpen(false);
            }}
            className="flex items-center gap-2.5 cursor-pointer select-none group"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-600 to-amber-400 text-white flex items-center justify-center font-bold text-lg shadow-sm shadow-amber-600/30 group-hover:scale-105 transition">
              P
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-base tracking-tight text-stone-900 dark:text-stone-100">
                  PageMark
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded-md bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                  Obsidian
                </span>
              </div>
              <p className="text-[10px] text-stone-500 dark:text-stone-400 font-medium">
                Handwritten notes to markdown
              </p>
            </div>
          </div>

          {/* Navigation Action Buttons */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={() => {
                setSelectedDocId(null);
                setIsScannerOpen(true);
              }}
              className="px-3 sm:px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 transition active:scale-95"
            >
              <Plus size={15} />
              <span>Scan Page</span>
            </button>

            <button
              onClick={() => setIsCheatSheetOpen(true)}
              className="p-2 sm:px-3 sm:py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-750 text-xs font-medium flex items-center gap-1.5 shadow-2xs transition"
              title="Printable Cheat Sheet Key"
            >
              <Bookmark size={15} className="text-amber-500" />
              <span className="hidden sm:inline">Cheat Sheet</span>
            </button>

            <button
              onClick={() => setIsBatchExportOpen(true)}
              className="p-2 sm:px-3 sm:py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-750 text-xs font-medium flex items-center gap-1.5 shadow-2xs transition"
              title="Export Zip Archive for Obsidian Vault"
            >
              <Archive size={15} />
              <span className="hidden sm:inline">Export Vault</span>
            </button>

            <button
              onClick={() => setIsSettingsOpen(true)}
              className="p-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-750 transition"
              title="Settings & Symbol Rules"
            >
              <SettingsIcon size={16} />
            </button>

            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-750 transition"
              title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </div>
        </div>
      </header>

      {/* Main View Area */}
      <main className="flex-1 flex flex-col">
        {selectedDocument ? (
          // Review & Markdown Side-by-Side Editor
          <ReviewEditor
            document={selectedDocument}
            settings={settings}
            onUpdateDocument={handleUpdateDocument}
            onBack={() => setSelectedDocId(null)}
            onSaveHandwritingReference={handleSaveHandwritingRef}
            onOpenBatchExport={() => setIsBatchExportOpen(true)}
          />
        ) : isScannerOpen ? (
          // Page Scanner / Crop Interface
          <PageScanner
            settings={settings}
            onPageProcessed={handleAddNewDocument}
            onLoadSample={handleLoadSample}
          />
        ) : (
          // Notes Dashboard / Library
          <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 flex flex-col gap-6">
            {/* Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-stone-900 dark:text-stone-100 tracking-tight">
                  Your Transcribed Notes
                </h1>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                  Obsidian-ready Markdown documents organized by filing code
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleLoadSample}
                  className="px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-750 text-xs font-medium flex items-center gap-1.5 transition"
                >
                  <Sparkles size={14} className="text-amber-500" />
                  Load Sample Note
                </button>

                <button
                  onClick={() => setIsScannerOpen(true)}
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold shadow-sm flex items-center gap-1.5 transition active:scale-95"
                >
                  <Camera size={15} />
                  Scan New Note
                </button>
              </div>
            </div>

            {/* Document Cards Grid */}
            {documents.length === 0 ? (
              <div className="border-2 border-dashed border-stone-300 dark:border-stone-800 rounded-3xl p-12 text-center flex flex-col items-center justify-center gap-3">
                <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                  <Camera size={32} />
                </div>
                <h3 className="font-bold text-base text-stone-900 dark:text-stone-100">
                  No notes transcribed yet
                </h3>
                <p className="text-xs text-stone-500 dark:text-stone-400 max-w-sm">
                  Snap a photo of your handwritten page or try our sample ANTH 145 lecture note.
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <button
                    onClick={() => setIsScannerOpen(true)}
                    className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-medium"
                  >
                    Scan Note
                  </button>
                  <button
                    onClick={handleLoadSample}
                    className="px-4 py-2 rounded-xl bg-stone-200 dark:bg-stone-800 text-stone-800 dark:text-stone-200 text-xs font-medium"
                  >
                    Load Sample
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {documents.map((doc) => {
                  const tasks = doc.items.filter((i) => i.type === 'task' || i.type === 'done_task');
                  const flashcards = doc.items.filter((i) => i.type === 'flashcard');
                  const events = doc.items.filter((i) => i.type === 'event');

                  return (
                    <div
                      key={doc.id}
                      onClick={() => setSelectedDocId(doc.id)}
                      className="group bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 hover:border-amber-400/80 dark:hover:border-amber-500/60 rounded-3xl p-4 shadow-xs hover:shadow-md transition cursor-pointer flex flex-col justify-between gap-4"
                    >
                      {/* Card Header */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-850 shrink-0">
                              [{doc.filingCodeDetected || 'INBOX'}]
                            </span>
                            <span className="text-[11px] text-stone-500 dark:text-stone-400 truncate">
                              {doc.scanDate}
                            </span>
                          </div>
                          <h3 className="font-bold text-sm text-stone-900 dark:text-stone-100 mt-2 truncate group-hover:text-amber-600 transition">
                            {doc.suggestedTitle}
                          </h3>
                        </div>

                        <button
                          onClick={(e) => handleDeleteDocument(doc.id, e)}
                          className="p-1.5 rounded-lg text-stone-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition shrink-0"
                          title="Delete note"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>

                      {/* Photo Thumbnail & Markdown Snippet */}
                      <div className="grid grid-cols-5 gap-3 bg-stone-50 dark:bg-stone-850 p-2.5 rounded-2xl border border-stone-200/60 dark:border-stone-800">
                        <div className="col-span-2 h-24 rounded-xl overflow-hidden bg-stone-900 flex items-center justify-center">
                          <img
                            src={doc.thumbnail || doc.originalImage}
                            alt="thumbnail"
                            className="max-h-full max-w-full object-cover"
                          />
                        </div>
                        <div className="col-span-3 flex flex-col justify-between text-[11px] text-stone-600 dark:text-stone-400">
                          <div className="flex items-center gap-1 text-stone-500 truncate">
                            <Folder size={12} className="text-amber-500 shrink-0" />
                            <span className="truncate">{doc.filingCodeMatched?.folder || 'Inbox'}</span>
                          </div>

                          <div className="flex flex-col gap-1 mt-1 text-[11px]">
                            {tasks.length > 0 && (
                              <span className="font-mono text-stone-700 dark:text-stone-300">
                                □ {tasks.length} task{tasks.length === 1 ? '' : 's'}
                              </span>
                            )}
                            {flashcards.length > 0 && (
                              <span className="font-mono text-stone-700 dark:text-stone-300">
                                ▲ {flashcards.length} card{flashcards.length === 1 ? '' : 's'}
                              </span>
                            )}
                            {events.length > 0 && (
                              <span className="font-mono text-stone-700 dark:text-stone-300">
                                ◇ {events.length} event{events.length === 1 ? '' : 's'}
                              </span>
                            )}
                          </div>

                          <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold self-end">
                            Open & Edit →
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Floating Bottom Nav for One-Handed Mobile Use */}
      <div className="sm:hidden sticky bottom-0 z-30 bg-white/95 dark:bg-stone-900/95 backdrop-blur-md border-t border-stone-200 dark:border-stone-800 p-2 flex items-center justify-around">
        <button
          onClick={() => {
            setSelectedDocId(null);
            setIsScannerOpen(false);
          }}
          className={`flex flex-col items-center gap-0.5 text-[10px] font-medium p-1 ${
            !isScannerOpen && !selectedDocId
              ? 'text-amber-600 dark:text-amber-400 font-bold'
              : 'text-stone-500'
          }`}
        >
          <FileText size={18} />
          <span>Notes</span>
        </button>

        <button
          onClick={() => {
            setSelectedDocId(null);
            setIsScannerOpen(true);
          }}
          className="flex items-center justify-center w-12 h-12 rounded-full bg-amber-600 text-white shadow-lg shadow-amber-600/30 -mt-5"
        >
          <Camera size={22} />
        </button>

        <button
          onClick={() => setIsCheatSheetOpen(true)}
          className="flex flex-col items-center gap-0.5 text-[10px] font-medium p-1 text-stone-500"
        >
          <Bookmark size={18} />
          <span>Cheat Key</span>
        </button>

        <button
          onClick={() => setIsSettingsOpen(true)}
          className="flex flex-col items-center gap-0.5 text-[10px] font-medium p-1 text-stone-500"
        >
          <SettingsIcon size={18} />
          <span>Settings</span>
        </button>
      </div>

      {/* MODALS */}
      {isSettingsOpen && (
        <SettingsModal
          settings={settings}
          onUpdateSettings={handleUpdateSettings}
          onClose={() => setIsSettingsOpen(false)}
        />
      )}

      {isCheatSheetOpen && (
        <CheatSheetModal
          settings={settings}
          onClose={() => setIsCheatSheetOpen(false)}
        />
      )}

      {isBatchExportOpen && (
        <BatchExportModal
          documents={documents}
          settings={settings}
          onClose={() => setIsBatchExportOpen(false)}
        />
      )}
    </div>
  );
}
