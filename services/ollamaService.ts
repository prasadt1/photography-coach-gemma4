/**
 * ollamaService.ts — Gemma 4 E4B inference via Ollama
 * Primary inference engine for Photography Coach v2.
 *
 * Spike 1 findings (resolved):
 *   - JSON Schema format param: supported in Ollama 0.22.1 via format field
 *   - Token counts: available as prompt_eval_count / eval_count
 *   - Vision input: base64 in messages[].images[] array
 *   - Bounding boxes: partial reliability → CV fallback used if absent
 */

import { OLLAMA_CONFIG, SCHEMA_VERSION, OLLAMA_CLOUD_CONFIG, type InferenceSource } from '../config';
import { ARTISAN_V3_OUTPUT_SCHEMA } from '../lib/artisanV3Schema';
import { PhotoAnalysisV2, CVData, TokenUsage } from '../types.v2';
import {
  buildSystemPrompt,
  buildCritiquePrompt,
  buildMentorPrompt,
  buildCullSystemPrompt,
  buildCullUserPrompt,
  SupportedLanguage,
} from './promptService';
import { validateV2Schema } from './validationService';
import { normalizeCullToPhotoAnalysisV2 } from './cullNormalize';
import { getAnalyzePhotoBudget, getCullAttemptPlan, RuntimeProfile } from './ollamaRuntimeBudget';

// ─── Ollama API types ─────────────────────────────────────────────────────────

interface OllamaMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  images?: string[];   // base64-encoded image strings
}

interface OllamaResponse {
  model: string;
  message: { role: string; content: string };
  done: boolean;
  prompt_eval_count?: number;
  eval_count?: number;
  total_duration?: number;     // nanoseconds
  eval_duration?: number;      // nanoseconds
}

// ─── JSON Schema for Ollama format enforcement ────────────────────────────────

const V2_OUTPUT_SCHEMA = {
  type: 'object',
  properties: {
    schema_version: { type: 'string' },
    model_id: { type: 'string' },
    scores: {
      type: 'object',
      properties: {
        composition: { type: 'number' },
        lighting: { type: 'number' },
        technique: { type: 'number' },
        creativity: { type: 'number' },
        subjectImpact: { type: 'number' },
      },
      required: ['composition', 'lighting', 'technique', 'creativity', 'subjectImpact'],
    },
    critique: {
      type: 'object',
      properties: {
        composition: { type: 'string' },
        lighting: { type: 'string' },
        technique: { type: 'string' },
        overall: { type: 'string' },
      },
      required: ['composition', 'lighting', 'technique', 'overall'],
    },
    strengths: { type: 'array', items: { type: 'string' } },
    improvements: { type: 'array', items: { type: 'string' } },
    learningPath: { type: 'array', items: { type: 'string' } },
    settingsEstimate: {
      type: 'object',
      properties: {
        focalLength: { type: 'string' },
        aperture: { type: 'string' },
        shutterSpeed: { type: 'string' },
        iso: { type: 'string' },
      },
      required: ['focalLength', 'aperture', 'shutterSpeed', 'iso'],
    },
    rationale: {
      type: 'object',
      properties: {
        observations: { type: 'array', items: { type: 'string' } },
        reasoningSteps: { type: 'array', items: { type: 'string' } },
        priorityFixes: { type: 'array', items: { type: 'string' } },
      },
      required: ['observations', 'reasoningSteps', 'priorityFixes'],
    },
    boundingBoxes: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['composition', 'lighting', 'focus', 'exposure', 'color'] },
          severity: { type: 'string', enum: ['critical', 'moderate', 'minor'] },
          x: { type: 'number' }, y: { type: 'number' },
          width: { type: 'number' }, height: { type: 'number' },
          description: { type: 'string' },
          suggestion: { type: 'string' },
        },
        required: ['type', 'severity', 'x', 'y', 'width', 'height', 'description', 'suggestion'],
      },
    },
    is_refusal: { type: 'boolean' },
    refusal_reason: { type: 'string' },
  },
  required: [
    'schema_version', 'model_id', 'scores', 'critique',
    'strengths', 'improvements', 'learningPath', 'settingsEstimate', 'rationale',
    'boundingBoxes',
  ],
};

/** Minimal schema for fast batch cull — normalized to full PhotoAnalysisV2 after inference */
const CULL_OUTPUT_SCHEMA = {
  type: 'object',
  properties: {
    schema_version: { type: 'string' },
    model_id: { type: 'string' },
    scores: {
      type: 'object',
      properties: {
        composition: { type: 'number' },
        lighting: { type: 'number' },
        technique: { type: 'number' },
        creativity: { type: 'number' },
        subjectImpact: { type: 'number' },
      },
      required: ['composition', 'lighting', 'technique', 'creativity', 'subjectImpact'],
    },
    critique: {
      type: 'object',
      properties: {
        composition: { type: 'string' },
        lighting: { type: 'string' },
        technique: { type: 'string' },
        overall: { type: 'string' },
      },
      required: ['composition', 'lighting', 'technique', 'overall'],
    },
    rationale: {
      type: 'object',
      properties: {
        observations: { type: 'array', items: { type: 'string' } },
      },
      required: ['observations'],
    },
    strengths: { type: 'array', items: { type: 'string' } },
    improvements: { type: 'array', items: { type: 'string' } },
    learningPath: { type: 'array', items: { type: 'string' } },
    boundingBoxes: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['composition', 'lighting', 'focus', 'exposure', 'color'] },
          severity: { type: 'string', enum: ['critical', 'moderate', 'minor'] },
          x: { type: 'number' }, y: { type: 'number' },
          width: { type: 'number' }, height: { type: 'number' },
          description: { type: 'string' },
          suggestion: { type: 'string' },
        },
        required: ['type', 'severity', 'x', 'y', 'width', 'height', 'description', 'suggestion'],
      },
    },
    is_refusal: { type: 'boolean' },
  },
  required: ['schema_version', 'model_id', 'scores', 'critique', 'rationale'],
};

// ─── Core inference function ──────────────────────────────────────────────────

/**
 * Stream a chat request, calling onToken for each partial token, returning the
 * full concatenated content and final token usage when done.
 */
async function callOllamaChat(
  messages: OllamaMessage[],
  useJsonSchema = true,
  onToken?: (partial: string) => void,
  signal?: AbortSignal,
  timeoutMs: number = OLLAMA_CONFIG.timeoutMs,
  numPredict?: number,
  numCtx?: number,
  /** When set with useJsonSchema, replaces the full v2 schema (e.g. cull batch). */
  schemaOverride?: object,
): Promise<{ content: string; tokenUsage: TokenUsage; latencyMs: number }> {
  const startMs = Date.now();
  const stream = onToken !== undefined;

  // Allow callers to override num_predict and num_ctx (e.g. deep mode needs more of both)
  const options = (numPredict !== undefined || numCtx !== undefined)
    ? {
        ...OLLAMA_CONFIG.options,
        ...(numPredict !== undefined && { num_predict: numPredict }),
        ...(numCtx !== undefined && { num_ctx: numCtx }),
      }
    : OLLAMA_CONFIG.options;

  const body = {
    model: OLLAMA_CONFIG.model,
    messages,
    format: useJsonSchema ? (schemaOverride ?? V2_OUTPUT_SCHEMA) : undefined,
    stream,
    options,
    keep_alive: '30m', // Keep model loaded for 30 minutes to avoid cold starts between batch photos
  };

  // Combine caller's cancel signal with the (possibly extended) timeout so either can abort.
  const combinedSignal = signal
    ? AbortSignal.any([signal, AbortSignal.timeout(timeoutMs)])
    : AbortSignal.timeout(timeoutMs);

  const response = await fetch(`${OLLAMA_CONFIG.baseUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: combinedSignal,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new OllamaError(`HTTP ${response.status}: ${text.slice(0, 300)}`, response.status);
  }

  // ── Streaming path ────────────────────────────────────────────────────────
  if (stream && response.body) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullContent = '';
    let lastData: OllamaResponse | null = null;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      for (const line of chunk.split('\n')) {
        if (!line.trim()) continue;
        try {
          const msg = JSON.parse(line) as OllamaResponse;
          const token = msg.message?.content ?? '';
          fullContent += token;
          if (token) onToken!(token);
          if (msg.done) lastData = msg;
        } catch {
          // partial JSON line — skip
        }
      }
    }

    const latencyMs = Date.now() - startMs;
    return {
      content: fullContent,
      tokenUsage: {
        promptTokens: lastData?.prompt_eval_count,
        completionTokens: lastData?.eval_count,
        totalTokens: (lastData?.prompt_eval_count ?? 0) + (lastData?.eval_count ?? 0),
        estimatedCost: 0,
      },
      latencyMs,
    };
  }

  // ── Non-streaming path (fallback / mentor chat) ───────────────────────────
  const data: OllamaResponse = await response.json();
  const latencyMs = Date.now() - startMs;
  return {
    content: data.message?.content ?? '',
    tokenUsage: {
      promptTokens: data.prompt_eval_count,
      completionTokens: data.eval_count,
      totalTokens: (data.prompt_eval_count ?? 0) + (data.eval_count ?? 0),
      estimatedCost: 0,
    },
    latencyMs,
  };
}

// ─── Main: analyzePhoto ───────────────────────────────────────────────────────

/**
 * Analyze a photo with Gemma 4 E4B.
 * @param base64Image - base64-encoded image (with or without data: prefix)
 * @param mimeType    - MIME type, e.g. "image/jpeg"
 * @param cvData      - Optional: deterministic CV grounding data (EXIF, histogram, focus)
 * @param onToken     - Optional streaming callback — called with each partial token
 * @param retries     - Internal retry counter
 */
export async function analyzePhoto(
  base64Image: string,
  _mimeType: string,
  cvData?: CVData,
  onToken?: (partial: string) => void,
  retries = 2,
  signal?: AbortSignal,
  language: SupportedLanguage = 'en',
  deepMode = false,
  fastMode = false,
  profile: RuntimeProfile = 'single',
): Promise<PhotoAnalysisV2> {
  const cleanBase64 = base64Image.includes('base64,')
    ? base64Image.split('base64,')[1]
    : base64Image;

  const userPrompt = buildCritiquePrompt(cvData, language, deepMode, fastMode);

  const messages: OllamaMessage[] = [
    { role: 'system', content: buildSystemPrompt(deepMode, fastMode) },
    { role: 'user', content: userPrompt, images: [cleanBase64] },
  ];

  // Mode-specific optimizations:
  // - Fast mode: ONLY reduces image resolution (768px vs 1024px), disables concurrent + deep
  // - Deep mode: more tokens, longer timeout, larger context
  // - Default: balanced settings
  const budget = getAnalyzePhotoBudget({
    deepMode,
    fastMode,
    retries,
    profile,
    defaultTimeoutMs: OLLAMA_CONFIG.timeoutMs,
  });

  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= budget.retries; attempt++) {
    if (signal?.aborted) {
      throw new DOMException('Operation aborted', 'AbortError');
    }
    try {
      const { content, tokenUsage } = await callOllamaChat(
        messages,
        true,
        onToken,
        signal,
        budget.timeoutMs,
        budget.numPredict,
        budget.numCtx,
        undefined,
      );

      let parsed: unknown;
      try {
        parsed = JSON.parse(content);
      } catch {
        // Try robust extraction: model may have prepended reasoning prose
        // (Gemma 4 thinking modes can emit text before the JSON).
        try {
          parsed = extractRobustJSON(content);
        } catch {
          console.error('[analyzePhoto] JSON parse failed. Raw content (first 500 chars):', content.slice(0, 500));
          console.error('[analyzePhoto] Raw content (last 200 chars):', content.slice(-200));
          throw new Error('Incomplete JSON in response — will retry');
        }
      }

      const raw = parsed as Partial<PhotoAnalysisV2>;

      // Stamp provenance fields (override whatever model wrote)
      raw.schema_version = SCHEMA_VERSION;
      raw.model_id = OLLAMA_CONFIG.modelId;
      raw.quantization = OLLAMA_CONFIG.quantization;
      raw.timestamp = Date.now();
      raw.tokenUsage = tokenUsage;

      const validated = validateV2Schema(raw);
      validated.wasDeepMode = deepMode;
      validated.outputLanguage = language;
      return validated;
    } catch (err: any) {
      lastError = err;
      if (err instanceof OllamaError && err.statusCode === 404) {
        throw new Error(`Gemma 4 model not found. Run: ollama pull ${OLLAMA_CONFIG.model}`);
      }
      if (attempt < budget.retries) {
        await sleepWithSignal(1500 * (attempt + 1), signal);
      }
    }
  }

  throw lastError ?? new Error('Ollama analysis failed after retries');
}

// ─── Fast batch cull: small schema + normalize to v2 ─────────────────────────

/** Cull path prioritizes first-attempt success over long timeout ladders. */
/**
 * Minimal-token vision pass for demo batch. Response is expanded to full PhotoAnalysisV2.
 * Two num_predict steps only; logs eval_count on parse/validation failure.
 */
export async function analyzePhotoCull(
  base64Image: string,
  _mimeType: string,
  onToken?: (partial: string) => void,
  signal?: AbortSignal,
  language: SupportedLanguage = 'en',
  profile: RuntimeProfile = 'single',
): Promise<PhotoAnalysisV2> {
  const cleanBase64 = base64Image.includes('base64,')
    ? base64Image.split('base64,')[1]
    : base64Image;

  const messages: OllamaMessage[] = [
    { role: 'system', content: buildCullSystemPrompt(language) },
    { role: 'user', content: buildCullUserPrompt(language), images: [cleanBase64] },
  ];

  let lastError: Error | null = null;
  const attemptPlan = getCullAttemptPlan(profile);

  for (let attempt = 0; attempt < attemptPlan.length; attempt++) {
    if (signal?.aborted) {
      throw new DOMException('Operation aborted', 'AbortError');
    }
    const { numPredict, timeoutMs } = attemptPlan[attempt];
    const attemptStart = Date.now();
    try {
      console.info(
        `[analyzePhotoCull] Attempt ${attempt + 1}/${attemptPlan.length} start`,
        { numPredict, timeoutMs },
      );
      const { content, tokenUsage } = await callOllamaChat(
        messages,
        true,
        onToken,
        signal,
        timeoutMs,
        numPredict,
        4096,
        CULL_OUTPUT_SCHEMA,
      );

      let parsed: unknown;
      try {
        parsed = JSON.parse(content);
      } catch {
        try {
          parsed = extractRobustJSON(content);
        } catch {
          console.error(
            `[analyzePhotoCull] JSON parse failed (attempt ${attempt + 1}/${attemptPlan.length}). eval_count=${tokenUsage.completionTokens ?? '?'}. First 400 chars:`,
            content.slice(0, 400),
          );
          throw new Error('Cull: incomplete JSON');
        }
      }

      const rawRecord = parsed as Record<string, unknown>;
      const expanded = normalizeCullToPhotoAnalysisV2(rawRecord, tokenUsage);
      const merged = {
        ...expanded,
        schema_version: SCHEMA_VERSION,
        model_id: OLLAMA_CONFIG.modelId,
        quantization: OLLAMA_CONFIG.quantization,
        timestamp: Date.now(),
        tokenUsage,
      };

      let validated: PhotoAnalysisV2;
      try {
        validated = validateV2Schema(merged);
      } catch (valErr) {
        console.error(
          `[analyzePhotoCull] Validation failed (attempt ${attempt + 1}/${attemptPlan.length}). eval_count=${tokenUsage.completionTokens ?? '?'}`,
          valErr,
        );
        throw valErr;
      }
      validated.wasCullBatch = true;
      validated.outputLanguage = language;
      console.info(
        `[analyzePhotoCull] Attempt ${attempt + 1} success`,
        {
          durationMs: Date.now() - attemptStart,
          completionTokens: tokenUsage.completionTokens ?? null,
          promptTokens: tokenUsage.promptTokens ?? null,
        },
      );
      return validated;
    } catch (err: unknown) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (lastError instanceof OllamaError && lastError.statusCode === 404) {
        throw new Error(`Gemma 4 model not found. Run: ollama pull ${OLLAMA_CONFIG.model}`);
      }
      console.warn(
        `[analyzePhotoCull] Attempt ${attempt + 1} failed after ${Date.now() - attemptStart}ms:`,
        lastError.message,
      );
    }
  }

  throw lastError ?? new Error('Cull analysis failed');
}

// ─── Mentor chat ──────────────────────────────────────────────────────────────

/**
 * Send a mentor chat message using the existing analysis as context.
 */
export async function mentorChat(
  question: string,
  analysis: PhotoAnalysisV2,
  history: Array<{ role: 'user' | 'assistant'; content: string }>,
  language: SupportedLanguage = 'en',
): Promise<string> {
  const systemPrompt = buildMentorPrompt(analysis, language);

  const messages: OllamaMessage[] = [
    { role: 'system', content: systemPrompt },
    ...history,
    { role: 'user', content: question },
  ];

  // Mentor chat uses free-form JSON — not schema-enforced
  const { content } = await callOllamaChat(messages, false);
  return content;
}

// ─── Compare two photos ──────────────────────────────────────────────────────

export interface ComparisonResult {
  winner: 'A' | 'B' | 'tie';
  reason: string;
  strengths_a: string[];
  strengths_b: string[];
  recommendation: string;
}

/**
 * Send two photos to Gemma 4 and ask which one is stronger and why.
 * Used for cull workflows ("which keeper from these two near-duplicates?").
 */
export async function comparePhotos(
  base64A: string,
  base64B: string,
  signal?: AbortSignal,
): Promise<ComparisonResult> {
  const cleanA = base64A.includes('base64,') ? base64A.split('base64,')[1] : base64A;
  const cleanB = base64B.includes('base64,') ? base64B.split('base64,')[1] : base64B;

  const systemPrompt = `You are a photography coach comparing two photos. Pick which is stronger overall and explain why with specific reasoning. Be decisive but fair — pick "tie" only if the photos are genuinely equivalent in quality.

Return ONLY valid JSON in this exact shape:
{
  "winner": "A" or "B" or "tie",
  "reason": "One concise sentence explaining the winner.",
  "strengths_a": ["short strength 1", "short strength 2", "short strength 3"],
  "strengths_b": ["short strength 1", "short strength 2", "short strength 3"],
  "recommendation": "One sentence advising the photographer which to keep."
}

Output JSON only, no prose, no code fences.`;

  const messages: OllamaMessage[] = [
    { role: 'system', content: systemPrompt },
    {
      role: 'user',
      content: 'Photo A is the first image, Photo B is the second image. Which is stronger?',
      images: [cleanA, cleanB],
    },
  ];

  // useJsonSchema=false because the V2 schema is for critique, not comparison.
  // Gemma is asked to emit our compare JSON via the system prompt instead.
  const { content } = await callOllamaChat(messages, false, undefined, signal);

  let parsed: ComparisonResult;
  try {
    parsed = extractComparisonJSON(content);
  } catch (err) {
    console.error('[comparePhotos] Failed to parse output. Raw:\n', content);
    throw new Error('Compare: model returned non-JSON output. Try again.');
  }

  // Coerce safe defaults
  if (!['A', 'B', 'tie'].includes(parsed.winner)) parsed.winner = 'tie';
  if (!parsed.reason) parsed.reason = 'No reasoning provided.';
  if (!Array.isArray(parsed.strengths_a)) parsed.strengths_a = [];
  if (!Array.isArray(parsed.strengths_b)) parsed.strengths_b = [];
  if (!parsed.recommendation) parsed.recommendation = '';

  return parsed;
}

// ─── Raw text inference (Voice/Quest/Sell modes) ──────────────────────────────

/**
 * Analyze a photo with custom prompts, returning raw text (no JSON parsing).
 * Used by Voice Mode, Quest Mode, and Sell Mode which need natural language output.
 *
 * @param base64Image  - base64-encoded image (with or without data: prefix)
 * @param mimeType     - MIME type, e.g. "image/jpeg"
 * @param systemPrompt - Mode-specific system prompt
 * @param userPrompt   - Mode-specific user prompt
 * @param signal       - Optional abort signal
 */
export async function analyzePhotoRaw(
  base64Image: string,
  _mimeType: string,
  systemPrompt: string,
  userPrompt: string,
  signal?: AbortSignal,
  jsonSchema?: object,
): Promise<string> {
  const cleanBase64 = base64Image.includes('base64,')
    ? base64Image.split('base64,')[1]
    : base64Image;

  const messages: OllamaMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt, images: [cleanBase64] },
  ];

  const useArtisanSchema = jsonSchema != null;
  const { content } = await callOllamaChat(
    messages,
    useArtisanSchema,
    undefined,
    signal,
    OLLAMA_CONFIG.timeoutMs,
    1024,
    4096,
    jsonSchema,
  );

  console.log('[analyzePhotoRaw] Response:', content.substring(0, 500));
  return content.trim();
}

/**
 * Aggressive JSON extraction for chatty model outputs.
 * Tries multiple strategies in order from cleanest to most aggressive.
 */
/**
 * Generic robust JSON extractor — handles model output with leading prose,
 * code fences, trailing commas, or other minor noise.
 */
function extractRobustJSON(raw: string): unknown {
  let s = raw.trim();
  // Strip code fences
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (fence) s = fence[1].trim();
  // Strip common LLM prefixes
  s = s.replace(/^(here(?:'s| is)|result|response|output|json)[:\s]*/i, '').trim();
  // Try as-is
  try { return JSON.parse(s); } catch {}
  // Find outermost JSON object
  const firstBrace = s.indexOf('{');
  const lastBrace = s.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    const candidate = s.slice(firstBrace, lastBrace + 1);
    try { return JSON.parse(candidate); } catch {}
    // Strip trailing commas
    const cleaned = candidate.replace(/,(\s*[}\]])/g, '$1');
    try { return JSON.parse(cleaned); } catch {}
  }
  throw new Error('No valid JSON found in output');
}

function extractComparisonJSON(raw: string): ComparisonResult {
  let s = raw.trim();

  // Strategy 1: Strip code fences
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (fence) s = fence[1].trim();

  // Strategy 2: Strip common LLM prefixes ("Here's the JSON:", "Result:", etc.)
  s = s.replace(/^(here(?:'s| is)|result|response|output|json)[:\s]*/i, '').trim();

  // Strategy 3: Try parsing as-is first
  try { return JSON.parse(s) as ComparisonResult; } catch {}

  // Strategy 4: Find outermost JSON object (first { to last })
  const firstBrace = s.indexOf('{');
  const lastBrace = s.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    const candidate = s.slice(firstBrace, lastBrace + 1);
    try { return JSON.parse(candidate) as ComparisonResult; } catch {}

    // Strategy 5: Strip trailing commas before } or ] (common LLM mistake)
    const cleaned = candidate.replace(/,(\s*[}\]])/g, '$1');
    try { return JSON.parse(cleaned) as ComparisonResult; } catch {}
  }

  // Strategy 6: Find any embedded JSON object via regex
  const matches = s.match(/\{[^{}]*"winner"[\s\S]*?\}/);
  if (matches) {
    try { return JSON.parse(matches[0]) as ComparisonResult; } catch {}
  }

  throw new Error('No valid JSON found in output');
}

// ─── Health check ─────────────────────────────────────────────────────────────

export async function checkOllamaHealth(): Promise<{
  running: boolean;
  modelAvailable: boolean;
  modelInfo?: { name: string; quantization: string; size: string };
}> {
  // Skip local Ollama check on deployed sites (would cause Mixed Content error)
  if (OLLAMA_CLOUD_CONFIG.enabled) {
    return { running: false, modelAvailable: false };
  }

  try {
    const res = await fetch(`${OLLAMA_CONFIG.baseUrl}/api/tags`, {
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return { running: false, modelAvailable: false };

    const { models } = await res.json() as { models: Array<{ name: string; details?: { quantization_level?: string; parameter_size?: string } }> };
    const found = models.find(m => m.name === OLLAMA_CONFIG.model);
    return {
      running: true,
      modelAvailable: !!found,
      modelInfo: found
        ? {
            name: found.name,
            quantization: found.details?.quantization_level ?? 'unknown',
            size: found.details?.parameter_size ?? 'unknown',
          }
        : undefined,
    };
  } catch {
    return { running: false, modelAvailable: false };
  }
}

// ─── Cloud availability check ─────────────────────────────────────────────────

/**
 * Check if Ollama Cloud is available via the Vercel API route.
 * Returns true if the route exists and has a valid API key configured.
 */
export async function checkCloudAvailability(): Promise<boolean> {
  if (!OLLAMA_CLOUD_CONFIG.enabled) return false;

  try {
    // Health check request to the API route
    const res = await fetch(OLLAMA_CLOUD_CONFIG.apiRoute, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ healthCheck: true }),
      signal: AbortSignal.timeout(5000),
    });

    if (res.status === 503) {
      return false;
    }

    if (res.status === 200) {
      const data = await res.json();
      return data.configured === true || data.cloudConfigured === true;
    }

    // Any other status means cloud is not available
    return false;
  } catch (err) {
    console.warn('[checkCloudAvailability] Failed:', err);
    return false;
  }
}

// ─── Cloud inference via Vercel API route ─────────────────────────────────────

/**
 * Call the Vercel API route to proxy to Ollama Cloud.
 * Used when local Ollama is not available.
 */
async function analyzePhotoCloud(
  base64Image: string,
  systemPrompt: string,
  userPrompt: string,
  signal?: AbortSignal,
  jsonSchema?: object,
): Promise<{ content: string; source: InferenceSource }> {
  const res = await fetch(OLLAMA_CLOUD_CONFIG.apiRoute, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      base64Image,
      systemPrompt,
      userPrompt,
      artisanSchema: !!jsonSchema,
      jsonSchema: jsonSchema ?? undefined,
    }),
    signal: signal ?? AbortSignal.timeout(120_000),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({})) as {
      error?: string;
      message?: string;
      details?: string;
      code?: string;
      modelsTried?: string[];
    };
    const detail = (error.details || error.message || '').trim();
    const label =
      error.code === 'INVALID_API_KEY'
        ? 'Invalid Ollama API key'
        : (error.error ?? res.statusText ?? `HTTP ${res.status}`);
    const suffix = detail ? ` — ${detail.slice(0, 280)}` : '';
    const models = error.modelsTried;
    const modelsNote = models?.length ? ` (tried: ${models.join(', ')})` : '';
    throw new OllamaError(
      `Cloud analysis failed: ${label}${suffix}${modelsNote}`,
      res.status,
    );
  }

  const data = await res.json();
  const source: InferenceSource =
    data.source === 'ollama-local' || data.target === 'local' ? 'local' : 'cloud';
  return {
    content: data.content,
    source,
  };
}

// ─── Unified inference with fallback chain ────────────────────────────────────

/**
 * Analyze a photo with fallback chain: Local Ollama → Cloud → Demo Mode.
 * Returns both the analysis content and the source used.
 */
export async function analyzePhotoWithFallback(
  base64Image: string,
  mimeType: string,
  systemPrompt: string,
  userPrompt: string,
  signal?: AbortSignal,
  options?: { artisanSchema?: boolean },
): Promise<{ content: string; source: InferenceSource; cloudError?: string }> {
  const jsonSchema = options?.artisanSchema ? ARTISAN_V3_OUTPUT_SCHEMA : undefined;
  let cloudError: string | undefined;

  // On deployed sites, skip local Ollama entirely (would cause Mixed Content error)
  if (!OLLAMA_CLOUD_CONFIG.enabled) {
    // Step 1: Try local Ollama first (only on localhost)
    try {
      const health = await checkOllamaHealth();
      if (health.running && health.modelAvailable) {
        console.log('[analyzePhotoWithFallback] Using local Ollama');
        const content = await analyzePhotoRaw(
          base64Image,
          mimeType,
          systemPrompt,
          userPrompt,
          signal,
          jsonSchema,
        );
        return { content, source: 'local' };
      }
    } catch (err) {
      console.warn('[analyzePhotoWithFallback] Local Ollama failed:', err);
    }
  }

  // Step 2: Try Ollama Cloud if enabled
  if (OLLAMA_CLOUD_CONFIG.enabled) {
    try {
      console.log('[analyzePhotoWithFallback] Trying Ollama Cloud');
      return await analyzePhotoCloud(
        base64Image,
        systemPrompt,
        userPrompt,
        signal,
        jsonSchema,
      );
    } catch (err) {
      cloudError = err instanceof Error ? err.message : String(err);
      console.warn('[analyzePhotoWithFallback] Cloud failed:', err);
    }
  }

  // Step 3: Fall back to Demo Mode
  console.log('[analyzePhotoWithFallback] Falling back to Demo Mode');
  return {
    content: '', // Empty signals Demo Mode — caller handles canned responses
    source: 'demo',
    cloudError,
  };
}

/**
 * Get the current inference source without performing analysis.
 * Used by UI components to show appropriate badges.
 */
export async function detectInferenceSource(): Promise<InferenceSource> {
  // Check local Ollama first
  const health = await checkOllamaHealth();
  if (health.running && health.modelAvailable) {
    return 'local';
  }

  // Check cloud availability
  if (OLLAMA_CLOUD_CONFIG.enabled) {
    const cloudAvailable = await checkCloudAvailability();
    if (cloudAvailable) {
      return 'cloud';
    }
  }

  // Default to demo mode
  return 'demo';
}

// ─── Model warm-up ────────────────────────────────────────────────────────────

/**
 * Preload the model into Ollama's in-memory cache.
 * Call this on app mount (fire-and-forget) to eliminate the ~40s cold-start
 * penalty that users would otherwise experience on their first photo upload.
 */
/**
 * Preload the model via /api/analyze (works with vercel dev + OLLAMA_TARGET=local).
 * Fire-and-forget on journey start so the first photo does not evict TTS mid-sentence.
 */
export async function warmUpModelViaApi(): Promise<void> {
  if (!OLLAMA_CLOUD_CONFIG.enabled) return;
  try {
    await fetch(OLLAMA_CLOUD_CONFIG.apiRoute, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ warmUp: true }),
      signal: AbortSignal.timeout(90_000),
    });
  } catch {
    // Silent — real errors surface on first analysis
  }
}

export async function warmUpModel(): Promise<void> {
  try {
    await fetch(`${OLLAMA_CONFIG.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_CONFIG.model,
        messages: [{ role: 'user', content: '.' }],
        stream: false,
        options: { num_predict: 1 },
        keep_alive: '30m', // Keep model loaded for batch processing
      }),
      signal: AbortSignal.timeout(90_000),
    });
  } catch {
    // Silent — warm-up failure does not block the app; real errors surface on analysis
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export class OllamaError extends Error {
  constructor(message: string, public statusCode?: number) {
    super(message);
    this.name = 'OllamaError';
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function sleepWithSignal(ms: number, signal?: AbortSignal): Promise<void> {
  if (!signal) {
    await sleep(ms);
    return;
  }
  if (signal.aborted) {
    throw new DOMException('Operation aborted', 'AbortError');
  }

  await new Promise<void>((resolve, reject) => {
    const id = setTimeout(() => {
      signal.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(id);
      signal.removeEventListener('abort', onAbort);
      reject(new DOMException('Operation aborted', 'AbortError'));
    };
    signal.addEventListener('abort', onAbort, { once: true });
  });
}
