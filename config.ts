/**
 * Photography Coach v2 — Runtime Configuration
 * All environment-specific values in one place.
 */

// Derive Ollama host from the page origin so LAN devices (phone, tablet)
// automatically reach the Mac running Ollama instead of their own localhost.
// Requires Ollama to be started with OLLAMA_HOST=0.0.0.0 for non-localhost access.
const _ollamaHost = (() => {
  if (typeof window === 'undefined') return 'localhost';
  const h = window.location.hostname;
  // Empty string = Electron file:// protocol; loopback addresses → use localhost
  if (!h || h === 'localhost' || h === '127.0.0.1' || h === '::1') return 'localhost';
  return h; // LAN IP — phone/tablet accessing via network
})();

// Detect if we're running in a deployed environment (Vercel, Netlify, GitHub Pages, etc.)
// If so, default to Demo Mode or Gemini API for judges to test without local Ollama
const _isDeployedEnvironment = (() => {
  if (typeof window === 'undefined') return false;
  const h = window.location.hostname;
  // Localhost and local IPs are NOT deployed
  if (!h || h === 'localhost' || h === '127.0.0.1' || h === '::1') return false;
  // Local network IPs (192.168.x.x, 10.x.x.x, etc.) are NOT deployed
  if (h.match(/^(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\.)/)) return false;
  // Everything else (vercel.app, netlify.app, github.io, custom domains) IS deployed
  return true;
})();

export const OLLAMA_CONFIG = {
  baseUrl: `http://${_ollamaHost}:11434`,
  model: 'gemma4:latest',
  modelId: 'gemma-4-e4b',           // Canonical ID written to v2 schema
  quantization: 'Q4_K_M',
  options: {
    temperature: 0.1,               // Low temp for structured output consistency
    num_predict: 1200,              // Raised from 700: 2-4 bounding boxes require ~400 extra tokens (~15s extra at 27tok/s)
  },
  timeoutMs: 120_000,               // 2 min per photo (generous for cold start)
  // Spike 1 findings:
  //   - Prefill: 2294 tok/s (fast), Generation: 27 tok/s, Model load: ~40s cold
  //   - Target: < 25s P95 warm (16 GB), < 15s on 32 GB+
  //   - Pre-load on app start to avoid 40s cold penalty
} as const;

export const SCHEMA_VERSION = '2.0';

// Demo Mode: When deployed (not localhost), default to Demo Mode for judges
// This allows testing the app without requiring local Ollama setup
//
// USAGE:
// 1. Deploy to Vercel/Netlify/GitHub Pages
// 2. App automatically detects it's not localhost
// 3. Shows banner: "Demo Mode: To use your own Ollama, visit http://YOUR_IP:5173"
// 4. Gracefully handles Ollama not being available (fallback to Gemini or mock)
//
export const DEMO_MODE_CONFIG = {
  isDeployedEnvironment: _isDeployedEnvironment,
  // When deployed, show a banner explaining Demo Mode and how to connect own Ollama
  enableDemoModeBanner: _isDeployedEnvironment,
  // Fallback strategy: 'gemini' = use Gemini API, 'mock' = mock responses, 'ollama-optional' = try Ollama but gracefully fallback
  deployedFallbackStrategy: 'ollama-optional' as 'gemini' | 'mock' | 'ollama-optional',
} as const;

// Ollama Cloud configuration for Vercel deployment fallback
// Priority: (1) Local Ollama → (2) Ollama Cloud → (3) Demo Mode
// Docs: https://docs.ollama.com/cloud
export const OLLAMA_CLOUD_CONFIG = {
  // Vercel serverless API route that proxies to Ollama Cloud
  apiRoute: '/api/analyze',
  // Model identifier on Ollama Cloud (gemma4 has vision support)
  model: 'gemma4',
  modelId: 'gemma4-cloud',
  // Whether cloud fallback is enabled (requires OLLAMA_API_KEY in Vercel)
  enabled: _isDeployedEnvironment,
} as const;

// Inference source tracking for UI badges
export type InferenceSource = 'local' | 'cloud' | 'demo';

// Get current inference source (used for UI badges)
export const getInferenceSourceLabel = (source: InferenceSource): string => {
  switch (source) {
    case 'local':
      return 'Local Gemma 4 · 100% Private';
    case 'cloud':
      return 'Ollama Cloud · Real Gemma 4';
    case 'demo':
      return 'Demo Mode · Sample Analysis';
  }
};

// Vault Mode: list of hostnames that are unconditionally blocked.
// The fetch interceptor (auditService.ts) checks against this list.
export const VAULT_BLOCKED_HOSTS = [
  'generativelanguage.googleapis.com',
  'googleapis.com',
  'openai.com',
  'anthropic.com',
  'api.cohere.ai',
] as const;

// Batch processing constants
export const BATCH_CONFIG = {
  checkpointEvery: 10,              // Save checkpoint every N jobs
  maxRetries: 2,
  retryDelayMs: 2000,
  maxFileSizeMb: 20,
} as const;

// Optional Gemini image generation (Studio Mode only, user API key required)
export const GEMINI_IMAGE_GEN = {
  model: 'gemini-2.5-flash',
  enabled: false,                   // Default off; user must opt-in with their own API key
  blockedInVault: true,
} as const;
