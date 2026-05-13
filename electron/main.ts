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
    title: `LENS — ${mode === 'vault' ? '🔒 Vault Mode' : '⚡ Studio Mode'}`,
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

  // In dev mode load from Vite dev server (HMR); in prod load built files.
  const devServerUrl = process.env.VITE_DEV_SERVER_URL;
  if (devServerUrl) {
    mainWindow.loadURL(devServerUrl);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

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

  // ─── Batch Processing IPC Handlers ──────────────────────────────────────

  ipcMain.handle('select-batch-folder', async () => {
    const { dialog } = await import('electron');
    const result = await dialog.showOpenDialog({
      title: 'Select Folder with Photos',
      properties: ['openDirectory'],
    });
    if (result.canceled) return { success: false };

    const fs = await import('fs/promises');
    const selectedPath = result.filePaths[0];
    const files = await fs.readdir(selectedPath);
    const photoExts = ['.jpg', '.jpeg', '.png', '.webp', '.heic', '.nef', '.cr2', '.arw'];
    const photoPaths = files
      .filter((f) => photoExts.some((ext) => f.toLowerCase().endsWith(ext)))
      .map((f) => path.join(selectedPath, f));

    return { success: true, folderPath: selectedPath, photoPaths };
  });

  ipcMain.handle('select-batch-output-dir', async () => {
    const { dialog } = await import('electron');
    const result = await dialog.showOpenDialog({
      title: 'Select Output Directory for XMP Files',
      properties: ['openDirectory'],
    });
    if (result.canceled) return { success: false };
    return { success: true, outputDir: result.filePaths[0] };
  });

  ipcMain.handle('batch-init-queue', async (_event, config: { batchDir: string; photoPaths: string[] }) => {
    try {
      const { BatchQueueManager } = await import('./batchService');
      const manager = new BatchQueueManager({ batchDir: config.batchDir });
      await manager.initializeQueue(config.photoPaths);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('batch-get-unprocessed', async (_event, batchDir: string) => {
    try {
      const { BatchQueueManager } = await import('./batchService');
      const manager = new BatchQueueManager({ batchDir });
      const jobs = await manager.getUnprocessedJobs();
      return { success: true, jobs };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('batch-record-complete', async (_event, params: { batchDir: string; jobId: string; result: any; latencyMs: number }) => {
    try {
      const { BatchQueueManager } = await import('./batchService');
      const manager = new BatchQueueManager({ batchDir: params.batchDir });
      await manager.recordJobComplete(params.jobId, params.result, params.latencyMs);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('batch-record-error', async (_event, params: { batchDir: string; jobId: string; error: string }) => {
    try {
      const { BatchQueueManager } = await import('./batchService');
      const manager = new BatchQueueManager({ batchDir: params.batchDir });
      await manager.recordJobError(params.jobId, params.error);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('batch-export-xmp', async (_event, params: { batchDir: string; outputDir: string }) => {
    try {
      const { BatchQueueManager } = await import('./batchService');
      const manager = new BatchQueueManager({ batchDir: params.batchDir });
      const count = await manager.exportAllXMP(params.outputDir);
      return { success: true, count };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('batch-get-checkpoint', async (_event, batchDir: string) => {
    try {
      const { BatchQueueManager } = await import('./batchService');
      const manager = new BatchQueueManager({ batchDir });
      const checkpoint = manager.getCheckpoint();
      return { success: true, checkpoint };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('read-file-as-base64', async (_event, filePath: string) => {
    try {
      const fs = await import('fs/promises');
      const buffer = await fs.readFile(filePath);
      const base64 = buffer.toString('base64');
      const ext = path.extname(filePath).toLowerCase();
      const mimeMap: Record<string, string> = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.webp': 'image/webp',
        '.heic': 'image/heic',
      };
      const mimeType = mimeMap[ext] || 'image/jpeg';
      return { success: true, base64: `data:${mimeType};base64,${base64}`, mimeType };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

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
