import React, { useState } from 'react';
import { X, Archive, Download, FileText, CheckCircle2, Folder, Layers } from 'lucide-react';
import JSZip from 'jszip';
import { PageDocument, AppSettings } from '../types';

interface BatchExportModalProps {
  documents: PageDocument[];
  settings: AppSettings;
  onClose: () => void;
}

export const BatchExportModal: React.FC<BatchExportModalProps> = ({
  documents,
  settings,
  onClose,
}) => {
  const [isZipping, setIsZipping] = useState<boolean>(false);
  const [status, setStatus] = useState<string | null>(null);

  // Download all as .zip matching Obsidian vault folders
  const handleDownloadZip = async () => {
    if (documents.length === 0) return;
    setIsZipping(true);
    setStatus('Compressing notes into Obsidian vault structure...');

    try {
      const zip = new JSZip();

      // Group documents into folders
      documents.forEach((doc) => {
        const folderPath = doc.filingCodeMatched?.folder || 'Inbox';
        const cleanTitle = (doc.suggestedTitle || 'Untitled Note')
          .replace(/[/\\?%*:|"<>]/g, '-')
          .trim();
        const filename = `${doc.scanDate} ${cleanTitle}.md`;

        // Add file inside folder
        const cleanFolderPath = folderPath.replace(/^\/+|\/+$/g, '');
        zip.folder(cleanFolderPath)?.file(filename, doc.markdown);
      });

      // Also create consolidated Flashcards.md grouped by course
      const flashcardsMap: Record<string, string[]> = {};
      documents.forEach((doc) => {
        const courseName = doc.filingCodeMatched?.name || 'General Notes';
        doc.items
          .filter((item) => item.type === 'flashcard')
          .forEach((item) => {
            if (!flashcardsMap[courseName]) flashcardsMap[courseName] = [];
            const parts = item.text.split(/::|=/);
            if (parts.length >= 2) {
              flashcardsMap[courseName].push(`${parts[0].trim()}::${parts.slice(1).join('=').trim()}`);
            } else {
              flashcardsMap[courseName].push(item.text.trim());
            }
          });
      });

      const totalFlashcards = Object.values(flashcardsMap).reduce((acc, l) => acc + l.length, 0);

      if (totalFlashcards > 0) {
        const fcLines = [
          '---',
          'title: Consolidated Flashcards',
          `date: ${new Date().toISOString().split('T')[0]}`,
          'tags:',
          '  - flashcards',
          '  - pagemark',
          'source: handwritten',
          '---',
          '',
          '# Consolidated Flashcards Library',
          '',
        ];

        for (const [course, cards] of Object.entries(flashcardsMap)) {
          fcLines.push(`## ${course}`);
          cards.forEach((c) => fcLines.push(`- ${c}`));
          fcLines.push('');
        }

        zip.file('Flashcards.md', fcLines.join('\n'));
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `PageMark_Obsidian_Vault_${new Date().toISOString().split('T')[0]}.zip`;
      link.click();
      URL.revokeObjectURL(url);

      setStatus('Zip exported successfully!');
      setTimeout(() => setStatus(null), 3000);
    } catch (err: any) {
      console.error('Zip export error:', err);
      setStatus(`Export failed: ${err.message}`);
    } finally {
      setIsZipping(false);
    }
  };

  // Download standalone Flashcards.md only
  const handleDownloadFlashcardsOnly = () => {
    const flashcardsMap: Record<string, string[]> = {};
    documents.forEach((doc) => {
      const courseName = doc.filingCodeMatched?.name || 'General Notes';
      doc.items
        .filter((item) => item.type === 'flashcard')
        .forEach((item) => {
          if (!flashcardsMap[courseName]) flashcardsMap[courseName] = [];
          const parts = item.text.split(/::|=/);
          if (parts.length >= 2) {
            flashcardsMap[courseName].push(`${parts[0].trim()}::${parts.slice(1).join('=').trim()}`);
          } else {
            flashcardsMap[courseName].push(item.text.trim());
          }
        });
    });

    const fcLines = [
      '---',
      'title: Consolidated Flashcards',
      `date: ${new Date().toISOString().split('T')[0]}`,
      'tags:',
      '  - flashcards',
      'source: handwritten',
      '---',
      '',
      '# Consolidated Flashcards Library',
      '',
    ];

    for (const [course, cards] of Object.entries(flashcardsMap)) {
      fcLines.push(`## ${course}`);
      cards.forEach((c) => fcLines.push(`- ${c}`));
      fcLines.push('');
    }

    const blob = new Blob([fcLines.join('\n')], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Flashcards.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const totalCards = documents.reduce(
    (acc, d) => acc + d.items.filter((i) => i.type === 'flashcard').length,
    0
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 dark:border-stone-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <Archive size={18} />
            </div>
            <div>
              <h2 className="font-bold text-stone-900 dark:text-stone-100 text-base">
                Export Notes to Obsidian
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                {documents.length} note{documents.length === 1 ? '' : 's'} ready for your vault
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex flex-col gap-4 text-xs">
          <div className="bg-stone-50 dark:bg-stone-850 p-4 rounded-2xl border border-stone-200 dark:border-stone-800 flex flex-col gap-3">
            <div className="font-semibold text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <Folder size={14} className="text-amber-500" />
              <span>Obsidian Vault Folder Structure</span>
            </div>
            <div className="flex flex-col gap-1.5 pl-4 border-l-2 border-amber-300 dark:border-amber-700 font-mono text-[11px] text-stone-600 dark:text-stone-300">
              {documents.map((d) => (
                <div key={d.id} className="truncate">
                  📁 {d.filingCodeMatched?.folder || 'Inbox'}/
                  <span className="text-stone-900 dark:text-stone-100 font-semibold">
                    {d.scanDate} {d.suggestedTitle}.md
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Flashcard Stats & Quick Button */}
          {totalCards > 0 && (
            <div className="p-4 rounded-2xl border border-amber-200 dark:border-amber-850 bg-amber-50/60 dark:bg-amber-950/40 flex items-center justify-between">
              <div>
                <span className="font-bold text-amber-900 dark:text-amber-200 text-xs">
                  {totalCards} Flashcard{totalCards === 1 ? '' : 's'} Found
                </span>
                <p className="text-[11px] text-amber-700 dark:text-amber-300">
                  Export only the flashcards grouped by course for spaced repetition.
                </p>
              </div>
              <button
                onClick={handleDownloadFlashcardsOnly}
                className="px-3 py-1.5 rounded-xl border border-amber-300 dark:border-amber-700 bg-white dark:bg-stone-800 text-amber-800 dark:text-amber-200 font-medium hover:bg-amber-100 dark:hover:bg-stone-700 transition"
              >
                Flashcards.md
              </button>
            </div>
          )}

          {status && (
            <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 font-medium flex items-center gap-2">
              <CheckCircle2 size={14} />
              <span>{status}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 bg-stone-50/80 dark:bg-stone-950 border-t border-stone-200 dark:border-stone-800">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl"
          >
            Cancel
          </button>
          <button
            onClick={handleDownloadZip}
            disabled={isZipping || documents.length === 0}
            className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs shadow-md shadow-amber-700/20 flex items-center gap-2 transition disabled:opacity-50"
          >
            {isZipping ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Building Zip Archive...</span>
              </>
            ) : (
              <>
                <Download size={15} />
                <span>Download All (.zip)</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
