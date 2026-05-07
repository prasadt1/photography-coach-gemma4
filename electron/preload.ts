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
    };
  }
}
