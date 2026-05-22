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
const CLOUD_VISION_FALLBACK = 'gemma3:4b';
const TIMEOUT_MS = 55_000;

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

function cloudModelsToTry(primary: string): string[] {
  return primary === CLOUD_VISION_FALLBACK
    ? [CLOUD_VISION_FALLBACK]
    : [CLOUD_VISION_FALLBACK, primary];
}

function getTarget(): 'local' | 'cloud' {
  return process.env.OLLAMA_TARGET === 'local' ? 'local' : 'cloud';
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

async function attemptOllamaChat(params: {
  endpoint: string;
  headers: Record<string, string>;
  model: string;
  systemPrompt: string;
  userPrompt: string;
  cleanBase64: string;
  outputSchema?: object;
}): Promise<{ ok: true; content: string } | { ok: false; status: number; details: string }> {
  const buildBody = (withSchema: boolean) => {
    const req: Record<string, unknown> = {
      model: params.model,
      messages: [
        { role: 'system', content: params.systemPrompt },
        { role: 'user', content: params.userPrompt, images: [params.cleanBase64] },
      ],
      stream: false,
      options: { temperature: 0.1, num_predict: 2048 },
    };
    if (withSchema && params.outputSchema) {
      req.format = params.outputSchema;
    }
    return req;
  };

  for (const withSchema of [true, false]) {
    if (!withSchema && !params.outputSchema) break;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
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
        return { ok: false, status: response.status, details: errorText.slice(0, 500) };
      }
      const data = (await response.json()) as { message?: { content?: string } };
      const content = data.message?.content ?? '';
      if (content.trim()) {
        return { ok: true, content };
      }
      return { ok: false, status: 502, details: 'Empty model response' };
    } catch (err) {
      clearTimeout(timeoutId);
      if (err instanceof Error && err.name === 'AbortError') {
        return { ok: false, status: 504, details: 'Request timeout' };
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
    return json({
      status: 'ok',
      configured: true,
      cloudConfigured: !isLocal && Boolean(apiKey),
      runtime: 'edge',
      target,
      model,
      endpoint,
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

  const models = isLocal ? [localModel] : cloudModelsToTry(cloudModel);
  let lastError = { status: 502, details: 'Unknown error' };

  for (const tryModel of models) {
    const result = await attemptOllamaChat({
      endpoint,
      headers,
      model: tryModel,
      systemPrompt: body.systemPrompt,
      userPrompt: body.userPrompt,
      cleanBase64,
      outputSchema,
    });

    if (result.ok) {
      return json({
        content: result.content,
        source: isLocal ? 'ollama-local' : 'ollama-hosted',
        model: tryModel,
        ...(!isLocal && tryModel !== cloudModelRequested
          ? {
              requestedModel: cloudModelRequested,
              cloudNote:
                tryModel === CLOUD_VISION_FALLBACK
                  ? 'Cloud vision fallback uses Gemma 3 4B; local demo uses Gemma 4 E4B'
                  : 'E4B runs locally; cloud uses Gemma 4 31B',
            }
          : {}),
        target,
      });
    }

    lastError = { status: result.status, details: result.details };
    if (result.status === 401) {
      return json(
        { error: 'Invalid Ollama API key', code: 'INVALID_API_KEY', details: result.details },
        401,
      );
    }
  }

  return json(
    {
      error: 'Ollama error',
      code: 'OLLAMA_ERROR',
      status: lastError.status,
      details: lastError.details,
      modelsTried: models,
    },
    502,
  );
}
