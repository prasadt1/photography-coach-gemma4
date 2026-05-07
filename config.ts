/**
 * Photography Coach v2 — Runtime Configuration
 * All environment-specific values in one place.
 */

export const OLLAMA_CONFIG = {
  baseUrl: 'http://localhost:11434',
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
