/**
 * electron/main.ts — Electron main process
 * Entry point for the desktop app (Vault Mode primary).
 *
 * Sources: docs/specs/10-platform-shells-spec.md §4.2
 */

import { app, BrowserWindow, session, ipcMain } from 'electron';
import path from 'path';
import { applyVaultPolicy } from './vault-policy';

let mainWindow: BrowserWindow | null = null;
let currentMode: 'studio' | 'vault' = 'studio';

function createWindow(mode: 'studio' | 'vault'): void {
  currentMode = mode;

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: `Photography Coach — ${mode === 'vault' ? '🔒 Vault Mode' : '⚡ Studio Mode'}`,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // Enable DevTools for debugging blank windows
  mainWindow.webContents.openDevTools();

  // Apply OS-level network isolation for Vault Mode
  if (mode === 'vault') {
    applyVaultPolicy(session.defaultSession);
    console.log('[main] Vault Mode: network isolation active');
  }

  // Load React renderer from the Vite build output.
  // electron-dist/ is one level below the project root, so ../dist/ is correct.
  mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ─── App lifecycle ────────────────────────────────────────────────────────────

app.whenReady().then(() => {
  // Register IPC handlers inside whenReady — Electron 35+ requires ipcMain
  // to be accessed after the app is initialized (lazy export).

  ipcMain.handle('select-mode', (_event, mode: 'studio' | 'vault') => {
    if (mainWindow) {
      mainWindow.close();
    }
    createWindow(mode);
  });

  ipcMain.handle('export-audit-log', async (_event, logData: string) => {
    const { dialog } = await import('electron');
    const { filePath } = await dialog.showSaveDialog({
      title: 'Export Vault Mode Audit Log',
      defaultPath: `audit-log-${new Date().toISOString().split('T')[0]}.jsonl`,
      filters: [
        { name: 'JSON Lines', extensions: ['jsonl'] },
        { name: 'JSON', extensions: ['json'] },
      ],
    });
    if (filePath) {
      const fs = await import('fs/promises');
      await fs.writeFile(filePath, logData, 'utf-8');
      return { success: true, path: filePath };
    }
    return { success: false };
  });

  ipcMain.handle('get-mode', () => currentMode);

  // Default to Studio Mode on first launch.
  createWindow('studio');
});

app.on('window-all-closed', () => {
  // macOS convention: keep process alive until Cmd+Q
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // macOS convention: re-create window when dock icon is clicked
  if (mainWindow === null) {
    createWindow(currentMode);
  }
});
