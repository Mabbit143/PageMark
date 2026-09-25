import React, { useState, useRef, useEffect } from 'react';
import {
  Camera,
  Upload,
  Crop,
  RotateCw,
  Sparkles,
  Sliders,
  Check,
  X,
  FileText,
  AlertCircle,
  HelpCircle,
  ArrowRight,
  Maximize2
} from 'lucide-react';
import { CornerPoints, PageDocument, Point, AppSettings } from '../types';
import {
  getDefaultCorners,
  detectPaperCorners,
  warpPerspective,
  applyPaperEnhancement,
  rotateCanvas,
} from '../utils/perspective';
import { generateObsidianMarkdown } from '../utils/markdown';
import { INBOX_FILING_CODE } from '../utils/defaults';

interface PageScannerProps {
  settings: AppSettings;
  onPageProcessed: (doc: PageDocument) => void;
  onLoadSample: () => void;
}

export const PageScanner: React.FC<PageScannerProps> = ({
  settings,
  onPageProcessed,
  onLoadSample,
}) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [filename, setFilename] = useState<string>('note-scan.jpg');
  const [mode, setMode] = useState<'auto' | 'bracket' | 'manual'>('auto');
  const [filterMode, setFilterMode] = useState<'clean' | 'contrast' | 'original'>('clean');
  const [rotation, setRotation] = useState<number>(0);
  const [corners, setCorners] = useState<CornerPoints | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Dragging corner points
  const [activeCorner, setActiveCorner] = useState<keyof CornerPoints | null>(null);
  const [magnifierPos, setMagnifierPos] = useState<Point | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  // When image loads, compute initial corners
  const handleImageLoaded = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const w = img.naturalWidth;
    const h = img.naturalHeight;

    if (mode === 'bracket') {
      setCorners(getDefaultCorners(w, h, 'bracket'));
    } else {
      // Auto detect paper
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        const detected = detectPaperCorners(canvas);
        setCorners(detected);
      } else {
        setCorners(getDefaultCorners(w, h, 'auto'));
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    setFilename(file.name);
    setErrorMessage(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      setSelectedImage(event.target?.result as string);
      setRotation(0);
    };
    reader.readAsDataURL(file);
  };

  // Convert natural image coordinate to display container coordinate
  const toDisplayCoords = (point: Point): Point => {
    const img = imageRef.current;
    if (!img) return { x: 0, y: 0 };
    const rect = img.getBoundingClientRect();
    const scaleX = rect.width / img.naturalWidth;
    const scaleY = rect.height / img.naturalHeight;
    return {
      x: point.x * scaleX,
      y: point.y * scaleY,
    };
  };

  // Convert display container coordinate to natural image coordinate
  const toNaturalCoords = (clientX: number, clientY: number): Point => {
    const img = imageRef.current;
    if (!img) return { x: 0, y: 0 };
    const rect = img.getBoundingClientRect();
    const scaleX = img.naturalWidth / rect.width;
    const scaleY = img.naturalHeight / rect.height;

    const x = Math.max(0, Math.min(img.naturalWidth, (clientX - rect.left) * scaleX));
    const y = Math.max(0, Math.min(img.naturalHeight, (clientY - rect.top) * scaleY));
    return { x, y };
  };

  // Touch and Mouse handlers for dragging corners
  const handlePointerDown = (corner: keyof CornerPoints) => (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveCorner(corner);
    setMode('manual');
    const natural = toNaturalCoords(e.clientX, e.clientY);
    setMagnifierPos(natural);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!activeCorner || !corners || !imageRef.current) return;
    const natural = toNaturalCoords(e.clientX, e.clientY);
    setCorners((prev) => (prev ? { ...prev, [activeCorner]: natural } : null));
    setMagnifierPos(natural);
  };

  const handlePointerUp = () => {
    setActiveCorner(null);
    setMagnifierPos(null);
  };

  const handleModeChange = (newMode: 'auto' | 'bracket' | 'manual') => {
    setMode(newMode);
    const img = imageRef.current;
    if (!img) return;
    const w = img.naturalWidth;
    const h = img.naturalHeight;

    if (newMode === 'bracket') {
      setCorners(getDefaultCorners(w, h, 'bracket'));
    } else if (newMode === 'auto') {
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        setCorners(detectPaperCorners(canvas));
      } else {
        setCorners(getDefaultCorners(w, h, 'auto'));
      }
    }
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  // Main processing pipeline
  const processPage = async () => {
    if (!selectedImage || !corners) return;

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = reject;
        img.src = selectedImage;
      });

      // 1. Initial canvas with rotation
      const rawCanvas = document.createElement('canvas');
      rawCanvas.width = img.naturalWidth;
      rawCanvas.height = img.naturalHeight;
      const rawCtx = rawCanvas.getContext('2d');
      if (!rawCtx) throw new Error('Could not create canvas context');
      rawCtx.drawImage(img, 0, 0);

      const rotatedCanvas = rotation !== 0 ? rotateCanvas(rawCanvas, rotation) : rawCanvas;

      // 2. Warp Perspective quad onto clean flat rectangle
      const warpedCanvas = warpPerspective(rotatedCanvas, corners, 1200, 1600);

      // 3. Apply Paper filter (whitened paper, contrast boost, remove shadows)
      const cleanCanvas = applyPaperEnhancement(
        warpedCanvas,
        filterMode,
        settings.contrastBoost
      );

      const processedDataUrl = cleanCanvas.toDataURL('image/jpeg', 0.9);
      const scanDate = new Date().toISOString().split('T')[0];

      // 4. Call server endpoint /api/transcribe
      const response = await fetch('/api/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: processedDataUrl,
          scanDate,
          filingCodes: settings.filingCodes,
          symbols: settings.symbols,
          handwritingReferences: settings.handwritingReferences,
          abbreviations: settings.abbreviations,
        }),
      });

      const result = await response.json();

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to parse page');
      }

      const transcription = result.data;
      const detectedCode = transcription.filing_code || null;
      const matchedFilingCode =
        settings.filingCodes.find(
          (c) => c.code.toLowerCase() === (detectedCode || '').toLowerCase()
        ) || null;

      const title = transcription.title || 'Untitled Note';
      const items = (transcription.items || []).map((it: any, idx: number) => ({
        id: `item-${Date.now()}-${idx}`,
        type: it.type || 'text',
        rawSymbol: it.raw_symbol,
        text: it.text || '',
        date: it.date || null,
        page: it.page || null,
        confidence: typeof it.confidence === 'number' ? it.confidence : 0.9,
        lowConfidenceWords: it.low_confidence_words || [],
      }));

      // 5. Generate deterministic Obsidian Markdown
      const markdown = generateObsidianMarkdown({
        title,
        scanDate,
        filingCode: matchedFilingCode,
        items,
        symbols: settings.symbols,
        lowConfidenceThreshold: settings.lowConfidenceThreshold,
      });

      const newDoc: PageDocument = {
        id: `doc-${Date.now()}`,
        originalImage: selectedImage,
        processedImage: processedDataUrl,
        thumbnail: processedDataUrl,
        filename,
        scanDate,
        mode,
        corners,
        rotation,
        filterMode,
        status: 'ready',
        filingCodeDetected: detectedCode,
        filingCodeMatched: matchedFilingCode,
        suggestedTitle: title,
        items,
        markdown,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      onPageProcessed(newDoc);
    } catch (err: any) {
      console.error('Processing error:', err);
      setErrorMessage(
        err.message ||
          'Failed to transcribe page. Check your API key or try adjusting the corners.'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4 sm:p-6 flex flex-col gap-6">
      {/* Top Banner / Hero */}
      {!selectedImage && (
        <div className="bg-gradient-to-br from-amber-50 via-stone-50 to-orange-50 dark:from-stone-900 dark:via-stone-900 dark:to-stone-850 border border-amber-200/70 dark:border-stone-800 rounded-3xl p-6 sm:p-8 text-center shadow-xs">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-700 dark:text-amber-400 mb-4 ring-1 ring-amber-500/20">
            <Camera size={28} />
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-stone-900 dark:text-stone-100 tracking-tight">
            Handwritten Notes to Obsidian Markdown
          </h2>
          <p className="mt-2 text-stone-600 dark:text-stone-300 max-w-lg mx-auto text-sm sm:text-base">
            Photograph your notes on <span className="font-semibold text-stone-900 dark:text-stone-100">any paper</span>.
            We straighten the perspective, read your corner filing codes like <code className="bg-stone-200 dark:bg-stone-800 px-1 py-0.5 rounded text-xs">[A145]</code>, and recognize line symbols.
          </p>

          {/* Quick Action Buttons */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              onClick={() => cameraInputRef.current?.click()}
              className="px-5 py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-medium shadow-md shadow-amber-700/20 flex items-center gap-2 transition active:scale-95"
            >
              <Camera size={19} />
              Take Photo
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-5 py-3 rounded-xl bg-white dark:bg-stone-800 hover:bg-stone-100 dark:hover:bg-stone-750 text-stone-800 dark:text-stone-200 border border-stone-300 dark:border-stone-700 font-medium shadow-xs flex items-center gap-2 transition active:scale-95"
            >
              <Upload size={19} />
              Upload Photos
            </button>

            <button
              onClick={onLoadSample}
              className="px-5 py-3 rounded-xl bg-stone-100 dark:bg-stone-800/80 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 font-medium border border-stone-200 dark:border-stone-700 flex items-center gap-2 transition"
            >
              <Sparkles size={18} className="text-amber-500" />
              Try Sample Note (ANTH 145)
            </button>
          </div>

          {/* Feature Highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-8 pt-6 border-t border-stone-200/80 dark:border-stone-800 text-left">
            <div className="flex items-start gap-3">
              <span className="text-xl">⌜ ⌝</span>
              <div>
                <h4 className="text-xs font-semibold text-stone-900 dark:text-stone-100">Bracket & Auto Crop</h4>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                  Detects paper edges or hand-drawn L-brackets with top-left dot upright orientation.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-xl font-mono text-amber-600">[A145]</span>
              <div>
                <h4 className="text-xs font-semibold text-stone-900 dark:text-stone-100">Filing Codes</h4>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                  Boxed codes route notes to specific folders, courses, and tags in your Obsidian vault.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-xl">▲ ★ □</span>
              <div>
                <h4 className="text-xs font-semibold text-stone-900 dark:text-stone-100">Line Symbols</h4>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                  Triangles become flashcards, squares become dated tasks, stars become important callouts.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Image Stage & Crop View */}
      {selectedImage && (
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl p-4 sm:p-6 shadow-sm flex flex-col gap-4">
          {/* Controls Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-stone-200 dark:border-stone-800">
            <div className="flex items-center gap-1.5 bg-stone-100 dark:bg-stone-800 p-1 rounded-xl">
              <button
                onClick={() => handleModeChange('auto')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  mode === 'auto'
                    ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-xs'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
                }`}
              >
                Auto Paper
              </button>
              <button
                onClick={() => handleModeChange('bracket')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  mode === 'bracket'
                    ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-xs'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
                }`}
              >
                Bracket Mode ⌜ ⌝
              </button>
              <button
                onClick={() => handleModeChange('manual')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  mode === 'manual'
                    ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-xs'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
                }`}
              >
                Manual Adjust
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleRotate}
                title="Rotate 90° Clockwise"
                className="p-2 rounded-xl border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 text-xs font-medium flex items-center gap-1.5 transition"
              >
                <RotateCw size={15} />
                Rotate
              </button>

              <div className="flex items-center gap-1 bg-stone-100 dark:bg-stone-800 p-1 rounded-xl text-xs">
                <button
                  onClick={() => setFilterMode('clean')}
                  className={`px-2.5 py-1 rounded-lg font-medium transition ${
                    filterMode === 'clean'
                      ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-white shadow-xs'
                      : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
                  }`}
                >
                  Clean
                </button>
                <button
                  onClick={() => setFilterMode('contrast')}
                  className={`px-2.5 py-1 rounded-lg font-medium transition ${
                    filterMode === 'contrast'
                      ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-white shadow-xs'
                      : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
                  }`}
                >
                  Contrast
                </button>
                <button
                  onClick={() => setFilterMode('original')}
                  className={`px-2.5 py-1 rounded-lg font-medium transition ${
                    filterMode === 'original'
                      ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-white shadow-xs'
                      : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
                  }`}
                >
                  Original
                </button>
              </div>

              <button
                onClick={() => setSelectedImage(null)}
                className="p-2 rounded-xl text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition"
                title="Dismiss image"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Interactive Quad Canvas Container */}
          <div
            ref={containerRef}
            className="relative w-full max-h-[65vh] flex items-center justify-center bg-stone-950/80 rounded-2xl overflow-hidden select-none touch-none border border-stone-800"
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          >
            <img
              ref={imageRef}
              src={selectedImage}
              alt="Scan"
              onLoad={handleImageLoaded}
              className="max-w-full max-h-[65vh] object-contain transition-transform"
              style={{
                transform: `rotate(${rotation}deg)`,
              }}
            />

            {/* Corner Quad Polygon & Interactive Handles */}
            {corners && imageRef.current && (
              <svg className="absolute inset-0 w-full h-full pointer-events-none">
                {(() => {
                  const tl = toDisplayCoords(corners.topLeft);
                  const tr = toDisplayCoords(corners.topRight);
                  const br = toDisplayCoords(corners.bottomRight);
                  const bl = toDisplayCoords(corners.bottomLeft);

                  return (
                    <>
                      {/* Semi-transparent darkened mask outside page */}
                      <polygon
                        points={`${tl.x},${tl.y} ${tr.x},${tr.y} ${br.x},${br.y} ${bl.x},${bl.y}`}
                        fill="rgba(245, 158, 11, 0.08)"
                        stroke="#f59e0b"
                        strokeWidth="2.5"
                        strokeDasharray={mode === 'bracket' ? '6 4' : 'none'}
                      />
                    </>
                  );
                })()}
              </svg>
            )}

            {/* Corner Handles */}
            {corners && imageRef.current && (
              <>
                {(['topLeft', 'topRight', 'bottomRight', 'bottomLeft'] as (keyof CornerPoints)[]).map(
                  (cornerKey) => {
                    const pt = toDisplayCoords(corners[cornerKey]);
                    const isCurrent = activeCorner === cornerKey;

                    return (
                      <div
                        key={cornerKey}
                        onPointerDown={handlePointerDown(cornerKey)}
                        style={{
                          left: `${pt.x}px`,
                          top: `${pt.y}px`,
                          transform: 'translate(-50%, -50%)',
                        }}
                        className={`absolute w-8 h-8 rounded-full flex items-center justify-center cursor-move touch-none transition-transform ${
                          isCurrent
                            ? 'scale-125 bg-amber-500 text-white shadow-lg ring-4 ring-amber-400/40 z-30'
                            : 'bg-white text-stone-800 shadow-md border-2 border-amber-500 hover:scale-110 z-20'
                        }`}
                      >
                        <div className="w-2.5 h-2.5 rounded-full bg-amber-600" />
                      </div>
                    );
                  }
                )}
              </>
            )}

            {/* Mobile Touch Loupe / Magnifier */}
            {activeCorner && magnifierPos && imageRef.current && (
              <div className="absolute top-4 left-4 z-40 w-28 h-28 rounded-full border-3 border-amber-500 bg-white shadow-2xl overflow-hidden pointer-events-none ring-4 ring-black/30">
                <div
                  style={{
                    width: `${imageRef.current.naturalWidth}px`,
                    height: `${imageRef.current.naturalHeight}px`,
                    transform: `translate(${-magnifierPos.x + 56}px, ${-magnifierPos.y + 56}px) scale(2.2)`,
                    transformOrigin: '0 0',
                  }}
                >
                  <img src={selectedImage} alt="magnified" className="w-full h-full" />
                </div>
                {/* Crosshair */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-4 h-0.5 bg-amber-500" />
                  <div className="h-4 w-0.5 bg-amber-500 absolute" />
                </div>
              </div>
            )}
          </div>

          {/* Hint & Instructions */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-1 text-xs text-stone-500 dark:text-stone-400">
            <div className="flex items-center gap-1.5">
              <HelpCircle size={14} className="text-amber-500" />
              <span>
                {mode === 'bracket'
                  ? 'Bracket mode: aligned to your 4 corner brackets (⌜ ⌝ ⌞ ⌟).'
                  : 'Drag corners to adjust perspective crop. Magnifier shows exact corner alignment.'}
              </span>
            </div>
            <span className="font-mono text-[11px] text-stone-400">
              {filename}
            </span>
          </div>

          {errorMessage && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs flex items-start gap-2">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <div>{errorMessage}</div>
            </div>
          )}

          {/* Bottom Action Bar */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              onClick={() => setSelectedImage(null)}
              className="px-4 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300 text-sm font-medium hover:bg-stone-50 dark:hover:bg-stone-800 transition"
            >
              Cancel
            </button>
            <button
              onClick={processPage}
              disabled={isProcessing}
              className="px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-sm font-medium shadow-md shadow-amber-700/20 flex items-center gap-2 transition active:scale-95"
            >
              {isProcessing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Reading Notes with Gemini Vision...</span>
                </>
              ) : (
                <>
                  <span>Process Page</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
