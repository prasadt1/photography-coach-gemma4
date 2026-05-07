/**
 * analysisOrchestrator.ts — v2 analysis pipeline coordinator
 * Orchestrates: CV → Ollama → validation → audit log
 *
 * This replaces the direct geminiService.analyzeImage() call in App.tsx.
 * Day 1 skeleton: basic data flow wired up (CV → Ollama → console.log).
 * Day 2: full UI integration with AnalysisResults v2 component.
 */

import { analyzePhoto, checkOllamaHealth, warmUpModel } from './ollamaService';
import { analyzeImageCV } from './cvService';
import { logAnalysis } from './auditService';
import { getOperationalMode } from './auditService';
import { PhotoAnalysisV2, CVData } from '../types.v2';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AnalysisProgress {
  stage: 'cv' | 'inference' | 'validation' | 'done' | 'error';
  message: string;
  pct: number;   // 0-100
}

export type ProgressCallback = (p: AnalysisProgress) => void;

// ─── Health check ─────────────────────────────────────────────────────────────

export { checkOllamaHealth, warmUpModel };

// ─── Main orchestration ───────────────────────────────────────────────────────

/**
 * Run the complete v2 analysis pipeline.
 *
 * @param base64Image  - base64-encoded image (with or without data: prefix)
 * @param mimeType     - MIME type, e.g. "image/jpeg"
 * @param imageElement - Optional HTMLImageElement for client-side CV
 * @param file         - Optional File object for EXIF extraction
 * @param onProgress   - Optional progress callback for UI
 */
export async function runAnalysisPipeline(
  base64Image: string,
  mimeType: string,
  imageElement?: HTMLImageElement,
  file?: File,
  onProgress?: ProgressCallback,
): Promise<PhotoAnalysisV2> {
  const report = (stage: AnalysisProgress['stage'], message: string, pct: number) => {
    onProgress?.({ stage, message, pct });
  };

  // Stage 1: Deterministic CV (optional but strongly preferred)
  let cvData: CVData | undefined;
  if (imageElement && file) {
    report('cv', 'Extracting EXIF and computing histogram…', 10);
    try {
      cvData = await analyzeImageCV(imageElement, file);
      report('cv', 'CV analysis complete', 30);
    } catch (err) {
      console.warn('[orchestrator] CV analysis failed, proceeding without grounding:', err);
      report('cv', 'CV skipped — proceeding without grounding data', 30);
    }
  } else {
    report('cv', 'No image element provided — skipping CV grounding', 30);
  }

  // Stage 2: Gemma 4 inference (streaming — progress advances with tokens)
  report('inference', 'Gemma 4 is analyzing your photo…', 35);
  let tokenCount = 0;
  const analysis = await analyzePhoto(
    base64Image,
    mimeType,
    cvData,
    (_token) => {
      tokenCount++;
      // Advance progress 35→85 as tokens stream in (cap estimate at 600 tokens)
      const pct = 35 + Math.min(50, Math.round((tokenCount / 600) * 50));
      report('inference', `Gemma 4 thinking… (${tokenCount} tokens)`, pct);
    },
  );
  report('inference', 'Gemma 4 inference complete', 85);

  // Stage 3: Audit log (Vault Mode only)
  if (getOperationalMode() === 'vault') {
    report('validation', 'Writing to audit log…', 90);
    try {
      const imageBytes = base64ToArrayBuffer(
        base64Image.includes('base64,') ? base64Image.split('base64,')[1] : base64Image,
      );
      await logAnalysis(imageBytes, analysis);
    } catch (err) {
      console.error('[orchestrator] Audit log write failed:', err);
      // Don't throw — audit failure should not block the user from seeing results
    }
  }

  report('done', 'Analysis complete', 100);

  // Development smoke-test: log result to console
  if ((import.meta as any).env?.DEV) {
    console.group('[Photography Coach v2] Analysis result');
    console.log('Model:', analysis.model_id, analysis.quantization ?? '');
    console.log('Scores:', analysis.scores);
    console.log('Strengths:', analysis.strengths.length, 'items');
    console.log('Improvements:', analysis.improvements.length, 'items');
    console.log('BoundingBoxes:', analysis.boundingBoxes?.length ?? 0);
    console.log('TokenUsage:', analysis.tokenUsage);
    console.log('Full:', analysis);
    console.groupEnd();
  }

  return analysis;
}

// ─── Batch job runner ─────────────────────────────────────────────────────────

/**
 * Run analysis on a File object (for batch queue).
 * Returns the result or throws with an informative message.
 */
export async function runBatchJob(file: File): Promise<PhotoAnalysisV2> {
  const base64 = await fileToBase64(file);
  const img = await loadImageElement(base64);
  return runAnalysisPipeline(base64, file.type, img, file);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function loadImageElement(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataUrl;
  });
}
