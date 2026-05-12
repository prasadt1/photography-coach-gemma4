# 07. Stack and Runtime Mapping

**Version:** 1.0
**Status:** Draft
**Dependencies:** 06-architecture-spec.md, 03-runtime-decisions-and-spikes.md
**Owner:** Spec Session Lead

---

## 1. Overview

This spec defines the **complete technology stack** and **runtime dependencies** for Photography Coach v2, including:

1. **Frontend dependencies** - React, TypeScript, Tailwind, charting libraries
2. **Service layer dependencies** - CV libraries, Ollama client, Gemini SDK, validation
3. **Runtime requirements** - Node.js, Ollama, optional Gemini API key
4. **Build tools** - Vite, TypeScript compiler, bundler configuration
5. **Optional integrations** - Cactus (if Spike 2 passes), llama.cpp quantization tools
6. **Deployment targets** - Web (static hosting), Desktop (Electron)

**Core Constraint:** Minimize dependencies to keep bundle size small and reduce attack surface for Vault Mode.

---

## 2. Frontend Stack

### 2.1. Core Framework

| Package | Version | Purpose | Required |
|---------|---------|---------|----------|
| `react` | 19.2.1 | UI framework | ✅ Required |
| `react-dom` | 19.2.1 | DOM rendering | ✅ Required |
| `typescript` | ^5.6.0 | Type safety | ✅ Required |
| `vite` | ^6.0.3 | Build tool, dev server | ✅ Required |
| `@vitejs/plugin-react` | ^4.3.4 | React support for Vite | ✅ Required |

**Inherited from v1 baseline** (00-baseline-audit.md section 2.1). No major version changes needed.

### 2.2. Styling and UI

| Package | Version | Purpose | Required |
|---------|---------|---------|----------|
| `tailwindcss` | ^3.4.0 | Utility-first CSS | ✅ Required |
| `postcss` | ^8.4.47 | CSS processing | ✅ Required |
| `autoprefixer` | ^10.4.20 | Browser prefixes | ✅ Required |
| `lucide-react` | ^0.344.0 | Icon library | ✅ Required |

**Note:** v1 uses these versions (00-baseline-audit.md). No changes needed for v2.

### 2.3. Charting and Visualization

| Package | Version | Purpose | Required |
|---------|---------|---------|----------|
| `recharts` | ^2.15.0 | React charting library | ✅ Required (new for v2) |

**Alternatives considered:**
- Chart.js + react-chartjs-2 (more features, larger bundle)
- D3.js (powerful but complex, overkill for MVP)

**Decision:** Recharts for simplicity and React integration. Use for:
1. Histogram chart (line graph, 256 bins)
2. Economics dashboard (line chart, session history)
3. Radar chart (5-axis scores, inherited from v1)

### 2.4. State Management

**No external library** - Use React's built-in:
- `useState` for simple state
- `useReducer` for complex state (e.g., mentorChatState)
- `useContext` if needed for deeply nested props (not expected in MVP)

**Rationale:** Redux/MobX/Zustand add complexity and bundle size. React's built-in state suffices for single-user, client-side app.

---

## 3. Service Layer Dependencies

### 3.1. Computer Vision

| Package | Version | Purpose | Required |
|---------|---------|---------|----------|
| `exif-js` | ^2.3.0 | EXIF extraction (browser-compatible) | ✅ Required |

**Note:** No additional CV libraries needed. Use browser Canvas API for:
- Histogram analysis
- Focus map (Laplacian variance)
- Edge density (Sobel filter)
- Color distribution (k-means clustering)

**Implementation:** Custom `cvService.ts` using Canvas ImageData APIs.

### 3.2. LLM Inference (Ollama)

**No npm package** - Use native `fetch` API to call Ollama HTTP endpoint:

```typescript
// ollamaService.ts
async function analyzePhoto(image: string, prompt: string): Promise<PhotoAnalysisV2> {
  const response = await fetch('http://localhost:11434/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gemma-4-e4b',
      prompt,
      images: [image],
      stream: false
    })
  });

  const result = await response.json();
  return JSON.parse(result.response);
}
```

**Runtime requirement:** Ollama server running locally (see section 5.1).

### 3.3. Optional Cloud Services (Studio Mode)

| Package | Version | Purpose | Required |
|---------|---------|---------|----------|
| `@google/generative-ai` | ^0.21.0 | Gemini API SDK | 🟡 Optional (Studio Mode only) |

**Usage:** Image generation only (`gemini-3-pro-image-preview` endpoint).

**Conditional import:**
```typescript
// geminiService.ts
let GoogleGenAI: any;

export async function initGeminiService(mode: 'studio' | 'vault') {
  if (mode === 'vault') {
    // Skip import, service disabled
    return;
  }

  if (!GoogleGenAI) {
    GoogleGenAI = await import('@google/generative-ai').then(m => m.GoogleGenAI);
  }
}
```

**Vault Mode:** This package is **never imported** (tree-shaking removes from bundle).

### 3.4. Schema Validation

| Package | Version | Purpose | Required |
|---------|---------|---------|----------|
| `zod` | ^3.24.1 | TypeScript-first schema validation | ✅ Required |

**Usage:**
- Validate Gemma 4 E4B output against PhotoAnalysisV2 schema
- Handle refusal mode (conditional validation, see 02-output-schema.md section 5)
- Runtime type safety (parse unknown JSON → typed object)

**Alternative considered:** Ajv (JSON Schema validator) - rejected because Zod has better TypeScript integration.

### 3.5. Cryptography (Audit Logging)

**No external package** - Use browser's Web Crypto API:

```typescript
// auditService.ts
async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
```

**Supported in:** All modern browsers (Chrome, Firefox, Safari, Edge).

### 3.6. Storage (IndexedDB)

| Package | Version | Purpose | Required |
|---------|---------|---------|----------|
| `idb` | ^8.0.2 | IndexedDB wrapper (Promise-based API) | ✅ Required (new for v2) |

**Usage:**
- Store session history (last 100 analyses)
- Store audit log (Vault Mode only, never deleted)
- Store user preferences (API keys, mode selection)

**Alternative:** Raw IndexedDB API - rejected due to callback-based complexity. `idb` provides cleaner Promise API.

---

## 4. Development Dependencies

### 4.1. TypeScript Tooling

| Package | Version | Purpose | Required |
|---------|---------|---------|----------|
| `@types/react` | ^19.0.9 | React type definitions | ✅ Required |
| `@types/react-dom` | ^19.0.2 | ReactDOM type definitions | ✅ Required |
| `@types/node` | ^22.10.6 | Node.js type definitions | ✅ Required |
| `typescript` | ^5.6.0 | TypeScript compiler | ✅ Required |

### 4.2. Linting and Formatting

| Package | Version | Purpose | Required |
|---------|---------|---------|----------|
| `eslint` | ^9.18.0 | Code linting | ✅ Required |
| `@eslint/js` | ^9.18.0 | ESLint config | ✅ Required |
| `typescript-eslint` | ^8.18.2 | TypeScript ESLint plugin | ✅ Required |
| `prettier` | ^3.4.2 | Code formatting | 🟡 Optional (recommended) |

**ESLint config** (inherited from v1):
- Enforce strict TypeScript rules
- Warn on unused variables
- Error on missing return types for exported functions

### 4.3. Testing (Optional for MVP)

| Package | Version | Purpose | Required |
|---------|---------|---------|----------|
| `vitest` | ^2.1.8 | Test runner (Vite-native) | 🟡 Optional (post-MVP) |
| `@testing-library/react` | ^16.1.0 | React component testing | 🟡 Optional (post-MVP) |

**MVP stance:** Testing deferred to post-hackathon. Focus on manual validation during Spike 1.

**Post-MVP:** Add unit tests for:
- CV algorithms (histogram, focus map, edge density)
- Validation logic (Zod schema, refusal detection)
- Audit log (hash chain verification)

---

## 5. Runtime Requirements

### 5.0. Runtime Classification

**Core production runtime (REQUIRED):**
- **Gemma 4 E4B via Ollama** - Primary inference engine for Studio and Vault modes
- Status: Production-ready, required for MVP
- Validated via Spike 1 (BLOCKING)

**Optional routing runtime (CONDITIONAL):**
- **Cactus** - If Spike 2 passes, replaces or wraps Ollama for performance
- Status: Experimental, 2-hour spike determines inclusion
- Fallback: Vanilla Ollama if Cactus fails

**Benchmark-only runtime (NON-PRODUCTION):**
- **llama.cpp** - Quantization experimentation and benchmarking
- Status: Optional Spike 4, used for quantization tuning only
- Artifact: Benchmark results in writeup appendix, not shipped runtime

**Batch orchestration artifacts (OPTIONAL ENHANCEMENT):**
- JSONL queue files (`jobs.jsonl`, `results.jsonl`, `checkpoint.json`)
- CSV metrics export (`metrics.csv`)
- Desktop Studio Mode only (not web, not Vault-blocking)
- See section 5.5 for details

### 5.1. Ollama

**Required:** Ollama server running locally for Gemma 4 E4B inference.

**Installation:**
```bash
# macOS (Homebrew)
brew install ollama

# Linux
curl https://ollama.ai/install.sh | sh

# Windows
# Download from https://ollama.ai/download
```

**Model setup:**
```bash
# Start Ollama server
ollama serve

# Pull Gemma 4 E4B model (quantized)
ollama pull gemma-4-e4b

# Optional: Pull specific quantization
ollama pull gemma-4-e4b:Q4_K_M
ollama pull gemma-4-e4b:Q5_K_M
ollama pull gemma-4-e4b:Q8_0
```

**Verification:**
```bash
# Test Ollama API
curl http://localhost:11434/api/tags

# Should return list of available models including gemma-4-e4b
```

**Default port:** `11434` (configurable via env var, see section 7.2).

**Health check:**
```typescript
// ollamaService.ts
export async function checkOllamaHealth(): Promise<boolean> {
  try {
    const response = await fetch('http://localhost:11434/api/tags');
    return response.ok;
  } catch {
    return false;
  }
}
```

### 5.2. Node.js

**Required for development:**
- Node.js >= 20.x (LTS)
- npm >= 10.x or pnpm >= 8.x

**Not required for production** (static build deployed to CDN/hosting).

**Development commands:**
```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### 5.3. ~~Optional: Cactus~~ — DROPPED (Spike 2 FAIL, 2026-05-07)

**Spike 2 result:** Cactus evaluated and dropped. See `spike/spike-2-results.md` for full analysis.

**Reasons:** (1) No web/Node.js TypeScript SDK — React Native only, incompatible with our React+Electron stack. (2) Proprietary `.cact` model format — cannot use existing `gemma4:latest` GGUF without conversion. (3) Hybrid cloud routing conflicts with Vault Mode network isolation guarantee. (4) Ollama already validated in Spike 1 with 100% GPU utilisation on this machine.

**Future work:** Cactus is viable if the project pivots to React Native iOS. Not applicable for current web+desktop architecture.

**~~Spike 2 determines:~~** ~~Should Cactus replace vanilla Ollama for performance/quality?~~

**If YES (Spike 2 passes):**

**Installation:**
```bash
# Install Cactus (hypothetical, actual instructions depend on Cactus release)
npm install -g @anthropic/cactus

# OR
brew install cactus
```

**Integration:**
```typescript
// ollamaService.ts (rename to llmService.ts)
const LLM_BACKEND = process.env.VITE_LLM_BACKEND || 'ollama'; // 'ollama' or 'cactus'

async function analyzePhoto(...): Promise<PhotoAnalysisV2> {
  if (LLM_BACKEND === 'cactus') {
    // Use Cactus API
    const response = await fetch('http://localhost:8000/api/generate', { ... });
  } else {
    // Use Ollama API
    const response = await fetch('http://localhost:11434/api/generate', { ... });
  }
}
```

**If NO (Spike 2 fails):**
- Stick with vanilla Ollama
- Remove Cactus from 07-stack-and-runtime-mapping.md
- No code changes needed (Ollama remains default)

**Deferred decision:** Wait for Spike 2 results (2-hour time box, Day 1).

### 5.4. Optional: Gemini API Key (Studio Mode)

**Required for image generation** (Studio Mode only, paid feature).

**Setup:**
1. User obtains API key from https://aistudio.google.com/apikey
2. User enters key in app settings
3. Key stored in IndexedDB (encrypted via Web Crypto API, optional enhancement)

**Environment variable (dev only):**
```bash
# .env.local
VITE_GEMINI_API_KEY=AIza...your-key-here
```

**Vault Mode:** API key setting hidden, Gemini service disabled.

### 5.5. Batch Orchestration (Desktop Studio Mode, Optional)

**Purpose:** Offline batch processing with checkpoint/resume for field workflows.

**Artifacts:**

| File | Format | Purpose | Required |
|------|--------|---------|----------|
| `jobs.jsonl` | JSONL | Input queue (one job per line) | ✅ Required (batch mode) |
| `results.jsonl` | JSONL | Output log (one result per line) | ✅ Required (batch mode) |
| `checkpoint.json` | JSON | Resume state (last completed job_id) | ✅ Required (batch mode) |
| `metrics.csv` | CSV | Batch metrics (tokens, latency, TTFT) | 🟡 Optional (analytics) |
| `errors.jsonl` | JSONL | Failed jobs log | 🟡 Optional (debugging) |

**JSONL Schema:**

**jobs.jsonl** (input):
```json
{"job_id":"001","photo_path":"/path/to/photo.jpg","mode":"studio","model":"gemma-4-e4b","status":"pending","retries":0,"created_at":"2026-05-15T10:00:00Z","output_path":null}
```

**results.jsonl** (output):
```json
{"job_id":"001","status":"completed","output_path":"/outputs/001.json","tokens":2847,"latency_ms":4523,"timestamp":"2026-05-15T10:05:23Z"}
```

**checkpoint.json** (state):
```json
{"last_completed_job_id":"012","timestamp":"2026-05-15T11:30:45Z","total_jobs":100,"completed_jobs":12,"failed_jobs":0}
```

**Execution model:**
- Single worker (sequential, no parallelism in MVP)
- Checkpoint every 10-12 jobs (configurable)
- Resume from last checkpoint on restart/crash
- Idempotent (skips already-completed jobs)

**Disk/memory guardrails:**
- Retention policy: Keep last 30 days of batch artifacts (configurable)
- Disk space check before batch start (fail if <5GB free)
- Memory limit: Process one photo at a time (no batch loading)
- Cleanup: Auto-delete old batches after retention period

**Runtime dependencies:**
- Node.js file system APIs (`fs`, `readline`)
- Desktop app only (Electron process APIs)
- Not available in web app (no file system access)

---

## 6. Build Configuration

### 6.1. Vite Config

**File:** `vite.config.ts`

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: true
  },
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
  optimizeDeps: {
    include: ['react', 'react-dom', 'recharts', 'zod', 'idb']
  }
});
```

**Optimizations:**
- Code splitting (vendor chunks separate from app code)
- Sourcemaps for debugging
- Dependency pre-bundling (faster cold starts)

### 6.2. TypeScript Config

**File:** `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "jsx": "react-jsx",
    "strict": true,
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "allowSyntheticDefaultImports": true,
    "forceConsistentCasingInFileNames": true,
    "noEmit": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

**Key settings:**
- `strict: true` - All strict type checks enabled
- `noEmit: true` - Vite handles bundling, TypeScript only checks types
- `jsx: react-jsx` - New JSX transform (no need to import React in every file)

### 6.3. Tailwind Config

**File:** `tailwind.config.js`

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Custom colors for photography theme
        'photo-dark': '#1a1a1a',
        'photo-accent': '#3b82f6'
      }
    },
  },
  plugins: [],
}
```

### 6.4. Package.json Scripts

```json
{
  "name": "photography-coach-v2",
  "version": "2.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "lint": "eslint . --ext ts,tsx",
    "format": "prettier --write \"src/**/*.{ts,tsx,css}\"",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "react": "^19.2.1",
    "react-dom": "^19.2.1",
    "recharts": "^2.15.0",
    "zod": "^3.24.1",
    "idb": "^8.0.2",
    "exif-js": "^2.3.0",
    "lucide-react": "^0.344.0",
    "@google/generative-ai": "^0.21.0"
  },
  "devDependencies": {
    "@types/react": "^19.0.9",
    "@types/react-dom": "^19.0.2",
    "@types/node": "^22.10.6",
    "@vitejs/plugin-react": "^4.3.4",
    "typescript": "^5.6.0",
    "vite": "^6.0.3",
    "tailwindcss": "^3.4.0",
    "postcss": "^8.4.47",
    "autoprefixer": "^10.4.20",
    "eslint": "^9.18.0",
    "@eslint/js": "^9.18.0",
    "typescript-eslint": "^8.18.2",
    "prettier": "^3.4.2"
  }
}
```

---

## 7. Environment Configuration

### 7.1. Environment Variables

**File:** `.env` (committed, defaults for dev)

```bash
# Ollama API endpoint
VITE_OLLAMA_BASE_URL=http://localhost:11434

# LLM backend (ollama or cactus, if Spike 2 passes)
VITE_LLM_BACKEND=ollama

# Gemini API key (optional, for Studio Mode image gen)
# VITE_GEMINI_API_KEY=your-key-here

# Mode (studio or vault, default studio)
VITE_DEFAULT_MODE=studio

# Feature flags
VITE_ENABLE_IMAGE_GENERATION=true
VITE_ENABLE_MENTOR_CHAT=true
VITE_ENABLE_AUDIT_LOGGING=true
```

**File:** `.env.local` (gitignored, user-specific overrides)

```bash
# User's Gemini API key
VITE_GEMINI_API_KEY=AIzaSy...your-key-here
```

### 7.2. Runtime Config Access

```typescript
// src/config.ts
export const config = {
  ollama: {
    baseUrl: import.meta.env.VITE_OLLAMA_BASE_URL || 'http://localhost:11434',
    model: 'gemma-4-e4b'
  },
  llm: {
    backend: import.meta.env.VITE_LLM_BACKEND || 'ollama'
  },
  gemini: {
    apiKey: import.meta.env.VITE_GEMINI_API_KEY || null
  },
  defaults: {
    mode: import.meta.env.VITE_DEFAULT_MODE || 'studio'
  },
  features: {
    imageGeneration: import.meta.env.VITE_ENABLE_IMAGE_GENERATION === 'true',
    mentorChat: import.meta.env.VITE_ENABLE_MENTOR_CHAT === 'true',
    auditLogging: import.meta.env.VITE_ENABLE_AUDIT_LOGGING === 'true'
  }
};
```

**Usage:**
```typescript
import { config } from './config';

const response = await fetch(`${config.ollama.baseUrl}/api/generate`, { ... });
```

---

## 8. Deployment

### 8.1. Web Deployment (Static Hosting)

**Build command:**
```bash
npm run build
```

**Output:** `dist/` folder containing:
- `index.html` - Entry point
- `assets/` - JS/CSS bundles (hashed filenames for cache busting)
- `favicon.ico`, `manifest.json`, etc.

**Hosting options:**
1. **Vercel:**
   ```bash
   vercel --prod
   ```
   - Auto-detects Vite, no config needed
   - Serverless functions not used (static only)

2. **Netlify:**
   - Drag-drop `dist/` folder to Netlify dashboard
   - Or: `netlify deploy --prod --dir=dist`

3. **GitHub Pages:**
   ```bash
   # Set base URL in vite.config.ts
   base: '/photography-coach-v2/'

   # Build and deploy
   npm run build
   gh-pages -d dist
   ```

4. **Self-hosted (Nginx):**
   ```nginx
   server {
     listen 80;
     server_name photography-coach.local;
     root /var/www/photography-coach-v2/dist;
     index index.html;

     location / {
       try_files $uri $uri/ /index.html;
     }
   }
   ```

**Note:** Web deployment requires users to run Ollama locally. Provide setup instructions on landing page.

### 8.2. Desktop Deployment (Electron)

**For true Vault Mode** (network isolation enforcement), package as Electron app.

**Dependencies:**
```json
{
  "devDependencies": {
    "electron": "^33.0.0",
    "electron-builder": "^25.0.0"
  }
}
```

**Electron main process** (`electron/main.ts`):
```typescript
import { app, BrowserWindow, session } from 'electron';

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  // Vault Mode: Block non-localhost network requests
  if (process.env.MODE === 'vault') {
    session.defaultSession.webRequest.onBeforeRequest((details, callback) => {
      const url = new URL(details.url);
      const isLocal = url.hostname === 'localhost' || url.hostname === '127.0.0.1';

      if (!isLocal) {
        console.log(`[Vault Mode] Blocked external request: ${details.url}`);
        callback({ cancel: true });
      } else {
        callback({ cancel: false });
      }
    });
  }

  win.loadFile('dist/index.html');
}

app.whenReady().then(createWindow);
```

**Build commands:**
```bash
# Build React app
npm run build

# Package Electron app
npm run electron:build

# Output: dist-electron/Photography-Coach-2.0.0.dmg (macOS)
#         dist-electron/Photography-Coach-2.0.0.exe (Windows)
#         dist-electron/Photography-Coach-2.0.0.AppImage (Linux)
```

**Electron config** (`electron-builder.json`):
```json
{
  "appId": "com.photographycoach.v2",
  "productName": "Photography Coach",
  "directories": {
    "output": "dist-electron"
  },
  "files": [
    "dist/**/*",
    "electron/**/*"
  ],
  "mac": {
    "category": "public.app-category.photography",
    "target": ["dmg", "zip"]
  },
  "win": {
    "target": ["nsis", "portable"]
  },
  "linux": {
    "target": ["AppImage", "deb"]
  }
}
```

**Deployment priority:** Desktop app (Electron) is **required for credible Vault Mode demo** - provides verifiable network isolation that web browsers cannot architecturally guarantee. Web app serves Studio Mode and development/testing purposes.

---

## 9. Dependency Decision Matrix

### 9.1. Required Dependencies (Must Have)

| Dependency | Purpose | Justification |
|------------|---------|---------------|
| React 19 | UI framework | Core framework, inherited from v1 |
| TypeScript | Type safety | Prevents runtime errors, required for Zod |
| Vite | Build tool | Fast dev server, optimized production builds |
| Tailwind CSS | Styling | Rapid UI development, small bundle |
| Recharts | Charting | Histogram, economics dashboard |
| Zod | Validation | Schema validation, refusal handling |
| idb | Storage | IndexedDB wrapper, session history + audit log |
| exif-js | EXIF extraction | Camera metadata extraction |
| electron | Desktop app packaging | Required for credible Vault Mode network isolation |
| electron-builder | Desktop app builds | Package desktop app for macOS/Windows/Linux |

### 9.2. Optional Dependencies (Conditional)

| Dependency | Condition | Purpose |
|------------|-----------|---------|
| @google/generative-ai | Studio Mode only | Gemini image generation API |

### 9.3. Excluded Dependencies (Considered but Rejected)

| Dependency | Reason for Exclusion |
|------------|---------------------|
| Redux / MobX / Zustand | React's built-in state sufficient for single-user app |
| Axios | Fetch API sufficient, Axios adds 13KB |
| Lodash | Prefer native ES6 methods (map, filter, reduce) |
| Moment.js | Use native Date + Intl.DateTimeFormat (Moment deprecated) |
| jQuery | Not needed in React ecosystem |

---

## 10. Bundle Size Analysis

### 10.1. Target Bundle Sizes

**Goal:** Keep initial load <500KB (gzipped).

**Breakdown (estimated):**
- React + ReactDOM: ~130KB (gzipped)
- Recharts: ~50KB
- Zod: ~15KB
- idb: ~5KB
- exif-js: ~10KB
- App code: ~100KB
- Tailwind CSS: ~20KB (with PurgeCSS)
- **Total: ~330KB (gzipped)** ✅ Under target

**Studio Mode (with Gemini SDK):**
- @google/generative-ai: ~40KB
- **Total: ~370KB (gzipped)** ✅ Still under target

**Optimization strategies:**
1. Code splitting (load Recharts only when Economics tab opened)
2. Tree shaking (remove unused Tailwind classes)
3. Dynamic imports for optional features

### 10.2. Lighthouse Performance Target

**Goal:** Lighthouse score >90 (Performance category).

**Key metrics:**
- First Contentful Paint (FCP): <1.5s
- Largest Contentful Paint (LCP): <2.5s
- Time to Interactive (TTI): <3.5s
- Cumulative Layout Shift (CLS): <0.1

**Strategies:**
1. Lazy load non-critical components (histogram, color palette)
2. Preload critical fonts (if custom fonts used)
3. Optimize images (use WebP, lazy load sample images)

---

## 11. Open Questions (Resolve During Spike 1 & 2)

### 11.1. Ollama vs Cactus (Spike 2)

**Question:** Should Cactus replace Ollama?

**Test during Spike 2 (2-hour time box):**
- Review Cactus documentation
- Compare API surface (compatible with Ollama API?)
- Assess performance claims (faster inference?)
- Check licensing (compatible with hackathon/open-source?)

**Decision:**
- **If Cactus passes** → Add to stack, make LLM backend configurable
- **If Cactus fails** → Stick with Ollama, remove Cactus from this spec

### 11.2. Quantization Libraries (Spike 4)

**Question:** Do we need custom quantization tools (llama.cpp)?

**Depends on:** Spike 4 results (post-Tier-2, non-blocking).

**If Spike 4 passes:**
- Document llama.cpp installation instructions
- Add quantization guide to docs/ (e.g., "How to quantize Gemma 4 E4B with llama.cpp")
- Include benchmark results in writeup appendix

**If Spike 4 skipped/fails:**
- Use Ollama's built-in quantizations (Q4_K_M, Q5_K_M, Q8_0)
- No additional tooling needed

---

## 12. Dependencies and Blockers

### 12.1. Blocking Dependencies

**This spec (07) blocks:**
- **08-ui-adaptation-spec.md** - needs component libraries (Recharts) to define UI elements
- **09-validation-and-error-handling-spec.md** - needs Zod for validation logic
- **10-platform-shells-spec.md** - needs Electron config for desktop app

**This spec (07) is blocked by:**
- **Spike 2 (Cactus)** - OPTIONAL, determines LLM backend choice
- **Spike 4 (llama.cpp quantization)** - OPTIONAL, non-blocking (deferred to post-Tier-2)

### 12.2. Deferred to Post-MVP

**Advanced dependencies:**
1. **Testing libraries** (vitest, @testing-library/react) - deferred to post-hackathon
2. **E2E testing** (Playwright, Cypress) - not needed for MVP
3. **Performance monitoring** (Sentry, LogRocket) - not needed for hackathon submission
4. **Analytics** (Google Analytics, Plausible) - not needed for MVP

---

## 13. Success Criteria

**This stack succeeds if:**

1. ✅ All required dependencies install without conflicts (`npm install` succeeds)
2. ✅ Dev server starts in <5 seconds (`npm run dev`)
3. ✅ Production build completes in <30 seconds (`npm run build`)
4. ✅ Bundle size <500KB gzipped (verified via `vite build --mode production`)
5. ✅ Lighthouse Performance score >90 (tested on production build)
6. ✅ Ollama integration works (5/5 photos analyzed successfully in Spike 1)
7. ✅ All TypeScript code compiles without errors (`npm run typecheck`)

---

## 14. Installation Guide

### 14.1. Quick Start (Development)

```bash
# 1. Clone repository
git clone https://github.com/your-org/photography-coach-v2.git
cd photography-coach-v2

# 2. Install dependencies
npm install

# 3. Install Ollama
brew install ollama  # macOS
# OR: See https://ollama.ai/download for other platforms

# 4. Start Ollama server
ollama serve

# 5. Pull Gemma 4 E4B model
ollama pull gemma-4-e4b

# 6. Start dev server
npm run dev

# 7. Open browser
# Navigate to http://localhost:5173
```

### 14.2. Production Deployment

```bash
# 1. Build production bundle
npm run build

# 2. Deploy to hosting (choose one)
vercel --prod          # Vercel
netlify deploy --prod  # Netlify
gh-pages -d dist       # GitHub Pages

# 3. Ensure users have Ollama installed locally
# Provide setup instructions on landing page
```

---

## 15. Summary

This spec defines the **complete technology stack and runtime dependencies** for Photography Coach v2:

**Frontend:**
- React 19 + TypeScript + Vite + Tailwind CSS
- Recharts (charting), Zod (validation), idb (storage)
- Bundle size: ~330KB gzipped (under 500KB target)

**Services:**
- exif-js (EXIF extraction), custom CV (Canvas API)
- Ollama (Gemma 4 E4B inference, required)
- Optional: @google/generative-ai (Gemini image gen, Studio Mode only)

**Runtime:**
- Ollama server (localhost:11434, required)
- Node.js 20+ (dev only, not production)
- Optional: Cactus (if Spike 2 passes), Electron (desktop app)

**Build:**
- Vite (dev server + bundler)
- TypeScript (type checking)
- ESLint + Prettier (linting + formatting)

**Deployment:**
- Web: Static hosting (Vercel, Netlify, GitHub Pages)
- Desktop: Electron app (for true Vault Mode network isolation)

**Next steps:**
1. Resolve Cactus decision during Spike 2 (update LLM backend if needed)
2. Implement service layer (ollamaService, cvService, etc.)
3. Proceed to **08-ui-adaptation-spec.md** to define UI components and interactions

---

**End of 07-stack-and-runtime-mapping.md**
