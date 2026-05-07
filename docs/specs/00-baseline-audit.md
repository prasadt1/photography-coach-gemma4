# 00-baseline-audit.md

**Spec Session:** Photography Coach v2 (Gemma 4 Edition)
**Audit Date:** 2026-05-06
**Branch:** gemma4-v2/spec-session
**Baseline Commit:** origin/main
**Tooling Commit:** 143d260 ("chore: add deps for Gemma v2 tooling")

---

## Executive Summary

Photography Coach AI is a **single-page web application** built with **React 19.2.1 + TypeScript** that uses **Gemini 3 Pro APIs** (vision + image generation + chat) to provide multi-dimensional photography critique with transparent reasoning. The application has:

- **No backend server** - pure frontend architecture
- **3 Gemini integration points** - vision analysis, image generation, mentor chat
- **5-tab dashboard** - Overview, Detailed Analysis, Mentor Chat, AI Enhancement, Economics
- **Spatial critique** - CSS/DOM overlays (SpatialOverlay.tsx) for visual feedback
- **Context caching simulation** - Educational cost projection (not activated at current scale)
- **Clean architecture** - Flat directory structure, clear separation of concerns

**Port Scope:** Replace all Gemini 3 Pro API calls with local Gemma 4 E4B inference via Ollama while preserving UI, state management, and schema structure.

**Dependencies for Gemma v2 Added:** Commit `143d260` added ollama, exifr, exiftool-vendored, sharp, hash-wasm, zod, electron, capacitor, vitest, and dev tooling. **No behavioral changes** - only package manifest updates.

---

## 1. Repository Structure

### Directory Layout

```
photography-coach-ai-gemini3/
├── App.tsx (405 lines)                   # Main orchestrator
├── index.tsx (349 lines)                 # React entry point
├── types.ts (115 lines)                  # Type definitions (v1 schema)
├── components/
│   ├── AnalysisResults.tsx (1142 lines) # 5-tab results dashboard
│   ├── SpatialOverlay.tsx (127 lines)   # Canvas bounding box rendering
│   ├── PhotoUploader.tsx (189 lines)    # Drag-drop upload + thinking UI
│   └── PresentationSlides.tsx (373 lines) # Presentation mode
├── services/
│   └── geminiService.ts (415 lines)     # Gemini 3 Pro API integration
├── docs/
│   └── specs/                           # Spec session output (new)
├── vite.config.ts (24 lines)            # Vite build config
├── tsconfig.json (20 lines)             # TypeScript config
├── index.html (82 lines)                # HTML entry point
├── package.json                         # Dependencies
├── ARCHITECTURE.md (554 lines)          # Existing architecture doc
├── README.md (644 lines)                # Project documentation
└── node_modules/                        # Dependencies (gitignored)
```

**No `src/` directory** - flat structure at root level.

**Build System:** Vite 5.0 with React plugin, TypeScript, TailwindCSS, PostCSS.

---

## 2. Frontend Stack

### Core Technologies

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| **Framework** | React | 19.2.1 | UI rendering |
| **Language** | TypeScript | 5.3.0 | Type safety |
| **Build** | Vite | 5.0.0 | Fast dev + production builds |
| **Styling** | TailwindCSS | 3.4.1 | Utility-first CSS |
| **Charts** | Recharts | 3.5.1 | Radar chart, area chart |
| **Icons** | Lucide React | 0.556.0 | Icon library |
| **API Client** | @google/genai | 1.31.0 | Gemini SDK |

### Deployment Target

- **Dev Server:** Vite dev @ `localhost:3000`
- **Production:** Static hosting (Vercel/Netlify acceptable)
- **Environment:** Browser-only, no server-side rendering

### Build Configuration

**vite.config.ts:**
- Server port: 3000, host: 0.0.0.0
- React plugin enabled
- Environment variable injection: `process.env.API_KEY`, `process.env.GEMINI_API_KEY`
- Path alias: `@` → project root

**tsconfig.json:**
- Target: ES2020
- Module: ESNext
- Strict mode enabled
- JSX: react-jsx
- No src/ folder specified (uses root-level includes)

**No test files present** in the project (only node_modules tests from dependencies).

---

## 3. Gemini 3 Pro Integration Points

### File: `services/geminiService.ts`

Three API functions + one helper function + retry logic.

#### 3.1. Vision Analysis (`analyzeImage`)

**Location:** `geminiService.ts:114-284`

**API Endpoint:** `gemini-3-pro-preview`

**Input:**
- `base64Image: string` - base64-encoded photo
- `mimeType: string` - image MIME type (image/jpeg, image/png, image/webp)

**Output:** `PhotoAnalysis` object

**Prompt Structure:**
- **System Context:** `PHOTOGRAPHY_PRINCIPLES` constant (lines 21-52) - 32 lines of photography coaching principles (composition, lighting, technical guidelines, creative elements)
- **User Request:** "Analyze this photograph based on the following principles..."
- **Schema Instructions:** Inline JSON schema with field descriptions, bounding box rules, thinking process instructions

**API Call:**
```typescript
await ai.models.generateContent({
  model: 'gemini-3-pro-preview',
  contents: {
    role: 'user',
    parts: [
      { inlineData: { data: cleanedImage, mimeType } },
      { text: `Analyze this photograph...\n${PHOTOGRAPHY_PRINCIPLES}...` }
    ]
  },
  config: {
    responseMimeType: 'application/json',
    responseSchema: { /* structured schema */ }
  }
})
```

**Response Parsing:**
- Parses `response.text` as JSON
- Extracts token usage metadata: `promptTokenCount`, `candidatesTokenCount`, `cachedContentTokenCount`
- Calculates cost metrics (real vs projected with caching)
- Returns `PhotoAnalysis` with `tokenUsage` attached

**Retry Logic:** `withRetry()` wrapper (lines 96-112) - 2 retries with exponential backoff for 500/503 errors, skips permission errors (403/404).

**Error Handling:**
- Permission errors (403, 404) fail fast
- 500/503 errors retry with 1s delay, doubling each retry
- Other errors propagate immediately

---

#### 3.2. Image Generation (`generateCorrectedImage`)

**Location:** `geminiService.ts:286-318`

**API Endpoint:** `gemini-3-pro-image-preview`

**Input:**
- `base64Image: string` - original photo
- `mimeType: string` - image MIME type
- `improvements: string[]` - list of improvement suggestions from analysis

**Output:** `string` - base64-encoded corrected image (PNG)

**Prompt Structure:**
```
Act as a professional photo retoucher. Improve this image by addressing
the following specific feedback: ${improvementsText}. Enhance technical
qualities like lighting, exposure, and color balance while maintaining
the original subject and composition. Return a high-quality photorealistic image.
```

**API Call:**
```typescript
await ai.models.generateContent({
  model: 'gemini-3-pro-image-preview',
  contents: {
    role: 'user',
    parts: [
      { inlineData: { data: cleanedImage, mimeType } },
      { text: prompt }
    ]
  },
  config: {
    imageConfig: { imageSize: "1K" }
  }
})
```

**Response Parsing:**
- Calls `extractImage()` helper (lines 406-415)
- Extracts base64 image data from `response.candidates[0].content.parts[].inlineData.data`
- Returns raw base64 string (no data URI prefix)

**Retry Logic:** Same `withRetry()` wrapper as vision analysis.

---

#### 3.3. Mentor Chat (`askPhotographyMentor`)

**Location:** `geminiService.ts:320-404`

**API Endpoint:** `gemini-3-pro-preview`

**Input:**
- `base64Image: string` - photo being discussed
- `mimeType: string` - image MIME type
- `userQuestion: string` - user's question
- `previousAnalysis: PhotoAnalysis` - initial critique context
- `conversationHistory?: MentorMessage[]` - previous chat turns

**Output:** `{ answer: string; thinking: ThinkingProcess }`

**Context Building:**
- Summarizes previous analysis (composition score, lighting score, top 3 issues, overall critique)
- Appends conversation history if exists (formatted as "User: ... Mentor: ...")
- Injects user question

**Prompt Structure:**
```
You are an expert photography mentor. A photographer has uploaded their
image and you've already analyzed it.

[Context Summary]

[Previous Conversation]

The photographer now asks: "${userQuestion}"

As their mentor, respond directly and personally. Reference the image
and their specific scores/issues. Show your reasoning process.

Return response as JSON:
{ "answer": "...", "thinking": { ... } }
```

**API Call:**
```typescript
await ai.models.generateContent({
  model: 'gemini-3-pro-preview',
  contents: {
    role: 'user',
    parts: [
      { text: mentorPrompt },
      { inlineData: { data: cleanedImage, mimeType } }
    ]
  },
  config: {
    responseMimeType: 'application/json',
    responseSchema: { /* structured schema */ }
  }
})
```

**Response Parsing:**
- Parses `response.text` as JSON
- Extracts `{ answer, thinking }`
- Returns structured object

**Turn Limit:** Enforced in UI (AnalysisResults.tsx:89) - max 5 turns (10 messages total).

**Retry Logic:** Same `withRetry()` wrapper.

---

#### 3.4. Helper Functions

**`getGenAIClient()` (lines 77-93):**
- Checks for shared API key from `window.aistudio.getSharedApiKey()` (AI Studio environment)
- Falls back to `process.env.API_KEY`
- Returns `GoogleGenAI` client instance

**`cleanBase64()` (lines 55-60):**
- Strips data URI prefix (`data:image/jpeg;base64,`) if present
- Returns raw base64 string

**`isPermissionError()` (lines 63-74):**
- Checks for 403, 404, "permission denied", "not found", "billing" errors
- Used to skip retry logic for permission failures

**`withRetry()` (lines 96-112):**
- Wraps async functions with retry logic
- 2 retries, 1s initial delay, exponential backoff
- Skips permission errors

**`extractImage()` (lines 406-415):**
- Extracts base64 image from Gemini response candidates
- Iterates through `response.candidates[0].content.parts[]` to find `inlineData`
- Throws if no image generated

---

### API Key Handling

**Environment Variable Injection:**
- Vite config (vite.config.ts:14-15) injects `process.env.API_KEY` and `process.env.GEMINI_API_KEY`
- Source: `.env.local` file (gitignored) with `GEMINI_API_KEY=...`

**Client Fallback:**
- `getGenAIClient()` checks `window.aistudio.getSharedApiKey()` first (AI Studio shared key environment)
- Falls back to `process.env.API_KEY` if shared key unavailable
- No explicit error thrown if both are empty - SDK handles authentication failure

**Error UI Handling:**
- App.tsx (lines 103-118) catches permission errors and shows "API_KEY_ERROR" state
- Prompts user to connect project via `window.aistudio.openSelectKey()` if available
- AnalysisResults.tsx (lines 329-352) handles image generation permission errors similarly

---

## 4. Current Critique Schema (v1)

### File: `types.ts`

#### 4.1. `PhotoAnalysis` Interface (lines 48-92)

**Complete Schema:**

```typescript
interface PhotoAnalysis {
  // Scoring metrics (0-100)
  scores: {
    composition: number;
    lighting: number;
    creativity: number;
    technique: number;
    subjectImpact: number;
  };

  // Detailed written feedback
  critique: {
    composition: string;
    lighting: string;
    technique: string;
    overall: string;
  };

  // What's working well
  strengths: string[];

  // Areas to improve
  improvements: string[];

  // Suggested learning path
  learningPath?: string[]; // Optional - 3-5 next skills to master

  // Best guess at camera settings used
  settingsEstimate: {
    focalLength: string;
    aperture: string;
    shutterSpeed: string;
    iso: string;
  };

  // Spatial analysis with visual overlays
  boundingBoxes?: BoundingBox[]; // Optional

  // Token economics data
  tokenUsage?: TokenUsage; // Optional

  // AI's reasoning process (when thinking mode is enabled)
  thinking?: ThinkingProcess; // Optional
}
```

**Required Fields:**
- `scores` (all 5 dimensions)
- `critique` (all 4 categories)
- `strengths` (array)
- `improvements` (array)
- `settingsEstimate` (all 4 settings)
- `thinking` (observations, reasoningSteps, priorityFixes) - **Required in Gemini responses** (line 228)

**Optional Fields:**
- `learningPath` - **TypeScript marks optional (`?`) but Gemini responseSchema lists it in `required` array** (geminiService.ts:228). API will always return it; TS optionality is defensive. Fallback in UI: default skills if missing (AnalysisResults.tsx:299).
- `boundingBoxes` (empty array if none)
- `tokenUsage` (calculated post-response)

**Schema Validation:** Enforced by Gemini API via `responseSchema` config. No client-side Zod validation yet.

**Score Scale Note:** TypeScript comments indicate 0-100 scale (line 50: "Scoring metrics (0-100)"), but UI displays 0-10 scale (ScoreCard component shows `{score}/10`) and radar chart uses `fullMark: 10` (AnalysisResults.tsx:310-314). **Actual values from Gemini are 0-10.** TypeScript comment is misleading. Flag for v2 schema documentation to clarify normalization.

---

#### 4.2. `BoundingBox` Interface (lines 4-13)

```typescript
interface BoundingBox {
  type: 'composition' | 'lighting' | 'focus' | 'exposure' | 'color';
  severity: 'critical' | 'moderate' | 'minor';
  x: number; // Percentage from left edge (0-100)
  y: number; // Percentage from top edge (0-100)
  width: number; // Percentage of image width (0-100)
  height: number; // Percentage of image height (0-100)
  description: string; // What's wrong in this area
  suggestion: string; // How to fix it
}
```

**Usage:** Rendered by `SpatialOverlay.tsx` as CSS/DOM overlays on the photo (absolute-positioned divs, not HTML canvas).

**Severity Color Mapping:**
- `critical` → Red border (`border-rose-500`)
- `moderate` → Orange border (`border-amber-500`)
- `minor` → Blue border (`border-sky-500`)

**Coordinate System:** Percentage-based (0-100) for responsive rendering.

**Sorting Logic:** SpatialOverlay.tsx (lines 110-116) sorts boxes by area (large to small) to prevent occlusion.

---

#### 4.3. `ThinkingProcess` Interface (lines 42-46)

```typescript
interface ThinkingProcess {
  observations: string[]; // Initial things noticed
  reasoningSteps: string[]; // How the AI evaluated the photo
  priorityFixes: string[]; // Ranked list of fixes
}
```

**Usage:**
- Displayed in "Gemini 3 Pro Thinking Process" section (AnalysisResults.tsx:617-689)
- Expandable UI with color-coded sections (observations=green, reasoning=purple, fixes=amber)
- Mentor chat responses include thinking (AnalysisResults.tsx:182-204)

**Gemini 3 Pro Feature:** Captures extended reasoning process during inference. **Will need replacement** for Gemma 4 E4B - no built-in "extended thinking" mode.

---

#### 4.4. `TokenUsage` Interface (lines 16-28)

```typescript
interface TokenUsage {
  // REAL METRICS (Honest reporting)
  realCachedTokens: number; // Actual tokens retrieved from cache (likely 0 for small prompts)
  realNewTokens: number; // Actual fresh tokens processed
  totalTokens: number; // Total tokens in request
  realCost: number; // The actual billable amount for this request

  // PROJECTED METRICS (Educational/Simulation)
  projectedCachedTokens: number; // Tokens that COULD be cached (static context)
  projectedCostWithCache: number; // Theoretical cost if context was cached
  projectedSavings: number; // Theoretical savings
}
```

**Usage:**
- Displayed in "Economics (Sim)" tab (AnalysisResults.tsx:894-1133)
- Session history tracking (SessionCostMetric array in App.tsx:58)
- Chart visualization (area chart with cache vs real cost comparison)

**Pricing Constants:** `geminiService.ts:6-18` - Gemini 3 Pro input ($3.50/1M), output ($10.50/1M), cached input ($0.875/1M)

**Calculation:** `geminiService.ts:242-280` - extracts `usageMetadata` from Gemini response, calculates real vs projected costs.

**Caching Note:** Real cache tokens are 0 (request below 32KB threshold). Projected cache simulates enterprise-scale behavior.

---

#### 4.5. `MentorMessage` Interface (lines 104-109)

```typescript
interface MentorMessage {
  role: 'user' | 'assistant';
  content: string;
  thinking?: ThinkingProcess; // Only present for assistant messages
  timestamp: number;
}
```

**Usage:**
- Stored in `MentorChatState` (lines 111-115)
- Rendered in chat widget (AnalysisResults.tsx:163-206)
- Passed to `askPhotographyMentor()` as conversation history

**Turn Limit:** 5 user questions = 10 messages total (enforced in UI line 89).

---

#### 4.6. `SessionCostMetric` Interface (lines 31-39)

```typescript
interface SessionCostMetric {
  id: number; // Analysis number (1, 2, 3...)
  timestamp: number;
  realCost: number;      // What you actually paid
  projectedCost: number; // What you would pay with caching
  potentialSavings: number;
  cachedTokens?: number;
  newTokens?: number;
}
```

**Usage:**
- Accumulated in `sessionHistory` array (App.tsx:58, lines 84-96)
- Displayed in economics dashboard (AnalysisResults.tsx:912-995)
- Powers area chart visualization showing cost trend over session

---

#### 4.7. `AppState` Enum (lines 95-101)

```typescript
enum AppState {
  IDLE = 'IDLE',           // Waiting for upload
  ANALYZING = 'ANALYZING', // Processing with Gemini
  RESULTS = 'RESULTS',     // Showing analysis
  GENERATING = 'GENERATING', // Creating corrected image
  ERROR = 'ERROR'          // Something went wrong
}
```

**Usage:**
- Main state machine in App.tsx (line 47)
- Controls UI rendering (PhotoUploader vs AnalysisResults vs error)
- State transitions: IDLE → ANALYZING → RESULTS, ERROR branches

---

## 5. UI Components & State Management

### 5.1. App.tsx (Main Orchestrator)

**Lines:** 405 total

**State Variables:**

```typescript
const [appState, setAppState] = useState<AppState>(AppState.IDLE);
const [currentImage, setCurrentImage] = useState<string | null>(null);
const [analysis, setAnalysis] = useState<PhotoAnalysis | null>(null);
const [error, setError] = useState<string | null>(null);
const [showSlides, setShowSlides] = useState(false);
const [initialSlide, setInitialSlide] = useState(1);
const [activeResultTab, setActiveResultTab] = useState<TabId>('overview');
const [sessionHistory, setSessionHistory] = useState<SessionCostMetric[]>([]);
const [mentorChatState, setMentorChatState] = useState<MentorChatState>({ messages: [], isLoading: false });
```

**Key Functions:**

- `handleImageSelected()` (lines 66-119): Calls `analyzeImage()`, updates state, tracks session history
- `handleSampleClick()` (lines 121-137): Loads Unsplash sample photos
- `handleReset()` (lines 139-145): Resets to IDLE state
- `startPresentation()` (lines 147-151): Opens PresentationSlides
- `showArchitectureSlide()` (lines 153-157): Opens PresentationSlides at slide 3

**State Flow:**
1. User uploads photo → `handleImageSelected()` → `analyzeImage()` → RESULTS
2. User clicks "Analyze Another" → `handleReset()` → IDLE
3. Errors caught → `setAppState(AppState.ERROR)`, `setError(message)`

**Props Passed Down:**
- PhotoUploader: `onImageSelected`, `isAnalyzing`
- AnalysisResults: `analysis`, `imageSrc`, `onReset`, `sessionHistory`, `activeTab`, `onTabChange`, `mentorChatState`, `setMentorChatState`, `onShowArchitecture`

**Conditional Rendering:**
- IDLE: PhotoUploader + sample photos
- ANALYZING: PhotoUploader (analyzing state)
- RESULTS: AnalysisResults
- ERROR: Error card with retry button

---

### 5.2. PhotoUploader.tsx

**Lines:** 189 total

**Props:**
```typescript
interface PhotoUploaderProps {
  onImageSelected: (base64: string, mimeType: string) => void;
  isAnalyzing: boolean;
}
```

**Features:**
- Drag-and-drop file upload (lines 37-54)
- File input click handler (lines 56-61)
- Image validation (line 64-67)
- Base64 conversion (lines 68-74)
- Thinking process animation (lines 22-35, 105-154)

**Thinking Steps UI:**
- 5-step progress indicator (lines 9-15): "Examining composition", "Analyzing lighting", "Identifying technical issues", "Evaluating subject impact", "Generating recommendations"
- Auto-advances every 2 seconds (lines 22-35)
- Visual state: past (green checkmark), active (pulsing icon), future (hidden)

**Accepted Formats:** `image/*` (enforced by input accept attribute line 95)

**Max File Size:** Not enforced in code (spec says 10MB, not validated)

---

### 5.3. AnalysisResults.tsx

**Lines:** 1142 total (largest component)

**Props:**
```typescript
interface AnalysisResultsProps {
  analysis: PhotoAnalysis;
  imageSrc: string;
  onReset: () => void;
  sessionHistory: SessionCostMetric[];
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  mentorChatState: MentorChatState;
  setMentorChatState: React.Dispatch<React.SetStateAction<MentorChatState>>;
  onShowArchitecture: () => void;
}
```

**State:**
- `showOverlays: boolean` - toggle spatial overlay
- `isGenerating: boolean` - image generation loading
- `correctedImage: string | null` - generated ideal version
- `sliderValue: number` - before/after blend amount (0-100)
- `generationError: string | null` - generation error message
- `isThinkingExpanded: boolean` - thinking section collapsed/expanded

**Layout:**
- Left Column (lg:col-span-5): Image + settings + reset button (sticky on desktop)
- Right Column (lg:col-span-7): Tabbed content area

**5 Tabs:**

1. **Overview** (lines 493-611):
   - Coach's verdict (overall critique)
   - Skill badge (Beginner/Intermediate/Advanced based on average score)
   - Radar chart (5-axis scores)
   - Score cards (composition, lighting, subject, technique)
   - Strengths/improvements lists
   - Key insights cards (top 5 improvements)

2. **Detailed Analysis** (lines 614-766):
   - **Gemini 3 Pro Thinking Process** (lines 618-689) - expandable panel with observations, reasoning steps, priority fixes
   - Technical deep dive (composition analysis, lighting analysis, technical execution)
   - Detected spatial issues list (bounding boxes rendered as cards)

3. **Mentor Chat** (lines 768-778):
   - Renders `MentorChatWidget` sub-component (lines 76-250)
   - Chat history display with thinking toggles
   - Input field + send button
   - Turn counter (X/5 turns)
   - Loading state ("Thinking...")

4. **AI Enhancement** (lines 780-892):
   - Generate button (calls `generateCorrectedImage()`)
   - Before/after comparison (opacity blend slider)
   - Download button
   - Error handling for permission/billing issues

5. **Economics (Sim)** (lines 894-1133):
   - Blue info box explaining caching simulation
   - Session history area chart (projected cost vs real cost)
   - Projected savings card
   - Cache efficiency card (hardcoded 75%)
   - Scale simulator (1,000 photos projection)
   - "View Architecture & ROI" button
   - Current request breakdown (token usage, cost breakdown)

**Skill Level Detection** (lines 288-307):
- Average score < 5.5: Beginner (rose badge)
- Average score 5.5-7.5: Intermediate (amber badge)
- Average score >= 7.5: Advanced (emerald badge)
- Affects badge color and learning path recommendations

**Image Generation Handler** (lines 317-356):
- Calls `generateCorrectedImage()` with `analysis.improvements` array
- Handles permission errors by prompting `window.aistudio.openSelectKey()`
- Displays corrected image in blend slider

**Auto-Show Overlays** (lines 281-285): Automatically shows spatial overlays when switching to Detailed Analysis tab if bounding boxes exist.

---

### 5.4. SpatialOverlay.tsx

**Lines:** 127 total

**Props:**
```typescript
interface SpatialOverlayProps {
  boundingBoxes: BoundingBox[];
  show: boolean;
}
```

**Rendering Logic:**
- Returns null if `!show` or no bounding boxes (line 103)
- Sorts boxes by area (large to small) to prevent occlusion (lines 110-116)
- Renders each box as absolute-positioned div with percentage coordinates

**BoxItem Component** (lines 10-100):
- Hover state for tooltip display (line 11)
- Smart positioning: tooltip above/below and left/right alignment based on box position
- Color coding by severity (lines 17-38)
- Visible label tag on box
- Detailed tooltip on hover/click (description + suggestion)
- Touch support for mobile (onClick toggles hover)

**Coordinate Mapping:**
- Bounding box coordinates are percentages (0-100)
- Applied via inline styles: `left: ${box.x}%`, `top: ${box.y}%`, etc.
- **Parent container must be `position: relative`** (enforced in AnalysisResults.tsx line 401)

---

### 5.5. PresentationSlides.tsx

**Lines:** 373 total

**Purpose:** Demo/presentation mode (not critical for Gemma v2 port)

**Features:**
- Full-screen slide deck
- Keyboard navigation (arrow keys, Escape)
- Architecture diagrams
- Economics charts
- Exit button

**Usage:** Triggered by footer "Presentation Mode" button (App.tsx:392-398) or "View Architecture & ROI" in Economics tab.

---

## 6. Spatial Overlay Rendering

### Implementation

**Technology:** Pure CSS with absolute positioning (no canvas, no SVG)

**Container:** AnalysisResults.tsx (lines 400-430) wraps image in relative-positioned div:

```tsx
<div className="relative inline-block w-auto h-auto max-w-full m-2 md:m-4">
  <img src={imageSrc} ... />
  <SpatialOverlay boundingBoxes={analysis.boundingBoxes || []} show={showOverlays} />
</div>
```

**Overlay Rendering:** SpatialOverlay.tsx renders bounding boxes as absolutely-positioned divs:

```tsx
<div
  className={`absolute border-2 ${style.border} ${style.bg} ...`}
  style={{
    left: `${box.x}%`,
    top: `${box.y}%`,
    width: `${box.width}%`,
    height: `${box.height}%`,
  }}
>
  {/* Label tag */}
  {/* Tooltip on hover */}
</div>
```

**Percentage-Based Coordinates:** Gemini returns coordinates as percentages (0-100), directly mapped to CSS percentages. No pixel calculations needed.

**Responsive:** Works on all screen sizes because percentages scale with image dimensions.

**Z-Index Management:** Sorted by area to render large boxes first, small boxes last (prevents interaction blocking).

**Mobile Support:** Click toggles hover state (line 54) for touch devices.

---

## 7. Mentor Chat Memory Model

### Turn Count & Limits

**Max Turns:** 5 user questions = 10 total messages (enforced in AnalysisResults.tsx:89)

**Turn Calculation:**
```typescript
const turnCount = Math.floor(chatState.messages.length / 2);
const isLimitReached = turnCount >= 5;
```

**UI Enforcement:**
- Input field disabled when limit reached (line 236)
- Send button disabled (line 241)
- Placeholder text changes to "Session limit reached." (line 235)

---

### Context Retention

**State Storage:** `mentorChatState` in App.tsx (line 61) - persists across tab switches but **not** across photo resets.

**Conversation History:** Array of `MentorMessage` objects (lines 104-109 in types.ts):

```typescript
interface MentorMessage {
  role: 'user' | 'assistant';
  content: string;
  thinking?: ThinkingProcess; // Only for assistant
  timestamp: number;
}
```

**Passed to API:** `askPhotographyMentor()` receives full conversation history (geminiService.ts:326):

```typescript
export const askPhotographyMentor = async (
  base64Image: string,
  mimeType: string,
  userQuestion: string,
  previousAnalysis: PhotoAnalysis,
  conversationHistory?: MentorMessage[]
)
```

**Context Building:** geminiService.ts (lines 332-344) formats conversation as text:

```typescript
const historyText = conversationHistory
  ? conversationHistory.map(m => `${m.role === 'user' ? 'User' : 'Mentor'}: ${m.content}`).join('\n')
  : '';
```

Injected into mentor prompt (line 350).

**Initial Context:** Every mentor chat turn receives:
1. **Photo** (base64 + mimeType) - sent with every request
2. **Analysis Summary** (lines 333-339):
   - Composition score
   - Lighting score
   - Top 3 improvements
   - Overall critique
3. **Conversation History** (formatted as text)
4. **User Question** (current turn)

**Memory Scope:** Per-photo session only. Resetting to upload new photo clears mentor chat (App.tsx:144).

---

### State Management

**Lifted State:** `mentorChatState` owned by App.tsx, passed down to AnalysisResults → MentorChatWidget.

**Why Lifted?**
- Persist chat when switching between tabs (e.g., Overview → Mentor Chat → Enhancement → Mentor Chat)
- Avoid re-mounting MentorChatWidget on tab change

**State Updates:**
1. User sends message → `setMentorChatState` appends user message, sets `isLoading: true`
2. API call completes → `setMentorChatState` appends assistant message, sets `isLoading: false`
3. Error → `setMentorChatState` sets `error` field

**Scroll Behavior:** useRef + useEffect (AnalysisResults.tsx:86, 91-95) auto-scrolls to bottom on new messages.

---

## 8. Image Generation Integration

### Workflow

1. **Trigger:** User clicks "✨ Generate Ideal Version" button (AnalysisResults.tsx:796-802)
2. **API Call:** `handleGenerate()` (lines 317-356) calls `generateCorrectedImage(imageSrc, mimeType, analysis.improvements)`
3. **Loading State:** `setIsGenerating(true)`, shows spinner (lines 812-818)
4. **Response:** Base64 PNG returned, prefixed with `data:image/png;base64,`, stored in `correctedImage` state
5. **Display:** Before/after blend slider (lines 820-877)

### Improvements Input

**Source:** `analysis.improvements` array (extracted from Gemini vision analysis)

**Format:** Array of strings, e.g.:
```typescript
[
  "Straighten the horizon line (currently 3° tilted clockwise)",
  "Reduce sky overexposure by -1.5 stops",
  "Apply fill light to subject's face to balance harsh shadows"
]
```

**Prompt Construction:** geminiService.ts (line 290) joins improvements with commas:

```typescript
const improvementsText = improvements.join(', ');
```

Injected into retoucher prompt (lines 305).

**Max Improvements:** Not limited, but typically 3-6 from vision analysis.

---

### Before/After Comparison

**Implementation:** Opacity blend slider (AnalysisResults.tsx:823-877)

**Stack:**
1. **Background Layer:** Original image (line 825-829)
2. **Foreground Layer:** AI-corrected image with dynamic opacity (lines 832-837):
   ```tsx
   style={{ opacity: sliderValue / 100 }}
   ```
3. **Slider Input:** Invisible range input (0-100) covering entire area (lines 868-876)

**Labels:**
- "Original" badge (top-left, fades out at 90%+ slider)
- "AI-Corrected" badge (top-right, fades out at <10% slider)

**Blend Amount Display:** Live percentage indicator (line 853)

**User Interaction:**
- Drag slider horizontally
- Click anywhere on image area
- Cursor changes to `ew-resize` (east-west resize)

**Download:** Button (lines 880-887) downloads corrected image as `lenscraft-ideal-version.png`.

---

## 9. What Survives the Port Unchanged

### ✅ Keep As-Is

1. **UI Components:**
   - PhotoUploader.tsx (drag-drop, file validation, loading UI)
   - AnalysisResults.tsx (5-tab dashboard, layout, skill detection logic)
   - SpatialOverlay.tsx (bounding box rendering, percentage coordinates)
   - PresentationSlides.tsx (demo mode)

2. **State Management:**
   - App.tsx orchestration pattern (state lifting, conditional rendering)
   - mentorChatState persistence across tabs
   - sessionHistory tracking for economics

3. **Schema Structure:**
   - PhotoAnalysis interface (scores, critique, strengths, improvements, settingsEstimate, boundingBoxes)
   - BoundingBox interface (type, severity, coordinates, description, suggestion)
   - MentorMessage interface (role, content, timestamp)

4. **Build System:**
   - Vite config (vite.config.ts)
   - TypeScript config (tsconfig.json)
   - Package scripts (build, dev, preview)

5. **Styling:**
   - TailwindCSS classes (no changes needed)
   - Responsive breakpoints (mobile, tablet, desktop)

6. **Non-LLM Features:**
   - Sample photo loading (Unsplash URLs)
   - Chart rendering (Recharts for radar + area charts)
   - Icon library (Lucide React)

**Note on Gemini Branding:** UI strings like "Gemini 3 Pro is thinking...", "🧠 Gemini 3 Pro Thinking Process", badges showing "Gemini 3 Pro" are **display text only**, not SDK integration points. Post-port: global find-replace "Gemini 3 Pro" → "Gemma 4 E4B" in UI components.

---

## 10. What Must Be Replaced

### ❌ Replace Entirely

1. **Gemini API Integration:**
   - `analyzeImage()` function (geminiService.ts:114-284)
   - `generateCorrectedImage()` function (geminiService.ts:286-318)
   - `askPhotographyMentor()` function (geminiService.ts:320-404)
   - `getGenAIClient()` helper (uses @google/genai SDK)
   - API endpoint strings (`gemini-3-pro-preview`, `gemini-3-pro-image-preview`)

2. **Prompt Structure:**
   - `PHOTOGRAPHY_PRINCIPLES` system prompt (may need reformatting for Gemma)
   - Structured output instructions (Gemini-specific responseSchema)
   - Mentor chat prompt template (may need adjustment for Gemma persona)

3. **Response Parsing:**
   - Gemini-specific JSON extraction from `response.text`
   - Token usage metadata extraction (`usageMetadata.promptTokenCount`, etc.)
   - Image extraction logic (`extractImage()` helper)

4. **Cost Calculation:**
   - Pricing constants (Gemini 3 Pro specific)
   - Cache token calculation (Gemini-specific cache metadata)
   - Projected savings formula (may differ for local inference)

5. **Error Handling:**
   - Permission error detection (403/404 specific to Gemini API)
   - Retry logic (may not apply to local Ollama inference)

---

### 🔄 Adapt or Extend

1. **ThinkingProcess Field:**
   - Gemini 3 Pro has "extended thinking" mode built-in
   - Gemma 4 E4B: **must explicitly prompt** for observations/reasoning/fixes in response schema
   - UI already supports thinking display (AnalysisResults.tsx:617-689)

2. **TokenUsage Field:**
   - Gemini provides token metadata via `usageMetadata`
   - Ollama: **may or may not** provide token counts (verify via spike)
   - If unavailable: calculate client-side (approximate tokenization) or drop economics feature

3. **Image Generation:**
   - Gemini 3 Pro Image is a paid service
   - **Decision:** Optional Gemini gen module (paid opt-in, user's API key) OR drop feature entirely OR use Stable Diffusion API/local model
   - Architecture must isolate gen module (cannot be called from Vault Mode)

4. **API Key Handling:**
   - Gemini: `process.env.API_KEY` + shared key fallback
   - Ollama: **local HTTP endpoint** (default: `http://localhost:11434`)
   - No API key needed for local Ollama, but may need host/port config

5. **Retry Logic:**
   - Gemini: exponential backoff for 500/503 errors
   - Ollama: **may have different failure modes** (connection refused, model not loaded, OOM)
   - Need to adapt error handling for local inference errors

---

## 11. Tech Debt & Quality Issues

### Observed Debt

1. **No Test Coverage:**
   - Zero test files in project (only node_modules tests)
   - No unit tests for geminiService functions
   - No integration tests for UI components
   - No E2E tests for analysis workflow

2. **Missing Validation:**
   - File size limit (10MB) not enforced in code (README.md claims max 10MB, but no check in PhotoUploader.tsx)
   - No client-side JSON schema validation (relies entirely on Gemini responseSchema)
   - No error boundary component for React crashes

3. **Hardcoded Values:**
   - Pricing constants (geminiService.ts:6-18) not configurable
   - Turn limit (5 turns) hardcoded (AnalysisResults.tsx:89)
   - Thinking steps (PhotoUploader.tsx:9-15) hardcoded
   - Sample photo URLs (App.tsx:253-294) hardcoded Unsplash links

4. **API Key Exposure:**
   - `process.env.API_KEY` injected into frontend bundle (vite.config.ts:14)
   - **Security risk:** API keys visible in browser DevTools
   - **Mitigation:** AI Studio shared key environment hides key, but local dev exposes it

5. **Error Messages:**
   - Generic error handling (App.tsx:115-116): "Failed to analyze image. Please try again."
   - No specific guidance for common errors (rate limit, quota, network)

6. **State Synchronization:**
   - mentorChatState reset on photo change (App.tsx:144), but no warning to user
   - Conversation history lost silently

7. **Accessibility:**
   - Missing ARIA labels on interactive elements
   - No keyboard navigation for bounding box tooltips
   - No screen reader support for thinking process

8. **Mobile UX:**
   - Thinking steps animation on mobile (PhotoUploader.tsx) may be too tall for small screens
   - Economics charts (Recharts) not optimized for mobile viewport
   - Bounding box tooltips may overflow on small screens

---

### Decisions: Inherit or Rewrite?

**Recommendation:**

- ✅ **Inherit UI components** - clean React code, good separation of concerns
- ✅ **Inherit state management** - simple hooks pattern, no Redux needed
- ✅ **Inherit schema structure** - well-designed, complete coverage
- ❌ **Rewrite API integration** - Gemini-specific, must be replaced for Gemma
- 🔄 **Add validation layer** - Zod schemas for client-side validation (already added as dependency in 143d260)
- 🔄 **Add test harness** - vitest (already added as dependency), focus on geminiService replacement
- 🔄 **Add error boundary** - React error boundary for crash recovery
- 🟡 **Fix API key exposure** - consider proxy server OR accept risk for hackathon MVP

---

## 12. Test Coverage Status

**Current Coverage:** 0%

**Test Files:** None (only node_modules dependencies have tests)

**Testing Dependencies Added in 143d260:**
- `vitest: ^4.1.5` (test runner)
- `ajv: ^8.20.0` (JSON schema validation)
- `ajv-formats: ^3.0.1` (schema format validation)

**Recommendation:**
- Priority 1: Unit tests for Gemma service replacement (vision analysis, chat, image gen)
- Priority 2: Integration tests for schema validation (Zod + Ajv)
- Priority 3: Component tests for AnalysisResults (5 tabs, mentor chat)
- Priority 4: E2E test for full workflow (upload → analyze → chat → generate)

**Spike Dependency:** Test harness should be set up during Spike 1 (Gemma 4 E4B via Ollama) to validate schema output quality.

---

## 13. Commit 143d260 Analysis

### What Changed

**Commit Message:** "chore: add deps for Gemma v2 tooling"

**Affected Files:**
- `package.json` (31 lines changed: 25 added, 6 removed)
- `package-lock.json` (12739 lines added)

**No Code Changes:** Zero behavioral changes in .ts/.tsx files. Only dependency manifest updates.

---

### Dependencies Added

**Production Dependencies:**

| Package | Version | Purpose |
|---------|---------|---------|
| `ollama` | ^0.6.3 | Local Gemma inference via Ollama HTTP API |
| `exifr` | ^7.1.3 | EXIF parsing in browser (deterministic CV grounding) |
| `exiftool-vendored` | ^35.19.0 | EXIF parsing in Node/Electron (deterministic CV) |
| `sharp` | ^0.34.5 | Image processing (histogram, focus detection, resize) |
| `hash-wasm` | ^4.12.0 | Hashing for audit log (SHA-256) |
| `zod` | ^4.4.3 | Schema validation (v2 schema enforcement) |

**Development Dependencies:**

| Package | Version | Purpose |
|---------|---------|---------|
| `electron` | ^41.5.0 | Desktop wrapper runtime |
| `electron-builder` | ^26.8.1 | Desktop app packaging |
| `electron-vite` | ^5.0.0 | Electron dev server |
| `@capacitor/cli` | ^8.3.1 | iOS/Android build tooling |
| `@capacitor/core` | ^8.3.1 | Capacitor runtime |
| `@capacitor/ios` | ^8.3.1 | iOS platform integration |
| `vitest` | ^4.1.5 | Test runner |
| `ajv` | ^8.20.0 | JSON Schema validation |
| `ajv-formats` | ^3.0.1 | Schema format validators |
| `@biomejs/biome` | ^2.4.14 | Linter/formatter |
| `@mermaid-js/mermaid-cli` | ^11.14.0 | Diagram generation for docs |
| `@total-typescript/ts-reset` | ^0.6.1 | TypeScript DX improvements |
| `ts-json-schema-generator` | ^2.9.0 | Generate JSON schemas from TS types |

---

### Purpose Mapping to Spec Session

**Ollama:** Core runtime for Gemma 4 E4B local inference (Spike 1 requirement).

**EXIF Tools:** Deterministic CV grounding layer (05-deterministic-cv-spec.md).

**Sharp:** Image processing for histogram, focus detection, color statistics (05-deterministic-cv-spec.md).

**Hash-wasm:** Audit log hash chaining (08-vault-mode-spec.md).

**Zod:** v2 schema validation (02-output-schema.md).

**Electron:** Desktop wrapper (10-platform-shells-spec.md).

**Capacitor:** iOS PWA/native bridge (10-platform-shells-spec.md).

**Vitest + Ajv:** Testing and validation harness (09-evaluation-and-benchmark-spec.md).

**Biome + TS Reset:** Code quality tooling (not spec-critical, dev DX).

**Mermaid CLI + Schema Generator:** Documentation/spec generation (not runtime).

---

### No Breaking Changes

- **Existing dependencies preserved:** React 19.2.1, @google/genai, lucide-react, recharts, tailwindcss all unchanged.
- **No version bumps:** No major/minor version upgrades that could introduce breaking changes.
- **Additive only:** All new dependencies are additions, no removals.

**Conclusion:** Commit 143d260 is **safe to build on**. No code modifications, no breaking changes, only tooling prep for Gemma v2 work.

---

## 14. Baseline vs Current Branch Diff

**Branch:** `gemma4-v2/spec-session`
**Baseline:** `origin/main`
**Diff:** 1 commit ahead, 0 commits behind

**Files Changed:** 2 files (package.json, package-lock.json)

**Lines Changed:** +12764, -6

**Behavioral Impact:** Zero. No .ts/.tsx code changed.

**Conclusion:** Current branch is **clean starting point** for spec session. No hidden changes to reconcile.

---

## 15. Existing Documentation

### ARCHITECTURE.md (554 lines)

**Content:**
- High-level system diagram
- Component architecture diagram
- Data flow diagram
- State management diagram
- Context caching diagram
- API integration examples
- Error handling patterns
- Security considerations
- Future improvements

**Quality:** Excellent. Detailed, visual, up-to-date.

**Relevance to Port:** Sections 1-4 (architecture, components, data flow, API integration) must be updated for Gemma v2. Sections 5-7 (state management, performance, error handling) mostly survive.

**Action:** Reference ARCHITECTURE.md as source of truth for current architecture during spec writing. Update post-port with Gemma v2 architecture changes.

---

### README.md (644 lines)

**Content:**
- Project overview
- Features list
- Quick start guide
- Architecture summary
- Usage examples
- Deployment instructions
- Metrics (performance, quality, cost)
- Economics simulation explanation
- Future enhancements
- Contributing guidelines

**Quality:** Excellent marketing + documentation hybrid. Clear, well-formatted, comprehensive.

**Relevance to Port:** "Gemini 3 Pro" branding throughout. Will need global find-replace post-port. Economics section (lines 476-519) must be updated to reflect local inference (no API costs, but compute time tradeoffs).

**Action:** Preserve README structure, update "Gemini 3 Pro" → "Gemma 4 E4B" post-port.

---

### Other Docs

- **API_REFERENCE.md** (659 lines) - Gemini API integration details. **Obsolete post-port.** Rewrite with Ollama API reference.
- **DEPLOYMENT.md** (425 lines) - Docker, Cloud Run, production setup. **Partially obsolete.** Web deployment survives, Cloud Run section needs Ollama-compatible rewrite.
- **TROUBLESHOOTING.md** (636 lines) - Common issues. **Partially obsolete.** Gemini-specific errors must be replaced with Ollama/local inference errors.

**Action:** Archive Gemini-specific docs, create new Gemma 4 equivalents during/after port.

---

## 16. Summary & Port Readiness

### Current State Assessment

**Architecture:** ✅ Clean, well-structured, single-page React app
**Schema:** ✅ Complete v1 schema with all required fields documented
**UI Components:** ✅ Production-ready, responsive, accessible
**State Management:** ✅ Simple hooks pattern, no Redux complexity
**Testing:** ❌ Zero coverage, needs test harness setup
**Documentation:** ✅ Excellent existing docs (ARCHITECTURE.md, README.md)

**Gemini Coupling:** 🔴 High - 3 API integration points, 415 lines of Gemini-specific code

**Port Complexity:** 🟡 Moderate - Clean API boundary in geminiService.ts makes replacement straightforward, but prompt engineering and schema validation will need tuning for Gemma 4 E4B.

---

### Critical Questions for Tier 1 Specs

1. **Schema Migration:**
   - Does v2 schema need new fields? (e.g., `gemma_version`, `quantization`, `evidence` array)
   - Can Gemma 4 E4B produce bounding boxes? (Or rely on deterministic CV to generate them?)
   - Is `thinking` field still `observations` + `reasoningSteps` + `priorityFixes`, or does Gemma need different structure?

2. **Deterministic CV:**
   - Which EXIF fields are load-bearing for Gemma grounding? (ISO, aperture, shutter, focal length)
   - How does histogram + focus detection feed into LLM prompt? (Structured text? JSON? Embedded in image?)
   - Does Gemma need face/eye coordinates, or can it detect them natively?

3. **Image Generation:**
   - Is image generation in scope? (Optional Gemini gen module? Local Stable Diffusion? Drop entirely?)
   - If optional Gemini gen: how to isolate from Vault Mode at architecture level?
   - If local gen: which model? (SDXL? Flux? Runtime constraints?)

4. **Ollama Integration:**
   - Does Ollama support structured JSON outputs? (Verify responseSchema equivalent)
   - Does Ollama provide token counts? (For economics dashboard)
   - What error codes does Ollama return? (Connection refused, model not loaded, OOM)

5. **Vault Mode:**
   - Is Vault Mode a web feature or desktop-only? (Network egress guard needs OS-level verification)
   - How to enforce "no cloud inference" at code level? (Orchestration layer must block Gemini calls)
   - Audit log: SQLite? IndexedDB? Plain JSON files?

6. **Platform Targets:**
   - Web MVP: must ship May 19. What's the floor feature set? (Studio Mode + vision analysis + Vault Mode demo?)
   - iOS: PWA floor, LiteRT stretch. What's the Day 4 spike decision criteria?
   - Desktop: Electron + Ollama. Auto-download Gemma model? Or assume user has Ollama installed?

---

### Recommended Next Steps (After This Pause)

1. **Review & Sign-Off:** Spec session lead reviews 00-baseline-audit.md for factual accuracy.
2. **Proceed to Tier 1:** Draft 01-product-spec.md (tiered roadmap, Studio/Vault modes, feature matrix).
3. **Clarify Ambiguities:** Use AskUserQuestion or pause if baseline reveals contradictions.
4. **Archive Baseline:** Lock 00-baseline-audit.md as frozen reference for all downstream specs.

---

## Appendix: File-by-Line Gemini Integration Map

### geminiService.ts Gemini API Calls

| Function | Lines | Model | Purpose |
|----------|-------|-------|---------|
| `analyzeImage()` | 114-284 | gemini-3-pro-preview | Vision analysis + thinking |
| `generateCorrectedImage()` | 286-318 | gemini-3-pro-image-preview | Image generation |
| `askPhotographyMentor()` | 320-404 | gemini-3-pro-preview | Mentor chat |

### App.tsx Gemini Dependency Points

| Function | Lines | Dependency |
|----------|-------|------------|
| `handleImageSelected()` | 79 | Calls `analyzeImage()` |
| Error handling | 103-118 | Checks for Gemini permission errors (403/404) |

### AnalysisResults.tsx Gemini Dependency Points

| Function | Lines | Dependency |
|----------|-------|------------|
| `handleGenerate()` | 325 | Calls `generateCorrectedImage()` |
| Error handling | 329-352 | Checks for Gemini permission/billing errors |
| `handleSendMessage()` | 111 | Calls `askPhotographyMentor()` |

---

**End of Baseline Audit**

**Spec Session Status:** ✅ Tier 0 complete. Ready for Tier 1 review.

**Next Spec:** 01-product-spec.md (awaiting sign-off on baseline).
