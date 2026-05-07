# 11. UI Adaptation Spec

**Version:** 1.0
**Status:** Draft
**Dependencies:** 01-product-spec.md, 02-output-schema.md, 05-deterministic-cv-spec.md, 08-vault-mode-spec.md
**Owner:** Spec Session Lead

---

## 1. Overview

This spec defines **UI adaptations** needed to port Photography Coach v1 (Gemini 3 Pro) to v2 (Gemma 4 E4B), including:

1. **Preserved components** - v1 UI that works unchanged
2. **Modified components** - v1 UI requiring updates for v2 schema
3. **New components** - v2-specific UI (CV visualizations, Vault Mode indicators, refusal handling)
4. **Removed components** - v1 features deprecated in v2

**Design Principle:** Minimize UI churn. Preserve v1 visual design and UX patterns where possible. Only change what's necessary for v2 functionality.

---

## 2. Component Inventory (v1 Baseline)

### 2.1. Preserved Components (No Changes)

**From 00-baseline-audit.md analysis:**

| Component | File | Lines | Purpose | v2 Status |
|-----------|------|-------|---------|-----------|
| PhotoUploader | PhotoUploader.tsx | 189 | Drag-drop upload, thinking animation | ✅ Keep as-is |
| App root | App.tsx | 268 | Root state management | 🔄 Minor updates (mode state) |
| SpatialOverlay | SpatialOverlay.tsx | 347 | CSS/DOM overlays for bounding boxes | ✅ Keep as-is (works with v2 boxes) |

**Rationale:**
- PhotoUploader: Upload flow unchanged (image → base64 → analysis)
- SpatialOverlay: v2 bounding boxes use same schema as v1 (x, y, width, height normalized)

### 2.2. Modified Components (v2 Schema Updates)

| Component | File | Lines | Changes Required | Complexity |
|-----------|------|-------|------------------|------------|
| AnalysisResults | AnalysisResults.tsx | 1142 | Update for v2 schema (rationale, evidence), add refusal handling | Medium |
| MentorChatWidget | (within AnalysisResults) | ~150 | Update for v2 thinking → rationale rename | Low |
| ScoreRadarChart | (within AnalysisResults) | ~50 | No change (scores same in v2) | None |

**AnalysisResults updates:**
- Replace `thinking` with `rationale` (observations, reasoningSteps, priorityFixes)
- Add evidence display (claim → source → details)
- Add refusal detection + RefusalMessage component
- Update "Detailed Analysis" tab to show new rationale structure

### 2.3. New Components (v2 Only)

| Component | Purpose | Complexity | Priority |
|-----------|---------|------------|----------|
| VaultModeBanner | Persistent top banner showing Vault Mode status | Low | High |
| AuditLogPanel | View/export audit log, verify chain | Medium | High |
| HistogramChart | Display luminance histogram from CV analysis | Medium | Medium |
| FocusMapOverlay | 10×10 grid heatmap showing sharpness distribution | Medium | Medium |
| ColorPalette | Display 5 dominant colors from CV analysis | Low | Low |
| EXIFPanel | Display camera settings (enhanced with CV-extracted data) | Low | Medium |
| RefusalMessage | Category-specific refusal UI (medical, identity, etc.) | Low | High |
| ModeSelector | Landing screen mode selection (Studio vs Vault) | Low | High |

### 2.4. Removed Components (v1 Deprecated)

**None.** All v1 features preserved in v2. Only additions, no removals.

---

## 3. Schema Mapping (v1 → v2)

### 3.1. Type Interface Changes

**v1 PhotoAnalysis:**
```typescript
interface PhotoAnalysis {
  scores: ScoreBreakdown;
  critique: CritiqueBreakdown;
  strengths: string[];
  improvements: string[];
  learningPath: string[];
  settingsEstimate: CameraSettings;
  boundingBoxes?: BoundingBox[];
  thinking: ThinkingProcess;  // ← v1
  tokenUsage?: TokenUsage;
}
```

**v2 PhotoAnalysisV2:**
```typescript
interface PhotoAnalysisV2 {
  schema_version: string;       // NEW
  model_id: string;             // NEW
  quantization?: string;        // NEW
  timestamp?: number;           // NEW
  scores: ScoreBreakdown;       // SAME
  critique: CritiqueBreakdown;  // SAME
  strengths: string[];          // SAME
  improvements: string[];       // SAME
  learningPath: string[];       // SAME
  settingsEstimate: CameraSettings; // SAME
  boundingBoxes?: BoundingBox[]; // SAME
  rationale: Rationale;         // RENAMED (was "thinking")
  evidence?: EvidenceItem[];    // NEW
  tokenUsage?: TokenUsage;      // SAME
  is_refusal?: boolean;         // NEW
  refusal_reason?: string;      // NEW
  refusal_category?: RefusalCategory; // NEW
}
```

### 3.2. Component Props Updates

**AnalysisResults.tsx props (unchanged):**
```typescript
interface AnalysisResultsProps {
  analysis: PhotoAnalysis; // Change to PhotoAnalysisV2
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

**Only change:** `analysis: PhotoAnalysisV2` (type update, no prop renames)

---

## 4. Component Specifications

### 4.1. VaultModeBanner (New)

**Purpose:** Persistent banner indicating Vault Mode active status.

**Location:** Top of screen (above all content, sticky position).

**Props:**
```typescript
interface VaultModeBannerProps {
  mode: 'studio' | 'vault';
  onViewAuditLog: () => void;
  onExportLog: () => void;
}
```

**Design:**
```tsx
export function VaultModeBanner({ mode, onViewAuditLog, onExportLog }: VaultModeBannerProps) {
  if (mode !== 'vault') return null;

  return (
    <div className="fixed top-0 left-0 right-0 bg-blue-900 text-white px-4 py-2 z-50 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <span className="text-2xl">🔒</span>
        <div>
          <div className="font-semibold">VAULT MODE ACTIVE</div>
          <div className="text-sm opacity-90">Network Isolated • Audit Log Recording</div>
        </div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={onViewAuditLog}
          className="px-3 py-1 bg-blue-800 hover:bg-blue-700 rounded text-sm"
        >
          View Audit Log
        </button>
        <button
          onClick={onExportLog}
          className="px-3 py-1 bg-blue-800 hover:bg-blue-700 rounded text-sm"
        >
          Export Log
        </button>
      </div>
    </div>
  );
}
```

**Style:**
- Fixed position (stays visible on scroll)
- High z-index (above other content)
- Dark blue background (#1e3a8a), white text
- Gold lock icon for emphasis

### 4.2. RefusalMessage (New)

**Purpose:** Display category-specific refusal message when `is_refusal: true`.

**Location:** Replaces AnalysisResults tabs when refusal detected.

**Props:**
```typescript
interface RefusalMessageProps {
  analysis: PhotoAnalysisV2;
  onReset: () => void;
}
```

**Design:**
```tsx
const REFUSAL_MESSAGES = {
  medical: {
    icon: '🏥',
    title: 'Medical Imagery Detected',
    description: 'Photography Coach focuses on creative and technical photography. Medical imagery (X-rays, procedures, injuries) is outside our scope.'
  },
  identity: {
    icon: '🪪',
    title: 'Identity Document Detected',
    description: 'For privacy and security, we cannot analyze identity documents (passports, licenses, ID cards).'
  },
  surveillance: {
    icon: '📹',
    title: 'Surveillance Footage Detected',
    description: 'We cannot analyze surveillance footage or security camera images with identifiable faces for privacy reasons.'
  },
  inappropriate: {
    icon: '⚠️',
    title: 'Inappropriate Content Detected',
    description: 'This image contains content outside our coaching scope.'
  },
  other: {
    icon: '🚫',
    title: 'Analysis Declined',
    description: 'This image is outside our coaching scope.'
  }
};

export function RefusalMessage({ analysis, onReset }: RefusalMessageProps) {
  const category = analysis.refusal_category || 'other';
  const msg = REFUSAL_MESSAGES[category];

  return (
    <div className="max-w-2xl mx-auto mt-12 p-8 bg-white rounded-lg shadow-lg">
      <div className="text-center">
        <div className="text-6xl mb-4">{msg.icon}</div>
        <h2 className="text-2xl font-bold mb-4">{msg.title}</h2>
        <p className="text-gray-700 mb-6">{msg.description}</p>

        <details className="text-left bg-gray-50 p-4 rounded mb-6">
          <summary className="cursor-pointer font-semibold">Technical Details</summary>
          <div className="mt-2 text-sm text-gray-600">
            <p><strong>Reason:</strong> {analysis.refusal_reason}</p>
            <p><strong>Category:</strong> {analysis.refusal_category}</p>
          </div>
        </details>

        <button
          onClick={onReset}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold"
        >
          Upload Different Photo
        </button>
      </div>
    </div>
  );
}
```

### 4.3. HistogramChart (New)

**Purpose:** Display luminance histogram from CV analysis.

**Location:** New "CV Analysis" tab or collapsible section in "Detailed Analysis" tab.

**Props:**
```typescript
interface HistogramChartProps {
  histogram: HistogramAnalysis;
}
```

**Design (using Recharts):**
```tsx
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine } from 'recharts';

export function HistogramChart({ histogram }: HistogramChartProps) {
  const data = histogram.luminance.histogram.map((count, bin) => ({ bin, count }));
  const { p1, p50, p99 } = histogram.luminance;

  return (
    <div className="bg-white p-4 rounded-lg">
      <h3 className="text-lg font-semibold mb-2">Luminance Histogram</h3>
      <LineChart width={600} height={300} data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="bin" label={{ value: 'Brightness (0-255)', position: 'bottom' }} />
        <YAxis label={{ value: 'Pixel Count', angle: -90, position: 'left' }} />
        <Tooltip />
        <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} dot={false} />
        <ReferenceLine x={p1} stroke="red" label="P1" strokeDasharray="3 3" />
        <ReferenceLine x={p50} stroke="green" label="Median" strokeDasharray="3 3" />
        <ReferenceLine x={p99} stroke="red" label="P99" strokeDasharray="3 3" />
      </LineChart>

      {histogram.clipping.highlights && (
        <div className="mt-2 text-sm text-red-600">
          ⚠️ Highlights clipped ({histogram.clipping.highlightPercent.toFixed(1)}% of pixels)
        </div>
      )}
      {histogram.clipping.shadows && (
        <div className="mt-1 text-sm text-red-600">
          ⚠️ Shadows crushed ({histogram.clipping.shadowPercent.toFixed(1)}% of pixels)
        </div>
      )}
    </div>
  );
}
```

### 4.4. FocusMapOverlay (New)

**Purpose:** Display 10×10 sharpness heatmap over image.

**Location:** Toggle button in spatial overlay controls (next to bounding boxes toggle).

**Props:**
```typescript
interface FocusMapOverlayProps {
  focusMap: FocusMap;
  imageWidth: number;
  imageHeight: number;
  visible: boolean;
}
```

**Design:**
```tsx
export function FocusMapOverlay({ focusMap, imageWidth, imageHeight, visible }: FocusMapOverlayProps) {
  if (!visible) return null;

  const cellWidth = imageWidth / focusMap.gridSize.cols;
  const cellHeight = imageHeight / focusMap.gridSize.rows;

  return (
    <div className="absolute inset-0 pointer-events-none">
      {focusMap.cells.map((cell) => {
        const x = cell.col * cellWidth;
        const y = cell.row * cellHeight;

        // Color based on sharpness: green (sharp), yellow (medium), red (blurred)
        const color = cell.classification === 'sharp' ? 'rgba(34, 197, 94, 0.3)' :
                     cell.classification === 'medium' ? 'rgba(234, 179, 8, 0.3)' :
                     'rgba(239, 68, 68, 0.3)';

        return (
          <div
            key={`${cell.row}-${cell.col}`}
            className="absolute border border-white/20"
            style={{
              left: x,
              top: y,
              width: cellWidth,
              height: cellHeight,
              backgroundColor: color
            }}
          />
        );
      })}
    </div>
  );
}
```

### 4.5. ModeSelector (New)

**Purpose:** Landing screen for mode selection (Studio vs Vault).

**Location:** Replaces App.tsx initial state when no image uploaded.

**Props:**
```typescript
interface ModeSelectorProps {
  onSelectMode: (mode: 'studio' | 'vault') => void;
  isElectron: boolean;
}
```

**Design:**
```tsx
export function ModeSelector({ onSelectMode, isElectron }: ModeSelectorProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Photography Coach v2</h1>
          <p className="text-xl text-gray-600">AI-powered photography coaching with Gemma 4</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Studio Mode Card */}
          <div className="bg-white rounded-xl shadow-lg p-8 hover:shadow-xl transition-shadow">
            <div className="text-5xl mb-4">⚡</div>
            <h2 className="text-2xl font-bold mb-4">Studio Mode</h2>
            <p className="text-gray-600 mb-6">
              Fast, flexible, with optional cloud features. Ideal for hobbyists and most users.
            </p>
            <ul className="space-y-2 mb-6 text-sm text-gray-700">
              <li>✅ Local Gemma 4 E4B inference</li>
              <li>✅ Optional cloud image generation</li>
              <li>✅ Session history tracking</li>
            </ul>
            <button
              onClick={() => onSelectMode('studio')}
              className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold"
            >
              Select Studio Mode
            </button>
          </div>

          {/* Vault Mode Card */}
          <div className="bg-white rounded-xl shadow-lg p-8 hover:shadow-xl transition-shadow border-2 border-indigo-200">
            <div className="text-5xl mb-4">🔒</div>
            <h2 className="text-2xl font-bold mb-4">Vault Mode</h2>
            <p className="text-gray-600 mb-6">
              100% local, network-isolated, audit-logged. For confidential client work.
            </p>
            <ul className="space-y-2 mb-6 text-sm text-gray-700">
              <li>✅ Network-isolated processing</li>
              <li>✅ Tamper-evident audit log</li>
              <li>✅ No cloud services</li>
            </ul>

            {!isElectron && (
              <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
                ⚠️ Web browser Vault Mode has limitations. Download desktop app for full isolation.
              </div>
            )}

            <button
              onClick={() => onSelectMode('vault')}
              className="w-full px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold"
            >
              Select Vault Mode
            </button>
          </div>
        </div>

        <div className="mt-12 text-center">
          <p className="text-sm text-gray-600 mb-4">Requirements:</p>
          <div className="flex justify-center gap-6 text-sm">
            <div>✅ Ollama running (localhost:11434)</div>
            <div>✅ Gemma 4 E4B model installed</div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

## 5. AnalysisResults Modifications

### 5.1. Refusal Detection (Early Return)

**Add at top of AnalysisResults component:**
```tsx
export function AnalysisResults({ analysis, imageSrc, onReset, ... }: AnalysisResultsProps) {
  // Early return for refusals
  if (analysis.is_refusal) {
    return <RefusalMessage analysis={analysis} onReset={onReset} />;
  }

  // ... rest of component unchanged ...
}
```

### 5.2. Rationale Display (Detailed Analysis Tab)

**Replace "Gemini 3 Pro Thinking Process" section:**

**Before (v1):**
```tsx
<div className="thinking-section">
  <h3>Gemini 3 Pro Thinking Process</h3>
  <div>Observations: {analysis.thinking.observations}</div>
  <div>Reasoning: {analysis.thinking.reasoning}</div>
  <div>Priority: {analysis.thinking.priority}</div>
</div>
```

**After (v2):**
```tsx
<div className="rationale-section">
  <h3>Gemma 4 E4B Reasoning Process</h3>

  <details open>
    <summary className="font-semibold cursor-pointer">Observations ({analysis.rationale.observations.length})</summary>
    <ul className="list-disc pl-6 mt-2 space-y-1">
      {analysis.rationale.observations.map((obs, i) => (
        <li key={i} className="text-gray-700">{obs}</li>
      ))}
    </ul>
  </details>

  <details open className="mt-4">
    <summary className="font-semibold cursor-pointer">Reasoning Steps ({analysis.rationale.reasoningSteps.length})</summary>
    <ol className="list-decimal pl-6 mt-2 space-y-2">
      {analysis.rationale.reasoningSteps.map((step, i) => (
        <li key={i} className="text-gray-700">{step}</li>
      ))}
    </ol>
  </details>

  <details open className="mt-4">
    <summary className="font-semibold cursor-pointer">Priority Fixes ({analysis.rationale.priorityFixes.length})</summary>
    <ol className="list-decimal pl-6 mt-2 space-y-1">
      {analysis.rationale.priorityFixes.map((fix, i) => (
        <li key={i} className="text-gray-700 font-medium">{fix}</li>
      ))}
    </ol>
  </details>
</div>
```

### 5.3. Evidence Display (New Section)

**Add after rationale section in "Detailed Analysis" tab:**
```tsx
{analysis.evidence && analysis.evidence.length > 0 && (
  <div className="evidence-section mt-6">
    <h3 className="text-lg font-semibold mb-3">Evidence Trail</h3>
    <div className="space-y-3">
      {analysis.evidence.map((item, i) => (
        <div key={i} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
          <div className="font-semibold text-gray-900 mb-1">
            {item.claim}
          </div>
          <div className="text-sm text-gray-600 flex items-center gap-2">
            <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
              {item.source.toUpperCase()}
            </span>
            <span>{item.details}</span>
            {item.confidence && (
              <span className={`px-2 py-1 rounded text-xs font-medium ${
                item.confidence === 'high' ? 'bg-green-100 text-green-700' :
                item.confidence === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                'bg-gray-100 text-gray-700'
              }`}>
                {item.confidence}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  </div>
)}
```

---

## 6. App.tsx State Management Updates

### 6.1. New State Fields

**Add to App.tsx state:**
```typescript
const [mode, setMode] = useState<'studio' | 'vault'>('studio');
const [cvData, setCvData] = useState<CVData | null>(null);
const [showModeSelector, setShowModeSelector] = useState(true);
```

### 6.2. Mode Selection Flow

**Add mode selection handler:**
```typescript
const handleModeSelect = (selectedMode: 'studio' | 'vault') => {
  setMode(selectedMode);
  setShowModeSelector(false);

  // Vault Mode: Initialize audit log
  if (selectedMode === 'vault') {
    auditLog.appendEvent('mode_selected', { mode: 'vault', previousMode: null });
  }
};
```

**Update render:**
```tsx
return (
  <div className="app">
    {showModeSelector ? (
      <ModeSelector
        onSelectMode={handleModeSelect}
        isElectron={window.electronAPI?.isElectron || false}
      />
    ) : (
      <>
        {mode === 'vault' && (
          <VaultModeBanner
            mode={mode}
            onViewAuditLog={() => setShowAuditLog(true)}
            onExportLog={handleExportAuditLog}
          />
        )}

        {/* ... rest of app (PhotoUploader, AnalysisResults, etc.) ... */}
      </>
    )}
  </div>
);
```

---

## 7. Responsive Design

### 7.1. Mobile Considerations

**AnalysisResults tabs:**
- Stack vertically on mobile (<768px)
- Full-width layout (remove 2-column grid)
- Sticky tab navigation at top

**VaultModeBanner:**
- Reduce padding on mobile
- Stack buttons vertically if needed
- Ensure lock icon + text remain visible

**Histogram/Focus Map:**
- Scale down on mobile (max-width: 100%)
- Hide less critical CV visualizations (color palette) on small screens

### 7.2. Accessibility

**ARIA labels:**
- VaultModeBanner: `role="banner"`, `aria-label="Vault Mode status"`
- RefusalMessage: `role="alert"`, `aria-live="polite"`
- Focus map overlay: `aria-hidden="true"` (decorative, redundant with text)

**Keyboard navigation:**
- Tab through mode selector cards
- Space/Enter to select mode
- Escape to close audit log panel

**Color contrast:**
- All text meets WCAG AA (4.5:1 minimum)
- Focus map colors distinguishable for colorblind users (green/yellow/red + opacity)

---

## 8. Testing

### 8.1. Component Tests

**Test case: UI-1 (Refusal message display)**
- Input: `analysis.is_refusal: true`, `refusal_category: 'medical'`
- Expected: RefusalMessage shown, AnalysisResults tabs hidden
- Verification: Medical icon (🏥) and message displayed

**Test case: UI-2 (Rationale display)**
- Input: Valid v2 analysis with rationale (5 observations, 3 reasoning steps, 2 priority fixes)
- Expected: Details sections expand/collapse, all items visible
- Verification: Check DOM for correct number of list items

**Test case: UI-3 (Evidence display)**
- Input: Analysis with 4 evidence items (2 visual, 1 exif, 1 cv)
- Expected: Evidence trail section shown, badges colored by source
- Verification: 4 cards rendered, correct source badges

**Test case: UI-4 (Vault Mode banner)**
- Input: `mode: 'vault'`
- Expected: Banner visible at top, buttons functional
- Verification: Fixed position, z-index above content

**Test case: UI-5 (Mode selector)**
- Input: Fresh app launch, no mode selected
- Expected: ModeSelector shown, 2 cards (Studio + Vault)
- Verification: Both buttons clickable, warning shown if web browser

### 8.2. Integration Tests

**Test case: UI-INT-1 (Full analysis flow with refusal)**
- Steps: Upload medical image → wait for analysis → refusal detected
- Expected: RefusalMessage displayed, "Upload Different Photo" button works
- Verification: Clicking button resets to PhotoUploader

**Test case: UI-INT-2 (Mode switch mid-session)**
- Steps: Studio Mode → analyze photo → switch to Vault Mode
- Expected: Modal blocks switch, prompts to reset session
- Verification: Session persists until user confirms reset

---

## 9. Dependencies and Blockers

### 9.1. Blocking Dependencies

**This spec (11) blocks:**
- Nothing (UI implementation can start after this spec)

**This spec (11) is blocked by:**
- **02-output-schema.md** - v2 schema structure (complete)
- **05-deterministic-cv-spec.md** - CV output formats (complete)
- **08-vault-mode-spec.md** - Vault Mode requirements (complete)
- **09-validation-and-error-handling-spec.md** - Refusal semantics (complete)

### 9.2. Implementation Assumptions

**Assumes:**
- React 19.2.1 + TypeScript (no framework changes)
- Tailwind CSS for styling (consistent with v1)
- Recharts for new charting components
- v1 component structure preserved (minimize refactoring)

---

## 10. Success Criteria

**This UI spec succeeds if:**

1. ✅ All v1 components identified (preserve/modify/remove)
2. ✅ New v2 components specified with props, design, and behavior
3. ✅ Schema migration documented (v1 → v2 type changes)
4. ✅ Refusal handling UX defined (category-specific messages)
5. ✅ Vault Mode indicators specified (banner, audit log panel)
6. ✅ CV visualizations designed (histogram, focus map, evidence)
7. ✅ Responsive design and accessibility requirements documented

---

## 11. Summary

This spec defines **UI adaptations** for Photography Coach v2:

**Preserved:**
- PhotoUploader, SpatialOverlay (work unchanged with v2)

**Modified:**
- AnalysisResults (v2 schema updates: rationale, evidence, refusal)
- App.tsx (mode state management)

**New:**
- VaultModeBanner, RefusalMessage, ModeSelector (v2-specific)
- HistogramChart, FocusMapOverlay, ColorPalette, EXIFPanel (CV visualizations)
- AuditLogPanel (Vault Mode audit trail)

**Design principle:** Minimal UI churn, preserve v1 UX patterns, only add what's necessary for v2 functionality.

**Next:** Proceed to **12-testing-strategy-spec.md** for comprehensive test planning.

---

**End of 11-ui-adaptation-spec.md**
