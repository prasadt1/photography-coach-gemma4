/**
 * electron/preload.ts — Preload script (IPC bridge)
 *
 * Runs in the renderer context before any web content loads.
 * Exposes a safe, narrow API surface to the renderer via contextBridge.
 * The renderer checks `window.electronAPI?.isElectron` to detect desktop mode.
 *
 * Sources: docs/specs/10-platform-shells-spec.md §4.2
 */

import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  /** Switch between Studio and Vault mode (restarts window with new policy). */
  selectMode: (mode: 'studio' | 'vault') =>
    ipcRenderer.invoke('select-mode', mode),

  /** Open native file-save dialog and write audit log JSONL. */
  exportAuditLog: (logData: string) =>
    ipcRenderer.invoke('export-audit-log', logData),

  /** Query which mode the main process is running in. */
  getMode: () => ipcRenderer.invoke('get-mode'),

  /** Platform string (darwin / win32 / linux) for platform-specific UI. */
  platform: process.platform,

  /** Renderer can use this to detect it's running inside Electron. */
  isElectron: true as const,

  // ─── Batch Processing API ────────────────────────────────────────────────

  /** Select folder containing photos to batch process. */
  selectBatchFolder: () => ipcRenderer.invoke('select-batch-folder'),

  /** Select output directory for XMP files. */
  selectBatchOutputDir: () => ipcRenderer.invoke('select-batch-output-dir'),

  /** Initialize batch queue (creates jobs.jsonl, checkpoint.json). */
  batchInitQueue: (config: { batchDir: string; photoPaths: string[] }) =>
    ipcRenderer.invoke('batch-init-queue', config),

  /** Get unprocessed jobs from queue (resume from checkpoint). */
  batchGetUnprocessed: (batchDir: string) =>
    ipcRenderer.invoke('batch-get-unprocessed', batchDir),

  /** Record job completion. */
  batchRecordComplete: (params: { batchDir: string; jobId: string; result: any; latencyMs: number }) =>
    ipcRenderer.invoke('batch-record-complete', params),

  /** Record job error. */
  batchRecordError: (params: { batchDir: string; jobId: string; error: string }) =>
    ipcRenderer.invoke('batch-record-error', params),

  /** Export all XMP files from results.jsonl. */
  batchExportXMP: (params: { batchDir: string; outputDir: string }) =>
    ipcRenderer.invoke('batch-export-xmp', params),

  /** Get current checkpoint state. */
  batchGetCheckpoint: (batchDir: string) =>
    ipcRenderer.invoke('batch-get-checkpoint', batchDir),

  /** Read file as base64 data URL. */
  readFileAsBase64: (filePath: string) =>
    ipcRenderer.invoke('read-file-as-base64', filePath),
});

// Type declaration — this file is also referenced by the renderer's TypeScript
// via /// <reference path="../electron/preload.ts" /> or tsconfig include.
declare global {
  interface Window {
    electronAPI?: {
      selectMode: (mode: 'studio' | 'vault') => Promise<void>;
      exportAuditLog: (logData: string) => Promise<{ success: boolean; path?: string }>;
      getMode: () => Promise<'studio' | 'vault'>;
      platform: string;
      isElectron: true;
      // Batch processing
      selectBatchFolder: () => Promise<{ success: boolean; folderPath?: string; photoPaths?: string[] }>;
      selectBatchOutputDir: () => Promise<{ success: boolean; outputDir?: string }>;
      batchInitQueue: (config: { batchDir: string; photoPaths: string[] }) => Promise<{ success: boolean; error?: string }>;
      batchGetUnprocessed: (batchDir: string) => Promise<{ success: boolean; jobs?: any[]; error?: string }>;
      batchRecordComplete: (params: { batchDir: string; jobId: string; result: any; latencyMs: number }) => Promise<{ success: boolean; error?: string }>;
      batchRecordError: (params: { batchDir: string; jobId: string; error: string }) => Promise<{ success: boolean; error?: string }>;
      batchExportXMP: (params: { batchDir: string; outputDir: string }) => Promise<{ success: boolean; count?: number; error?: string }>;
      batchGetCheckpoint: (batchDir: string) => Promise<{ success: boolean; checkpoint?: any; error?: string }>;
      readFileAsBase64: (filePath: string) => Promise<{ success: boolean; base64?: string; mimeType?: string; error?: string }>;
    };
  }
}
