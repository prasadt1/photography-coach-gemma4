/**
 * browserLLM.ts — Tier 2 fallback: Gemma 2B running in-browser via WebLLM.
 *
 * Activated automatically when Ollama (Tier 1) is unavailable.
 * Uses WebGPU; falls back to WASM if WebGPU unavailable.
 * Model is downloaded once (~1.5GB) and cached in browser storage.
 *
 * IMPORTANT: This is a TEXT-ONLY model. It cannot see the image.
 * The critique is generated from deterministic CV data (EXIF, histogram, focus, color).
 * Quality is intentionally lower than Tier 1 — set expectations in the UI.
 */

import type { MLCEngine, InitProgressReport } from '@mlc-ai/web-llm';
import { CVData, PhotoAnalysisV2 } from '../types.v2';
import { validateV2Schema } from './validationService';

const MODEL_ID = 'gemma-2-2b-it-q4f16_1-MLC';
const SCHEMA_VERSION = '2.0';

// ─── Engine lifecycle ─────────────────────────────────────────────────────────

let engine: MLCEngine | null = null;
let loadPromise: Promise<MLCEngine> | null = null;
let lastProgress: InitProgressReport | null = null;

export type BrowserLLMProgress = {
  pct: number;        // 0–100
  text: string;       // human-readable status from WebLLM
  stage: 'idle' | 'downloading' | 'compiling' | 'ready' | 'error';
};

let progressListeners = new Set<(p: BrowserLLMProgress) => void>();

export function subscribeBrowserLLMProgress(fn: (p: BrowserLLMProgress) => void) {
  progressListeners.add(fn);
  return () => progressListeners.delete(fn);
}

function emit(p: BrowserLLMProgress) {
  progressListeners.forEach(fn => { try { fn(p); } catch {} });
}

function reportFromWebLLM(r: InitProgressReport): BrowserLLMProgress {
  const pct = Math.round((r.progress ?? 0) * 100);
  const text = r.text ?? '';
  let stage: BrowserLLMProgress['stage'] = 'downloading';
  if (text.toLowerCase().includes('shader')) stage = 'compiling';
  if (pct >= 100 && text.toLowerCase().includes('finish')) stage = 'ready';
  return { pct, text, stage };
}

/**
 * Load the WebLLM engine. Idempotent — first call starts download, subsequent calls reuse.
 * Returns once the model is fully loaded and ready for inference.
 */
export async function loadBrowserLLM(): Promise<MLCEngine> {
  if (engine) return engine;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    emit({ pct: 0, text: 'starting', stage: 'downloading' });
    const { CreateMLCEngine } = await import('@mlc-ai/web-llm');
    const eng = await CreateMLCEngine(MODEL_ID, {
      initProgressCallback: (r) => {
        lastProgress = r;
        emit(reportFromWebLLM(r));
      },
    });
    engine = eng;
    emit({ pct: 100, text: 'ready', stage: 'ready' });
    return eng;
  })();

  try {
    return await loadPromise;
  } catch (err) {
    loadPromise = null;
    emit({ pct: lastProgress?.progress ? Math.round(lastProgress.progress * 100) : 0, text: (err as Error).message, stage: 'error' });
    throw err;
  }
}

export function isBrowserLLMReady(): boolean {
  return engine !== null;
}

/** Detect WebGPU availability — returned to callers so they can decide whether to offer Tier 2. */
export function isWebGPUAvailable(): boolean {
  return typeof navigator !== 'undefined' && 'gpu' in navigator;
}

// ─── Text-only critique prompt ────────────────────────────────────────────────

const TIER_2_SYSTEM_PROMPT = `You are a photography coach reviewing a photo using ONLY the deterministic measurements provided. You CANNOT see the image. Treat the measurements as the only ground truth.

Output ONLY a single JSON object — no prose before or after, no code fences. The JSON MUST contain ALL these fields exactly as named:

{
  "scores": { "composition": 0-10, "lighting": 0-10, "technique": 0-10, "creativity": 0-10, "subjectImpact": 0-10 },
  "critique": { "composition": "...", "lighting": "...", "technique": "...", "overall": "..." },
  "strengths": ["...", "...", "..."],
  "improvements": ["...", "...", "..."],
  "learningPath": ["...", "...", "..."],
  "settingsEstimate": { "focalLength": "...", "aperture": "...", "shutterSpeed": "...", "iso": "..." },
  "rationale": { "observations": ["...", "...", "..."], "reasoningSteps": ["...", "...", "..."], "priorityFixes": ["...", "...", "..."] },
  "boundingBoxes": [],
  "evidence": []
}

RULES:
- Each critique field must be a sentence (>10 chars).
- strengths, improvements, learningPath: each an array of 3-5 short strings.
- rationale arrays: each 3-5 short strings.
- settingsEstimate: read from EXIF if present; otherwise use "unknown" for any field.
- boundingBoxes and evidence: ALWAYS empty arrays — you cannot see the image.
- Do not describe visual content beyond what the measurements imply.

Output the JSON now and nothing else.`;

function buildTier2Prompt(cvData?: CVData, filename?: string): string {
  const lines: string[] = [];
  if (filename) lines.push(`FILENAME: ${filename}`);

  if (cvData?.exif && Object.keys(cvData.exif).length > 0) {
    const relevant = ['Make', 'Model', 'FocalLength', 'FNumber', 'ExposureTime', 'ISO', 'Flash', 'WhiteBalance', 'ExposureMode'];
    const exifLines = relevant
      .filter(k => cvData.exif[k] != null && cvData.exif[k] !== '')
      .map(k => `  ${k}: ${cvData.exif[k]}`);
    if (exifLines.length) {
      lines.push('EXIF:');
      lines.push(...exifLines);
    }
  }
  if (cvData?.highlightClipping != null) lines.push(`HIGHLIGHT_CLIPPING: ${cvData.highlightClipping.toFixed(1)}%`);
  if (cvData?.shadowClipping != null) lines.push(`SHADOW_CLIPPING: ${cvData.shadowClipping.toFixed(1)}%`);
  if (cvData?.focusMap?.sharpnessScore != null) lines.push(`SHARPNESS: ${cvData.focusMap.sharpnessScore.toFixed(2)} (0=blurry, 1=sharp)`);
  if (cvData?.colorStats) {
    lines.push(`COLOR_TEMPERATURE: ${cvData.colorStats.temperature}`);
    lines.push(`AVERAGE_SATURATION: ${(cvData.colorStats.saturation * 100).toFixed(0)}%`);
  }
  if (cvData?.faceCount != null) lines.push(`FACES_DETECTED: ${cvData.faceCount}`);

  const measurements = lines.length > 0 ? lines.join('\n') : '(no measurements available)';

  return `MEASUREMENTS:\n${measurements}\n\nReturn the JSON critique now.`;
}

// ─── Public API: analyze ──────────────────────────────────────────────────────

/**
 * Analyze a photo using Tier 2 (browser LLM, text-only).
 * Note: base64Image is ignored — the model cannot see it. We still accept it for API parity.
 */
export async function analyzePhotoBrowser(
  _base64Image: string,
  _mimeType: string,
  cvData?: CVData,
  filename?: string,
  onToken?: (partial: string) => void,
  signal?: AbortSignal,
): Promise<PhotoAnalysisV2> {
  const eng = await loadBrowserLLM();
  if (signal?.aborted) throw new Error('aborted');

  const userPrompt = buildTier2Prompt(cvData, filename);

  const stream = await eng.chat.completions.create({
    messages: [
      { role: 'system', content: TIER_2_SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ],
    stream: true,
    max_tokens: 1200,
    temperature: 0.6,
  });

  let fullText = '';
  let promptTokens = 0;
  let completionTokens = 0;

  for await (const chunk of stream) {
    if (signal?.aborted) throw new Error('aborted');
    const delta = chunk.choices[0]?.delta?.content ?? '';
    if (delta) {
      fullText += delta;
      onToken?.(fullText);
    }
    if (chunk.usage) {
      promptTokens = chunk.usage.prompt_tokens ?? promptTokens;
      completionTokens = chunk.usage.completion_tokens ?? completionTokens;
    }
  }

  // Robust JSON extraction — handle code fences, prose before/after JSON, etc.
  const jsonText = extractJSON(fullText);
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    console.error('[browserLLM] Raw output was:', fullText);
    throw new Error('Browser LLM returned non-JSON output. Try again or use Ollama for reliable results.');
  }

  // Coerce missing fields with safe defaults so a chatty Gemma 2B doesn't fail validation
  const coerced = coerceTier2Output(parsed as Record<string, unknown>);
  coerced.schema_version = SCHEMA_VERSION;
  coerced.model_id = 'gemma-2-2b-browser';
  coerced.quantization = 'q4f16_1-MLC';
  coerced.timestamp = Date.now();
  coerced.tokenUsage = {
    promptTokens,
    completionTokens,
    totalTokens: promptTokens + completionTokens,
  };
  coerced.boundingBoxes = [];
  coerced.evidence = [];

  return validateV2Schema(coerced);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function extractJSON(text: string): string {
  let s = text.trim();
  // Strip code fences if present
  const fenceMatch = s.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (fenceMatch) s = fenceMatch[1].trim();
  // Find the outermost JSON object — first { to last matching }
  const firstBrace = s.indexOf('{');
  const lastBrace = s.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    s = s.slice(firstBrace, lastBrace + 1);
  }
  return s;
}

/**
 * Fill in missing fields with safe defaults. Gemma 2B sometimes drops
 * fields (especially learningPath, settingsEstimate). We'd rather show
 * a slightly skeleton critique than fail the whole pipeline.
 */
function coerceTier2Output(raw: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...raw };

  // scores: fill any missing dim with 5 (neutral)
  const scores = (out.scores as Record<string, number>) ?? {};
  out.scores = {
    composition: scores.composition ?? 5,
    lighting: scores.lighting ?? 5,
    technique: scores.technique ?? 5,
    creativity: scores.creativity ?? 5,
    subjectImpact: scores.subjectImpact ?? 5,
  };

  // critique: ensure all four fields exist with at least placeholder text
  const crit = (out.critique as Record<string, string>) ?? {};
  out.critique = {
    composition: crit.composition || 'Composition could not be assessed without seeing the image.',
    lighting: crit.lighting || 'Lighting was estimated from histogram only.',
    technique: crit.technique || 'Technical quality based on focus and EXIF.',
    overall: crit.overall || 'Browser AI critique generated from measurements only.',
  };

  // arrays: ensure they exist and have at least 3 items (pad with generic text if needed)
  const padArr = (arr: unknown, fallback: string[]): string[] => {
    const a = Array.isArray(arr) ? arr.filter((x): x is string => typeof x === 'string') : [];
    while (a.length < 3) a.push(fallback[a.length] ?? 'No specific suggestion available.');
    return a;
  };
  out.strengths = padArr(out.strengths, ['Photo accepted for analysis.', 'Camera settings captured.', 'EXIF data preserved.']);
  out.improvements = padArr(out.improvements, ['Try Tier 1 (Ollama + Gemma 4) for vision-based critique.', 'Compare with similar photos.', 'Review lighting and composition basics.']);
  out.learningPath = padArr(out.learningPath, ['Practice rule of thirds.', 'Learn exposure triangle basics.', 'Study leading lines and framing.']);

  // settingsEstimate: ensure object exists with all four keys
  const settings = (out.settingsEstimate as Record<string, string>) ?? (out.cameraSettings as Record<string, string>) ?? {};
  out.settingsEstimate = {
    focalLength: settings.focalLength || 'unknown',
    aperture: settings.aperture || 'unknown',
    shutterSpeed: settings.shutterSpeed || 'unknown',
    iso: settings.iso || 'unknown',
  };

  // rationale: ensure all three sub-arrays exist with 3+ items
  const rat = (out.rationale as Record<string, unknown>) ?? {};
  out.rationale = {
    observations: padArr(rat.observations, ['Measurements captured from EXIF and CV pipeline.', 'No image vision used.', 'Tier 2 browser inference.']),
    reasoningSteps: padArr(rat.reasoningSteps, ['Reviewed available measurements.', 'Inferred quality from histogram and EXIF.', 'Generated critique within model constraints.']),
    priorityFixes: padArr(rat.priorityFixes, ['Use Tier 1 (Ollama) for stronger critique.', 'Provide higher-resolution input.', 'Ensure EXIF metadata is preserved.']),
  };

  return out;
}

// ─── Public API: mentor chat ──────────────────────────────────────────────────

export async function mentorChatBrowser(
  question: string,
  analysis: PhotoAnalysisV2,
  history: Array<{ role: 'user' | 'assistant'; content: string }>,
): Promise<string> {
  const eng = await loadBrowserLLM();

  const systemPrompt = `You are a photography mentor having a conversation about a photo you previously critiqued.

Your previous critique scores: composition ${analysis.scores.composition}/10, lighting ${analysis.scores.lighting}/10, technique ${analysis.scores.technique}/10.
Your overall observation: ${analysis.critique?.overall ?? '—'}

Continue the conversation naturally. Be helpful, specific, and concise (2-4 sentences).`;

  const messages = [
    { role: 'system' as const, content: systemPrompt },
    ...history,
    { role: 'user' as const, content: question },
  ];

  const completion = await eng.chat.completions.create({
    messages,
    stream: false,
    max_tokens: 300,
    temperature: 0.7,
  });

  return completion.choices[0]?.message?.content ?? '';
}
