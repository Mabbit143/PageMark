import React, { useState } from 'react';
import {
  Download,
  Copy,
  Check,
  Folder,
  Tag,
  Calendar,
  AlertTriangle,
  Eye,
  Edit3,
  FileCode,
  Layers,
  Sparkles,
  ArrowLeft,
  Share2,
  Bookmark
} from 'lucide-react';
import { PageDocument, AppSettings, FilingCode, HandwritingReference } from '../types';
import { generateObsidianMarkdown } from '../utils/markdown';
import { HandwritingPad } from './HandwritingPad';

interface ReviewEditorProps {
  document: PageDocument;
  settings: AppSettings;
  onUpdateDocument: (updated: PageDocument) => void;
  onBack: () => void;
  onSaveHandwritingReference: (ref: HandwritingReference) => void;
  onOpenBatchExport?: () => void;
}

export const ReviewEditor: React.FC<ReviewEditorProps> = ({
  document,
  settings,
  onUpdateDocument,
  onBack,
  onSaveHandwritingReference,
  onOpenBatchExport,
}) => {
  const [activeTab, setActiveTab] = useState<'split' | 'photo' | 'markdown'>('split');
  const [markdownText, setMarkdownText] = useState<string>(document.markdown);
  const [copied, setCopied] = useState<boolean>(false);
  const [selectedFilingCodeId, setSelectedFilingCodeId] = useState<string>(
    document.filingCodeMatched?.id || 'code-inbox'
  );
  const [title, setTitle] = useState<string>(document.suggestedTitle);
  const [showMistakeModal, setShowMistakeModal] = useState<boolean>(false);
  const [mistakeDescription, setMistakeDescription] = useState<string>(
    'It read my ▲ as an A. Add this image as an example of my triangle.'
  );
  const [selectedTargetSymbolId, setSelectedTargetSymbolId] = useState<string>('sym-flashcard');
  const [isDrawingReference, setIsDrawingReference] = useState<boolean>(false);

  // Sync markdown changes
  const handleMarkdownChange = (newMd: string) => {
    setMarkdownText(newMd);
    onUpdateDocument({
      ...document,
      markdown: newMd,
      suggestedTitle: title,
      updatedAt: Date.now(),
    });
  };

  // When filing code dropdown changes
  const handleFilingCodeChange = (codeId: string) => {
    setSelectedFilingCodeId(codeId);
    const matched = settings.filingCodes.find((c) => c.id === codeId) || null;
    const recompiled = generateObsidianMarkdown({
      title,
      scanDate: document.scanDate,
      filingCode: matched,
      items: document.items,
      symbols: settings.symbols,
      lowConfidenceThreshold: settings.lowConfidenceThreshold,
    });
    setMarkdownText(recompiled);
    onUpdateDocument({
      ...document,
      filingCodeMatched: matched,
      markdown: recompiled,
      updatedAt: Date.now(),
    });
  };

  // When title changes
  const handleTitleBlur = () => {
    const matched = settings.filingCodes.find((c) => c.id === selectedFilingCodeId) || null;
    const recompiled = generateObsidianMarkdown({
      title,
      scanDate: document.scanDate,
      filingCode: matched,
      items: document.items,
      symbols: settings.symbols,
      lowConfidenceThreshold: settings.lowConfidenceThreshold,
    });
    setMarkdownText(recompiled);
    onUpdateDocument({
      ...document,
      suggestedTitle: title,
      markdown: recompiled,
      updatedAt: Date.now(),
    });
  };

  // Copy to clipboard
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(markdownText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  // Download .md file
  const handleDownloadMd = () => {
    const cleanTitle = title.replace(/[/\\?%*:|"<>]/g, '-').trim() || 'Untitled';
    const filename = `${document.scanDate} ${cleanTitle}.md`;
    const blob = new Blob([markdownText], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = window.document.createElement('a');
    link.href = url;
    link.download = filename;
    window.document.body.appendChild(link);
    link.click();
    window.document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Save mistake correction to user's handwriting library
  const handleSaveMistakeToLibrary = (imageData: string) => {
    const targetSymbol = settings.symbols.find((s) => s.id === selectedTargetSymbolId);
    const newRef: HandwritingReference = {
      id: `ref-${Date.now()}`,
      targetId: selectedTargetSymbolId,
      targetName: targetSymbol ? `${targetSymbol.char} ${targetSymbol.name}` : 'Correction',
      type: 'symbol',
      label: mistakeDescription || `Correction for ${targetSymbol?.name}`,
      imageData,
      notes: mistakeDescription,
      createdAt: new Date().toISOString(),
    };
    onSaveHandwritingReference(newRef);
    setShowMistakeModal(false);
  };

  // Count low confidence items
  const lowConfidenceCount = document.items.filter((i) => i.confidence < 0.8).length;

  return (
    <div className="w-full max-w-7xl mx-auto p-3 sm:p-6 flex flex-col gap-4">
      {/* Top Bar Navigation & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-stone-200 dark:border-stone-800">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-xl text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition"
            title="Back to queue / scanner"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={handleTitleBlur}
                className="text-lg sm:text-xl font-bold text-stone-900 dark:text-stone-100 bg-transparent hover:bg-stone-100 dark:hover:bg-stone-800/60 focus:bg-stone-100 dark:focus:bg-stone-800 px-2 py-0.5 rounded-lg border border-transparent focus:border-amber-400 outline-hidden transition"
              />
            </div>
            <div className="flex items-center gap-3 px-2 text-xs text-stone-500 dark:text-stone-400 mt-0.5">
              <span>{document.scanDate}</span>
              <span>•</span>
              <span className="font-mono text-amber-600 dark:text-amber-400">
                Box: {document.filingCodeDetected ? `[${document.filingCodeDetected}]` : 'None (Inbox)'}
              </span>
            </div>
          </div>
        </div>

        {/* View Toggle on Mobile & Main Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Mobile Tab Selector */}
          <div className="flex md:hidden bg-stone-100 dark:bg-stone-800 p-1 rounded-xl text-xs">
            <button
              onClick={() => setActiveTab('photo')}
              className={`px-3 py-1.5 rounded-lg font-medium transition ${
                activeTab === 'photo'
                  ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-white shadow-xs'
                  : 'text-stone-600 dark:text-stone-400'
              }`}
            >
              Photo
            </button>
            <button
              onClick={() => setActiveTab('markdown')}
              className={`px-3 py-1.5 rounded-lg font-medium transition ${
                activeTab === 'markdown'
                  ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-white shadow-xs'
                  : 'text-stone-600 dark:text-stone-400'
              }`}
            >
              Markdown
            </button>
          </div>

          <button
            onClick={() => setShowMistakeModal(true)}
            className="px-3 py-2 rounded-xl text-xs font-medium border border-amber-300 dark:border-amber-800/80 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/40 flex items-center gap-1.5 transition"
            title="Teach the model your handwriting style"
          >
            <Sparkles size={14} className="text-amber-500" />
            <span className="hidden sm:inline">Fix Mistake / Teach Symbol</span>
            <span className="sm:hidden">Teach</span>
          </button>

          <button
            onClick={handleCopy}
            className="px-3 py-2 rounded-xl text-xs font-medium border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-750 flex items-center gap-1.5 shadow-xs transition"
          >
            {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
            <span>{copied ? 'Copied!' : 'Copy'}</span>
          </button>

          <button
            onClick={handleDownloadMd}
            className="px-4 py-2 rounded-xl text-xs font-medium bg-amber-600 hover:bg-amber-500 text-white shadow-sm flex items-center gap-1.5 transition active:scale-95"
          >
            <Download size={14} />
            <span>Download .md</span>
          </button>
        </div>
      </div>

      {/* Course / Filing Code Routing Bar */}
      <div className="bg-stone-50 dark:bg-stone-850 border border-stone-200 dark:border-stone-800 rounded-2xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-stone-600 dark:text-stone-300">
            <Folder size={14} className="text-amber-500" />
            <span className="font-medium">Obsidian Destination:</span>
          </div>

          <select
            value={selectedFilingCodeId}
            onChange={(e) => handleFilingCodeChange(e.target.value)}
            className="bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 px-3 py-1 rounded-lg text-xs font-medium outline-hidden focus:border-amber-500"
          >
            <option value="code-inbox">📁 Inbox (No Course)</option>
            {settings.filingCodes.map((fc) => (
              <option key={fc.id} value={fc.id}>
                [{fc.code}] {fc.name} — {fc.folder}
              </option>
            ))}
          </select>

          {document.filingCodeMatched && (
            <div className="flex items-center gap-1.5">
              {document.filingCodeMatched.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 rounded-md bg-stone-200/70 dark:bg-stone-700 text-stone-700 dark:text-stone-300 text-[11px] font-mono"
                >
                  #{tag.replace(/^#/, '')}
                </span>
              ))}
            </div>
          )}
        </div>

        {lowConfidenceCount > 0 && (
          <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400 bg-amber-100/70 dark:bg-amber-950/60 px-2.5 py-1 rounded-lg text-[11px]">
            <AlertTriangle size={13} />
            <span>
              {lowConfidenceCount} line{lowConfidenceCount === 1 ? '' : 's'} with low confidence marked with{' '}
              <code className="bg-amber-200 dark:bg-amber-900 px-1 py-0.2 rounded font-mono">
                ==word==
              </code>
            </span>
          </div>
        )}
      </div>

      {/* Main Review Area: Side-by-Side or Responsive Split */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 min-h-[580px]">
        {/* Left Column: Straightened Note Photo */}
        <div
          className={`flex flex-col bg-stone-900 border border-stone-800 rounded-2xl overflow-hidden shadow-xs ${
            activeTab === 'markdown' ? 'hidden md:flex' : 'flex'
          }`}
        >
          <div className="px-4 py-2.5 bg-stone-950 border-b border-stone-800 flex items-center justify-between text-xs text-stone-400">
            <div className="flex items-center gap-2">
              <Eye size={14} className="text-amber-400" />
              <span className="font-medium text-stone-300">Cleaned Page Photo</span>
            </div>
            <span className="text-[11px] text-stone-500">
              Perspective Corrected & Contrast Enhanced
            </span>
          </div>

          <div className="flex-1 p-2 sm:p-4 flex items-center justify-center overflow-auto bg-stone-950/90">
            <img
              src={document.processedImage || document.originalImage}
              alt="Transcribed note page"
              className="max-h-[72vh] w-auto object-contain rounded-lg shadow-lg border border-stone-800"
            />
          </div>
        </div>

        {/* Right Column: Obsidian-Ready Markdown Editor */}
        <div
          className={`flex flex-col bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl overflow-hidden shadow-xs ${
            activeTab === 'photo' ? 'hidden md:flex' : 'flex'
          }`}
        >
          <div className="px-4 py-2.5 bg-stone-50 dark:bg-stone-850 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-stone-700 dark:text-stone-300 font-medium">
              <FileCode size={14} className="text-amber-500" />
              <span>Obsidian Markdown (.md)</span>
            </div>
            <div className="text-[11px] text-stone-500 dark:text-stone-400">
              Fully editable • Instant sync
            </div>
          </div>

          <div className="flex-1 p-3 sm:p-4 flex flex-col">
            <textarea
              value={markdownText}
              onChange={(e) => handleMarkdownChange(e.target.value)}
              className="w-full h-full min-h-[480px] p-3 rounded-xl bg-stone-50/60 dark:bg-stone-950 font-mono text-xs sm:text-sm text-stone-800 dark:text-stone-200 border border-stone-200 dark:border-stone-800 outline-hidden focus:border-amber-500 resize-none leading-relaxed transition"
              spellCheck={false}
            />
          </div>
        </div>
      </div>

      {/* Mistake Correction Modal / Teach Symbol */}
      {showMistakeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl w-full max-w-lg shadow-2xl p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold">
                <Sparkles size={18} />
                <span>Fix Mistake & Learn My Handwriting</span>
              </div>
              <button
                onClick={() => setShowMistakeModal(false)}
                className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-stone-600 dark:text-stone-300">
              Tell the system what went wrong so it learns your personal handwriting style and symbols.
              For example: <span className="italic font-medium">"It read my ▲ as an A. Add this image as an example of my triangle."</span>
            </p>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                What went wrong?
              </label>
              <input
                type="text"
                value={mistakeDescription}
                onChange={(e) => setMistakeDescription(e.target.value)}
                placeholder="e.g. It read my ▲ as an A. Here is how I draw my triangle."
                className="px-3 py-2 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 outline-hidden focus:border-amber-500"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                Which symbol or code should this be taught for?
              </label>
              <select
                value={selectedTargetSymbolId}
                onChange={(e) => setSelectedTargetSymbolId(e.target.value)}
                className="px-3 py-2 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 outline-hidden focus:border-amber-500"
              >
                <optgroup label="Line Symbols">
                  {settings.symbols.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.char} — {s.name} ({s.description})
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Corner Brackets & Dots">
                  <option value="brackets">⌜ ⌝ ⌞ ⌟ Corner Brackets & Orientation Dot</option>
                </optgroup>
                <optgroup label="Filing Codes">
                  {settings.filingCodes.map((fc) => (
                    <option key={fc.id} value={fc.id}>
                      [{fc.code}] Boxed Code — {fc.name}
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>

            <div className="p-3 bg-amber-50/80 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-800/80 text-xs text-amber-900 dark:text-amber-200 flex flex-col gap-2">
              <p>
                Click below to draw or upload a sample of how you write this. It will be sent to the Gemini Vision model alongside your notes as a few-shot reference example.
              </p>
              <button
                onClick={() => setIsDrawingReference(true)}
                className="px-3 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-medium text-xs flex items-center justify-center gap-1.5 self-start shadow-xs transition"
              >
                <Edit3 size={14} />
                Draw / Upload Reference Example
              </button>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-stone-200 dark:border-stone-800">
              <button
                onClick={() => setShowMistakeModal(false)}
                className="px-4 py-2 text-xs font-medium text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Handwriting Reference Pad Popup */}
      {isDrawingReference && (
        <HandwritingPad
          title={`Handwriting Reference: ${
            settings.symbols.find((s) => s.id === selectedTargetSymbolId)?.name || 'Glyph'
          }`}
          subtitle={mistakeDescription}
          onSave={handleSaveMistakeToLibrary}
          onClose={() => setIsDrawingReference(false)}
        />
      )}
    </div>
  );
};
