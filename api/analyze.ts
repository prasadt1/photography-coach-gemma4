/**
 * Vercel Serverless API Route: /api/analyze
 *
 * Proxies image analysis requests to Ollama Cloud.
 * API docs: https://docs.ollama.com/cloud
 *
 * Environment Variables (set in Vercel dashboard):
 *   OLLAMA_API_KEY - Required: Your Ollama Cloud API key from ollama.com/settings/keys
 *   OLLAMA_CLOUD_MODEL - Optional: Model to use (default: gemma3:27b)
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

// Ollama Cloud configuration - uses same API format as local Ollama
const OLLAMA_CLOUD_URL = 'https://ollama.com/api/chat';
const DEFAULT_MODEL = 'gemma4';  // Gemma 4 with vision support on Ollama Cloud
const TIMEOUT_MS = 120_000;  // 2 minutes

interface AnalyzeRequest {
  base64Image: string;
  systemPrompt: string;
  userPrompt: string;
  healthCheck?: boolean;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  // CORS headers for browser requests
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only accept POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Check for API key
  const apiKey = process.env.OLLAMA_API_KEY;
  if (!apiKey) {
    return res.status(503).json({
      error: 'Ollama Cloud not configured',
      code: 'NO_API_KEY',
      message: 'OLLAMA_API_KEY environment variable not set.',
    });
  }

  const model = process.env.OLLAMA_CLOUD_MODEL || DEFAULT_MODEL;

  try {
    const body = req.body as AnalyzeRequest;

    // Health check endpoint
    if (body.healthCheck) {
      return res.status(200).json({
        status: 'ok',
        cloudConfigured: true,
        model: model,
        endpoint: OLLAMA_CLOUD_URL,
      });
    }

    // Validate request
    if (!body.base64Image || !body.systemPrompt || !body.userPrompt) {
      return res.status(400).json({
        error: 'Missing required fields: base64Image, systemPrompt, userPrompt',
      });
    }

    // Clean base64 if it has data URI prefix
    const cleanBase64 = body.base64Image.includes('base64,')
      ? body.base64Image.split('base64,')[1]
      : body.base64Image;

    // Prepare Ollama Cloud request - same format as local Ollama
    const ollamaRequest = {
      model: model,
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

    // Call Ollama Cloud
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    console.log('[/api/analyze] Calling Ollama Cloud:', OLLAMA_CLOUD_URL, 'model:', model);

    const response = await fetch(OLLAMA_CLOUD_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(ollamaRequest),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[/api/analyze] Ollama Cloud error:', response.status, errorText);

      if (response.status === 401) {
        return res.status(401).json({
          error: 'Invalid API key',
          code: 'INVALID_API_KEY',
          details: 'Check your OLLAMA_API_KEY in Vercel environment variables',
        });
      }
      if (response.status === 429) {
        return res.status(429).json({
          error: 'Rate limited',
          code: 'RATE_LIMITED',
        });
      }
      if (response.status === 404) {
        return res.status(404).json({
          error: 'Model not found',
          code: 'MODEL_NOT_FOUND',
          details: `Model "${model}" not available. Try: gemma3:27b, gemma2:27b, llama3.2-vision`,
        });
      }

      return res.status(502).json({
        error: 'Ollama Cloud error',
        code: 'CLOUD_ERROR',
        status: response.status,
        details: errorText.slice(0, 500),
      });
    }

    const data = await response.json();
    const content = data.message?.content ?? '';

    console.log('[/api/analyze] Success, response length:', content.length);

    return res.status(200).json({
      content,
      source: 'ollama-cloud',
      model: model,
    });

  } catch (err) {
    console.error('[/api/analyze] Error:', err);

    if (err instanceof Error && err.name === 'AbortError') {
      return res.status(504).json({
        error: 'Request timeout',
        code: 'TIMEOUT',
      });
    }

    return res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
      message: err instanceof Error ? err.message : 'Unknown error',
    });
  }
}
