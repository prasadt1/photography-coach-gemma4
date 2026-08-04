/**
 * /api/analyze — Ollama Cloud proxy for judge uploads (Edge runtime, fetch-only).
 * Edge avoids Node 24 serverless startup crashes on Vercel.
 */

export const config = {
  runtime: 'edge',
  maxDuration: 60,
};

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
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
/** Stay under Vercel Edge maxDuration (60s) with headroom for JSON parsing. */
const HOSTED_DEADLINE_MS = 58_000;
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

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
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
  },
  deadlineAt: number,
): Promise<{ ok: true; content: string } | { ok: false; status: number; details: string }> {
  const buildBody = (withSchema: boolean) => {
    const req: Record<string, unknown> = {
      model: params.model,
      messages: [
        { role: 'system', content: params.systemPrompt },
        { role: 'user', content: params.userPrompt, images: [params.cleanBase64] },
      ],
      stream: false,
      options: { temperature: 0.1, num_predict: 1200 },
    };
    if (withSchema && params.outputSchema) {
      req.format = params.outputSchema;
    }
    return req;
  };

  const schemaAttempts: boolean[] = params.outputSchema ? [true, false] : [false];

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
        // Retry schema-off only when schema-on failed quickly (likely format rejection).
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

export default async function handler(request: Request): Promise<Response> {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS });
  }

  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
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
    return json(
      {
        error: 'Hosted analysis not configured',
        code: 'NO_API_KEY',
        message: 'OLLAMA_API_KEY is not set on this Vercel project (lens-app-gemma4).',
      },
      503,
    );
  }

  let body: AnalyzeRequest;
  try {
    body = (await request.json()) as AnalyzeRequest;
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  if (body.healthCheck) {
    const forcedCloud = isHostedVercel() && process.env.OLLAMA_TARGET === 'local';
    return json({
      status: 'ok',
      configured: true,
      cloudConfigured: !isLocal && Boolean(apiKey),
      runtime: 'edge',
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
          model,
          messages: [{ role: 'user', content: '.' }],
          stream: false,
          options: { num_predict: 1 },
          keep_alive: '30m',
        }),
      });
      if (!warmRes.ok) {
        const errorText = await warmRes.text();
        return json(
          { error: 'Warm-up failed', code: 'WARMUP_ERROR', details: errorText.slice(0, 500) },
          502,
        );
      }
      return json({ status: 'ok', warmed: true, target, model });
    } catch (err) {
      return json(
        {
          error: 'Warm-up failed',
          message: err instanceof Error ? err.message : 'Unknown error',
        },
        502,
      );
    }
  }

  if (!body.base64Image || !body.systemPrompt || !body.userPrompt) {
    return json({ error: 'Missing required fields: base64Image, systemPrompt, userPrompt' }, 400);
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

  const models = [model];
  const deadlineAt = Date.now() + (isHostedVercel() ? HOSTED_DEADLINE_MS : LOCAL_DEADLINE_MS);

  const result = await attemptOllamaChat(
    {
      endpoint,
      headers,
      model,
      systemPrompt: body.systemPrompt,
      userPrompt: body.userPrompt,
      cleanBase64,
      outputSchema,
    },
    deadlineAt,
  );

  if (result.ok) {
    return json({
      content: result.content,
      source: isLocal ? 'ollama-local' : 'ollama-hosted',
      model,
      ...(!isLocal && model !== cloudModelRequested
        ? {
            requestedModel: cloudModelRequested,
            cloudNote: 'E4B runs locally; cloud uses Gemma 4 31B',
          }
        : {}),
      target,
    });
  }

  if (result.status === 401) {
    return json(
      { error: 'Invalid Ollama API key', code: 'INVALID_API_KEY', details: result.details },
      401,
    );
  }

  return json(
    {
      error: 'Ollama error',
      code: 'OLLAMA_ERROR',
      status: result.status,
      details: result.details,
      modelsTried: models,
    },
    502,
  );
}
