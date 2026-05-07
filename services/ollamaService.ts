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

import { OLLAMA_CONFIG, SCHEMA_VERSION } from '../config';
import { PhotoAnalysisV2, CVData, TokenUsage } from '../types.v2';
import { PHOTOGRAPHY_PRINCIPLES, buildCritiquePrompt, buildMentorPrompt } from './promptService';
import { validateV2Schema } from './validationService';

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

// ─── Core inference function ──────────────────────────────────────────────────

/**
 * Stream a chat request, calling onToken for each partial token, returning the
 * full concatenated content and final token usage when done.
 */
async function callOllamaChat(
  messages: OllamaMessage[],
  useJsonSchema = true,
  onToken?: (partial: string) => void,
): Promise<{ content: string; tokenUsage: TokenUsage; latencyMs: number }> {
  const startMs = Date.now();
  const stream = onToken !== undefined;

  const body = {
    model: OLLAMA_CONFIG.model,
    messages,
    format: useJsonSchema ? V2_OUTPUT_SCHEMA : undefined,
    stream,
    options: OLLAMA_CONFIG.options,
  };

  const response = await fetch(`${OLLAMA_CONFIG.baseUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(OLLAMA_CONFIG.timeoutMs),
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
): Promise<PhotoAnalysisV2> {
  const cleanBase64 = base64Image.includes('base64,')
    ? base64Image.split('base64,')[1]
    : base64Image;

  const userPrompt = buildCritiquePrompt(cvData);

  const messages: OllamaMessage[] = [
    { role: 'system', content: PHOTOGRAPHY_PRINCIPLES },
    { role: 'user', content: userPrompt, images: [cleanBase64] },
  ];

  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const { content, tokenUsage } = await callOllamaChat(messages, true, onToken);

      let parsed: unknown;
      try {
        parsed = JSON.parse(content);
      } catch {
        // Streaming sometimes produces incomplete JSON on retry; treat as transient
        throw new Error('Incomplete JSON in response — will retry');
      }

      const raw = parsed as Partial<PhotoAnalysisV2>;

      // Stamp provenance fields (override whatever model wrote)
      raw.schema_version = SCHEMA_VERSION;
      raw.model_id = OLLAMA_CONFIG.modelId;
      raw.quantization = OLLAMA_CONFIG.quantization;
      raw.timestamp = Date.now();
      raw.tokenUsage = tokenUsage;

      return validateV2Schema(raw);
    } catch (err: any) {
      lastError = err;
      if (err instanceof OllamaError && err.statusCode === 404) {
        throw new Error(`Gemma 4 model not found. Run: ollama pull ${OLLAMA_CONFIG.model}`);
      }
      if (attempt < retries) {
        await sleep(1500 * (attempt + 1));
      }
    }
  }

  throw lastError ?? new Error('Ollama analysis failed after retries');
}

// ─── Mentor chat ──────────────────────────────────────────────────────────────

/**
 * Send a mentor chat message using the existing analysis as context.
 */
export async function mentorChat(
  question: string,
  analysis: PhotoAnalysisV2,
  history: Array<{ role: 'user' | 'assistant'; content: string }>,
): Promise<string> {
  const systemPrompt = buildMentorPrompt(analysis);

  const messages: OllamaMessage[] = [
    { role: 'system', content: systemPrompt },
    ...history,
    { role: 'user', content: question },
  ];

  // Mentor chat uses free-form JSON — not schema-enforced
  const { content } = await callOllamaChat(messages, false);
  return content;
}

// ─── Health check ─────────────────────────────────────────────────────────────

export async function checkOllamaHealth(): Promise<{
  running: boolean;
  modelAvailable: boolean;
  modelInfo?: { name: string; quantization: string; size: string };
}> {
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

// ─── Model warm-up ────────────────────────────────────────────────────────────

/**
 * Preload the model into Ollama's in-memory cache.
 * Call this on app mount (fire-and-forget) to eliminate the ~40s cold-start
 * penalty that users would otherwise experience on their first photo upload.
 */
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
