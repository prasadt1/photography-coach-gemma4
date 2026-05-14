/**
 * Vercel Serverless API Route: /api/analyze
 *
 * Proxies image analysis requests to Ollama Cloud when local Ollama isn't available.
 * This enables the live Vercel demo to perform REAL Gemma 4 analysis.
 *
 * Environment Variables:
 *   OLLAMA_API_KEY - API key for Ollama Cloud (set in Vercel dashboard)
 *
 * Detection priority (handled by client):
 *   1. Local Ollama (localhost:11434) — always preferred
 *   2. Ollama Cloud via this route — when local unavailable
 *   3. Demo Mode — graceful fallback with canned responses
 */

// Vercel serverless types (compatible with Vercel Node.js runtime)
interface VercelRequest {
  method?: string;
  body: unknown;
}

interface VercelResponse {
  status(code: number): VercelResponse;
  json(data: unknown): void;
}

// Ollama Cloud configuration
const OLLAMA_CLOUD_URL = 'https://api.ollama.com/api/chat';
const CLOUD_MODEL = 'gemma4:31b-cloud';  // Ollama Cloud model identifier
const TIMEOUT_MS = 120_000;  // 2 minutes - same as local

interface AnalyzeRequest {
  base64Image: string;
  systemPrompt: string;
  userPrompt: string;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
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
      message: 'OLLAMA_API_KEY environment variable not set. Falling back to Demo Mode.',
    });
  }

  try {
    const body = req.body as AnalyzeRequest;

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

    // Prepare Ollama Cloud request
    const ollamaRequest = {
      model: CLOUD_MODEL,
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

      // Return specific error codes for client to handle fallback
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
        details: errorText.slice(0, 200),
      });
    }

    const data = await response.json();
    const content = data.message?.content ?? '';

    return res.status(200).json({
      content,
      source: 'ollama-cloud',
      model: CLOUD_MODEL,
      tokenUsage: {
        promptTokens: data.prompt_eval_count,
        completionTokens: data.eval_count,
        totalTokens: (data.prompt_eval_count ?? 0) + (data.eval_count ?? 0),
      },
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
