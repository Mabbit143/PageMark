import React from 'react';
import { X, Printer, Bookmark, CornerDownRight, CheckSquare, Sparkles } from 'lucide-react';
import { AppSettings } from '../types';

interface CheatSheetModalProps {
  settings: AppSettings;
  onClose: () => void;
}

export const CheatSheetModal: React.FC<CheatSheetModalProps> = ({ settings, onClose }) => {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl w-full max-w-4xl max-h-[92vh] shadow-2xl overflow-hidden flex flex-col">
        {/* Header (hidden in print) */}
        <div className="print:hidden flex items-center justify-between px-6 py-4 border-b border-stone-200 dark:border-stone-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <Bookmark size={18} />
            </div>
            <div>
              <h2 className="font-bold text-stone-900 dark:text-stone-100 text-lg">
                PageMark Cheat Sheet
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Printable 1-page pocket reference for your notebooks and desk
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 transition"
            >
              <Printer size={15} />
              Print Sheet
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Printable Document Container */}
        <div className="flex-1 p-6 sm:p-8 overflow-y-auto bg-stone-50/60 dark:bg-stone-950 print:bg-white print:p-0 print:m-0 text-stone-900 dark:text-stone-100">
          {/* Print Sheet Paper Styling */}
          <div className="max-w-3xl mx-auto bg-white dark:bg-stone-900 print:bg-white border border-stone-200 dark:border-stone-800 print:border-none rounded-2xl p-6 sm:p-8 shadow-xs print:shadow-none flex flex-col gap-6">
            {/* Sheet Title */}
            <div className="flex items-start justify-between border-b border-stone-200 dark:border-stone-800 pb-4">
              <div>
                <h1 className="text-2xl font-black tracking-tight text-stone-900">
                  PageMark <span className="text-amber-600 font-serif italic">Quick Key</span>
                </h1>
                <p className="text-xs text-stone-600 mt-1">
                  Handwritten note notation key for automatic Obsidian Markdown conversion.
                </p>
              </div>
              <div className="text-right text-[11px] text-stone-500">
                <div>Scan with PageMark Vision</div>
                <div className="font-mono font-bold text-stone-700">Obsidian Vault Ready</div>
              </div>
            </div>

            {/* SECTION 1: CORNER BRACKETS & FILING CODE BOX */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Corner Brackets */}
              <div className="border border-stone-200 rounded-xl p-4 bg-stone-50/50 print:bg-white flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg font-mono font-bold text-amber-700">⌜ ⌝ ⌞ ⌟</span>
                    <h3 className="font-bold text-xs text-stone-900">Corner Brackets & Dot</h3>
                  </div>
                  <p className="text-[11px] text-stone-600 leading-relaxed">
                    Draw 4 L-shaped corner brackets near the page edges.
                    Put a <strong className="text-stone-900">dot inside the TOP-LEFT bracket</strong> (•) so PageMark rotates the page upright automatically.
                  </p>
                </div>
                <div className="mt-3 flex items-center justify-around p-2 bg-white border border-dashed border-stone-300 rounded-lg text-xs font-mono">
                  <span className="text-amber-600 font-bold">⌜• top-left</span>
                  <span className="text-stone-400">⌝ top-right</span>
                </div>
              </div>

              {/* Filing Code Box */}
              <div className="border border-stone-200 rounded-xl p-4 bg-stone-50/50 print:bg-white flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-mono font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300">
                      [CODE]
                    </span>
                    <h3 className="font-bold text-xs text-stone-900">Top-Right Boxed Code</h3>
                  </div>
                  <p className="text-[11px] text-stone-600 leading-relaxed">
                    Write your filing code inside a hand-drawn rectangle in the top-right corner.
                    PageMark reads it and files the note into your course folder with tags.
                  </p>
                </div>
                <div className="mt-3 flex flex-wrap gap-1 p-2 bg-white border border-stone-200 rounded-lg text-[11px] font-mono">
                  {settings.filingCodes.slice(0, 4).map((fc) => (
                    <span key={fc.id} className="text-stone-800 font-semibold">
                      [{fc.code}]
                    </span>
                  ))}
                  <span className="text-stone-400">... or [TODO]</span>
                </div>
              </div>
            </div>

            {/* SECTION 2: 10 LINE SYMBOLS TABLE */}
            <div>
              <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Sparkles size={14} className="text-amber-500" />
                Line Start Symbols (10 Defaults)
              </h3>
              <p className="text-[11px] text-stone-500 mb-3">
                Draw symbol at the very start of a line, slightly larger than your handwriting. Plain lines without symbols become regular paragraphs. Underlined text becomes a heading (<code className="font-mono bg-stone-100 px-1">##</code>).
              </p>

              <div className="border border-stone-200 rounded-xl overflow-hidden text-xs">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-stone-100 print:bg-stone-100 border-b border-stone-200 text-stone-700 font-semibold text-[11px]">
                      <th className="py-2 px-3 w-12 text-center">Symbol</th>
                      <th className="py-2 px-3 w-36">Meaning</th>
                      <th className="py-2 px-3">How to Write It</th>
                      <th className="py-2 px-3 w-48 font-mono">Markdown Output</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200 text-[11px] text-stone-800">
                    <tr>
                      <td className="py-2 px-3 text-center text-sm font-bold text-stone-900">●</td>
                      <td className="py-2 px-3 font-medium">Bullet Point</td>
                      <td className="py-2 px-3 text-stone-600">Filled circle</td>
                      <td className="py-2 px-3 font-mono text-stone-600">- text</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 text-center text-sm font-bold text-stone-900">□</td>
                      <td className="py-2 px-3 font-medium">Pending Task</td>
                      <td className="py-2 px-3 text-stone-600">
                        Empty square + date ("Oct 12", "next Fri")
                      </td>
                      <td className="py-2 px-3 font-mono text-stone-600">- [ ] text 📅 YYYY-MM-DD</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 text-center text-sm font-bold text-stone-900">☑</td>
                      <td className="py-2 px-3 font-medium">Completed Task</td>
                      <td className="py-2 px-3 text-stone-600">Checked square box</td>
                      <td className="py-2 px-3 font-mono text-stone-600">- [x] text</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 text-center text-sm font-bold text-stone-900">▲</td>
                      <td className="py-2 px-3 font-medium">Flashcard / Vocab</td>
                      <td className="py-2 px-3 text-stone-600">
                        Triangle, write "front :: back" or "front = back"
                      </td>
                      <td className="py-2 px-3 font-mono text-stone-600">
                        front::back (under ## Flashcards)
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 text-center text-sm font-bold text-stone-900">?</td>
                      <td className="py-2 px-3 font-medium">Question to Ask</td>
                      <td className="py-2 px-3 text-stone-600">Question mark inside a circle</td>
                      <td className="py-2 px-3 font-mono text-stone-600">- [ ] ❓ text #question</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 text-center text-sm font-bold text-stone-900">★</td>
                      <td className="py-2 px-3 font-medium">Important / Exam</td>
                      <td className="py-2 px-3 text-stone-600">Star at line start</td>
                      <td className="py-2 px-3 font-mono text-stone-600">&gt; [!important] text</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 text-center text-sm font-bold text-stone-900">"</td>
                      <td className="py-2 px-3 font-medium">Direct Quote</td>
                      <td className="py-2 px-3 text-stone-600">
                        Quote mark, write page after e.g. "(p. 42)"
                      </td>
                      <td className="py-2 px-3 font-mono text-stone-600">&gt; "text" (p. N) #quote</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 text-center text-sm font-bold text-stone-900">→</td>
                      <td className="py-2 px-3 font-medium">Topic Wikilink</td>
                      <td className="py-2 px-3 text-stone-600">
                        Arrow pointing to topic/concept name
                      </td>
                      <td className="py-2 px-3 font-mono text-stone-600">
                        → [[Topic]] (under ## Related)
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 text-center text-sm font-bold text-stone-900">~</td>
                      <td className="py-2 px-3 font-medium">Personal Idea</td>
                      <td className="py-2 px-3 text-stone-600">Wavy line for your own insights</td>
                      <td className="py-2 px-3 font-mono text-stone-600">&gt; [!idea] text #idea</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 text-center text-sm font-bold text-stone-900">◇</td>
                      <td className="py-2 px-3 font-medium">Date / Event</td>
                      <td className="py-2 px-3 text-stone-600">
                        Diamond symbol, write date and event
                      </td>
                      <td className="py-2 px-3 font-mono text-stone-600">- 📅 YYYY-MM-DD text #event</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* SECTION 3: YOUR ACTIVE FILING CODES */}
            <div>
              <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wider mb-2">
                Your Vault Filing Codes
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                {settings.filingCodes.map((fc) => (
                  <div
                    key={fc.id}
                    className="p-2.5 rounded-lg border border-stone-200 bg-stone-50/50 print:bg-white flex flex-col gap-1"
                  >
                    <div className="flex items-center gap-1.5 font-mono">
                      <span className="font-bold text-amber-700 bg-amber-100 px-1 rounded text-[11px]">
                        [{fc.code}]
                      </span>
                      <span className="font-semibold text-stone-900 font-sans">{fc.name}</span>
                    </div>
                    <div className="text-[10px] text-stone-500 font-mono truncate">
                      {fc.folder}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer note */}
            <div className="text-[10px] text-stone-400 text-center border-t border-stone-200 pt-3">
              Generated by PageMark • Works on any paper notebook or loose sheet • No special paper needed
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
