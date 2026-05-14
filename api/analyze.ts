/**
 * Vercel Serverless API Route: /api/analyze
 *
 * Proxies image analysis requests to Ollama Cloud when local Ollama isn't available.
 * This enables the live Vercel demo to perform REAL Gemma 4 analysis.
 *
 * Environment Variables:
 *   OLLAMA_API_KEY - API key for Ollama Cloud (set in Vercel dashboard)
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

// Ollama Cloud configuration
// TODO: Update these to match your Ollama Cloud account
const OLLAMA_CLOUD_URL = process.env.OLLAMA_CLOUD_URL || 'https://api.ollama.com/v1/chat/completions';
const CLOUD_MODEL = process.env.OLLAMA_CLOUD_MODEL || 'gemma2:9b';
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

  try {
    const body = req.body as AnalyzeRequest;

    // Health check endpoint
    if (body.healthCheck) {
      return res.status(200).json({
        status: 'ok',
        cloudConfigured: true,
        model: CLOUD_MODEL,
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

    // Prepare Ollama Cloud request (OpenAI-compatible format)
    const ollamaRequest = {
      model: CLOUD_MODEL,
      messages: [
        { role: 'system', content: body.systemPrompt },
        {
          role: 'user',
          content: [
            { type: 'text', text: body.userPrompt },
            { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${cleanBase64}` } },
          ],
        },
      ],
      temperature: 0.1,
      max_tokens: 1024,
    };

    // Call Ollama Cloud
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    console.log('[/api/analyze] Calling Ollama Cloud:', OLLAMA_CLOUD_URL, 'model:', CLOUD_MODEL);

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
        });
      }
      if (response.status === 429) {
        return res.status(429).json({
          error: 'Rate limited',
          code: 'RATE_LIMITED',
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
    // OpenAI-compatible response format
    const content = data.choices?.[0]?.message?.content ?? data.message?.content ?? '';

    console.log('[/api/analyze] Success, response length:', content.length);

    return res.status(200).json({
      content,
      source: 'ollama-cloud',
      model: CLOUD_MODEL,
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
