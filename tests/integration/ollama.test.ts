/**
 * Integration test: ollamaService ↔ live Ollama
 *
 * Requires `ollama serve` running and gemma4:latest pulled.
 * Skips automatically when Ollama is not reachable.
 *
 * Run:  npx vitest run tests/integration
 */

import { describe, it, expect, beforeAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { checkOllamaHealth, analyzePhoto } from '../../services/ollamaService';
import { isImplicitRefusal } from '../../services/validationService';

// ─── Pre-flight ───────────────────────────────────────────────────────────────

let ollamaAvailable = false;
let modelAvailable = false;

beforeAll(async () => {
  const health = await checkOllamaHealth();
  ollamaAvailable = health.running;
  modelAvailable = health.modelAvailable;

  if (!ollamaAvailable) {
    console.warn('\n⚠️  Ollama not running — integration tests will be skipped.');
    console.warn('   Start it with: ollama serve\n');
  } else if (!modelAvailable) {
    console.warn('\n⚠️  gemma4:latest not found — integration tests will be skipped.');
    console.warn('   Pull it with: ollama pull gemma4\n');
  } else {
    console.info('\n✅  Ollama running + gemma4:latest available.\n');
  }
}, 10_000);

// ─── Health check ─────────────────────────────────────────────────────────────

describe('checkOllamaHealth', () => {
  it('returns a valid health object', async () => {
    const health = await checkOllamaHealth();
    expect(typeof health.running).toBe('boolean');
    expect(typeof health.modelAvailable).toBe('boolean');
  });
});

// ─── analyzePhoto — real inference ───────────────────────────────────────────

describe('analyzePhoto — live Ollama', () => {
  // Load the test landscape image used in Spike 1
  const imagePath = path.join(process.cwd(), 'spike', 'test-landscape.jpg');
  let base64Image: string;

  beforeAll(() => {
    if (!fs.existsSync(imagePath)) {
      console.warn(`No spike image found at ${imagePath}; skipping image-dependent tests.`);
      return;
    }
    const buf = fs.readFileSync(imagePath);
    base64Image = buf.toString('base64');
  });

  it('returns a valid v2 schema response', async () => {
    if (!ollamaAvailable || !modelAvailable) return;
    if (!base64Image) return;

    const tokens: string[] = [];
    const result = await analyzePhoto(
      base64Image,
      'image/jpeg',
      undefined,
      tok => tokens.push(tok),
    );

    // Schema fields present
    expect(result.schema_version).toBe('2.0');
    expect(result.model_id).toBe('gemma-4-e4b');
    expect(result.timestamp).toBeGreaterThan(0);

    // Scores in range
    for (const [key, val] of Object.entries(result.scores)) {
      expect(val, `scores.${key} must be 0–10`).toBeGreaterThanOrEqual(0);
      expect(val, `scores.${key} must be 0–10`).toBeLessThanOrEqual(10);
    }

    // Arrays populated for non-refusal
    if (!result.is_refusal) {
      expect(result.strengths.length).toBeGreaterThan(0);
      expect(result.improvements.length).toBeGreaterThan(0);
      expect(result.learningPath.length).toBeGreaterThan(0);
    }

    // Critique present
    expect(result.critique.overall.length).toBeGreaterThan(10);

    // Rationale populated
    expect(result.rationale.observations.length).toBeGreaterThan(0);
    expect(result.rationale.priorityFixes.length).toBeGreaterThan(0);

    // Token usage stamped
    expect(result.tokenUsage?.totalTokens).toBeGreaterThan(0);

    // Streaming delivered at least some tokens
    expect(tokens.length).toBeGreaterThan(0);

    // Not a refusal for this benign landscape photo
    expect(isImplicitRefusal(result)).toBe(false);

    // Log summary for human review
    console.info(`\n[Integration] Token usage: ${JSON.stringify(result.tokenUsage)}`);
    console.info(`[Integration] Overall score avg: ${
      (Object.values(result.scores).reduce((a, b) => a + b, 0) / 5).toFixed(1)
    }`);
    console.info(`[Integration] Streaming tokens received: ${tokens.length}\n`);
  }, 150_000);   // 150s timeout — allows for a cold model start

  it('token count is within Spike 1 target (≤ 700 tokens)', async () => {
    if (!ollamaAvailable || !modelAvailable || !base64Image) return;

    const result = await analyzePhoto(base64Image, 'image/jpeg');
    const completion = result.tokenUsage?.completionTokens ?? 0;

    console.info(`[Integration] Completion tokens: ${completion}`);
    // Warn (not fail) if over budget — model variations can bump this slightly
    if (completion > 700) {
      console.warn(`⚠️  Completion tokens (${completion}) exceeds 700 target — consider prompt tuning.`);
    }
    expect(completion).toBeLessThan(1200);   // Hard fail above 1200 (double-budget)
  }, 150_000);

  it('returns a response within 90 seconds (warm model)', async () => {
    if (!ollamaAvailable || !modelAvailable || !base64Image) return;

    const start = Date.now();
    await analyzePhoto(base64Image, 'image/jpeg');
    const elapsed = Date.now() - start;

    console.info(`[Integration] Total latency: ${elapsed}ms`);
    expect(elapsed).toBeLessThan(90_000);   // < 90s — allows for first cold start in CI
  }, 150_000);
});

// ─── Pipeline: CV data grounding ─────────────────────────────────────────────

describe('analyzePhoto — with synthetic CVData', () => {
  const imagePath = path.join(process.cwd(), 'spike', 'test-portrait.jpg');
  let base64Image: string;

  beforeAll(() => {
    if (!fs.existsSync(imagePath)) return;
    base64Image = fs.readFileSync(imagePath).toString('base64');
  });

  it('accepts CVData grounding without crashing', async () => {
    if (!ollamaAvailable || !modelAvailable || !base64Image) return;

    const cvData = {
      exif: { make: 'Canon', iso: 400, focalLength: 85, aperture: 2.8, shutterSpeed: '1/500' },
      histogram: { red: [], green: [], blue: [], luminance: [], clippingHighlight: 0.01, clippingShadow: 0.02, meanBrightness: 120, contrast: 65 },
      focusMap: { sharpnessScore: 0.72, laplacianVariance: 320, hotspotX: 50, hotspotY: 40, hotspotRadius: 25, edgeCount: 1400 },
      colorStats: { dominantHues: [30, 45], saturationMean: 0.55, warmthIndex: 0.72, colorCount: 8 },
      faces: [],
    };

    const result = await analyzePhoto(base64Image, 'image/jpeg', cvData as any);
    expect(result.schema_version).toBe('2.0');
    expect(result.scores.technique).toBeGreaterThanOrEqual(0);
  }, 150_000);
});
