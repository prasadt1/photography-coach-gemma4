/**
 * Vercel Serverless API Route: /api/analyze
 *
 * Proxies image analysis to Ollama (cloud or local Mac via OLLAMA_TARGET=local).
 *
 * Environment Variables:
 *   OLLAMA_API_KEY - Required when OLLAMA_TARGET=cloud (default)
 *   OLLAMA_CLOUD_MODEL - Optional cloud model (default: gemma4:31b-cloud)
 *   OLLAMA_TARGET - "cloud" (default) | "local"
 *   OLLAMA_LOCAL_URL - Optional (default: http://127.0.0.1:11434)
 *   OLLAMA_LOCAL_MODEL - Optional (default: gemma4:e4b)
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

const OLLAMA_CLOUD_URL = 'https://ollama.com/api/chat';
const DEFAULT_CLOUD_MODEL = 'gemma4:31b-cloud';
const DEFAULT_LOCAL_URL = 'http://127.0.0.1:11434';
const DEFAULT_LOCAL_MODEL = 'gemma4:e4b';
const TIMEOUT_MS = 120_000;

interface AnalyzeRequest {
  base64Image: string;
  systemPrompt: string;
  userPrompt: string;
  healthCheck?: boolean;
}

function getTarget(): 'local' | 'cloud' {
  return process.env.OLLAMA_TARGET === 'local' ? 'local' : 'cloud';
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const target = getTarget();
  const isLocal = target === 'local';
  const localUrl = (process.env.OLLAMA_LOCAL_URL || DEFAULT_LOCAL_URL).replace(/\/$/, '');
  const localModel = process.env.OLLAMA_LOCAL_MODEL || DEFAULT_LOCAL_MODEL;
  const cloudModel = process.env.OLLAMA_CLOUD_MODEL || DEFAULT_CLOUD_MODEL;
  const apiKey = process.env.OLLAMA_API_KEY;

  if (!isLocal && !apiKey) {
    return res.status(503).json({
      error: 'Hosted analysis not configured',
      code: 'NO_API_KEY',
      message: 'OLLAMA_API_KEY environment variable not set.',
    });
  }

  const model = isLocal ? localModel : cloudModel;
  const endpoint = isLocal ? `${localUrl}/api/chat` : OLLAMA_CLOUD_URL;

  try {
    const body = req.body as AnalyzeRequest;

    if (body?.healthCheck) {
      return res.status(200).json({
        status: 'ok',
        configured: true,
        target,
        model,
        endpoint,
      });
    }

    if (!body?.base64Image || !body.systemPrompt || !body.userPrompt) {
      return res.status(400).json({
        error: 'Missing required fields: base64Image, systemPrompt, userPrompt',
      });
    }

    const cleanBase64 = body.base64Image.includes('base64,')
      ? body.base64Image.split('base64,')[1]
      : body.base64Image;

    const ollamaRequest = {
      model,
      messages: [
        { role: 'system', content: body.systemPrompt },
        { role: 'user', content: body.userPrompt, images: [cleanBase64] },
      ],
      stream: false,
      options: {
        temperature: 0.1,
        num_predict: 1024,
      },
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    console.log(`[/api/analyze] target=${target}`, endpoint, 'model:', model);

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (!isLocal && apiKey) {
      headers.Authorization = `Bearer ${apiKey}`;
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(ollamaRequest),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[/api/analyze] Ollama error:', response.status, errorText);

      if (!isLocal && response.status === 401) {
        return res.status(401).json({
          error: 'Invalid API key',
          code: 'INVALID_API_KEY',
        });
      }

      return res.status(502).json({
        error: 'Ollama error',
        code: 'OLLAMA_ERROR',
        status: response.status,
        details: errorText.slice(0, 500),
      });
    }

    const data = await response.json();
    const content = data.message?.content ?? '';

    return res.status(200).json({
      content,
      source: isLocal ? 'ollama-local' : 'ollama-hosted',
      model,
      target,
    });
  } catch (err) {
    console.error('[/api/analyze] Error:', err);

    if (err instanceof Error && err.name === 'AbortError') {
      return res.status(504).json({ error: 'Request timeout', code: 'TIMEOUT' });
    }

    return res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
      message: err instanceof Error ? err.message : 'Unknown error',
    });
  }
}
