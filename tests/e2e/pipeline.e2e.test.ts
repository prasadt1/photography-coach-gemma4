/**
 * E2E pipeline tests — Day 4 spec requirement
 *
 * These tests exercise the full analysis pipeline end-to-end using
 * real services (Ollama + auditService) without a browser, verifying
 * the critical paths the manual test checklist relies on.
 *
 *   P-1  Studio Mode happy path  (upload → pipeline → valid result)
 *   P-2  Vault Mode audit log    (pipeline + audit → verify chain → export)
 *   CP-2 Audit log export/import (export JSONL → hash chain intact)
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { checkOllamaHealth, analyzePhoto } from '../../services/ollamaService';
import {
  setOperationalMode,
  logAnalysis,
  verifyChain,
  exportAuditLog,
} from '../../services/auditService';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const SPIKE_DIR = join(process.cwd(), 'spike');
const TEST_PHOTO = join(SPIKE_DIR, 'test-landscape.jpg');

let imageBuffer: ArrayBuffer;
let imageBase64: string;

// Cache a single analysis result to avoid redundant Ollama calls across tests
import type { PhotoAnalysisV2 } from '../../types.v2';
let cachedAnalysis: PhotoAnalysisV2 | null = null;

async function getOrRunAnalysis(): Promise<PhotoAnalysisV2> {
  if (!cachedAnalysis) {
    cachedAnalysis = await analyzePhoto(imageBase64, 'image/jpeg');
  }
  return cachedAnalysis;
}

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeAll(async () => {
  const bytes = await readFile(TEST_PHOTO);
  imageBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  imageBase64 = bytes.toString('base64');

  // Verify Ollama is alive before running tests
  const health = await checkOllamaHealth();
  if (!health.running) {
    throw new Error('Ollama not running — skipping e2e tests. Run: ollama serve');
  }
  console.log('\n✅  E2E precondition: Ollama running');
}, 15000);

afterAll(() => {
  // Reset to Studio Mode after Vault Mode tests
  setOperationalMode('studio');
});

// ─── P-1: Studio Mode happy path ──────────────────────────────────────────────

describe('P-1: Studio Mode happy path', () => {
  it('full pipeline returns a valid v2 schema result', async () => {
    setOperationalMode('studio');

    // analyzePhoto validates internally and returns PhotoAnalysisV2 or throws.
    // We cache the result so downstream tests reuse it without extra Ollama calls.
    const data = await getOrRunAnalysis();
    expect(data).toBeDefined();
    expect(data.schema_version).toBe('2.0');
    expect(data.scores.composition).toBeGreaterThanOrEqual(0);
    expect(data.scores.composition).toBeLessThanOrEqual(10);
    expect(Array.isArray(data.strengths)).toBe(true);
    expect(Array.isArray(data.improvements)).toBe(true);

    const scores = Object.values(data.scores) as number[];
    console.log(`[P-1] ✅  Score avg: ${(scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)}`);
  }, 120000);

  it('result includes rationale with observations and priorityFixes', async () => {
    const data = await getOrRunAnalysis();
    expect(Array.isArray(data.rationale.observations)).toBe(true);
    expect(Array.isArray(data.rationale.priorityFixes)).toBe(true);
    console.log(`[P-1] ✅  Observations: ${data.rationale.observations.length}, Fixes: ${data.rationale.priorityFixes.length}`);
  }, 120000);
});

// ─── P-2: Vault Mode audit log flow ───────────────────────────────────────────

describe('P-2: Vault Mode audit log', () => {
  it('analysis in Vault Mode produces an audit log entry', async () => {
    setOperationalMode('vault');

    // Reuse the cached analysis — no extra Ollama call needed to test audit logging
    const data = await getOrRunAnalysis();
    expect(data).toBeDefined();

    const entry = await logAnalysis(imageBuffer, data);
    expect(entry).toBeDefined();
    expect(entry.event).toBe('analysis_complete');
    expect(typeof entry.hash).toBe('string');
    expect(entry.hash).toHaveLength(64); // SHA-256 hex
    expect(entry.seq).toBeGreaterThanOrEqual(1);
    console.log(`[P-2] ✅  Audit entry seq=${entry.seq} hash=${entry.hash.slice(0, 16)}…`);
  }, 150000);

  it('verifyChain passes after logging', async () => {
    const result = await verifyChain();
    expect(result.valid).toBe(true);
    expect(result.brokenAt).toBeUndefined();
    console.log('[P-2] ✅  Hash chain verified — no tampering detected');
  }, 10000);
});

// ─── CP-2: Audit log export / import ─────────────────────────────────────────

describe('CP-2: Audit log export integrity', () => {
  it('exported log is valid JSONL with hash fields', async () => {
    const jsonl = await exportAuditLog();
    expect(typeof jsonl).toBe('string');
    expect(jsonl.length).toBeGreaterThan(0);

    // Each non-empty line must be parseable JSON with a hash field
    const lines = jsonl.split('\n').filter(l => l.trim().length > 0 && !l.startsWith('#'));
    expect(lines.length).toBeGreaterThan(0);

    for (const line of lines) {
      const entry = JSON.parse(line);
      expect(typeof entry.hash).toBe('string');
      expect(entry.hash).toHaveLength(64);
      expect(typeof entry.seq).toBe('number');
      expect(typeof entry.prevHash).toBe('string');
    }

    console.log(`[CP-2] ✅  Exported ${lines.length} audit entries — all valid JSONL`);
  }, 10000);

  it('exported log chain verifies cleanly (tamper-evidence check)', async () => {
    const { sha256 } = await import('hash-wasm');
    const jsonl = await exportAuditLog();
    const lines = jsonl.split('\n').filter(l => l.trim().length > 0 && !l.startsWith('#'));

    let prevHash = '0000000000000000000000000000000000000000000000000000000000000000';
    for (const line of lines) {
      const entry = JSON.parse(line);
      expect(entry.prevHash).toBe(prevHash);
      // Recompute hash
      const { hash, ...rest } = entry;
      const computed = await sha256(JSON.stringify(rest));
      expect(computed).toBe(hash);
      prevHash = hash;
    }
    console.log(`[CP-2] ✅  Chain cryptographically intact across ${lines.length} entries`);
  }, 10000);
});
