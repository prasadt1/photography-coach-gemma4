/**
 * auditService.ts — Hash-chained audit log for Vault Mode
 * Provides tamper-evident logging of all analysis events.
 *
 * Sources: docs/specs/08-vault-mode-spec.md
 *
 * Security model:
 *   - Each entry contains the SHA-256 hash of the previous entry
 *   - Tampering any entry invalidates all subsequent hashes
 *   - Log stored in IndexedDB via the `idb` library (Day 3 spec requirement)
 *   - localStorage used as fallback when IndexedDB is unavailable
 *   - Users can export as JSONL for external verification
 */

import { sha256 } from 'hash-wasm';
import { openDB as idbOpenDB, type IDBPDatabase } from 'idb';
import { AuditLogEntry, PhotoAnalysisV2, OperationalMode } from '../types.v2';

const DB_NAME = 'photography-coach-vault';
const STORE_NAME = 'audit_log';
const GENESIS_HASH = '0000000000000000000000000000000000000000000000000000000000000000';

// ─── In-memory state ──────────────────────────────────────────────────────────

let currentMode: OperationalMode = 'studio';
let lastHash = GENESIS_HASH;
let seqCounter = 0;
let seqInitialized = false;

async function initSeqCounter(): Promise<void> {
  if (seqInitialized) return;
  seqInitialized = true;
  try {
    const entries = await getAllEntries();
    if (entries.length > 0) {
      seqCounter = Math.max(...entries.map(e => e.seq));
      lastHash = entries[entries.length - 1].hash;
    }
  } catch {
    // If we can't read IDB, start from 0 — not ideal but safe
  }
}

// ─── Mode guard ───────────────────────────────────────────────────────────────

export function setOperationalMode(mode: OperationalMode): void {
  currentMode = mode;
  if (mode === 'vault') {
    installEgressGuard();
  } else {
    uninstallEgressGuard();
  }
}

export function getOperationalMode(): OperationalMode {
  return currentMode;
}

// ─── Vault Mode network egress guard ─────────────────────────────────────────
// Intercepts fetch calls and blocks cloud API calls in Vault Mode.

import { VAULT_BLOCKED_HOSTS } from '../config';

const originalFetch = globalThis.fetch;
let egressGuardInstalled = false;

function installEgressGuard(): void {
  if (egressGuardInstalled) return;
  egressGuardInstalled = true;

  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = input instanceof URL ? input : new URL(input.toString(), 'http://localhost');
    const hostname = url.hostname;

    const blocked = VAULT_BLOCKED_HOSTS.some(h => hostname.includes(h));
    if (blocked) {
      const msg = `[Vault Mode] Blocked outbound request to ${hostname}`;
      console.warn(msg);
      await logEvent('mode_change', '', '', 'vault-egress-block', { blockedHost: hostname });
      throw new EgressBlockedError(msg);
    }

    return originalFetch(input, init);
  };
}

function uninstallEgressGuard(): void {
  if (!egressGuardInstalled) return;
  globalThis.fetch = originalFetch;
  egressGuardInstalled = false;
}

// ─── Audit log events ─────────────────────────────────────────────────────────

export async function logAnalysis(
  imageBytes: ArrayBuffer,
  analysis: PhotoAnalysisV2,
  filename?: string,
): Promise<AuditLogEntry> {
  if (currentMode !== 'vault') return null as unknown as AuditLogEntry; // No-op in Studio Mode

  const imageHash = await sha256(new Uint8Array(imageBytes));
  const resultHash = await sha256(JSON.stringify(analysis));
  return logEvent('analysis_complete', imageHash, resultHash, analysis.model_id, filename ? { filename } : undefined);
}

export async function logRefusal(imageBytes: ArrayBuffer, reason: string): Promise<void> {
  if (currentMode !== 'vault') return;
  const imageHash = await sha256(new Uint8Array(imageBytes));
  await logEvent('refusal', imageHash, '', 'gemma-4-e4b', { reason });
}

// ─── Internal log entry builder ───────────────────────────────────────────────

async function logEvent(
  event: AuditLogEntry['event'],
  imageHash: string,
  resultHash: string,
  modelId: string,
  metadata?: Record<string, unknown>,
): Promise<AuditLogEntry> {
  await initSeqCounter();
  seqCounter++;
  const entryWithoutSelfHash = {
    seq: seqCounter,
    timestamp: Date.now(),
    event,
    imageHash,
    resultHash: resultHash || undefined,
    modelId,
    prevHash: lastHash,
    metadata,
  };

  const selfHash = await sha256(JSON.stringify(entryWithoutSelfHash));
  const entry: AuditLogEntry = { ...entryWithoutSelfHash, hash: selfHash };

  lastHash = selfHash;
  await persistEntry(entry);
  return entry;
}

// ─── Persistence (IndexedDB via `idb` library) ────────────────────────────────

type AuditDB = IDBPDatabase<{
  [STORE_NAME]: {
    key: number;
    value: AuditLogEntry;
    indexes: Record<string, never>;
  };
}>;

let dbPromise: Promise<AuditDB> | null = null;

function getDB(): Promise<AuditDB> {
  if (!dbPromise) {
    dbPromise = idbOpenDB<{ [STORE_NAME]: { key: number; value: AuditLogEntry; indexes: Record<string, never> } }>(DB_NAME, 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'seq', autoIncrement: true });
        }
      },
    });
  }
  return dbPromise;
}

// In-memory fallback used when neither IndexedDB nor localStorage is available
// (e.g. Node.js test environment).
const _memoryFallback: AuditLogEntry[] = [];

async function persistEntry(entry: AuditLogEntry): Promise<void> {
  try {
    const db = await getDB();
    await db.put(STORE_NAME, entry);
  } catch {
    // Fallback 1: localStorage (web, capped at ~5MB, last 50 entries)
    try {
      if (typeof localStorage !== 'undefined') {
        const existing: AuditLogEntry[] = JSON.parse(localStorage.getItem('audit_log') ?? '[]');
        existing.push(entry);
        localStorage.setItem('audit_log', JSON.stringify(existing.slice(-50)));
        return;
      }
    } catch {
      // localStorage unavailable — fall through to memory
    }
    // Fallback 2: in-memory (Node.js / SSR — lost on process exit)
    _memoryFallback.push(entry);
  }
}

// ─── Export ───────────────────────────────────────────────────────────────────

export async function exportAuditLog(): Promise<string> {
  const entries = await getAllEntries();
  return entries.map(e => JSON.stringify(e)).join('\n');
}

export async function verifyChain(): Promise<{ valid: boolean; brokenAt?: number }> {
  const entries = await getAllEntries();
  let prevHash = GENESIS_HASH;

  for (const entry of entries) {
    if (entry.prevHash !== prevHash) {
      return { valid: false, brokenAt: entry.seq };
    }
    // Recompute entry hash to detect tampering
    const { hash, ...rest } = entry;
    const computed = await sha256(JSON.stringify(rest));
    if (computed !== hash) {
      return { valid: false, brokenAt: entry.seq };
    }
    prevHash = hash;
  }

  return { valid: true };
}

async function getAllEntries(): Promise<AuditLogEntry[]> {
  try {
    const db = await getDB();
    return await db.getAll(STORE_NAME);
  } catch {
    // Fallback 1: localStorage (web)
    try {
      if (typeof localStorage !== 'undefined') {
        return JSON.parse(localStorage.getItem('audit_log') ?? '[]');
      }
    } catch {
      // fall through
    }
    // Fallback 2: in-memory (Node.js / SSR)
    return [..._memoryFallback];
  }
}

// ─── Error types ──────────────────────────────────────────────────────────────

export class EgressBlockedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EgressBlockedError';
  }
}
