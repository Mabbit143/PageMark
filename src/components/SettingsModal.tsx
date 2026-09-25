import React, { useState } from 'react';
import {
  X,
  Plus,
  Trash2,
  Edit2,
  Folder,
  Tag,
  PenTool,
  Upload,
  Download,
  RotateCcw,
  Check,
  Sparkles,
  BookOpen,
  FileCode,
  Image as ImageIcon,
  Sliders,
  Type,
  Settings
} from 'lucide-react';
import {
  AppSettings,
  FilingCode,
  SymbolDefinition,
  HandwritingReference,
  Abbreviation,
} from '../types';
import { HandwritingPad } from './HandwritingPad';
import { exportSettingsJSON, importSettingsJSON } from '../utils/storage';
import { INITIAL_SETTINGS } from '../utils/defaults';

interface SettingsModalProps {
  settings: AppSettings;
  onUpdateSettings: (newSettings: AppSettings) => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  onUpdateSettings,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'symbols' | 'codes' | 'handwriting' | 'abbreviations' | 'preferences'>('symbols');

  // Handwriting Pad state
  const [padTarget, setPadTarget] = useState<{
    id: string;
    name: string;
    type: 'symbol' | 'code' | 'bracket';
    existingImage?: string;
  } | null>(null);

  // New Custom Symbol modal state
  const [isAddingSymbol, setIsAddingSymbol] = useState<boolean>(false);
  const [newSymbolChar, setNewSymbolChar] = useState<string>('§');
  const [newSymbolName, setNewSymbolName] = useState<string>('');
  const [newSymbolPattern, setNewSymbolPattern] = useState<string>('> [!note]\n> {text}');
  const [newSymbolDescription, setNewSymbolDescription] = useState<string>('');
  const [newSymbolImage, setNewSymbolImage] = useState<string | undefined>(undefined);

  // New Filing Code modal state
  const [isAddingCode, setIsAddingCode] = useState<boolean>(false);
  const [newCodeKey, setNewCodeKey] = useState<string>('');
  const [newCodeName, setNewCodeName] = useState<string>('');
  const [newCodeFolder, setNewCodeFolder] = useState<string>('');
  const [newCodeTags, setNewCodeTags] = useState<string>('');

  // New Abbreviation state
  const [newAbbr, setNewAbbr] = useState<string>('');
  const [newExpansion, setNewExpansion] = useState<string>('');

  // Export / Import message
  const [importStatus, setImportStatus] = useState<string | null>(null);

  // Save changes
  const updateSettingsField = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    const updated = { ...settings, [key]: value };
    onUpdateSettings(updated);
  };

  // Add Custom Symbol
  const handleSaveCustomSymbol = () => {
    if (!newSymbolName.trim()) return;

    const newSym: SymbolDefinition = {
      id: `custom-sym-${Date.now()}`,
      char: newSymbolChar.trim() || '★',
      name: newSymbolName.trim(),
      type: 'custom',
      markdownPattern: newSymbolPattern || '- {text}',
      description: newSymbolDescription || `Custom symbol ${newSymbolChar}`,
      exampleImage: newSymbolImage,
      isDefault: false,
    };

    updateSettingsField('symbols', [...settings.symbols, newSym]);

    // If an image was provided, also register it in handwritingReferences
    if (newSymbolImage) {
      const ref: HandwritingReference = {
        id: `ref-${Date.now()}`,
        targetId: newSym.id,
        targetName: `${newSym.char} ${newSym.name}`,
        type: 'symbol',
        label: `Reference for custom symbol ${newSym.name}`,
        imageData: newSymbolImage,
        createdAt: new Date().toISOString(),
      };
      updateSettingsField('handwritingReferences', [...settings.handwritingReferences, ref]);
    }

    setIsAddingSymbol(false);
    setNewSymbolChar('§');
    setNewSymbolName('');
    setNewSymbolPattern('> [!note]\n> {text}');
    setNewSymbolDescription('');
    setNewSymbolImage(undefined);
  };

  const handleDeleteSymbol = (id: string) => {
    updateSettingsField(
      'symbols',
      settings.symbols.filter((s) => s.id !== id)
    );
  };

  // Add Filing Code
  const handleSaveFilingCode = () => {
    if (!newCodeKey.trim() || !newCodeName.trim()) return;

    const tagsArray = newCodeTags
      .split(',')
      .map((t) => t.trim().replace(/^#/, ''))
      .filter(Boolean);

    const newCode: FilingCode = {
      id: `code-${Date.now()}`,
      code: newCodeKey.toUpperCase().replace(/[\[\]]/g, '').trim(),
      name: newCodeName.trim(),
      folder: newCodeFolder.trim() || `Courses/${newCodeName.trim()}`,
      tags: tagsArray.length > 0 ? tagsArray : [newCodeKey.toLowerCase()],
    };

    updateSettingsField('filingCodes', [...settings.filingCodes, newCode]);
    setIsAddingCode(false);
    setNewCodeKey('');
    setNewCodeName('');
    setNewCodeFolder('');
    setNewCodeTags('');
  };

  const handleDeleteFilingCode = (id: string) => {
    updateSettingsField(
      'filingCodes',
      settings.filingCodes.filter((c) => c.id !== id)
    );
  };

  // Abbreviations
  const handleAddAbbr = () => {
    if (!newAbbr.trim() || !newExpansion.trim()) return;
    const item: Abbreviation = {
      id: `abbr-${Date.now()}`,
      abbr: newAbbr.trim(),
      expansion: newExpansion.trim(),
    };
    updateSettingsField('abbreviations', [...settings.abbreviations, item]);
    setNewAbbr('');
    setNewExpansion('');
  };

  const handleDeleteAbbr = (id: string) => {
    updateSettingsField(
      'abbreviations',
      settings.abbreviations.filter((a) => a.id !== id)
    );
  };

  // Handwriting reference save from pad
  const handleSaveHandwritingRef = (imageData: string) => {
    if (!padTarget) return;

    // Check if one already exists for this target
    const existingIdx = settings.handwritingReferences.findIndex((r) => r.targetId === padTarget.id);
    let updatedRefs: HandwritingReference[];

    const newRef: HandwritingReference = {
      id: existingIdx >= 0 ? settings.handwritingReferences[existingIdx].id : `ref-${Date.now()}`,
      targetId: padTarget.id,
      targetName: padTarget.name,
      type: padTarget.type,
      label: `Handwriting example for ${padTarget.name}`,
      imageData,
      createdAt: new Date().toISOString(),
    };

    if (existingIdx >= 0) {
      updatedRefs = [...settings.handwritingReferences];
      updatedRefs[existingIdx] = newRef;
    } else {
      updatedRefs = [...settings.handwritingReferences, newRef];
    }

    updateSettingsField('handwritingReferences', updatedRefs);
    setPadTarget(null);
  };

  const handleDeleteHandwritingRef = (id: string) => {
    updateSettingsField(
      'handwritingReferences',
      settings.handwritingReferences.filter((r) => r.id !== id)
    );
  };

  // Export / Import
  const handleExport = () => {
    const jsonStr = exportSettingsJSON(settings);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `PageMark_Settings_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const jsonStr = event.target?.result as string;
        const imported = importSettingsJSON(jsonStr);
        onUpdateSettings(imported);
        setImportStatus('Settings imported successfully!');
        setTimeout(() => setImportStatus(null), 3000);
      } catch (err: any) {
        setImportStatus(`Import failed: ${err.message}`);
      }
    };
    reader.readAsText(file);
  };

  const handleResetDefaults = () => {
    if (confirm('Reset all filing codes, symbols, and settings to original defaults?')) {
      onUpdateSettings(INITIAL_SETTINGS);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl w-full max-w-4xl max-h-[90vh] shadow-2xl overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 dark:border-stone-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <Settings size={18} />
            </div>
            <div>
              <h2 className="font-bold text-stone-900 dark:text-stone-100 text-lg">Settings & Rules</h2>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Configure filing codes, line symbols, handwriting examples, and abbreviations
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 px-6 pt-3 border-b border-stone-200 dark:border-stone-800 bg-stone-50/60 dark:bg-stone-950 overflow-x-auto">
          <button
            onClick={() => setActiveTab('symbols')}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'symbols'
                ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                : 'border-transparent text-stone-600 dark:text-stone-400 hover:text-stone-900'
            }`}
          >
            <Sparkles size={14} />
            Line Symbols ({settings.symbols.length})
          </button>

          <button
            onClick={() => setActiveTab('codes')}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'codes'
                ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                : 'border-transparent text-stone-600 dark:text-stone-400 hover:text-stone-900'
            }`}
          >
            <Folder size={14} />
            Filing Codes ({settings.filingCodes.length})
          </button>

          <button
            onClick={() => setActiveTab('handwriting')}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'handwriting'
                ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                : 'border-transparent text-stone-600 dark:text-stone-400 hover:text-stone-900'
            }`}
          >
            <PenTool size={14} />
            Handwriting Library ({settings.handwritingReferences.length})
          </button>

          <button
            onClick={() => setActiveTab('abbreviations')}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'abbreviations'
                ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                : 'border-transparent text-stone-600 dark:text-stone-400 hover:text-stone-900'
            }`}
          >
            <Type size={14} />
            Abbreviations ({settings.abbreviations.length})
          </button>

          <button
            onClick={() => setActiveTab('preferences')}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'preferences'
                ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                : 'border-transparent text-stone-600 dark:text-stone-400 hover:text-stone-900'
            }`}
          >
            <Sliders size={14} />
            Preferences & Data
          </button>
        </div>

        {/* Tab Content Container */}
        <div className="flex-1 p-6 overflow-y-auto">
          {/* TAB 1: LINE SYMBOLS */}
          {activeTab === 'symbols' && (
            <div className="flex flex-col gap-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-stone-900 dark:text-stone-100 text-sm">
                    Line Symbols & Markdown Rules
                  </h3>
                  <p className="text-xs text-stone-500 dark:text-stone-400">
                    Drawn at the start of a line. Lines with no symbol are plain paragraphs; underlined or larger text becomes headings.
                  </p>
                </div>
                <button
                  onClick={() => setIsAddingSymbol(true)}
                  className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-medium flex items-center gap-1.5 shadow-xs transition"
                >
                  <Plus size={14} />
                  Add Custom Symbol
                </button>
              </div>

              {/* Symbol List Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {settings.symbols.map((sym) => {
                  const refExample = settings.handwritingReferences.find((r) => r.targetId === sym.id);

                  return (
                    <div
                      key={sym.id}
                      className="p-3.5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-850 flex flex-col justify-between gap-3 shadow-2xs hover:border-amber-400/60 transition"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <span className="w-9 h-9 rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 flex items-center justify-center text-lg font-bold text-stone-800 dark:text-stone-100 shadow-2xs shrink-0">
                            {sym.char}
                          </span>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold text-xs text-stone-900 dark:text-stone-100">
                                {sym.name}
                              </h4>
                              {sym.isDefault ? (
                                <span className="text-[10px] px-1.5 py-0.2 rounded-sm bg-stone-200 dark:bg-stone-700 text-stone-600 dark:text-stone-300">
                                  Default
                                </span>
                              ) : (
                                <span className="text-[10px] px-1.5 py-0.2 rounded-sm bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200">
                                  Custom
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-stone-500 dark:text-stone-400 line-clamp-1 mt-0.5">
                              {sym.description}
                            </p>
                          </div>
                        </div>

                        {!sym.isDefault && (
                          <button
                            onClick={() => handleDeleteSymbol(sym.id)}
                            className="p-1 rounded-lg text-stone-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition"
                            title="Delete custom symbol"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>

                      <div className="bg-white dark:bg-stone-900 p-2 rounded-xl border border-stone-200 dark:border-stone-800 flex items-center justify-between text-[11px] font-mono text-stone-700 dark:text-stone-300">
                        <span className="truncate">{sym.markdownPattern}</span>
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-stone-200/60 dark:border-stone-800 text-[11px]">
                        <div className="flex items-center gap-1.5 text-stone-500">
                          {refExample ? (
                            <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                              <Check size={12} />
                              Drawing saved
                            </span>
                          ) : (
                            <span className="text-stone-400">No handwriting example</span>
                          )}
                        </div>

                        <button
                          onClick={() =>
                            setPadTarget({
                              id: sym.id,
                              name: `${sym.char} ${sym.name}`,
                              type: 'symbol',
                              existingImage: refExample?.imageData,
                            })
                          }
                          className="px-2 py-1 rounded-lg text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 font-medium flex items-center gap-1 transition"
                        >
                          <PenTool size={12} />
                          {refExample ? 'Edit Drawing' : 'Teach My Style'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: FILING CODES */}
          {activeTab === 'codes' && (
            <div className="flex flex-col gap-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-stone-900 dark:text-stone-100 text-sm">
                    Top-Right Corner Filing Codes
                  </h3>
                  <p className="text-xs text-stone-500 dark:text-stone-400">
                    Write short codes inside a hand-drawn box in the top-right corner like <code className="font-mono bg-stone-200 dark:bg-stone-800 px-1 py-0.5 rounded text-[11px]">[A145]</code>.
                  </p>
                </div>
                <button
                  onClick={() => setIsAddingCode(true)}
                  className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-medium flex items-center gap-1.5 shadow-xs transition"
                >
                  <Plus size={14} />
                  Add Filing Code
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {settings.filingCodes.map((fc) => {
                  const refExample = settings.handwritingReferences.find((r) => r.targetId === fc.id);

                  return (
                    <div
                      key={fc.id}
                      className="p-3.5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-850 flex flex-col justify-between gap-3 shadow-2xs hover:border-amber-400/60 transition"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded-md font-mono text-xs font-bold bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-800">
                              [{fc.code}]
                            </span>
                            <h4 className="font-semibold text-xs text-stone-900 dark:text-stone-100">
                              {fc.name}
                            </h4>
                          </div>
                          <div className="flex items-center gap-1.5 mt-2 text-xs text-stone-600 dark:text-stone-300">
                            <Folder size={13} className="text-amber-500 shrink-0" />
                            <span className="font-mono text-[11px] truncate">{fc.folder}</span>
                          </div>
                        </div>

                        <button
                          onClick={() => handleDeleteFilingCode(fc.id)}
                          className="p-1 rounded-lg text-stone-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition"
                          title="Delete code"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>

                      <div className="flex flex-wrap items-center gap-1">
                        {fc.tags.map((t) => (
                          <span
                            key={t}
                            className="px-2 py-0.5 rounded-md bg-stone-200 dark:bg-stone-700 text-stone-600 dark:text-stone-300 text-[10px] font-mono"
                          >
                            #{t.replace(/^#/, '')}
                          </span>
                        ))}
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-stone-200/60 dark:border-stone-800 text-[11px]">
                        <span className="text-stone-400">
                          {refExample ? 'Sample drawing active' : 'No handwriting sample'}
                        </span>
                        <button
                          onClick={() =>
                            setPadTarget({
                              id: fc.id,
                              name: `[${fc.code}] ${fc.name}`,
                              type: 'code',
                              existingImage: refExample?.imageData,
                            })
                          }
                          className="px-2 py-1 rounded-lg text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 font-medium flex items-center gap-1 transition"
                        >
                          <PenTool size={12} />
                          {refExample ? 'Edit Sample' : 'Draw Sample Box'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: HANDWRITING REFERENCE LIBRARY */}
          {activeTab === 'handwriting' && (
            <div className="flex flex-col gap-5">
              <div className="bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-850 p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-stone-900 dark:text-stone-100 text-sm">
                    Few-Shot Visual Handwriting Reference
                  </h3>
                  <p className="text-xs text-stone-600 dark:text-stone-300 mt-0.5">
                    Draw or upload examples of your symbols, filing boxes, and corner brackets.
                    These images are sent directly to the Gemini vision model alongside your note photos so it learns your personal handwriting style!
                  </p>
                </div>
                <button
                  onClick={() =>
                    setPadTarget({
                      id: 'bracket-corner',
                      name: 'Corner Brackets (⌜ ⌝ ⌞ ⌟) with Top-Left Dot',
                      type: 'bracket',
                    })
                  }
                  className="px-3 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-medium flex items-center gap-1.5 shrink-0 shadow-xs transition"
                >
                  <PenTool size={14} />
                  Add Bracket Reference
                </button>
              </div>

              {settings.handwritingReferences.length === 0 ? (
                <div className="p-8 text-center border-2 border-dashed border-stone-200 dark:border-stone-800 rounded-2xl">
                  <PenTool size={28} className="mx-auto text-stone-400 mb-2" />
                  <p className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                    No handwriting references saved yet
                  </p>
                  <p className="text-[11px] text-stone-500 mt-1 max-w-sm mx-auto">
                    Draw examples for your symbols in the "Line Symbols" tab or click above to draw your corner brackets.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {settings.handwritingReferences.map((ref) => (
                    <div
                      key={ref.id}
                      className="border border-stone-200 dark:border-stone-800 rounded-2xl p-3 bg-white dark:bg-stone-850 flex flex-col gap-2 shadow-2xs group"
                    >
                      <div className="w-full h-28 rounded-xl bg-white border border-stone-200 dark:border-stone-700 flex items-center justify-center overflow-hidden p-1 shadow-inner">
                        <img
                          src={ref.imageData}
                          alt={ref.label}
                          className="max-h-full max-w-full object-contain"
                        />
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <div className="truncate font-semibold text-stone-900 dark:text-stone-100">
                          {ref.targetName}
                        </div>
                        <button
                          onClick={() => handleDeleteHandwritingRef(ref.id)}
                          className="text-stone-400 hover:text-red-500 transition"
                          title="Remove reference"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                      <span className="text-[10px] text-stone-400 truncate">
                        {ref.label}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: ABBREVIATIONS */}
          {activeTab === 'abbreviations' && (
            <div className="flex flex-col gap-5">
              <div>
                <h3 className="font-semibold text-stone-900 dark:text-stone-100 text-sm">
                  Personal Shorthand & Abbreviations
                </h3>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  Define common abbreviations you use in lecture or notes (e.g. "w/" for "with").
                  The vision model uses this to accurately transcribe words without mistaking shorthand glyphs.
                </p>
              </div>

              {/* Add New Abbreviation Input */}
              <div className="flex flex-wrap items-center gap-2 p-3 bg-stone-50 dark:bg-stone-850 border border-stone-200 dark:border-stone-800 rounded-2xl">
                <input
                  type="text"
                  placeholder="Shorthand (e.g. w/)"
                  value={newAbbr}
                  onChange={(e) => setNewAbbr(e.target.value)}
                  className="px-3 py-1.5 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 font-mono text-stone-900 dark:text-stone-100 outline-hidden focus:border-amber-500"
                />
                <span className="text-stone-400 text-xs">→</span>
                <input
                  type="text"
                  placeholder="Expansion (e.g. with)"
                  value={newExpansion}
                  onChange={(e) => setNewExpansion(e.target.value)}
                  className="px-3 py-1.5 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 outline-hidden focus:border-amber-500 flex-1 min-w-[140px]"
                />
                <button
                  onClick={handleAddAbbr}
                  className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-medium flex items-center gap-1 shadow-xs transition"
                >
                  <Plus size={14} />
                  Add
                </button>
              </div>

              {/* Abbreviations List */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {settings.abbreviations.map((item) => (
                  <div
                    key={item.id}
                    className="p-2.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-850 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2 font-mono">
                      <span className="font-bold text-amber-600 dark:text-amber-400">
                        {item.abbr}
                      </span>
                      <span className="text-stone-400">=</span>
                      <span className="text-stone-800 dark:text-stone-200 font-sans">
                        {item.expansion}
                      </span>
                    </div>
                    <button
                      onClick={() => handleDeleteAbbr(item.id)}
                      className="p-1 text-stone-400 hover:text-red-500 transition"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: PREFERENCES & DATA */}
          {activeTab === 'preferences' && (
            <div className="flex flex-col gap-6">
              {/* Vision & Processing Settings */}
              <div>
                <h3 className="font-semibold text-stone-900 dark:text-stone-100 text-sm mb-3">
                  Transcription & Vision Options
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-850 flex flex-col gap-2">
                    <label className="text-xs font-semibold text-stone-800 dark:text-stone-200">
                      Low-Confidence Threshold ({Math.round(settings.lowConfidenceThreshold * 100)}%)
                    </label>
                    <p className="text-[11px] text-stone-500 dark:text-stone-400">
                      Words or lines below this score are automatically flagged with{' '}
                      <code className="bg-amber-100 dark:bg-amber-950 px-1 py-0.5 rounded font-mono">
                        ==word==
                      </code>
                    </p>
                    <input
                      type="range"
                      min="0.5"
                      max="0.95"
                      step="0.05"
                      value={settings.lowConfidenceThreshold}
                      onChange={(e) =>
                        updateSettingsField('lowConfidenceThreshold', parseFloat(e.target.value))
                      }
                      className="accent-amber-600 mt-2"
                    />
                  </div>

                  <div className="p-4 rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-850 flex flex-col gap-2">
                    <label className="text-xs font-semibold text-stone-800 dark:text-stone-200">
                      Contrast Boost Multiplier ({settings.contrastBoost.toFixed(1)}x)
                    </label>
                    <p className="text-[11px] text-stone-500 dark:text-stone-400">
                      Strength of dark ink extraction against shadow and background paper texture.
                    </p>
                    <input
                      type="range"
                      min="1.0"
                      max="2.5"
                      step="0.1"
                      value={settings.contrastBoost}
                      onChange={(e) =>
                        updateSettingsField('contrastBoost', parseFloat(e.target.value))
                      }
                      className="accent-amber-600 mt-2"
                    />
                  </div>
                </div>
              </div>

              {/* Backup & Export */}
              <div className="pt-4 border-t border-stone-200 dark:border-stone-800">
                <h3 className="font-semibold text-stone-900 dark:text-stone-100 text-sm mb-1">
                  Backup & Synchronization
                </h3>
                <p className="text-xs text-stone-500 dark:text-stone-400 mb-3">
                  Export all your custom symbols, filing codes, handwriting drawings, and abbreviations to a JSON file.
                </p>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={handleExport}
                    className="px-4 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-xs font-medium text-stone-800 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-750 flex items-center gap-1.5 shadow-2xs transition"
                  >
                    <Download size={14} />
                    Export Settings (.json)
                  </button>

                  <label className="px-4 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-xs font-medium text-stone-800 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-750 flex items-center gap-1.5 shadow-2xs cursor-pointer transition">
                    <Upload size={14} />
                    Import Settings (.json)
                    <input type="file" accept=".json" onChange={handleImport} className="hidden" />
                  </label>

                  <button
                    onClick={handleResetDefaults}
                    className="px-4 py-2 rounded-xl text-xs font-medium text-stone-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 flex items-center gap-1.5 transition ml-auto"
                  >
                    <RotateCcw size={14} />
                    Reset to Defaults
                  </button>
                </div>

                {importStatus && (
                  <div className="mt-3 p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950 text-amber-800 dark:text-amber-200 text-xs font-medium">
                    {importStatus}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end px-6 py-3.5 bg-stone-50/80 dark:bg-stone-950 border-t border-stone-200 dark:border-stone-800">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 dark:bg-stone-100 dark:hover:bg-white text-white dark:text-stone-900 text-xs font-semibold shadow-xs transition"
          >
            Done
          </button>
        </div>
      </div>

      {/* SUB-MODAL: Add Custom Line Symbol */}
      {isAddingSymbol && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl w-full max-w-md shadow-2xl p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-stone-900 dark:text-stone-100 text-sm">
                Add Custom Line Symbol
              </h3>
              <button
                onClick={() => setIsAddingSymbol(false)}
                className="text-stone-400 hover:text-stone-600"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-4 gap-2">
              <div className="col-span-1 flex flex-col gap-1">
                <label className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                  Glyph
                </label>
                <input
                  type="text"
                  maxLength={3}
                  value={newSymbolChar}
                  onChange={(e) => setNewSymbolChar(e.target.value)}
                  className="px-3 py-2 text-center text-lg font-bold rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                />
              </div>

              <div className="col-span-3 flex flex-col gap-1">
                <label className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                  Symbol Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Vocabulary, Hypothesis"
                  value={newSymbolName}
                  onChange={(e) => setNewSymbolName(e.target.value)}
                  className="px-3 py-2 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                Markdown Output Format
              </label>
              <textarea
                rows={2}
                placeholder="e.g. > [!quote] {text}"
                value={newSymbolPattern}
                onChange={(e) => setNewSymbolPattern(e.target.value)}
                className="px-3 py-2 font-mono text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100"
              />
              <span className="text-[10px] text-stone-400">
                Use <code className="bg-stone-200 dark:bg-stone-800 px-1 rounded">{'{text}'}</code> for transcribed line text and <code className="bg-stone-200 dark:bg-stone-800 px-1 rounded">{'{date}'}</code> for dates.
              </span>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                Description / Rule
              </label>
              <input
                type="text"
                placeholder="e.g. Drawn at start of line for definitions"
                value={newSymbolDescription}
                onChange={(e) => setNewSymbolDescription(e.target.value)}
                className="px-3 py-2 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100"
              />
            </div>

            {/* Optional Drawing / Photo of custom symbol */}
            <div className="p-3 bg-stone-50 dark:bg-stone-850 rounded-2xl border border-stone-200 dark:border-stone-800 flex items-center justify-between">
              <div className="text-xs">
                <span className="font-semibold text-stone-800 dark:text-stone-200">
                  Example Drawing:
                </span>
                <p className="text-[11px] text-stone-500">
                  {newSymbolImage ? 'Custom drawing attached' : 'Optional sample image'}
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  setPadTarget({
                    id: 'temp-custom-sym',
                    name: `${newSymbolChar} ${newSymbolName || 'Custom Symbol'}`,
                    type: 'symbol',
                    existingImage: newSymbolImage,
                  })
                }
                className="px-2.5 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-200 text-xs font-medium hover:bg-white dark:hover:bg-stone-800 flex items-center gap-1"
              >
                <PenTool size={13} />
                {newSymbolImage ? 'Redraw' : 'Draw'}
              </button>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-stone-200 dark:border-stone-800">
              <button
                type="button"
                onClick={() => setIsAddingSymbol(false)}
                className="px-4 py-2 text-xs text-stone-600 dark:text-stone-400"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveCustomSymbol}
                disabled={!newSymbolName.trim()}
                className="px-4 py-2 text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white rounded-xl shadow-xs disabled:opacity-50"
              >
                Save Symbol
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUB-MODAL: Add Filing Code */}
      {isAddingCode && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl w-full max-w-md shadow-2xl p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-stone-900 dark:text-stone-100 text-sm">
                Add Filing Code
              </h3>
              <button
                onClick={() => setIsAddingCode(false)}
                className="text-stone-400 hover:text-stone-600"
              >
                ✕
              </button>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                Boxed Code (written in top-right)
              </label>
              <input
                type="text"
                placeholder="e.g. A145, TODO, PSY201"
                value={newCodeKey}
                onChange={(e) => setNewCodeKey(e.target.value)}
                className="px-3 py-2 text-xs font-mono font-bold rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                Course / Display Name
              </label>
              <input
                type="text"
                placeholder="e.g. ANTH 145"
                value={newCodeName}
                onChange={(e) => setNewCodeName(e.target.value)}
                className="px-3 py-2 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                Obsidian Folder Path
              </label>
              <input
                type="text"
                placeholder="e.g. Courses/ANTH 145"
                value={newCodeFolder}
                onChange={(e) => setNewCodeFolder(e.target.value)}
                className="px-3 py-2 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                Obsidian Tags (comma separated)
              </label>
              <input
                type="text"
                placeholder="anthropology, anth145, lecture"
                value={newCodeTags}
                onChange={(e) => setNewCodeTags(e.target.value)}
                className="px-3 py-2 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-stone-200 dark:border-stone-800">
              <button
                type="button"
                onClick={() => setIsAddingCode(false)}
                className="px-4 py-2 text-xs text-stone-600 dark:text-stone-400"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveFilingCode}
                disabled={!newCodeKey.trim() || !newCodeName.trim()}
                className="px-4 py-2 text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white rounded-xl shadow-xs disabled:opacity-50"
              >
                Save Filing Code
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DRAWING PAD MODAL */}
      {padTarget && (
        <HandwritingPad
          title={`Draw Reference: ${padTarget.name}`}
          subtitle="Draw this symbol or glyph with your finger or pen to teach Gemini Vision your handwriting style"
          initialImage={padTarget.existingImage}
          onSave={(img) => {
            if (padTarget.id === 'temp-custom-sym') {
              setNewSymbolImage(img);
              setPadTarget(null);
            } else {
              handleSaveHandwritingRef(img);
            }
          }}
          onClose={() => setPadTarget(null)}
        />
      )}
    </div>
  );
};
