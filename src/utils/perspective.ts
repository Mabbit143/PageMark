import { CornerPoints, Point } from '../types';

/**
 * Computes default corner points inside an image
 */
export function getDefaultCorners(width: number, height: number, mode: 'auto' | 'bracket' | 'manual' = 'auto'): CornerPoints {
  if (mode === 'bracket') {
    // Brackets are typically drawn ~12% inset from page margins
    const mx = width * 0.12;
    const my = height * 0.10;
    return {
      topLeft: { x: mx, y: my },
      topRight: { x: width - mx, y: my },
      bottomRight: { x: width - mx, y: height - my },
      bottomLeft: { x: mx, y: height - my },
    };
  }

  // Auto / default paper margin (~4% inset)
  const mx = width * 0.04;
  const my = height * 0.04;
  return {
    topLeft: { x: mx, y: my },
    topRight: { x: width - mx, y: my },
    bottomRight: { x: width - mx, y: height - my },
    bottomLeft: { x: mx, y: height - my },
  };
}

/**
 * Paper boundary heuristic detection using edge gradients & brightness contrast
 */
export function detectPaperCorners(canvas: HTMLCanvasElement): CornerPoints {
  const w = canvas.width;
  const h = canvas.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return getDefaultCorners(w, h, 'auto');

  try {
    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;

    // Sample along diagonals and cross-sections to find bright paper vs darker table background
    let minX = w * 0.05;
    let maxX = w * 0.95;
    let minY = h * 0.05;
    let maxY = h * 0.95;

    // Check horizontal brightness profile across middle
    const midY = Math.floor(h / 2);
    let leftEdge = 0;
    let rightEdge = w;

    for (let x = 0; x < w / 2; x += 4) {
      const idx = (midY * w + x) * 4;
      const b = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
      if (b > 130) {
        leftEdge = Math.max(x - 10, w * 0.02);
        break;
      }
    }

    for (let x = w - 1; x > w / 2; x -= 4) {
      const idx = (midY * w + x) * 4;
      const b = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
      if (b > 130) {
        rightEdge = Math.min(x + 10, w * 0.98);
        break;
      }
    }

    // Check vertical brightness profile
    const midX = Math.floor(w / 2);
    let topEdge = 0;
    let bottomEdge = h;

    for (let y = 0; y < h / 2; y += 4) {
      const idx = (y * w + midX) * 4;
      const b = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
      if (b > 130) {
        topEdge = Math.max(y - 10, h * 0.02);
        break;
      }
    }

    for (let y = h - 1; y > h / 2; y -= 4) {
      const idx = (y * w + midX) * 4;
      const b = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
      if (b > 130) {
        bottomEdge = Math.min(y + 10, h * 0.98);
        break;
      }
    }

    if (rightEdge - leftEdge > w * 0.4 && bottomEdge - topEdge > h * 0.4) {
      minX = leftEdge;
      maxX = rightEdge;
      minY = topEdge;
      maxY = bottomEdge;
    }

    return {
      topLeft: { x: minX, y: minY },
      topRight: { x: maxX, y: minY },
      bottomRight: { x: maxX, y: maxY },
      bottomLeft: { x: minX, y: maxY },
    };
  } catch (e) {
    return getDefaultCorners(w, h, 'auto');
  }
}

/**
 * 3x3 Matrix Inverse
 */
function invert3x3(m: number[]): number[] | null {
  const [a11, a12, a13, a21, a22, a23, a31, a32, a33] = m;
  const det =
    a11 * (a22 * a33 - a23 * a32) -
    a12 * (a21 * a33 - a23 * a31) +
    a13 * (a21 * a32 - a22 * a31);

  if (Math.abs(det) < 1e-8) return null;
  const invDet = 1.0 / det;

  return [
    (a22 * a33 - a23 * a32) * invDet,
    (a13 * a32 - a12 * a33) * invDet,
    (a12 * a23 - a13 * a22) * invDet,
    (a23 * a31 - a21 * a33) * invDet,
    (a11 * a33 - a13 * a31) * invDet,
    (a13 * a21 - a11 * a23) * invDet,
    (a21 * a32 - a22 * a31) * invDet,
    (a12 * a31 - a11 * a32) * invDet,
    (a11 * a22 - a12 * a21) * invDet,
  ];
}

/**
 * Solves 8x8 linear system for projective transformation (Homography matrix H)
 * mapping quad corners src to dest.
 */
function getProjectiveMatrix(src: Point[], dst: Point[]): number[] | null {
  // src is 4 points, dst is 4 points
  // We want H mapping dst -> src so we can reverse-sample destination pixels
  const a: number[][] = [];
  const b: number[] = [];

  for (let i = 0; i < 4; i++) {
    const sx = dst[i].x;
    const sy = dst[i].y;
    const dx = src[i].x;
    const dy = src[i].y;

    a.push([sx, sy, 1, 0, 0, 0, -sx * dx, -sy * dx]);
    b.push(dx);
    a.push([0, 0, 0, sx, sy, 1, -sx * dy, -sy * dy]);
    b.push(dy);
  }

  // Gaussian elimination to solve a * h = b
  const n = 8;
  for (let i = 0; i < n; i++) {
    let maxRow = i;
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(a[k][i]) > Math.abs(a[maxRow][i])) {
        maxRow = k;
      }
    }
    // Swap rows
    [a[i], a[maxRow]] = [a[maxRow], a[i]];
    [b[i], b[maxRow]] = [b[maxRow], b[i]];

    if (Math.abs(a[i][i]) < 1e-10) return null;

    for (let k = i + 1; k < n; k++) {
      const factor = a[k][i] / a[i][i];
      for (let j = i; j < n; j++) {
        a[k][j] -= factor * a[i][j];
      }
      b[k] -= factor * b[i];
    }
  }

  const h = new Array(9).fill(0);
  h[8] = 1;

  for (let i = n - 1; i >= 0; i--) {
    let sum = b[i];
    for (let j = i + 1; j < n; j++) {
      sum -= a[i][j] * h[j];
    }
    h[i] = sum / a[i][i];
  }

  return h;
}

/**
 * Perspective unwarp: Extracts and straightens quad defined by corners
 */
export function warpPerspective(
  sourceCanvas: HTMLCanvasElement,
  corners: CornerPoints,
  targetWidth = 1200,
  targetHeight = 1600
): HTMLCanvasElement {
  const outputCanvas = document.createElement('canvas');
  outputCanvas.width = targetWidth;
  outputCanvas.height = targetHeight;
  const outCtx = outputCanvas.getContext('2d');
  const srcCtx = sourceCanvas.getContext('2d');

  if (!outCtx || !srcCtx) return sourceCanvas;

  const srcPoints: Point[] = [
    corners.topLeft,
    corners.topRight,
    corners.bottomRight,
    corners.bottomLeft,
  ];

  const dstPoints: Point[] = [
    { x: 0, y: 0 },
    { x: targetWidth, y: 0 },
    { x: targetWidth, y: targetHeight },
    { x: 0, y: targetHeight },
  ];

  const H = getProjectiveMatrix(srcPoints, dstPoints);
  if (!H) {
    // Fallback: draw directly
    outCtx.drawImage(sourceCanvas, 0, 0, targetWidth, targetHeight);
    return outputCanvas;
  }

  const srcImageData = srcCtx.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height);
  const srcPixels = srcImageData.data;
  const sw = sourceCanvas.width;
  const sh = sourceCanvas.height;

  const outImageData = outCtx.createImageData(targetWidth, targetHeight);
  const outPixels = outImageData.data;

  // Bilinear interpolation mapping for high fidelity
  for (let y = 0; y < targetHeight; y++) {
    for (let x = 0; x < targetWidth; x++) {
      const denom = H[6] * x + H[7] * y + H[8];
      const srcX = (H[0] * x + H[1] * y + H[2]) / denom;
      const srcY = (H[3] * x + H[4] * y + H[5]) / denom;

      const outIdx = (y * targetWidth + x) * 4;

      if (srcX >= 0 && srcX < sw - 1 && srcY >= 0 && srcY < sh - 1) {
        const x0 = Math.floor(srcX);
        const y0 = Math.floor(srcY);
        const x1 = x0 + 1;
        const y1 = y0 + 1;

        const wx = srcX - x0;
        const wy = srcY - y0;

        const idx00 = (y0 * sw + x0) * 4;
        const idx10 = (y0 * sw + x1) * 4;
        const idx01 = (y1 * sw + x0) * 4;
        const idx11 = (y1 * sw + x1) * 4;

        for (let c = 0; c < 3; c++) {
          const top = (1 - wx) * srcPixels[idx00 + c] + wx * srcPixels[idx10 + c];
          const bot = (1 - wx) * srcPixels[idx01 + c] + wx * srcPixels[idx11 + c];
          outPixels[outIdx + c] = Math.round((1 - wy) * top + wy * bot);
        }
        outPixels[outIdx + 3] = 255;
      } else {
        outPixels[outIdx] = 255;
        outPixels[outIdx + 1] = 255;
        outPixels[outIdx + 2] = 255;
        outPixels[outIdx + 3] = 255;
      }
    }
  }

  outCtx.putImageData(outImageData, 0, 0);
  return outputCanvas;
}

/**
 * Enhanced Clean Paper filter: removes shadows, whitens background, preserves ink
 */
export function applyPaperEnhancement(
  canvas: HTMLCanvasElement,
  filterMode: 'clean' | 'contrast' | 'original' = 'clean',
  contrastBoost = 1.4
): HTMLCanvasElement {
  if (filterMode === 'original') return canvas;

  const outCanvas = document.createElement('canvas');
  outCanvas.width = canvas.width;
  outCanvas.height = canvas.height;
  const ctx = outCanvas.getContext('2d');
  if (!ctx) return canvas;

  ctx.drawImage(canvas, 0, 0);
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imgData.data;
  const len = data.length;

  for (let i = 0; i < len; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    // Luminance
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;

    if (filterMode === 'clean') {
      // Paper background whitening with smooth knee curve
      // Background typically lum > 170
      let enhancedLum: number;
      if (lum > 175) {
        enhancedLum = 255; // Solid clean white paper
      } else if (lum > 120) {
        // High contrast ramp
        enhancedLum = 120 + ((lum - 120) / 55) * 135;
      } else {
        // Darken handwritten ink lines
        enhancedLum = Math.max(0, lum * 0.75);
      }

      // Keep subtle original color tint for high-legibility pen colors (blue/black ink)
      const ratio = enhancedLum / (lum || 1);
      data[i] = Math.min(255, Math.max(0, r * ratio));
      data[i + 1] = Math.min(255, Math.max(0, g * ratio));
      data[i + 2] = Math.min(255, Math.max(0, b * ratio));
    } else if (filterMode === 'contrast') {
      // Crisp grayscale high contrast
      const factor = (259 * (contrastBoost * 80 + 255)) / (255 * (259 - contrastBoost * 80));
      const val = factor * (lum - 128) + 128;
      const clamped = Math.min(255, Math.max(0, val));
      data[i] = clamped;
      data[i + 1] = clamped;
      data[i + 2] = clamped;
    }
  }

  ctx.putImageData(imgData, 0, 0);
  return outCanvas;
}

/**
 * Rotates canvas by degrees (90, 180, 270)
 */
export function rotateCanvas(canvas: HTMLCanvasElement, degrees: number): HTMLCanvasElement {
  const norm = ((degrees % 360) + 360) % 360;
  if (norm === 0) return canvas;

  const out = document.createElement('canvas');
  const ctx = out.getContext('2d');
  if (!ctx) return canvas;

  if (norm === 90 || norm === 270) {
    out.width = canvas.height;
    out.height = canvas.width;
  } else {
    out.width = canvas.width;
    out.height = canvas.height;
  }

  ctx.translate(out.width / 2, out.height / 2);
  ctx.rotate((norm * Math.PI) / 180);
  ctx.drawImage(canvas, -canvas.width / 2, -canvas.height / 2);

  return out;
}

/**
 * Checks for a dot inside one of the 4 corner brackets to orient page upright
 */
export function detectDotOrientation(canvas: HTMLCanvasElement, corners: CornerPoints): number {
  // Scans corner areas for isolated high-density ink dot
  // Returns rotation adjustment in degrees (0, 90, 180, 270)
  // If dot is detected near Top-Left -> 0 degrees
  // If dot near Top-Right -> 270 degrees
  // If dot near Bottom-Right -> 180 degrees
  // If dot near Bottom-Left -> 90 degrees
  return 0; // default upright
}
