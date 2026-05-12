# 06. Architecture Spec

**Version:** 1.0
**Status:** Draft
**Dependencies:** 01-product-spec.md, 02-output-schema.md, 04-prompt-and-rationale-spec.md, 05-deterministic-cv-spec.md
**Owner:** Spec Session Lead

---

## 1. Overview

This spec defines the **system architecture** for Photography Coach v2, covering:

1. **Component structure** - Frontend, services, Ollama integration, optional cloud services
2. **Data flow** - Image upload → CV analysis → Gemma inference → UI rendering
3. **Mode differentiation** - Studio Mode (speed, optional cloud) vs Vault Mode (confidentiality, network isolation)
4. **State management** - React state, IndexedDB for session history, audit logging
5. **Network boundaries** - Architectural enforcement of Vault Mode isolation

**Core Constraint:** Gemma 4 E4B via Ollama is the primary inference engine. All other services (optional Gemini image gen, future cloud critique APIs) are **add-ons only**, user-initiated, and blocked in Vault Mode.

---

## 2. High-Level Architecture

### 2.1. System Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser (React)                       │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                     UI Layer                          │  │
│  │  - PhotoUploader                                      │  │
│  │  - AnalysisResults (5 tabs: Overview, Detail,        │  │
│  │    Mentor Chat, Enhancement, Economics)               │  │
│  │  - SpatialOverlay (focus map, bounding boxes)        │  │
│  │  - HistogramChart, ColorPalette, EXIFPanel           │  │
│  └───────────────────────────────────────────────────────┘  │
│                           ▲                                  │
│                           │ Props/State                      │
│                           ▼                                  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                  State Management                     │  │
│  │  - React useState/useReducer                          │  │
│  │  - App.tsx (root state: analysis, image, mode,       │  │
│  │    mentorChat, sessionHistory)                        │  │
│  └───────────────────────────────────────────────────────┘  │
│                           ▲                                  │
│                           │ API Calls                        │
│                           ▼                                  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                   Service Layer                       │  │
│  │  - cvService.ts (EXIF, histogram, focus, edges)      │  │
│  │  - ollamaService.ts (Gemma 4 E4B inference)          │  │
│  │  - geminiService.ts (optional image gen, DISABLED    │  │
│  │    in Vault Mode)                                     │  │
│  │  - validationService.ts (Zod schema validation)      │  │
│  │  - auditService.ts (hash-chained log, Vault only)    │  │
│  └───────────────────────────────────────────────────────┘  │
│                           ▲                                  │
│                           │ HTTP/Local                       │
│                           ▼                                  │
└─────────────────────────────────────────────────────────────┘
                            ▲
                            │
         ┌──────────────────┴──────────────────┐
         │                                     │
         ▼                                     ▼
┌────────────────────┐              ┌─────────────────────┐
│   Ollama Runtime   │              │  Optional Gemini    │
│  (Gemma 4 E4B)     │              │  Image Gen API      │
│  localhost:11434   │              │  (Studio Mode only, │
│  /api/generate     │              │   paid, user key)   │
└────────────────────┘              └─────────────────────┘
     Local Only                      Cloud (Blocked in Vault)
```

### 2.2. Component Responsibilities

#### UI Layer

**PhotoUploader.tsx**
- Drag-and-drop file upload
- File validation (image/* MIME types, max 10MB)
- Base64 conversion
- Thinking animation (5-step progress UI)

**AnalysisResults.tsx**
- Tabbed interface (5 tabs)
- Display PhotoAnalysisV2 data (scores, critique, strengths, improvements)
- Mentor chat widget (5-turn limit)
- Image generation trigger (Studio Mode only)
- Economics dashboard (token usage, session history)

**SpatialOverlay.tsx**
- Render bounding boxes (from Gemma or CV fallback)
- Toggle focus map grid (10×10 heatmap)
- CSS/DOM overlays (not Canvas, per 00-baseline-audit.md erratum)

**HistogramChart.tsx, ColorPalette.tsx, EXIFPanel.tsx**
- Visualize CV data (histogram, dominant colors, camera settings)
- New components for v2 (not in v1 baseline)

#### State Management

**App.tsx (root component)**
```typescript
interface AppState {
  mode: 'studio' | 'vault';                  // Mode selection
  image: { src: string; mimeType: string } | null;
  analysis: PhotoAnalysisV2 | null;
  cvData: CVData | null;                     // From cvService
  isAnalyzing: boolean;
  mentorChatState: MentorChatState;
  sessionHistory: SessionCostMetric[];       // For economics dashboard
  error: string | null;
}
```

**State updates:**
- User uploads image → `setImage()`, trigger CV analysis
- CV completes → `setCvData()`, trigger Gemma inference
- Gemma completes → `setAnalysis()`, render results
- User sends mentor chat → append message, trigger follow-up inference

#### Service Layer

**cvService.ts**
- `extractEXIF(imageFile: File): Promise<EXIFData>`
- `analyzeHistogram(imageData: ImageData): HistogramAnalysis`
- `generateFocusMap(imageData: ImageData): FocusMap`
- `analyzeEdgeDensity(imageData: ImageData): EdgeDensityMap`
- `analyzeColorDistribution(imageData: ImageData): ColorDistribution`
- Returns `CVData` object (combines all CV outputs)

**ollamaService.ts**
- `analyzePhoto(image: string, mimeType: string, cvData: CVData): Promise<PhotoAnalysisV2>`
- `askMentor(image: string, mimeType: string, question: string, context: MentorContext): Promise<MentorResponse>`
- Builds prompts per 04-prompt-and-rationale-spec.md
- Calls Ollama API (localhost:11434)
- Validates response via validationService

**geminiService.ts** (OPTIONAL, Studio Mode only)
- `generateCorrectedImage(image: string, mimeType: string, improvements: string[]): Promise<string>`
- Disabled in Vault Mode (architectural enforcement, see section 4.3)
- Requires user-provided API key (no default key)
- Paid add-on feature (opt-in only)

**validationService.ts**
- `validatePhotoAnalysisV2(data: unknown): PhotoAnalysisV2` (from 02-output-schema.md section 5)
- Uses Zod schema, handles refusal mode (all scores = 0.0)
- Throws on validation failure (caller retries or fails gracefully)

**auditService.ts** (Vault Mode only)
- `logEvent(event: AuditEvent): void` - Append event to hash-chained log
- `getAuditLog(): AuditEvent[]` - Retrieve full log
- `exportAuditLog(): string` - Export as JSON (tamper-evident)
- Stores log in IndexedDB (persistent, local-only)

**batchService.ts** (Desktop Studio Mode, optional enhancement)
- `enqueueJob(job: BatchJob): void` - Add job to JSONL queue
- `processQueue(): Promise<void>` - Sequential execution with checkpointing
- `resumeFromCheckpoint(): Promise<void>` - Resume after crash/restart
- `getQueueStatus(): QueueStatus` - Current progress, metrics
- Non-blocking enhancement for offline workflows (see section 11)

---

## 3. Data Flow

### 3.1. Primary Flow: Photo Analysis

**Step-by-step:**

```
1. User uploads photo (PhotoUploader)
   ↓
2. Image loaded into App.tsx state
   ↓
3. cvService extracts EXIF + analyzes pixels (800ms)
   - extractEXIF() → EXIFData
   - analyzeHistogram() → HistogramAnalysis
   - generateFocusMap() → FocusMap
   - analyzeEdgeDensity() → EdgeDensityMap
   - analyzeColorDistribution() → ColorDistribution
   ↓
4. CV results stored in App.tsx state (cvData)
   ↓
5. ollamaService builds prompt (04-prompt-and-rationale-spec.md)
   - System prompt (photography principles, schema instructions)
   - User prompt (image + EXIF + CV summary + analysis request)
   ↓
6. ollamaService calls Ollama API (3-8 seconds)
   - POST http://localhost:11434/api/generate
   - Body: { model: "gemma-4-e4b", prompt: "...", images: ["base64..."] }
   ↓
7. Ollama returns JSON response
   ↓
8. validationService validates response
   - Zod schema check (PhotoAnalysisV2)
   - If refusal mode (all scores = 0.0) → relax array constraints
   - If invalid → retry (max 3 attempts) or fail gracefully
   ↓
9. Valid PhotoAnalysisV2 stored in App.tsx state (analysis)
   ↓
10. AnalysisResults renders tabs (Overview, Detail, etc.)
    - Display scores, critique, strengths, improvements
    - Visualize CV data (histogram, focus map, color palette)
    - Enable mentor chat, image generation (if Studio Mode)
```

**Error handling:**
- CV fails → log error, proceed with analysis (EXIF = null, no histogram overlay)
- Ollama unreachable → display error: "Local inference unavailable. Check that Ollama is running."
- Schema validation fails after 3 retries → display error: "Analysis format invalid. Please try another photo."
- Refusal mode → display message: "This image is outside our coaching scope."

### 3.2. Secondary Flow: Mentor Chat

```
1. User types question in MentorChatWidget
   ↓
2. Question + context (previous analysis, chat history) sent to ollamaService
   ↓
3. ollamaService builds mentor prompt (04-prompt-and-rationale-spec.md section 5.3)
   - Includes previous analysis summary (scores, top improvements)
   - Includes conversation history (formatted as text)
   - Includes current question
   ↓
4. Ollama generates answer + thinking
   ↓
5. Response appended to mentorChatState.messages
   ↓
6. MentorChatWidget renders new message
   ↓
7. Turn counter increments (X/5 turns)
   ↓
8. If turn limit reached (5 turns) → disable input
```

### 3.3. Optional Flow: Image Generation (Studio Mode Only)

```
1. User clicks "Generate Ideal Version" (AnalysisResults AI Enhancement tab)
   ↓
2. Check mode:
   - If Vault Mode → button disabled (architectural enforcement)
   - If Studio Mode → proceed
   ↓
3. Check API key:
   - If no user key configured → prompt: "Enter your Gemini API key"
   - If key present → proceed
   ↓
4. geminiService.generateCorrectedImage(image, mimeType, improvements)
   ↓
5. Gemini API returns base64 PNG
   ↓
6. Display before/after blend slider
   ↓
7. User downloads corrected image
```

**Enforcement:** Vault Mode disables this flow via:
- Button grayed out + disabled in UI
- `geminiService` calls throw error if mode = 'vault'
- Network policy blocks external API calls (see section 4.3)

---

## 4. Mode Differentiation

### 4.1. Studio Mode Architecture

**Characteristics:**
- ✅ Local Gemma 4 E4B via Ollama (default, always available)
- ✅ Optional Gemini image generation (paid, user key, opt-in)
- ✅ Network access allowed (for Gemini API, future cloud critique APIs)
- ✅ Session history stored in IndexedDB (no audit logging)

**Data flow:**
```
Image → CV → Ollama (local) → UI
         ↓ (optional, user-initiated)
       Gemini API (cloud) → Corrected image → UI
```

**Use case:** Hobbyists, serious amateurs, working pros who prioritize speed and convenience over confidentiality.

### 4.2. Vault Mode Architecture

**Characteristics:**
- ✅ Local Gemma 4 E4B via Ollama (only inference engine)
- ❌ Gemini image generation DISABLED (architectural enforcement)
- ❌ Network egress blocked (no cloud API calls)
- ✅ Hash-chained audit log (tamper-evident record of all operations)
- ✅ Session history stored in IndexedDB with audit metadata
- 🔒 **Desktop app (Electron) required** for credible network isolation (see section 4.3)

**Data flow:**
```
Image → CV → Ollama (local) → UI
         ↓
       Audit log (local) → IndexedDB
```

**Use case:** Working professionals with confidentiality requirements (NDA-bound client work, legal cases, sensitive corporate shoots).

**Deployment target:** Desktop app (Electron) provides verifiable network isolation. Web app fallback available for development/demo but lacks cryptographic enforcement of network boundaries.

### 4.3. Network Isolation Enforcement

**Vault Mode blocks all network calls via architectural layers:**

#### Layer 1: Service-Level Checks

```typescript
// ollamaService.ts
export async function analyzePhoto(
  image: string,
  mimeType: string,
  cvData: CVData,
  mode: 'studio' | 'vault'
): Promise<PhotoAnalysisV2> {
  // Ollama is local (localhost:11434) → always allowed
  const response = await fetch('http://localhost:11434/api/generate', { ... });
  // ...
}

// geminiService.ts
export async function generateCorrectedImage(
  image: string,
  mimeType: string,
  improvements: string[],
  mode: 'studio' | 'vault'
): Promise<string> {
  if (mode === 'vault') {
    throw new Error('Image generation disabled in Vault Mode (network isolation policy)');
  }
  // Proceed with Gemini API call
  // ...
}
```

#### Layer 2: UI-Level Enforcement

```typescript
// AnalysisResults.tsx (AI Enhancement tab)
const isGenerateDisabled = mode === 'vault' || !userApiKey;

<button
  disabled={isGenerateDisabled}
  onClick={handleGenerate}
  className={isGenerateDisabled ? 'opacity-50 cursor-not-allowed' : ''}
>
  {mode === 'vault'
    ? '🔒 Disabled in Vault Mode'
    : 'Generate Ideal Version'
  }
</button>
```

#### Layer 3: Network Policy (Architectural Enforcement)

**Desktop app (Electron) - Required for credible Vault Mode:**
- Use Electron's `session.webRequest` API to block non-localhost network requests
- Whitelist: `localhost`, `127.0.0.1`, `file://`
- Blacklist: All other domains
- **Rationale:** Vault Mode trust claims (confidential workflows, NDA-bound work) require verifiable network isolation, which web browsers cannot architecturally guarantee

**Web app fallback (development/demo only):**
- Rely on service-level checks (Layer 1) + UI enforcement (Layer 2)
- **Limitation:** Network isolation is policy-based (not cryptographically enforced). Users trusting Vault Mode for confidential work should use desktop app.
- **Use case:** Web app suitable for Studio Mode and non-confidential use cases only

### 4.4. Mode Selection UI

**Where:** Landing screen (before photo upload) or settings modal.

**Options:**
- **Studio Mode** (default):
  - Icon: ⚡ Lightning bolt
  - Description: "Fast, flexible, with optional cloud features"
  - Fine print: "Powered by local Gemma 4 E4B. Optional Gemini image generation (paid, requires your API key)."

- **Vault Mode**:
  - Icon: 🔒 Lock
  - Description: "100% local, network-isolated, audit-logged"
  - Fine print: "All processing stays on your device. Image generation disabled. Audit log available for export."

**Mode switching:**
- Can switch modes between photos (clears session history)
- Cannot switch mid-session (requires reset)

---

## 5. Ollama Integration Layer

### 5.1. API Surface

**Ollama HTTP API** (localhost:11434):

**Endpoint:** `POST /api/generate`

**Request:**
```json
{
  "model": "gemma-4-e4b",
  "prompt": "System prompt + user prompt as defined in 04-prompt-and-rationale-spec.md",
  "images": ["base64-encoded-image"],
  "stream": false,
  "options": {
    "temperature": 0.7,
    "top_p": 0.9
  }
}
```

**Response:**
```json
{
  "model": "gemma-4-e4b",
  "created_at": "2026-05-06T14:23:15Z",
  "response": "{ \"schema_version\": \"2.0\", ... }",
  "done": true,
  "context": [...],
  "total_duration": 3847283920,
  "load_duration": 1283920,
  "prompt_eval_count": 1847,
  "eval_count": 1053
}
```

**Response fields:**
- `response` - JSON string (PhotoAnalysisV2)
- `prompt_eval_count` - Input token count (if available per Spike 1)
- `eval_count` - Output token count (if available)
- `total_duration` - Inference time in nanoseconds

### 5.2. Structured Output Handling

**Spike 1 must determine:** Does Ollama support native JSON schema enforcement?

**Scenario A: Native support**
```json
{
  "model": "gemma-4-e4b",
  "prompt": "...",
  "images": ["..."],
  "format": "json",
  "schema": { /* PhotoAnalysisV2 JSON Schema */ }
}
```

**Scenario B: No native support (client-side validation)**
```typescript
async function analyzePhoto(...): Promise<PhotoAnalysisV2> {
  const response = await fetch('http://localhost:11434/api/generate', {
    method: 'POST',
    body: JSON.stringify({ model: 'gemma-4-e4b', prompt, images })
  });

  const result = await response.json();
  const parsed = JSON.parse(result.response);

  // Validate via Zod (with retry logic)
  try {
    return validatePhotoAnalysisV2(parsed);
  } catch (error) {
    // Retry (max 3 attempts)
    if (retryCount < 3) {
      return analyzePhoto(..., retryCount + 1);
    }
    throw new Error('Schema validation failed after 3 attempts');
  }
}
```

### 5.3. Token Count Tracking

**Spike 1 must determine:** Does Ollama return `prompt_eval_count` and `eval_count`?

**If YES:**
```typescript
const tokenUsage = {
  promptTokens: result.prompt_eval_count,
  completionTokens: result.eval_count,
  totalTokens: result.prompt_eval_count + result.eval_count
};
analysis.tokenUsage = tokenUsage;
```

**If NO:**
```typescript
// Client-side estimation (approximate)
import { encode } from 'gpt-tokenizer'; // or tiktoken

const promptTokens = encode(prompt).length;
const completionTokens = encode(result.response).length;
const tokenUsage = {
  promptTokens,
  completionTokens,
  totalTokens: promptTokens + completionTokens
};
analysis.tokenUsage = tokenUsage; // Mark as estimated
```

**UI display:**
- Real counts: "Tokens: 2,847 (1,794 prompt + 1,053 completion)"
- Estimated counts: "Tokens: ~2,850 (estimated)"

### 5.4. Error Handling

**Ollama errors:**

1. **Connection refused (Ollama not running):**
   - Error message: "Local inference unavailable. Please start Ollama: `ollama serve`"
   - UI: Display troubleshooting link to docs

2. **Model not found (Gemma 4 E4B not pulled):**
   - Error message: "Model not found. Run: `ollama pull gemma-4-e4b`"
   - UI: Display one-click pull button (calls `ollama pull` via child process in Electron)

3. **Timeout (inference >30 seconds):**
   - Error message: "Analysis timed out. Try a smaller image or faster quantization (Q4 instead of Q8)."
   - Retry with timeout increase (60 seconds)

4. **Invalid response (malformed JSON):**
   - Retry (max 3 attempts)
   - If persistent → error message: "Model produced invalid output. Please report this issue."

---

## 6. State Management Strategy

### 6.1. React State (In-Memory)

**Root state in App.tsx:**
```typescript
const [mode, setMode] = useState<'studio' | 'vault'>('studio');
const [image, setImage] = useState<{ src: string; mimeType: string } | null>(null);
const [analysis, setAnalysis] = useState<PhotoAnalysisV2 | null>(null);
const [cvData, setCvData] = useState<CVData | null>(null);
const [isAnalyzing, setIsAnalyzing] = useState(false);
const [mentorChatState, setMentorChatState] = useState<MentorChatState>({ messages: [], isLoading: false });
const [sessionHistory, setSessionHistory] = useState<SessionCostMetric[]>([]);
const [error, setError] = useState<string | null>(null);
```

**Why lifted state:**
- AnalysisResults needs `analysis`, `cvData`, `mentorChatState`
- PhotoUploader needs `setImage`, `setIsAnalyzing`
- EconomicsDashboard needs `sessionHistory`
- Mode affects multiple components (UI enablement, audit logging)

**State updates trigger re-renders** → components react to new data automatically.

### 6.2. IndexedDB (Persistent Storage)

**Use cases:**
1. **Session history** - Store past analyses for economics dashboard (trend chart)
2. **Audit log** (Vault Mode only) - Tamper-evident log of all operations
3. **User preferences** - API keys, mode selection, UI settings

**Schema:**
```typescript
interface StoredSession {
  id: string;                          // UUID
  timestamp: number;                   // Unix timestamp
  mode: 'studio' | 'vault';
  imageHash: string;                   // SHA-256 hash (don't store image itself)
  analysis: PhotoAnalysisV2;
  cvData: CVData;
  tokenUsage: TokenUsage;
  auditLogHash?: string;               // Hash of audit log at this point (Vault Mode)
}

interface AuditEvent {
  id: string;                          // UUID
  timestamp: number;
  eventType: 'photo_upload' | 'analysis_complete' | 'mentor_chat' | 'export_log';
  details: Record<string, any>;
  previousHash: string;                // Hash of previous event (chain link)
  currentHash: string;                 // Hash of this event (SHA-256)
}
```

**IndexedDB stores:**
- `sessions` object store (key: id, indexed by timestamp)
- `auditLog` object store (key: id, indexed by timestamp, Vault Mode only)
- `preferences` object store (key: setting name)

**Retention:**
- Sessions: Keep last 100 (configurable)
- Audit log: Never delete (Vault Mode requirement, export for archival)
- Preferences: Persist indefinitely

### 6.3. No Server-Side State

**All state is client-side** (browser or Electron app). Benefits:
- Privacy (no data sent to server)
- Simplicity (no backend database)
- Vault Mode compatible (no cloud dependencies)

**Trade-off:** No cross-device sync (acceptable for v2 MVP).

---

## 7. Audit Logging (Vault Mode)

### 7.1. Purpose

**Vault Mode users need tamper-evident logs** to:
1. Prove analysis happened locally (no cloud calls)
2. Demonstrate compliance with confidentiality policies (NDA, legal cases)
3. Detect tampering (hash chain breaks if events modified)

### 7.2. Hash Chain Design

**Each audit event contains:**
- Event data (type, timestamp, details)
- `previousHash` - SHA-256 hash of previous event
- `currentHash` - SHA-256 hash of (event data + previousHash)

**Chain properties:**
- First event: `previousHash = "0000...0000"` (genesis)
- Subsequent events: `previousHash = previous event's currentHash`
- Tampering breaks chain: If event N modified → currentHash changes → event N+1's previousHash doesn't match → audit fails

**Verification:**
```typescript
function verifyAuditLog(events: AuditEvent[]): boolean {
  for (let i = 1; i < events.length; i++) {
    const prev = events[i - 1];
    const curr = events[i];

    if (curr.previousHash !== prev.currentHash) {
      console.error(`Audit chain broken at event ${i}`);
      return false;
    }

    // Recompute curr.currentHash and verify
    const recomputed = sha256(JSON.stringify({
      id: curr.id,
      timestamp: curr.timestamp,
      eventType: curr.eventType,
      details: curr.details,
      previousHash: curr.previousHash
    }));

    if (recomputed !== curr.currentHash) {
      console.error(`Event ${i} hash mismatch (tampered)`);
      return false;
    }
  }

  return true; // Chain intact
}
```

### 7.3. Logged Events

**Event types:**
1. `photo_upload` - User uploads photo
   - Details: `{ imageHash: string, timestamp: number, mode: 'vault' }`
2. `cv_analysis_complete` - CV processing done
   - Details: `{ imageHash: string, duration_ms: number }`
3. `ollama_request` - Sending prompt to Ollama
   - Details: `{ model: 'gemma-4-e4b', promptTokens: number }`
4. `ollama_response` - Received response from Ollama
   - Details: `{ completionTokens: number, duration_ms: number, isRefusal: boolean }`
5. `mentor_chat` - User asks follow-up question
   - Details: `{ turnNumber: number, promptTokens: number }`
6. `export_log` - User exports audit log
   - Details: `{ eventCount: number, exportFormat: 'json' }`

### 7.4. Export Format

**User can export audit log as JSON:**
```json
{
  "exportTimestamp": "2026-05-06T18:47:23Z",
  "totalEvents": 42,
  "chainVerified": true,
  "events": [
    {
      "id": "a1b2c3d4-...",
      "timestamp": 1746540195000,
      "eventType": "photo_upload",
      "details": { "imageHash": "e3b0c442...", "mode": "vault" },
      "previousHash": "0000...0000",
      "currentHash": "8f7e6d5c..."
    },
    {
      "id": "e5f6g7h8-...",
      "timestamp": 1746540196000,
      "eventType": "cv_analysis_complete",
      "details": { "imageHash": "e3b0c442...", "duration_ms": 742 },
      "previousHash": "8f7e6d5c...",
      "currentHash": "3c4b5a69..."
    },
    // ... more events ...
  ]
}
```

**UI:** Button in Vault Mode settings: "Export Audit Log" → downloads JSON file.

**Use case:** Attach audit log to client deliverables, proving local processing.

---

## 8. Technology Stack Summary

### 8.1. Frontend

- **Framework:** React 19.2.1 (from v1 baseline)
- **TypeScript:** 5.x
- **Build tool:** Vite (fast dev server, optimized builds)
- **Styling:** Tailwind CSS (utility-first, responsive)
- **Charts:** Recharts or Chart.js (for histogram, economics line chart)
- **State:** React useState/useReducer (no Redux, keep it simple)

### 8.2. Services

- **CV Layer:** Browser Canvas API + exif-js
- **Ollama Client:** Fetch API (HTTP calls to localhost:11434)
- **Gemini Client:** Google GenAI SDK (optional, Studio Mode only)
- **Validation:** Zod (schema validation)
- **Audit:** Custom hash-chain implementation (SHA-256 via Web Crypto API)

### 8.3. Runtime

- **Development:** Vite dev server (localhost:5173)
- **Production (web):** Static hosting (Vercel, Netlify, GitHub Pages)
- **Production (desktop):** Electron app (for true Vault Mode network isolation)
- **LLM Inference:** Ollama (local server, localhost:11434)

### 8.4. Storage

- **In-memory:** React state
- **Persistent:** IndexedDB (via `idb` library for cleaner API)
- **No server:** All data stays client-side

---

## 9. Performance Targets

### 9.1. Latency Budget

**Photo analysis (end-to-end):**
- Image upload + validation: <100ms
- CV processing: <800ms (per 05-deterministic-cv-spec.md)
- Prompt building: <50ms
- Ollama inference: 3-8 seconds (target P50: 5s, P95: 8s)
- Validation + rendering: <200ms
- **Total: 4-9 seconds** (competitive with cloud APIs)

**Mentor chat:**
- Prompt building: <100ms
- Ollama inference: 2-5 seconds (shorter than initial analysis, less context)
- **Total: 2-5 seconds per turn**

**Image generation (Studio Mode, optional):**
- Gemini API call: 10-30 seconds (cloud latency, not controllable)
- Display: <100ms
- **Total: 10-30 seconds** (acceptable for paid feature)

### 9.2. Optimization Strategies

**For large images:**
1. Downsample before CV (resize to 1920×1080)
2. Progressive loading (display EXIF → histogram → full results)
3. Web Workers for CV processing (avoid blocking main thread)

**For slow devices:**
1. Skip optional CV features (edge density, color distribution)
2. Lower focus map resolution (5×5 instead of 10×10)
3. Use Q4 quantization (faster than Q5/Q8)

**For web app responsiveness:**
1. Optimistic UI updates (show loading states immediately)
2. Debounce mentor chat input (don't send on every keystroke)
3. Lazy load tabs (only render active tab content)

---

## 10. Open Questions (Resolve During Spike 1)

### 10.1. Ollama API Surface

**Question:** Does Ollama support:
- Native JSON schema enforcement?
- Token count reporting (prompt_eval_count, eval_count)?
- Image input via base64 inline?

**Impact:** Determines implementation details in ollamaService.ts (see section 5.2, 5.3).

### 10.2. Quantization Choice

**Question:** Which quantization (Q4/Q5/Q8) offers best quality/speed trade-off?

**Depends on:** Spike 4 results (post-Tier-2, non-blocking).

**Default assumption:** Q4_K_M (per Spike 1 baseline, fastest).

**Deferred decision:** Allow users to select quantization in settings (Spike 4 informs recommendation).

---

## 11. Batch Processing (Desktop Studio Mode, Optional Enhancement)

### 11.1. Motivation

**Use case:** Photographers need to process hundreds of photos offline (e.g., field work, network-limited environments, consistency requirements for portfolio reviews).

**Requirement:** JSONL job queue with checkpoint/resume for crash recovery and progress tracking.

**Scope:** Non-blocking enhancement to MVP. Core Gemma/Ollama path unchanged. Vault policy unaffected.

### 11.2. Batch Runner Module

**Architecture:**

```
┌─────────────────────────────────────────┐
│       Batch Orchestration Layer         │
│                                         │
│  1. Ingest → JSONL queue (jobs.jsonl)  │
│  2. Worker → sequential execution       │
│  3. Checkpoint → every N jobs (10-12)   │
│  4. Resume → on restart/crash           │
│  5. Outputs → validated results + logs  │
└─────────────────────────────────────────┘
         ▼                    ▼
   ┌─────────┐          ┌──────────┐
   │ Ollama  │          │ CV Layer │
   │ Service │          │ Service  │
   └─────────┘          └──────────┘
```

**Data flow:**
```
Folder of photos → Batch ingest → jobs.jsonl (one job per line)
                                       ↓
                         Single worker (sequential, no parallelism)
                                       ↓
                         For each job: CV → Ollama → Validation
                                       ↓
                         Every 10-12 jobs: Checkpoint (job_id, timestamp)
                                       ↓
                         Output: results.jsonl + metrics.csv
                                       ↓
                         On crash/restart: Resume from last checkpoint
```

### 11.3. JSONL Job Schema

**jobs.jsonl** (input queue, one job per line):
```json
{"job_id":"001","photo_path":"/path/to/photo1.jpg","mode":"studio","model":"gemma-4-e4b","status":"pending","retries":0,"created_at":"2026-05-15T10:00:00Z"}
{"job_id":"002","photo_path":"/path/to/photo2.jpg","mode":"studio","model":"gemma-4-e4b","status":"pending","retries":0,"created_at":"2026-05-15T10:00:01Z"}
```

**results.jsonl** (output, one result per line):
```json
{"job_id":"001","status":"completed","output_path":"/outputs/001.json","tokens":2847,"latency_ms":4523,"timestamp":"2026-05-15T10:05:23Z"}
{"job_id":"002","status":"completed","output_path":"/outputs/002.json","tokens":2912,"latency_ms":4678,"timestamp":"2026-05-15T10:10:01Z"}
```

### 11.4. Checkpoint/Resume Behavior

**Checkpoint cadence:** Every 10-12 jobs (configurable).

**checkpoint.json:**
```json
{
  "last_completed_job_id": "012",
  "timestamp": "2026-05-15T11:30:45Z",
  "total_jobs": 100,
  "completed_jobs": 12,
  "failed_jobs": 0
}
```

**Resume logic:**
1. Load `checkpoint.json` (if exists)
2. Read `jobs.jsonl`, skip jobs with `job_id <= last_completed_job_id`
3. Continue processing from next job
4. Do not reprocess completed jobs (idempotent)

**Crash recovery test:**
1. Start batch run (100 photos)
2. Interrupt after 25 jobs (kill process)
3. Restart batch runner
4. Verify: resumes from job 26, completes remaining 75, no duplicates

### 11.5. Metrics Export

**metrics.csv** (summary of batch run):
```csv
job_id,photo_path,status,tokens_prompt,tokens_completion,latency_ms,ttft_ms,schema_valid,timestamp
001,/path/to/photo1.jpg,completed,1794,1053,4523,850,true,2026-05-15T10:05:23Z
002,/path/to/photo2.jpg,completed,1812,1100,4678,902,true,2026-05-15T10:10:01Z
003,/path/to/photo3.jpg,failed,0,0,0,0,false,2026-05-15T10:15:12Z
```

**Metrics tracked:**
- Tokens/second (throughput)
- Time to first token (TTFT) - if Ollama supports
- End-to-end latency (image upload → validated result)
- Schema pass rate (% of jobs with valid PhotoAnalysisV2)

**Use case:** Compare quantizations (Q4 vs Q5 vs Q8), measure Gemma performance over large datasets.

### 11.6. Implementation Notes

**Service:** `src/services/batchService.ts` (Desktop app only, not web).

**Storage:** File system (JSONL files, not IndexedDB).

**Execution:** Single worker, sequential (no parallelism in MVP). Parallel workers in post-MVP.

**Error handling:** Retry failed jobs (max 3 attempts), log errors to `errors.jsonl`.

**UI:** Progress bar in Desktop app (X/N jobs completed, ETA, current job).

### 11.7. Desktop Integration

**How users access:**
1. Desktop app: File menu → "Batch Analysis"
2. Select folder of photos
3. Configure: mode (Studio/Vault), model (gemma-4-e4b), checkpoint cadence
4. Click "Start Batch"
5. Monitor progress (live updates)
6. View results: `results.jsonl`, `metrics.csv`, `checkpoint.json`
7. Export audit log (Vault Mode only)

**Vault Mode behavior:**
- Batch analysis allowed in Vault Mode (all local processing)
- Audit log records batch events (batch_started, batch_checkpoint, batch_completed)
- No cloud endpoints called (network isolation enforced)

---

## 11. Dependencies and Blockers

### 11.1. Blocking Dependencies

**This spec (06) blocks:**
- **07-stack-and-runtime-mapping.md** - needs architecture to map components to runtime
- **08-ui-adaptation-spec.md** - needs component structure and data flow
- **09-validation-and-error-handling-spec.md** - needs error scenarios and retry logic
- **10-platform-shells-spec.md** - needs Electron app structure for desktop Vault Mode

**This spec (06) is blocked by:**
- **Spike 1 (Gemma via Ollama)** - MUST resolve Ollama API surface questions
- **Spike 2 (Cactus)** - OPTIONAL, determines if Cactus replaces vanilla Ollama

### 11.2. Deferred to Tier 3

**Advanced features:**
1. **Cross-device sync** - Sync sessions across devices (requires backend)
2. **Portfolio review** - Analyze entire folder, generate comparative report
3. **Parallel batch processing** - Multi-worker batch analysis (MVP uses single worker)

**Batch analysis:** Lightweight offline implementation added in section 11 (JSONL queue, checkpoint/resume). Non-blocking enhancement.

---

## 12. Success Criteria

**This architecture succeeds if:**

1. ✅ Data flow is clear and testable (can unit test each service independently)
2. ✅ Mode differentiation is enforced architecturally (Vault blocks cloud, Studio allows optional cloud)
3. ✅ Ollama integration is reliable (5/5 photos analyzed successfully in Spike 1)
4. ✅ Audit logging is tamper-evident (hash chain verification passes 100% on 50 test events)
5. ✅ State management scales (no performance issues with 100+ session history entries)
6. ✅ Performance targets met (P95 latency <9 seconds, P50 <5 seconds)

---

## 13. Summary

This spec defines the **system architecture** for Photography Coach v2:

1. **Component structure:** UI layer (React) → Service layer (CV, Ollama, Gemini, validation, audit) → Runtime (Ollama local, optional Gemini cloud)
2. **Data flow:** Image → CV → Ollama → Validation → UI (4-9 second end-to-end)
3. **Mode differentiation:** Studio (optional cloud) vs Vault (network-isolated, audit-logged)
4. **Ollama integration:** HTTP API (localhost:11434), structured output via JSON mode or client-side validation
5. **State management:** React state (in-memory) + IndexedDB (persistent)
6. **Audit logging:** Hash-chained events (tamper-evident) for Vault Mode

**Next steps:**
1. Resolve Ollama API questions during Spike 1
2. Implement service layer (ollamaService, cvService, validationService, auditService)
3. Proceed to **07-stack-and-runtime-mapping.md** to document dependencies and deployment

---

**End of 06-architecture-spec.md**
