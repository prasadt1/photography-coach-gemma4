/**
 * analysisOrchestrator.ts — v2 analysis pipeline coordinator
 * Orchestrates: CV → Ollama → validation → audit log
 *
 * This replaces the direct geminiService.analyzeImage() call in App.tsx.
 * Day 1 skeleton: basic data flow wired up (CV → Ollama → console.log).
 * Day 2: full UI integration with AnalysisResults v2 component.
 */

import { analyzePhoto, analyzePhotoCull, checkOllamaHealth, warmUpModel, warmUpModelViaApi, analyzePhotoWithFallback, detectInferenceSource } from './ollamaService';
import { ARTISAN_V3_OUTPUT_SCHEMA } from '../lib/artisanV3Schema';
import type { InferenceSource } from '../config';
import { analyzeImageCV } from './cvService';
import { logAnalysis } from './auditService';
import { getOperationalMode } from './auditService';
import { analyzePhotoBrowser, isWebGPUAvailable } from './browserLLM';
import { SupportedLanguage } from './promptService';
import { PhotoAnalysisV2, CVData } from '../types.v2';

export type AnalysisTier = 'tier1-ollama' | 'tier2-browser';

// Resize a base64 image to max `maxPx` on the long edge before sending to Ollama.
// Gemma doesn't benefit from 12MP inputs — 1024px is sufficient for composition
// and lighting analysis, and cuts token prefill time dramatically.
function resizeForModel(base64: string, maxPx = 1024): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
      if (scale === 1) { resolve(base64); return; }
      const canvas = document.createElement('canvas');
      canvas.width  = Math.round(img.width  * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = () => resolve(base64); // fall back to original on error
    img.src = base64;
  });
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AnalysisProgress {
  stage: 'cv' | 'inference' | 'validation' | 'done' | 'error';
  message: string;
  pct: number;   // 0-100
}

export type ProgressCallback = (p: AnalysisProgress) => void;

// ─── Health check ─────────────────────────────────────────────────────────────

export { checkOllamaHealth, warmUpModel, warmUpModelViaApi };

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
  signal?: AbortSignal,
  tier: AnalysisTier = 'tier1-ollama',
  language: SupportedLanguage = 'en',
  deepMode = false,
  fastMode = false,
  /** When true with fastMode + Ollama: skip CV, 512px image, cull schema inference */
  batchCull = false,
  /** True only for pass-1 bulk runs; tightens runtime budgets to keep cancellation responsive. */
  batchPass1 = false,
): Promise<PhotoAnalysisV2> {
  const report = (stage: AnalysisProgress['stage'], message: string, pct: number) => {
    onProgress?.({ stage, message, pct });
  };

  const useCullPath = batchCull && fastMode && tier === 'tier1-ollama';
  const runtimeProfile = batchPass1 ? 'batch-pass1' : 'single';

  // Stage 1: Deterministic CV (skipped for demo cull batch — saves CPU and time)
  let cvData: CVData | undefined;
  if (useCullPath) {
    report('cv', 'Demo cull: skipping CV for speed…', 30);
  } else if (imageElement && file) {
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

  // Stage 2: model inference — tier-dependent
  let analysis: PhotoAnalysisV2;

  if (tier === 'tier2-browser') {
    // Tier 2: text-only Gemma 2B in-browser. CV data is the only ground truth.
    report('inference', 'Browser AI (Gemma 2B) is analyzing measurements…', 35);
    if (!isWebGPUAvailable()) {
      throw new Error('Browser AI requires WebGPU. Try Chrome/Edge desktop or use Tier 1 with Ollama.');
    }
    let charCount = 0;
    analysis = await analyzePhotoBrowser(
      base64Image,
      mimeType,
      cvData,
      file?.name,
      (partial) => {
        charCount = partial.length;
        const pct = 35 + Math.min(50, Math.round((charCount / 1500) * 50));
        report('inference', `Gemma 2B thinking… (${charCount} chars)`, pct);
      },
      signal,
    );
    report('inference', 'Gemma 2B inference complete', 85);
  } else {
    // Tier 1: Gemma 4 E4B via Ollama (with full vision input)
    report('inference', 'Preparing image for Gemma 4 E4B…', 33);
    const targetResolution = useCullPath ? 512 : fastMode ? 768 : 1024;
    const modelBase64 = await resizeForModel(base64Image, targetResolution);
    report('inference', useCullPath
      ? '⚡ Gemma 4 E4B cull pass… (target ~45–90s warm; cold start can be slower)'
      : fastMode
        ? '⚡ Gemma 4 E4B fast analysis… (target ~60–90s warm; cold start can be slower)'
        : deepMode
          ? 'Gemma 4 E4B is doing a deep critique… (60-90s, richer rationale)'
          : 'Gemma 4 E4B is analyzing your photo…', 35);
    let tokenCount = 0;
    const tokenCap = useCullPath ? 450 : deepMode ? 1000 : 600;

    if (useCullPath) {
      analysis = await analyzePhotoCull(
        modelBase64,
        mimeType,
        (_token) => {
          tokenCount++;
          const pct = 35 + Math.min(50, Math.round((tokenCount / tokenCap) * 50));
          report('inference', `⚡ Cull pass… (${tokenCount} tokens)`, pct);
        },
        signal,
        language,
        runtimeProfile,
      );
    } else {
      analysis = await analyzePhoto(
        modelBase64,
        mimeType,
        cvData,
        (_token) => {
          tokenCount++;
          const pct = 35 + Math.min(50, Math.round((tokenCount / tokenCap) * 50));
          report('inference', fastMode
            ? `⚡ Fast analysis… (${tokenCount} tokens)`
            : deepMode
              ? `Gemma 4 E4B deep-thinking… (${tokenCount} tokens)`
              : `Gemma 4 E4B thinking… (${tokenCount} tokens)`, pct);
        },
        2,
        signal,
        language,
        deepMode,
        fastMode,
        runtimeProfile,
      );
    }
    report('inference', 'Gemma 4 E4B inference complete', 85);
  }

  // Stage 3: Audit log (Vault Mode only)
  if (getOperationalMode() === 'vault') {
    report('validation', 'Writing to audit log…', 90);
    try {
      const imageBytes = base64ToArrayBuffer(
        base64Image.includes('base64,') ? base64Image.split('base64,')[1] : base64Image,
      );
      await logAnalysis(imageBytes, analysis, file?.name);
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

// ─── Mode-specific analysis (Voice, Quest, Sell) ─────────────────────────────

import {
  VOICE_COACH_SYSTEM_PROMPT,
  VOICE_COACH_USER_PROMPT,
  SELL_COACH_SYSTEM_PROMPT,
  SELL_COACH_USER_PROMPT,
  ARTISAN_ACCESSIBILITY_SYSTEM_PROMPT,
  ARTISAN_ACCESSIBILITY_USER_PROMPT,
  buildQuestSystemPrompt,
  buildQuestUserPrompt,
  QuestChallenge,
} from './promptService';
import { analyzePhotoRaw } from './ollamaService';

/**
 * Analyze photo for Voice Mode (audio-first, clock-face directions)
 * Returns plain text response, not JSON
 */
export async function analyzeForVoiceMode(
  base64Image: string,
  mimeType: string,
): Promise<string> {
  // Resize for faster inference
  const resized = await resizeForModel(base64Image, 768);

  const response = await analyzePhotoRaw(
    resized,
    mimeType,
    VOICE_COACH_SYSTEM_PROMPT,
    VOICE_COACH_USER_PROMPT,
  );

  return response;
}

/**
 * Analyze photo for Quest Mode (daily challenges with PASS/FAIL)
 * Returns plain text with [REASONING], [VERDICT], [TIP] blocks
 */
export async function analyzeForQuestMode(
  base64Image: string,
  mimeType: string,
  challenge: QuestChallenge,
): Promise<string> {
  // Resize for faster inference
  const resized = await resizeForModel(base64Image, 768);

  const systemPrompt = buildQuestSystemPrompt(challenge);
  const userPrompt = buildQuestUserPrompt(challenge);

  const response = await analyzePhotoRaw(
    resized,
    mimeType,
    systemPrompt,
    userPrompt,
  );

  return response;
}

/**
 * Analyze photo for Sell Mode (product photo coaching)
 * Returns plain text with listing score and recommendations
 *
 * @param accessibilityMode - When true, uses low-vision-friendly prompts that:
 *   - Describe what's visible FIRST, then provide guidance
 *   - Avoid photography jargon (bokeh, rule of thirds, etc.)
 *   - Use spatial language (inches, left/right) not percentages
 *   - Confirm color accuracy with everyday comparisons
 *   - Always offer a clear next action
 */
export async function analyzeForSellMode(
  base64Image: string,
  mimeType: string,
  accessibilityMode: boolean = false,
): Promise<string> {
  // Resize for faster inference
  const resized = await resizeForModel(base64Image, 768);

  const systemPrompt = accessibilityMode
    ? ARTISAN_ACCESSIBILITY_SYSTEM_PROMPT
    : SELL_COACH_SYSTEM_PROMPT;

  const userPrompt = accessibilityMode
    ? ARTISAN_ACCESSIBILITY_USER_PROMPT
    : SELL_COACH_USER_PROMPT;

  const response = await analyzePhotoRaw(
    resized,
    mimeType,
    systemPrompt,
    userPrompt,
    undefined,
    accessibilityMode ? ARTISAN_V3_OUTPUT_SCHEMA : undefined,
  );

  return response;
}

/**
 * Analyze photo for Sell Mode with automatic fallback chain.
 * Priority: (1) Local Ollama → (2) Ollama Cloud → (3) Demo Mode
 *
 * Returns both the analysis content and the inference source used.
 * When source is 'demo', content will be empty — caller handles demo responses.
 */
export async function analyzeForSellModeWithFallback(
  base64Image: string,
  mimeType: string,
  accessibilityMode: boolean = false,
): Promise<{ content: string; source: InferenceSource; cloudError?: string }> {
  // Resize for faster inference
  const resized = await resizeForModel(base64Image, 768);

  const systemPrompt = accessibilityMode
    ? ARTISAN_ACCESSIBILITY_SYSTEM_PROMPT
    : SELL_COACH_SYSTEM_PROMPT;

  const userPrompt = accessibilityMode
    ? ARTISAN_ACCESSIBILITY_USER_PROMPT
    : SELL_COACH_USER_PROMPT;

  return analyzePhotoWithFallback(
    resized,
    mimeType,
    systemPrompt,
    userPrompt,
    undefined,
    { artisanSchema: accessibilityMode },
  );
}

// Export inference source detection for UI components
export { detectInferenceSource };
export type { InferenceSource };
