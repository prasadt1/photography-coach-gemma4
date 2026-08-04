/**
 * /api/analyze — Ollama Cloud proxy for judge uploads (Node.js serverless).
 * Node (not Edge): Edge must send first bytes within 25s; vision chats often take longer.
 * Pin Node 20 via package.json engines to avoid Node 24 startup crashes.
 */

export const config = {
  maxDuration: 60,
};

type VercelRequest = {
  method?: string;
  body?: AnalyzeRequest;
};

type VercelResponse = {
  setHeader(name: string, value: string): void;
  status(code: number): VercelResponse;
  json(data: unknown): VercelResponse;
  end(): void;
};

const ARTISAN_V3_OUTPUT_SCHEMA = {
  type: 'object',
  properties: {
    subject: { type: 'string' },
    critique: {
      type: 'object',
      properties: {
        framing: { type: 'string' },
        lighting: { type: 'string' },
        primary_fix: { type: 'string' },
      },
      required: ['framing', 'lighting', 'primary_fix'],
    },
    ratings: {
      type: 'object',
      properties: {
        lighting: { type: 'number' },
        framing: { type: 'number' },
        background: { type: 'number' },
        focus: { type: 'number' },
      },
      required: ['lighting', 'framing', 'background', 'focus'],
    },
    primary_issue: { type: 'string' },
    confidence_note: { type: 'string' },
    alt_text: { type: 'string' },
    listing_copy: { type: 'string' },
    tags: { type: 'array', items: { type: 'string' } },
    ready_to_list: { type: 'boolean' },
  },
  required: [
    'subject',
    'critique',
    'ratings',
    'primary_issue',
    'confidence_note',
    'alt_text',
    'listing_copy',
    'tags',
    'ready_to_list',
  ],
};

const OLLAMA_CLOUD_URL = 'https://ollama.com/api/chat';
const DEFAULT_LOCAL_URL = 'http://127.0.0.1:11434';
const DEFAULT_LOCAL_MODEL = 'gemma4:e4b';
const DEFAULT_CLOUD_MODEL = 'gemma4:31b';
const CLOUD_MODEL_ALIASES: Record<string, string> = {
  'gemma4:e4b': 'gemma4:31b',
  'gemma4:4b': 'gemma4:31b',
};
/**
 * Living Ollama Cloud vision model. gemma3:* retired 2026-07-15.
 * gemma4:31b vision currently 500s/hangs on Cloud — use minimax-m3 for hosted judge uploads.
 */
const CLOUD_VISION_FALLBACKS = ['minimax-m3'] as const;
const HOSTED_DEADLINE_MS = 55_000;
const LOCAL_DEADLINE_MS = 115_000;
const MIN_ATTEMPT_MS = 3_000;
const SCHEMA_RETRY_MIN_MS = 12_000;

interface AnalyzeRequest {
  base64Image?: string;
  systemPrompt?: string;
  userPrompt?: string;
  healthCheck?: boolean;
  warmUp?: boolean;
  artisanSchema?: boolean;
  jsonSchema?: object;
}

function resolveCloudModel(requested?: string): string {
  const raw = requested || DEFAULT_CLOUD_MODEL;
  return CLOUD_MODEL_ALIASES[raw] ?? raw;
}

/** Hosted gemma4:31b vision is unhealthy — use a living cloud vision model only. */
function cloudModelsToTry(primary: string): string[] {
  if (primary === 'gemma4:31b') {
    return [...CLOUD_VISION_FALLBACKS];
  }
  const extras = CLOUD_VISION_FALLBACKS.filter((m) => m !== primary);
  return [primary, ...extras];
}

function msRemaining(deadlineAt: number): number {
  return deadlineAt - Date.now();
}

/** Vercel production/preview cannot reach the maker's Mac at 127.0.0.1. */
function isHostedVercel(): boolean {
  const env = process.env.VERCEL_ENV;
  return env === 'production' || env === 'preview';
}

function getTarget(): 'local' | 'cloud' {
  if (isHostedVercel()) return 'cloud';
  return process.env.OLLAMA_TARGET === 'local' ? 'local' : 'cloud';
}

function setCors(res: VercelResponse): void {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

async function attemptOllamaChat(
  params: {
    endpoint: string;
    headers: Record<string, string>;
    model: string;
    systemPrompt: string;
    userPrompt: string;
    cleanBase64: string;
    outputSchema?: object;
    allowSchemaRetry?: boolean;
    numPredict?: number;
  },
  deadlineAt: number,
): Promise<{ ok: true; content: string } | { ok: false; status: number; details: string }> {
  const allowSchemaRetry = params.allowSchemaRetry !== false;
  const numPredict = params.numPredict ?? 1200;
  const buildBody = (withSchema: boolean) => {
    const req: Record<string, unknown> = {
      model: params.model,
      messages: [
        { role: 'system', content: params.systemPrompt },
        { role: 'user', content: params.userPrompt, images: [params.cleanBase64] },
      ],
      stream: false,
      think: false,
      options: { temperature: 0.1, num_predict: numPredict },
    };
    if (withSchema && params.outputSchema) {
      req.format = params.outputSchema;
    }
    return req;
  };

  const schemaAttempts: boolean[] =
    params.outputSchema && allowSchemaRetry ? [true, false] : params.outputSchema ? [true] : [false];

  for (let i = 0; i < schemaAttempts.length; i++) {
    const withSchema = schemaAttempts[i]!;
    const remaining = msRemaining(deadlineAt);
    if (remaining < MIN_ATTEMPT_MS) {
      return { ok: false, status: 504, details: 'Request timeout' };
    }

    const attemptTimeout = Math.min(52_000, remaining - 1_500);
    const startedAt = Date.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), attemptTimeout);
    try {
      const response = await fetch(params.endpoint, {
        method: 'POST',
        headers: params.headers,
        body: JSON.stringify(buildBody(withSchema)),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (!response.ok) {
        const errorText = await response.text();
        const err = { ok: false as const, status: response.status, details: errorText.slice(0, 500) };
        const hasSchemaRetry = withSchema && i < schemaAttempts.length - 1;
        if (hasSchemaRetry && msRemaining(deadlineAt) >= SCHEMA_RETRY_MIN_MS) {
          continue;
        }
        return err;
      }
      const data = (await response.json()) as { message?: { content?: string } };
      const content = data.message?.content ?? '';
      if (content.trim()) {
        return { ok: true, content };
      }
      const empty = { ok: false as const, status: 502, details: 'Empty model response' };
      if (withSchema && i < schemaAttempts.length - 1 && msRemaining(deadlineAt) >= SCHEMA_RETRY_MIN_MS) {
        continue;
      }
      return empty;
    } catch (err) {
      clearTimeout(timeoutId);
      if (err instanceof Error && err.name === 'AbortError') {
        const timedOut = { ok: false as const, status: 504, details: 'Request timeout' };
        const elapsed = Date.now() - startedAt;
        const hasSchemaRetry =
          withSchema && i < schemaAttempts.length - 1 && msRemaining(deadlineAt) >= SCHEMA_RETRY_MIN_MS;
        if (hasSchemaRetry && elapsed < 15_000) {
          continue;
        }
        return timedOut;
      }
      return {
        ok: false,
        status: 500,
        details: err instanceof Error ? err.message : 'Unknown error',
      };
    }
  }
  return { ok: false, status: 502, details: 'All attempts failed' };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(res);

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const target = getTarget();
  const isLocal = target === 'local';
  const localUrl = (process.env.OLLAMA_LOCAL_URL || DEFAULT_LOCAL_URL).replace(/\/$/, '');
  const localModel = process.env.OLLAMA_LOCAL_MODEL || DEFAULT_LOCAL_MODEL;
  const cloudModelRequested = process.env.OLLAMA_CLOUD_MODEL || DEFAULT_CLOUD_MODEL;
  const cloudModel = isLocal ? localModel : resolveCloudModel(cloudModelRequested);
  const apiKey = process.env.OLLAMA_API_KEY;
  const model = isLocal ? localModel : cloudModel;
  const endpoint = isLocal ? `${localUrl}/api/chat` : OLLAMA_CLOUD_URL;

  if (!isLocal && !apiKey) {
    return res.status(503).json({
      error: 'Hosted analysis not configured',
      code: 'NO_API_KEY',
      message: 'OLLAMA_API_KEY is not set on this Vercel project (lens-app-gemma4).',
    });
  }

  const body = (req.body ?? {}) as AnalyzeRequest;

  if (body.healthCheck) {
    const forcedCloud = isHostedVercel() && process.env.OLLAMA_TARGET === 'local';
    return res.status(200).json({
      status: 'ok',
      configured: true,
      cloudConfigured: !isLocal && Boolean(apiKey),
      runtime: 'nodejs',
      target,
      model,
      endpoint,
      ...(forcedCloud
        ? {
            note: 'OLLAMA_TARGET=local ignored on Vercel hosting; using Ollama Cloud.',
          }
        : {}),
    });
  }

  if (body.warmUp) {
    const warmHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
    if (!isLocal && apiKey) {
      warmHeaders.Authorization = `Bearer ${apiKey}`;
    }
    try {
      const warmRes = await fetch(endpoint, {
        method: 'POST',
        headers: warmHeaders,
        body: JSON.stringify({
          model: isLocal ? model : CLOUD_VISION_FALLBACKS[0] ?? model,
          messages: [{ role: 'user', content: '.' }],
          stream: false,
          think: false,
          options: { num_predict: 1 },
          keep_alive: '30m',
        }),
      });
      if (!warmRes.ok) {
        const errorText = await warmRes.text();
        return res.status(502).json({
          error: 'Warm-up failed',
          code: 'WARMUP_ERROR',
          details: errorText.slice(0, 500),
        });
      }
      return res.status(200).json({ status: 'ok', warmed: true, target, model });
    } catch (err) {
      return res.status(502).json({
        error: 'Warm-up failed',
        message: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }

  if (!body.base64Image || !body.systemPrompt || !body.userPrompt) {
    return res.status(400).json({
      error: 'Missing required fields: base64Image, systemPrompt, userPrompt',
    });
  }

  const cleanBase64 = body.base64Image.includes('base64,')
    ? body.base64Image.split('base64,')[1]!
    : body.base64Image;

  const outputSchema =
    body.jsonSchema ?? (body.artisanSchema ? ARTISAN_V3_OUTPUT_SCHEMA : undefined);

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (!isLocal && apiKey) {
    headers.Authorization = `Bearer ${apiKey}`;
  }

  const models = isLocal ? [model] : cloudModelsToTry(cloudModel);
  const deadlineAt = Date.now() + (isHostedVercel() ? HOSTED_DEADLINE_MS : LOCAL_DEADLINE_MS);
  let lastError = { status: 502, details: 'Unknown error' };

  for (let mi = 0; mi < models.length; mi++) {
    const tryModel = models[mi]!;
    const isLastModel = mi === models.length - 1;
    if (msRemaining(deadlineAt) < MIN_ATTEMPT_MS) {
      lastError = { status: 504, details: 'Request timeout' };
      break;
    }

    const result = await attemptOllamaChat(
      {
        endpoint,
        headers,
        model: tryModel,
        systemPrompt: body.systemPrompt,
        userPrompt: body.userPrompt,
        cleanBase64,
        outputSchema,
        allowSchemaRetry: true,
        numPredict: isLocal ? 1200 : 900,
      },
      deadlineAt,
    );

    if (result.ok) {
      return res.status(200).json({
        content: result.content,
        source: isLocal ? 'ollama-local' : 'ollama-hosted',
        model: tryModel,
        ...(!isLocal && tryModel !== cloudModel
          ? {
              requestedModel: cloudModelRequested,
              cloudNote: `Live hosted vision via ${tryModel} (gemma4:31b cloud vision currently unavailable)`,
            }
          : !isLocal && tryModel !== cloudModelRequested
            ? {
                requestedModel: cloudModelRequested,
                cloudNote: 'E4B runs locally; cloud uses Gemma 4 31B',
              }
            : {}),
        target,
      });
    }

    lastError = { status: result.status, details: result.details };
    if (result.status === 401) {
      return res.status(401).json({
        error: 'Invalid Ollama API key',
        code: 'INVALID_API_KEY',
        details: result.details,
      });
    }
    if (result.status === 504 && isLastModel) {
      break;
    }
  }

  return res.status(502).json({
    error: 'Ollama error',
    code: 'OLLAMA_ERROR',
    status: lastError.status,
    details: lastError.details,
    modelsTried: models,
  });
}
