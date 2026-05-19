/**
 * cvService.ts — Deterministic computer vision pipeline
 * Provides factual grounding data before Gemma inference.
 * Pipeline order:
 *   1. EXIF extraction  (exifr — browser-compatible)
 *   2. Histogram analysis (canvas pixel data)
 *   3. Focus/sharpness   (Laplacian variance via canvas)
 *   4. Color stats        (dominant colors, saturation, temperature)
 *
 * All operations run client-side (no server needed).
 */

import exifr from 'exifr';
import { CVData, HistogramData, FocusMapData, ColorStats } from '../types.v2';

// ─── Main entry point ──────────────────────────────────────────────────────────

/**
 * Run the full deterministic CV pipeline on an image.
 * @param imageElement - HTMLImageElement with src already set
 * @param file         - Original File object (for EXIF extraction)
 */
export async function analyzeImageCV(
  imageElement: HTMLImageElement,
  file: File,
): Promise<CVData> {
  const [exif, pixelData] = await Promise.all([
    extractExif(file),
    getPixelData(imageElement),
  ]);

  const [histogram, focusMap, colorStats] = await Promise.all([
    computeHistogram(pixelData, imageElement.naturalWidth, imageElement.naturalHeight),
    computeFocusMap(pixelData, imageElement.naturalWidth, imageElement.naturalHeight),
    computeColorStats(pixelData, imageElement.naturalWidth, imageElement.naturalHeight),
  ]);

  const { highlightClipping, shadowClipping } = computeClipping(pixelData);

  return {
    exif,
    histogram,
    focusMap,
    colorStats,
    highlightClipping,
    shadowClipping,
  };
}

// ─── EXIF extraction ──────────────────────────────────────────────────────────

async function extractExif(file: File): Promise<Record<string, string | number | null>> {
  try {
    const raw = await exifr.parse(file, {
      pick: [
        'Make', 'Model', 'FocalLength', 'FNumber', 'ExposureTime',
        'ISO', 'Flash', 'WhiteBalance', 'ExposureMode', 'MeteringMode',
        'LensModel', 'DateTimeOriginal', 'GPSLatitude', 'GPSLongitude',
      ],
    });
    if (!raw) return {};

    const result: Record<string, string | number | null> = {};
    for (const [k, v] of Object.entries(raw)) {
      if (v != null) {
        result[k] = typeof v === 'object' ? JSON.stringify(v) : (v as string | number);
      }
    }
    return result;
  } catch {
    return {};
  }
}

// ─── Pixel data extraction ────────────────────────────────────────────────────

function getPixelData(img: HTMLImageElement): Promise<Uint8ClampedArray> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    // Downsample to max 512px wide for performance
    const scale = Math.min(1, 512 / img.naturalWidth);
    canvas.width = Math.floor(img.naturalWidth * scale);
    canvas.height = Math.floor(img.naturalHeight * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) return reject(new Error('Canvas 2D context not available'));
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    resolve(imageData.data);
  });
}

// ─── Histogram ────────────────────────────────────────────────────────────────

/** @internal Exported for unit testing */
export function computeHistogram(
  pixels: Uint8ClampedArray,
  _w: number,
  _h: number,
): HistogramData {
  const red = new Array(256).fill(0);
  const green = new Array(256).fill(0);
  const blue = new Array(256).fill(0);
  const luminance = new Array(256).fill(0);

  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];
    red[r]++;
    green[g]++;
    blue[b]++;
    const lum = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
    luminance[lum]++;
  }

  return { red, green, blue, luminance };
}

// ─── Highlight and shadow clipping ───────────────────────────────────────────

/** @internal Exported for unit testing */
export function computeClipping(pixels: Uint8ClampedArray): {
  highlightClipping: number;
  shadowClipping: number;
} {
  const HIGHLIGHT_THRESHOLD = 250;
  const SHADOW_THRESHOLD = 5;
  let highlights = 0;
  let shadows = 0;
  const total = pixels.length / 4;

  for (let i = 0; i < pixels.length; i += 4) {
    const lum = 0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2];
    if (lum >= HIGHLIGHT_THRESHOLD) highlights++;
    if (lum <= SHADOW_THRESHOLD) shadows++;
  }

  return {
    highlightClipping: (highlights / total) * 100,
    shadowClipping: (shadows / total) * 100,
  };
}

// ─── Focus map (Laplacian variance) ──────────────────────────────────────────

/** @internal Exported for unit testing */
export function computeFocusMap(
  pixels: Uint8ClampedArray,
  w: number,
  h: number,
): FocusMapData {
  const GRID_SIZE = 10;
  const grid: number[][] = [];

  const cellW = Math.floor(w / GRID_SIZE);
  const cellH = Math.floor(h / GRID_SIZE);

  // Simple Laplacian variance per grid cell
  let maxVariance = 0;

  for (let gy = 0; gy < GRID_SIZE; gy++) {
    const row: number[] = [];
    for (let gx = 0; gx < GRID_SIZE; gx++) {
      const startX = gx * cellW;
      const startY = gy * cellH;
      let variance = 0;
      let count = 0;

      for (let py = startY + 1; py < startY + cellH - 1; py += 2) {
        for (let px = startX + 1; px < startX + cellW - 1; px += 2) {
          const idx = (py * w + px) * 4;
          // Grayscale Laplacian kernel
          const center = 0.299 * pixels[idx] + 0.587 * pixels[idx + 1] + 0.114 * pixels[idx + 2];
          const top = 0.299 * pixels[idx - w * 4] + 0.587 * pixels[idx - w * 4 + 1] + 0.114 * pixels[idx - w * 4 + 2];
          const bottom = 0.299 * pixels[idx + w * 4] + 0.587 * pixels[idx + w * 4 + 1] + 0.114 * pixels[idx + w * 4 + 2];
          const left = 0.299 * pixels[idx - 4] + 0.587 * pixels[idx - 3] + 0.114 * pixels[idx - 2];
          const right = 0.299 * pixels[idx + 4] + 0.587 * pixels[idx + 5] + 0.114 * pixels[idx + 6];
          const lap = Math.abs(4 * center - top - bottom - left - right);
          variance += lap;
          count++;
        }
      }

      const cellVariance = count > 0 ? variance / count : 0;
      row.push(cellVariance);
      maxVariance = Math.max(maxVariance, cellVariance);
    }
    grid.push(row);
  }

  // Normalise grid to 0-1
  const normalised = grid.map(row =>
    row.map(v => (maxVariance > 0 ? v / maxVariance : 0)),
  );

  // Overall sharpness = average of top-25% cells
  const allValues = normalised.flat().sort((a, b) => b - a);
  const topN = Math.max(1, Math.floor(allValues.length * 0.25));
  const sharpnessScore = allValues.slice(0, topN).reduce((a, b) => a + b, 0) / topN;

  // Find focus region (cell with highest variance)
  let maxI = 0, maxJ = 0, maxV = 0;
  for (let i = 0; i < GRID_SIZE; i++) {
    for (let j = 0; j < GRID_SIZE; j++) {
      if (normalised[i][j] > maxV) { maxV = normalised[i][j]; maxI = i; maxJ = j; }
    }
  }

  return {
    grid: normalised,
    sharpnessScore: Math.min(1, sharpnessScore),
    focusRegion: {
      x: (maxJ / GRID_SIZE) * 100,
      y: (maxI / GRID_SIZE) * 100,
      width: (1 / GRID_SIZE) * 100,
      height: (1 / GRID_SIZE) * 100,
    },
  };
}

// ─── Color stats ──────────────────────────────────────────────────────────────

/** @internal Exported for unit testing */
export function computeColorStats(
  pixels: Uint8ClampedArray,
  _w: number,
  _h: number,
): ColorStats {
  let totalSaturation = 0;
  let warmPixels = 0;
  let coolPixels = 0;
  let totalPixels = 0;

  // Sample every 8th pixel for performance
  for (let i = 0; i < pixels.length; i += 32) {
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];

    // Saturation (via HSL)
    const max = Math.max(r, g, b) / 255;
    const min = Math.min(r, g, b) / 255;
    const l = (max + min) / 2;
    const s = max === min ? 0 : l > 0.5 ? (max - min) / (2 - max - min) : (max - min) / (max + min);
    totalSaturation += s;

    // Warm/cool (simple: warm if R+G > B, cool if B > R+G)
    if (r + g * 0.5 > b * 1.5) warmPixels++;
    else if (b > r * 0.8 && b > g * 0.8) coolPixels++;

    totalPixels++;
  }

  const avgSaturation = totalPixels > 0 ? totalSaturation / totalPixels : 0;
  const temperature: ColorStats['temperature'] =
    warmPixels > coolPixels * 1.5 ? 'warm'
    : coolPixels > warmPixels * 1.5 ? 'cool'
    : 'neutral';

  // Dominant colors: sample and bucket to 32-value palette
  const buckets = new Map<string, number>();
  for (let i = 0; i < pixels.length; i += 16) {
    // Clamp to 255 to avoid 256 → 3-char hex ('100' instead of 'ff')
    const r = Math.min(255, Math.round(pixels[i] / 32) * 32);
    const g = Math.min(255, Math.round(pixels[i + 1] / 32) * 32);
    const b = Math.min(255, Math.round(pixels[i + 2] / 32) * 32);
    const key = `${r},${g},${b}`;
    buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }
  const sorted = [...buckets.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  const dominant = sorted.map(([k]) => {
    const [r, g, b] = k.split(',').map(Number);
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  });

  return { dominant, saturation: avgSaturation, temperature };
}
