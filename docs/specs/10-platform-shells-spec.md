# 10. Platform Shells Spec

**Version:** 1.0
**Status:** Draft
**Dependencies:** 06-architecture-spec.md, 07-stack-and-runtime-mapping.md, 08-vault-mode-spec.md
**Owner:** Spec Session Lead

---

## 1. Overview

This spec defines **platform-specific deployment targets** for Photography Coach v2, including:

1. **Web app** - Studio Mode primary, Vault Mode development/demo only (mandatory floor)
2. **Desktop app** - Electron, Vault Mode primary, Studio Mode also supported (required for credible Vault Mode)
3. **iOS app** - PWA floor (guaranteed), LiteRT native (stretch goal, depends on Spike 3)

**Platform Priorities:**
- **Web (Studio):** MANDATORY - Primary deployment target for hobbyists and casual users
- **Desktop (Vault):** REQUIRED - Only platform with credible network isolation for confidential work
- **iOS (PWA):** GUARANTEED - Progressive Web App via Safari
- **iOS (native):** OPTIONAL - Depends on Spike 3 (LiteRT on-device inference)

**Key Constraint:** Web Studio Mode is mandatory floor. Desktop app required for credible Vault Mode network isolation claims. iOS native is stretch goal.

---

## 2. Platform Feature Matrix

### 2.1. Feature Support by Platform

| Feature | Web App | Desktop App | iOS PWA | iOS Native (Spike 3) |
|---------|---------|-------------|---------|---------------------|
| **Studio Mode** | ✅ Full | ✅ Full | ✅ Full | ✅ Full |
| **Vault Mode** | 🟡 Dev/Demo only* | ✅ Production | ⚠️ Not recommended** | ⚠️ Not recommended** |
| **Local Inference (Gemma)** | ✅ Via Ollama | ✅ Via Ollama | ✅ Via Ollama*** | ✅ Via LiteRT (native) |
| **CV Analysis** | ✅ Full | ✅ Full | ✅ Full | ✅ Full |
| **Image Generation** | ✅ Optional | ✅ Optional (disabled in Vault) | ✅ Optional | ✅ Optional |
| **Network Isolation** | ❌ Policy-based only | ✅ Cryptographic (Electron) | ❌ Not enforceable | ❌ Not enforceable |
| **Audit Logging** | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes |
| **Mentor Chat** | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes |
| **Session History** | ✅ IndexedDB | ✅ IndexedDB | ✅ IndexedDB | ✅ IndexedDB |

**Notes:**
- *Web Vault Mode: Lacks cryptographic network enforcement, suitable for dev/demo only
- **iOS Vault Mode: Cannot enforce network isolation (iOS restrictions), not recommended for confidential work
- ***iOS PWA: Requires Ollama server accessible on local network (e.g., Mac/PC running Ollama, iOS device on same WiFi)

### 2.2. Platform Recommendations

**Studio Mode (speed, convenience, optional cloud):**
1. **Primary:** Web app (deploy to Vercel/Netlify)
2. **Alternative:** Desktop app (offline capability, faster performance)
3. **Mobile:** iOS PWA (on-the-go coaching, requires local network Ollama access)

**Vault Mode (confidentiality, network isolation, audit logging):**
1. **Primary:** Desktop app (Electron) - ONLY platform with credible network isolation
2. **Not recommended:** Web, iOS PWA, iOS native - Cannot enforce network boundaries

---

## 3. Web App

### 3.1. Deployment Target

**Primary use case:** Studio Mode for hobbyists, serious amateurs, and working pros who don't need confidentiality.

**Hosting:**
- Static site (Vite build output)
- CDN delivery (Vercel, Netlify, Cloudflare Pages, GitHub Pages)
- No backend required (all state client-side)

**Requirements:**
- Modern browser (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+)
- Ollama running locally (localhost:11434)
- JavaScript enabled

### 3.2. Build Configuration

**vite.config.ts (web app):**
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/', // Or '/photography-coach-v2/' for GitHub Pages
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'charts': ['recharts'],
          'validation': ['zod']
        }
      }
    }
  },
  server: {
    port: 5173,
    open: true
  }
});
```

### 3.3. Deployment Steps

**Vercel:**
```bash
# 1. Install Vercel CLI
npm install -g vercel

# 2. Build production bundle
npm run build

# 3. Deploy
vercel --prod

# Output: https://photography-coach-v2.vercel.app
```

**Netlify:**
```bash
# 1. Install Netlify CLI
npm install -g netlify-cli

# 2. Build production bundle
npm run build

# 3. Deploy
netlify deploy --prod --dir=dist

# Output: https://photography-coach-v2.netlify.app
```

**GitHub Pages:**
```bash
# 1. Install gh-pages
npm install --save-dev gh-pages

# 2. Add to package.json scripts:
"deploy": "vite build --base=/photography-coach-v2/ && gh-pages -d dist"

# 3. Deploy
npm run deploy

# Output: https://{username}.github.io/photography-coach-v2/
```

### 3.4. Limitations

**Vault Mode in web browser:**
- ⚠️ No cryptographic network isolation (see 08-vault-mode-spec.md section 3.2)
- ⚠️ Browser extensions can intercept fetch() calls
- ⚠️ Dev tools can bypass request blocking
- ✅ Suitable for development/demo only, NOT production confidential work

**Recommended approach:**
- Display warning banner when Vault Mode selected in browser
- Provide "Download Desktop App" button prominently
- Allow "Continue Anyway" for dev/testing

### 3.5. Landing Page

**Entry screen (before photo upload):**
```
┌─────────────────────────────────────────────────┐
│  Photography Coach v2                            │
│  AI-powered photography coaching with Gemma 4    │
│                                                  │
│  Choose your mode:                               │
│                                                  │
│  ┌─────────────────┐  ┌─────────────────┐      │
│  │ ⚡ Studio Mode   │  │ 🔒 Vault Mode    │      │
│  │ Fast, flexible  │  │ Network-isolated │      │
│  │ [Select]        │  │ [Select]         │      │
│  └─────────────────┘  └─────────────────┘      │
│                                                  │
│  Requirements:                                   │
│  ✅ Ollama running (localhost:11434)             │
│  ✅ Gemma 4 E4B model installed                  │
│                                                  │
│  [Check Ollama Status]                           │
│  [View Setup Instructions]                       │
└─────────────────────────────────────────────────┘
```

---

## 4. Desktop App (Electron)

### 4.1. Deployment Target

**Primary use case:** Vault Mode for working professionals with confidentiality requirements (NDA-bound work, legal cases, corporate shoots).

**Secondary use case:** Studio Mode with better performance and offline capability.

**Platforms:**
- macOS (Intel + Apple Silicon)
- Windows (x64, ARM64)
- Linux (x64, AppImage + deb)

### 4.2. Electron Structure

**Project structure:**
```
photography-coach-v2/
├── electron/
│   ├── main.ts              // Main process (Electron entry point)
│   ├── preload.ts           // Preload script (IPC bridge)
│   └── vault-policy.ts      // Network isolation policy
├── src/                     // React app (renderer process)
├── dist/                    // Vite build output
├── dist-electron/           // Electron packaged apps
├── electron-builder.json    // Build configuration
└── package.json
```

**Main process (electron/main.ts):**
```typescript
import { app, BrowserWindow, session, ipcMain } from 'electron';
import path from 'path';
import { applyVaultPolicy } from './vault-policy';

let mainWindow: BrowserWindow | null = null;

function createWindow(mode: 'studio' | 'vault') {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    title: `Photography Coach - ${mode === 'vault' ? 'Vault Mode' : 'Studio Mode'}`,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // Apply network policy for Vault Mode
  if (mode === 'vault') {
    applyVaultPolicy(session.defaultSession);
  }

  // Load React app
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

// IPC handlers
ipcMain.handle('select-mode', (event, mode: 'studio' | 'vault') => {
  if (mainWindow) {
    mainWindow.close();
  }
  createWindow(mode);
});

ipcMain.handle('export-audit-log', async (event, logData: string) => {
  const { dialog } = await import('electron');
  const { filePath } = await dialog.showSaveDialog({
    title: 'Export Audit Log',
    defaultPath: `audit-log-${new Date().toISOString().split('T')[0]}.json`,
    filters: [{ name: 'JSON', extensions: ['json'] }]
  });

  if (filePath) {
    const fs = await import('fs/promises');
    await fs.writeFile(filePath, logData, 'utf-8');
    return { success: true, path: filePath };
  }

  return { success: false };
});

app.whenReady().then(() => {
  // Show mode selection on first launch
  createWindow('studio'); // Default to Studio Mode
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
```

**Network policy (electron/vault-policy.ts):**
```typescript
import { Session } from 'electron';

export function applyVaultPolicy(session: Session): void {
  console.log('[Vault Mode] Applying network isolation policy');

  session.webRequest.onBeforeRequest((details, callback) => {
    const url = new URL(details.url);
    const isLocalhost =
      url.hostname === 'localhost' ||
      url.hostname === '127.0.0.1' ||
      url.hostname === '::1';

    if (!isLocalhost) {
      console.log(`[Vault Mode] BLOCKED: ${details.url}`);

      // Log to audit trail (if audit service available)
      // auditLog.recordBlockedRequest(details.url, details.method);

      callback({ cancel: true });
    } else {
      console.log(`[Vault Mode] ALLOWED: ${details.url}`);
      callback({ cancel: false });
    }
  });
}
```

**Preload script (electron/preload.ts):**
```typescript
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  selectMode: (mode: 'studio' | 'vault') => ipcRenderer.invoke('select-mode', mode),
  exportAuditLog: (logData: string) => ipcRenderer.invoke('export-audit-log', logData),
  platform: process.platform,
  isElectron: true
});

declare global {
  interface Window {
    electronAPI: {
      selectMode: (mode: 'studio' | 'vault') => Promise<void>;
      exportAuditLog: (logData: string) => Promise<{ success: boolean; path?: string }>;
      platform: string;
      isElectron: boolean;
    };
  }
}
```

### 4.3. Build Configuration

**electron-builder.json:**
```json
{
  "appId": "com.photographycoach.v2",
  "productName": "Photography Coach",
  "directories": {
    "output": "dist-electron"
  },
  "files": [
    "dist/**/*",
    "electron/**/*",
    "!electron/**/*.ts"
  ],
  "mac": {
    "category": "public.app-category.photography",
    "target": [
      {
        "target": "dmg",
        "arch": ["x64", "arm64"]
      },
      {
        "target": "zip",
        "arch": ["x64", "arm64"]
      }
    ],
    "icon": "build/icon.icns"
  },
  "win": {
    "target": [
      {
        "target": "nsis",
        "arch": ["x64", "arm64"]
      },
      {
        "target": "portable",
        "arch": ["x64"]
      }
    ],
    "icon": "build/icon.ico"
  },
  "linux": {
    "target": [
      {
        "target": "AppImage",
        "arch": ["x64"]
      },
      {
        "target": "deb",
        "arch": ["x64"]
      }
    ],
    "icon": "build/icon.png",
    "category": "Graphics"
  }
}
```

**package.json scripts:**
```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "electron:dev": "concurrently \"vite\" \"wait-on http://localhost:5173 && electron .\"",
    "electron:build": "npm run build && electron-builder",
    "electron:build:mac": "npm run build && electron-builder --mac",
    "electron:build:win": "npm run build && electron-builder --win",
    "electron:build:linux": "npm run build && electron-builder --linux"
  }
}
```

### 4.4. Distribution

**macOS:**
```bash
# Build universal binary (Intel + Apple Silicon)
npm run electron:build:mac

# Output:
# dist-electron/Photography-Coach-2.0.0-universal.dmg
# dist-electron/Photography-Coach-2.0.0-universal-mac.zip
```

**Windows:**
```bash
# Build installer + portable
npm run electron:build:win

# Output:
# dist-electron/Photography-Coach-Setup-2.0.0.exe
# dist-electron/Photography-Coach-2.0.0-portable.exe
```

**Linux:**
```bash
# Build AppImage + deb
npm run electron:build:linux

# Output:
# dist-electron/Photography-Coach-2.0.0.AppImage
# dist-electron/Photography-Coach-2.0.0.deb
```

**Code signing (optional):**
- macOS: Requires Apple Developer ID certificate
- Windows: Requires code signing certificate (DigiCert, etc.)
- Linux: No code signing required

### 4.5. Auto-Update (Post-MVP)

**Electron auto-updater:**
```typescript
import { autoUpdater } from 'electron-updater';

autoUpdater.checkForUpdatesAndNotify();

autoUpdater.on('update-available', () => {
  console.log('Update available');
  // Notify user
});

autoUpdater.on('update-downloaded', () => {
  console.log('Update downloaded');
  // Prompt user to restart and install
});
```

**Update server:**
- GitHub Releases (free, automatic via electron-builder)
- Custom server (S3 + CloudFront)

**Not required for MVP.**

---

## 5. iOS App

### 5.1. Deployment Target

**Primary use case:** On-the-go photography coaching for mobile users.

**Two paths:**
1. **PWA (guaranteed):** Progressive Web App via Safari
2. **Native app (Spike 3):** LiteRT on-device inference (stretch goal)

### 5.2. PWA (Progressive Web App)

**Guaranteed floor** - Works on all iOS devices with Safari.

**Capabilities:**
- ✅ Add to Home Screen (icon on home screen)
- ✅ Full-screen mode (no Safari chrome)
- ✅ Offline capability (service worker)
- ✅ Push notifications (not needed for MVP)
- ✅ Camera access (for photo upload)

**Limitations:**
- ❌ No true background processing (suspended when backgrounded)
- ❌ Limited storage (IndexedDB capped at ~50MB by iOS)
- ❌ Cannot run local Ollama (requires server on network)
- ⚠️ Vault Mode not recommended (no network isolation enforcement)

**Implementation:**

**manifest.json:**
```json
{
  "name": "Photography Coach",
  "short_name": "Photo Coach",
  "description": "AI-powered photography coaching with Gemma 4",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#1a1a1a",
  "theme_color": "#3b82f6",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ]
}
```

**Service worker (sw.js):**
```javascript
const CACHE_NAME = 'photography-coach-v2.0.0';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/assets/index.js',
  '/assets/index.css'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
```

**Ollama access on iOS PWA:**
- iOS device must be on same local network as Mac/PC running Ollama
- User configures Ollama server IP in settings (e.g., `http://192.168.1.100:11434`)
- Not suitable for mobile data usage (requires WiFi)

**Alternative:** Cloud-based Ollama proxy (not recommended for Vault Mode)

### 5.3. Native App (LiteRT) - Spike 3 Dependent

**Contingent on Spike 3 pass** (Day 4, 6-hour time box).

**If Spike 3 passes:**
- Use TensorFlow Lite (LiteRT) for on-device inference
- Bundle Gemma 4 E4B quantized model (Q4, ~4GB)
- Run inference natively on iPhone (A14+ chips recommended)

**Implementation (conceptual):**
```swift
// iOS Swift app with LiteRT
import TensorFlowLite

class GemmaInferenceService {
    private var interpreter: Interpreter?

    init() {
        guard let modelPath = Bundle.main.path(forResource: "gemma-4-e4b-q4", ofType: "tflite") else {
            fatalError("Model not found")
        }

        do {
            interpreter = try Interpreter(modelPath: modelPath)
            try interpreter?.allocateTensors()
        } catch {
            print("Failed to load model: \(error)")
        }
    }

    func analyzePhoto(image: UIImage, prompt: String) -> PhotoAnalysisV2? {
        // Encode image and prompt
        // Run inference via LiteRT
        // Decode output JSON
        // Return typed PhotoAnalysisV2
    }
}
```

**Packaging:**
- Xcode project
- Swift UI for native iOS UI
- LiteRT framework (CocoaPods or SPM)
- Gemma 4 E4B model bundled in app (4GB app size)

**App Store submission:**
- Requires Apple Developer Program ($99/year)
- Review process (1-3 days typically)
- Privacy policy (required for App Store)

**If Spike 3 fails:**
- Fall back to PWA only
- Document LiteRT as "future enhancement" in roadmap
- iOS users use web app (via Safari or Mac/PC Ollama proxy)

### 5.4. iOS Platform Recommendation

**For MVP:**
- **Studio Mode:** PWA via Safari (good enough, works now)
- **Vault Mode:** Not recommended on iOS (no network isolation enforcement)

**Post-MVP (if Spike 3 passes):**
- **Studio Mode:** Native app with LiteRT (better performance, offline capability)
- **Vault Mode:** Still not recommended (iOS cannot enforce network boundaries like Electron)

---

## 6. Platform-Specific Considerations

### 6.1. Performance

**Web app:**
- Performance varies by browser (Chrome fastest, Safari slowest)
- CV processing in main thread (blocks UI unless Web Workers used)
- Network latency to localhost Ollama (~10ms)

**Desktop app:**
- Consistent performance (Chromium engine)
- Background processing possible (Node.js main process)
- No network latency (same machine as Ollama)

**iOS PWA:**
- Safari WebKit slower than Chrome V8 (~20% slower CV processing)
- Memory constraints on older iPhones (<4GB RAM)
- Network latency to remote Ollama (50-200ms depending on WiFi)

**iOS native (LiteRT):**
- On-device inference faster than network Ollama (if A14+ chip)
- Memory intensive (4GB model + inference)
- Battery drain higher than remote inference

### 6.2. Storage

**Web app:**
- IndexedDB: ~50MB typical limit (browser-dependent)
- Session history: Keep last 50 analyses
- Audit log: Export frequently to avoid quota

**Desktop app:**
- IndexedDB: No practical limit (GBs available)
- Session history: Keep last 500 analyses
- Audit log: Never delete (can grow to 100MB+)

**iOS PWA:**
- IndexedDB: ~50MB limit (iOS Safari)
- Session history: Keep last 20 analyses
- Audit log: Export frequently, clear old logs

**iOS native:**
- SQLite: GBs available (user's device storage)
- Session history: Keep last 200 analyses
- Audit log: Persistent, export as needed

### 6.3. Ollama Access

**Web app:**
- Must run on same machine as Ollama (localhost:11434)
- CORS not an issue (same-origin)
- Users must install + run Ollama

**Desktop app:**
- Same as web app (same machine as Ollama)
- Can check Ollama status via IPC (better UX)

**iOS PWA:**
- Must configure remote Ollama IP (e.g., Mac on same WiFi)
- CORS may be an issue (Ollama needs `--origins` flag)
- Not suitable for mobile data (WiFi only)

**iOS native (LiteRT):**
- No Ollama required (on-device inference)
- Fully offline capability
- 4GB model bundled with app

---

## 7. Build and Deploy Matrix

### 7.1. Development

| Platform | Command | Output | Test |
|----------|---------|--------|------|
| Web | `npm run dev` | Dev server (localhost:5173) | Browser |
| Desktop | `npm run electron:dev` | Electron window | Electron |
| iOS PWA | `npm run dev` (Safari) | Dev server (mobile Safari) | iPhone Safari |
| iOS Native | Xcode Run | iOS Simulator / Device | Xcode |

### 7.2. Production

| Platform | Command | Output | Size |
|----------|---------|--------|------|
| Web | `npm run build` | dist/ folder | ~1.5MB (gzipped) |
| Desktop (macOS) | `npm run electron:build:mac` | .dmg, .zip | ~150MB |
| Desktop (Windows) | `npm run electron:build:win` | .exe, .exe (portable) | ~140MB |
| Desktop (Linux) | `npm run electron:build:linux` | .AppImage, .deb | ~130MB |
| iOS PWA | `npm run build` | dist/ folder (hosted) | ~1.5MB |
| iOS Native | Xcode Archive | .ipa (App Store) | ~4.2GB (includes model) |

### 7.3. Distribution

| Platform | Method | Hosting |
|----------|--------|---------|
| Web | Static hosting | Vercel, Netlify, GitHub Pages |
| Desktop (macOS) | Direct download | GitHub Releases, website |
| Desktop (Windows) | Direct download | GitHub Releases, website |
| Desktop (Linux) | Direct download | GitHub Releases, website |
| iOS PWA | Add to Home Screen | Same as web hosting |
| iOS Native | App Store | Apple App Store |

---

## 8. Testing

### 8.1. Platform-Specific Tests

**Test case: P-1 (Web app in Chrome/Firefox/Safari)**
- Steps: Upload photo → analyze → view results
- Expected: Analysis completes, UI renders correctly
- Verification: Check all 3 browsers

**Test case: P-2 (Desktop app Vault Mode network isolation)**
- Steps: Launch desktop app → select Vault Mode → attempt external API call
- Expected: Electron blocks call, audit log records event
- Verification: Wireshark shows zero non-localhost packets

**Test case: P-3 (iOS PWA installation)**
- Steps: Open web app in Safari → Add to Home Screen → launch from icon
- Expected: App opens in full-screen standalone mode
- Verification: No Safari chrome visible

**Test case: P-4 (iOS PWA with remote Ollama)**
- Setup: Mac running Ollama on 192.168.1.100, iPhone on same WiFi
- Steps: Configure Ollama IP → upload photo → analyze
- Expected: Analysis completes via remote Ollama
- Verification: Network monitor on Mac shows Ollama API call from iPhone

**Test case: P-5 (iOS native with LiteRT - if Spike 3 passes)**
- Steps: Launch native app → upload photo → analyze (on-device)
- Expected: Analysis completes without network call
- Verification: Airplane mode test (still works offline)

### 8.2. Cross-Platform Tests

**Test case: CP-1 (Session history sync)**
- Setup: Analyze 3 photos on web app, 2 photos on desktop app
- Expected: Each platform has separate session history (no sync)
- Verification: 3 sessions on web, 2 on desktop

**Test case: CP-2 (Audit log export/import)**
- Setup: Desktop app Vault Mode, 10 events logged
- Steps: Export log → open on web app → verify chain
- Expected: Verification passes (hash chain intact)
- Verification: chainVerified: true in export JSON

---

## 9. Dependencies and Blockers

### 9.1. Blocking Dependencies

**This spec (10) blocks:**
- Nothing (final spec in Tier 3)

**This spec (10) is blocked by:**
- **06-architecture-spec.md** - component structure (complete)
- **07-stack-and-runtime-mapping.md** - Electron dependencies (complete)
- **08-vault-mode-spec.md** - network isolation requirements (complete)
- **Spike 3 (LiteRT iOS)** - OPTIONAL, determines iOS native feasibility (Day 4)

### 9.2. Open Questions

**Q1: Should iOS native app be prioritized post-MVP?**
- **Depends on:** Spike 3 results (Day 4)
- **If Spike 3 passes:** iOS native becomes post-MVP priority (better UX, offline capability)
- **If Spike 3 fails:** Deprioritize iOS native, focus on web + desktop

**Q2: Should desktop app support auto-update?**
- **Options:** GitHub Releases (free), custom server (paid)
- **Recommendation:** GitHub Releases for open-source project, defer to post-MVP

**Q3: Should web app support offline mode (service worker)?**
- **Options:** Yes (PWA features), No (simpler, less to maintain)
- **Recommendation:** Yes for iOS PWA compatibility, minimal overhead

---

## 10. Success Criteria

**This platform spec succeeds if:**

1. ✅ Web app deploys successfully to Vercel/Netlify (Studio Mode works)
2. ✅ Desktop app packages for macOS/Windows/Linux (Vault Mode works)
3. ✅ iOS PWA installs and runs (Studio Mode works with remote Ollama)
4. ✅ Network isolation verified on desktop app (Wireshark test passes)
5. ✅ Performance parity across platforms (within 20% variance)
6. ✅ Platform recommendations clear (users know which platform for which use case)

---

## 11. Summary

This spec defines **platform-specific deployment** for Photography Coach v2:

1. **Web app:** Studio Mode primary (mandatory floor), Vault Mode dev/demo only, deploy to Vercel/Netlify
2. **Desktop app (Electron):** Vault Mode primary (required for credible network isolation), Studio Mode also supported, distribute via GitHub Releases
3. **iOS PWA:** Studio Mode floor (guaranteed), requires remote Ollama on local network, Vault Mode not recommended
4. **iOS native (LiteRT):** Stretch goal (Spike 3 dependent), on-device inference, ~4GB app size

**Platform priorities:**
- **MANDATORY:** Web app (Studio Mode)
- **REQUIRED:** Desktop app (Vault Mode)
- **GUARANTEED:** iOS PWA (Studio Mode)
- **OPTIONAL:** iOS native (Spike 3 dependent)

**Next steps:**
1. Build web app (Vite) → deploy to Vercel
2. Build desktop app (Electron) → package for macOS/Windows/Linux
3. Test iOS PWA installation and remote Ollama access
4. Run Spike 3 (Day 4) to determine iOS native feasibility

---

**End of 10-platform-shells-spec.md**
