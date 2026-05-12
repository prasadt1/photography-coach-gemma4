# 02-output-schema.md

**Spec Session:** Photography Coach v2 (Gemma 4 Edition)
**Author:** Claude (Spec Session Agent)
**Date:** 2026-05-06
**Dependencies:** 00-baseline-audit.md, 01-product-spec.md
**Status:** Tier 1 - Awaiting Review

---

## Executive Summary

This spec defines the **v2 output schema** for Photography Coach v2, optimized for Gemma 4 E4B structured output capabilities. Key changes from v1:

- **Added provenance fields:** `schema_version`, `model_id`, `quantization` (optional)
- **Renamed `thinking` → `rationale`:** More precise terminology for observations/reasoning/fixes
- **Added `evidence` array:** Links critique claims to deterministic CV sources (EXIF, histogram)
- **Clarified score scale:** 0-10 normalized (v1 had ambiguous 0-100 comment vs actual 0-10 values)
- **Preserved backward compatibility:** v1 → v2 migration table provided for existing data

**Validation Strategy:** Client-side Zod + Ajv (JSON Schema draft-07) enforced before display.

---

## 1. v1 Schema (Frozen Reference)

### Source

Captured from baseline audit (`00-baseline-audit.md` section 4.1, `types.ts` lines 48-92).

### Complete v1 Schema

```typescript
interface PhotoAnalysisV1 {
  // Scoring metrics (0-10 actual, despite misleading "0-100" comment)
  scores: {
    composition: number;        // 0-10
    lighting: number;           // 0-10
    creativity: number;         // 0-10
    technique: number;          // 0-10
    subjectImpact: number;      // 0-10
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

  // Suggested learning path (TypeScript optional, API required per geminiService.ts:228)
  learningPath?: string[];

  // Best guess at camera settings used
  settingsEstimate: {
    focalLength: string;
    aperture: string;
    shutterSpeed: string;
    iso: string;
  };

  // Spatial analysis with visual overlays
  boundingBoxes?: BoundingBox[];

  // Token economics data (calculated post-response)
  tokenUsage?: TokenUsage;

  // AI's reasoning process (required by Gemini responseSchema despite TS optional)
  thinking?: {
    observations: string[];
    reasoningSteps: string[];
    priorityFixes: string[];
  };
}

interface BoundingBox {
  type: 'composition' | 'lighting' | 'focus' | 'exposure' | 'color';
  severity: 'critical' | 'moderate' | 'minor';
  x: number;        // Percentage from left edge (0-100)
  y: number;        // Percentage from top edge (0-100)
  width: number;    // Percentage of image width (0-100)
  height: number;   // Percentage of image height (0-100)
  description: string;
  suggestion: string;
}

interface TokenUsage {
  realCachedTokens: number;
  realNewTokens: number;
  totalTokens: number;
  realCost: number;
  projectedCachedTokens: number;
  projectedCostWithCache: number;
  projectedSavings: number;
}
```

### v1 Known Issues

1. **Score scale ambiguity:** Comment says "0-100" but actual values are 0-10 (UI displays `{score}/10`)
2. **TypeScript vs API mismatch:** `learningPath?` and `thinking?` marked optional in TS but required by Gemini responseSchema
3. **No provenance:** Missing `model_id`, `quantization`, `schema_version` (makes migration/debugging harder)
4. **No evidence linking:** Critique claims lack traceable sources (EXIF vs CV vs model inference)
5. **Thinking terminology:** "thinking" is vague; "rationale" is more precise for structured reasoning

---

## 2. v2 Schema Definition

### Design Goals

1. **Provenance:** Every output includes model ID, quantization, schema version
2. **Evidence-based:** Link critique claims to deterministic sources where possible
3. **Migration-friendly:** Preserve v1 field names where sensible, add new fields as optional
4. **Validation-ready:** Clear types, enums, ranges for Zod/Ajv enforcement
5. **Gemma 4 E4B optimized:** Schema fields match Gemma's structured output strengths

---

### Complete v2 Schema (TypeScript)

```typescript
/**
 * Photography Coach v2 Output Schema
 * Optimized for Gemma 4 E4B structured output
 * Schema Version: 2.0
 */

interface PhotoAnalysisV2 {
  // === PROVENANCE (NEW) ===
  schema_version: string;           // "2.0" (semver)
  model_id: string;                 // "gemma-4-e4b" or "gemini-3-pro-preview" (for comparison)
  quantization?: string;            // "Q4_K_M" | "Q5_K_M" | "Q8_0" | "FP16" (optional, Ollama-specific)
  timestamp?: number;               // Unix timestamp (optional, for audit log)

  // === SCORING (0-10 scale, clarified) ===
  scores: {
    composition: number;            // 0-10 (0.1 precision), rule of thirds, framing, balance
    lighting: number;               // 0-10 (0.1 precision), exposure, contrast, color temperature
    technique: number;              // 0-10 (0.1 precision), focus, sharpness, camera settings
    creativity: number;             // 0-10 (0.1 precision), originality, storytelling, artistic impact
    subjectImpact: number;          // 0-10 (0.1 precision), subject clarity, emotional resonance
  };

  // === CRITIQUE (natural language, preserved from v1) ===
  critique: {
    composition: string;            // Detailed analysis of framing, rule of thirds, leading lines
    lighting: string;               // Detailed analysis of exposure, shadows, highlights, color
    technique: string;              // Detailed analysis of focus, sharpness, camera settings
    overall: string;                // Summary verdict, skill level assessment, contextual feedback
  };

  // === STRENGTHS & IMPROVEMENTS (preserved from v1) ===
  strengths: string[];              // 3-6 items, specific positive observations
  improvements: string[];           // 3-6 items, actionable fixes with priority

  // === LEARNING PATH (preserved from v1, clarified as required) ===
  learningPath: string[];           // 3-5 next skills to master (REQUIRED, not optional despite v1 TS)

  // === SETTINGS ESTIMATE (preserved from v1) ===
  settingsEstimate: {
    focalLength: string;            // e.g., "85mm" or "24mm equiv" or "unknown"
    aperture: string;               // e.g., "f/2.8" or "f/5.6" or "unknown"
    shutterSpeed: string;           // e.g., "1/250s" or "1/60s" or "unknown"
    iso: string;                    // e.g., "400" or "1600" or "unknown"
  };

  // === SPATIAL ANALYSIS (preserved from v1, BoundingBox unchanged) ===
  boundingBoxes?: BoundingBox[];   // Optional, empty array if none detected

  // === RATIONALE (renamed from "thinking", structure preserved) ===
  rationale: {
    observations: string[];         // 3-6 initial visual observations (what was noticed first)
    reasoningSteps: string[];       // 3-5 evaluation steps (how the photo was analyzed)
    priorityFixes: string[];        // 3-5 ranked improvements by impact (critical → minor)
  };

  // === EVIDENCE (NEW) ===
  evidence?: EvidenceItem[];        // Optional array linking critique claims to sources

  // === TOKEN USAGE (optional, for economics dashboard) ===
  tokenUsage?: TokenUsage;          // Optional, calculated post-response (Ollama may not provide)
}

/**
 * BoundingBox (unchanged from v1)
 */
interface BoundingBox {
  type: 'composition' | 'lighting' | 'focus' | 'exposure' | 'color';
  severity: 'critical' | 'moderate' | 'minor';
  x: number;                        // Percentage from left edge (0-100)
  y: number;                        // Percentage from top edge (0-100)
  width: number;                    // Percentage of image width (0-100)
  height: number;                   // Percentage of image height (0-100)
  description: string;              // What's wrong in this area
  suggestion: string;               // How to fix it
}

/**
 * EvidenceItem (NEW in v2)
 * Links a critique claim to its deterministic source
 */
interface EvidenceItem {
  field: string;                    // Which critique field this supports (e.g., "technique", "lighting")
  source: 'EXIF' | 'CV' | 'model';  // Where this evidence came from
  value: string;                    // The specific value (e.g., "f/2.8", "12% highlight clipping")
  confidence?: number;              // Optional confidence score (0-1) for CV-derived evidence
}

/**
 * TokenUsage (preserved from v1, but optional in v2)
 * Ollama may not provide token counts; if unavailable, omit entirely
 */
interface TokenUsage {
  totalTokens?: number;             // Total tokens processed (if available)
  promptTokens?: number;            // Input tokens (if available)
  completionTokens?: number;        // Output tokens (if available)
  estimatedCost?: number;           // For local inference, this is $0 or compute-time-based
}
```

---

### v2 Field Justifications

| Field | Justification |
|-------|---------------|
| `schema_version` | Enables v1/v2 detection for migration + backward compatibility |
| `model_id` | Essential for comparison harness (Gemini vs Gemma), debugging model-specific issues |
| `quantization` | Impacts quality/speed tradeoffs (Q4 faster but less accurate than Q8); needed for eval harness |
| `timestamp` | Enables audit log chronological ordering + session replay |
| `rationale` (renamed) | "Thinking" is vague; "rationale" better conveys structured reasoning |
| `evidence` | Links claims to sources (EXIF, CV, model); builds user trust in critique accuracy |
| `learningPath` (required) | v1 had TS-optional but API-required mismatch; v2 clarifies as required |
| `tokenUsage` (optional) | Ollama may not provide; economics dashboard degrades gracefully if missing |

---

## 3. v1 → v2 Migration Table

### Field Mapping

| v1 Field | v2 Field | Migration Rule |
|----------|----------|----------------|
| `scores.composition` | `scores.composition` | Direct copy (both 0-10) |
| `scores.lighting` | `scores.lighting` | Direct copy |
| `scores.creativity` | `scores.creativity` | Direct copy |
| `scores.technique` | `scores.technique` | Direct copy |
| `scores.subjectImpact` | `scores.subjectImpact` | Direct copy |
| `critique.composition` | `critique.composition` | Direct copy |
| `critique.lighting` | `critique.lighting` | Direct copy |
| `critique.technique` | `critique.technique` | Direct copy |
| `critique.overall` | `critique.overall` | Direct copy |
| `strengths` | `strengths` | Direct copy |
| `improvements` | `improvements` | Direct copy |
| `learningPath` | `learningPath` | Copy if present; generate default if missing: `["Master composition basics", "Learn exposure compensation", "Practice aperture priority mode"]` |
| `settingsEstimate` | `settingsEstimate` | Direct copy |
| `boundingBoxes` | `boundingBoxes` | Direct copy (BoundingBox schema unchanged) |
| `thinking.observations` | `rationale.observations` | Rename parent field, copy array |
| `thinking.reasoningSteps` | `rationale.reasoningSteps` | Rename parent field, copy array |
| `thinking.priorityFixes` | `rationale.priorityFixes` | Rename parent field, copy array |
| `tokenUsage` | `tokenUsage` | Copy if present; omit if missing (v2 makes it fully optional) |
| (none) | `schema_version` | Set to `"2.0"` |
| (none) | `model_id` | Set to `"gemini-3-pro-preview"` for legacy data |
| (none) | `quantization` | Omit (not applicable to cloud models) |
| (none) | `timestamp` | Set to file modification time or omit |
| (none) | `evidence` | Omit (cannot retroactively generate evidence from v1 data) |

---

### Migration Code (TypeScript)

```typescript
function migrateV1ToV2(v1: PhotoAnalysisV1): PhotoAnalysisV2 {
  return {
    schema_version: "2.0",
    model_id: "gemini-3-pro-preview", // Assume Gemini for legacy data
    quantization: undefined,           // Not applicable to cloud models
    timestamp: Date.now(),             // Or file mtime if available

    scores: { ...v1.scores },
    critique: { ...v1.critique },
    strengths: [...v1.strengths],
    improvements: [...v1.improvements],

    learningPath: v1.learningPath || [
      "Master composition basics",
      "Learn exposure compensation",
      "Practice aperture priority mode"
    ],

    settingsEstimate: { ...v1.settingsEstimate },
    boundingBoxes: v1.boundingBoxes ? [...v1.boundingBoxes] : undefined,

    rationale: v1.thinking ? {
      observations: [...v1.thinking.observations],
      reasoningSteps: [...v1.thinking.reasoningSteps],
      priorityFixes: [...v1.thinking.priorityFixes]
    } : {
      observations: ["(migrated from v1, no rationale available)"],
      reasoningSteps: ["(migrated from v1, no rationale available)"],
      priorityFixes: ["(migrated from v1, no rationale available)"]
    },

    evidence: undefined,  // Cannot retroactively generate
    tokenUsage: v1.tokenUsage ? {
      totalTokens: v1.tokenUsage.totalTokens,
      promptTokens: undefined,     // v1 didn't separate prompt/completion
      completionTokens: undefined,
      estimatedCost: v1.tokenUsage.realCost
    } : undefined
  };
}
```

---

### Reverse Migration (v2 → v1)

**Use Case:** Display v2 data in legacy UI (e.g., comparison harness showing both Gemini and Gemma side-by-side).

```typescript
function migrateV2ToV1(v2: PhotoAnalysisV2): PhotoAnalysisV1 {
  return {
    scores: { ...v2.scores },
    critique: { ...v2.critique },
    strengths: [...v2.strengths],
    improvements: [...v2.improvements],
    learningPath: [...v2.learningPath],
    settingsEstimate: { ...v2.settingsEstimate },
    boundingBoxes: v2.boundingBoxes ? [...v2.boundingBoxes] : undefined,

    thinking: {
      observations: [...v2.rationale.observations],
      reasoningSteps: [...v2.rationale.reasoningSteps],
      priorityFixes: [...v2.rationale.priorityFixes]
    },

    tokenUsage: v2.tokenUsage ? {
      totalTokens: v2.tokenUsage.totalTokens || 0,
      realCachedTokens: 0,  // v2 doesn't track cache separately for local inference
      realNewTokens: v2.tokenUsage.totalTokens || 0,
      realCost: v2.tokenUsage.estimatedCost || 0,
      projectedCachedTokens: 0,
      projectedCostWithCache: 0,
      projectedSavings: 0
    } : undefined
  };
}
```

---

## 4. Validation Rules

### Score Constraints

```typescript
const scoreSchema = z.number()
  .min(0, "Score must be >= 0")
  .max(10, "Score must be <= 10")
  .multipleOf(0.1, "Score precision is 0.1");

const scoresSchema = z.object({
  composition: scoreSchema,
  lighting: scoreSchema,
  technique: scoreSchema,
  creativity: scoreSchema,
  subjectImpact: scoreSchema
});
```

**Rationale:** Scores are 0-10 with 0.1 precision (e.g., 7.5, 8.2). This matches UI display (`{score}/10`) and radar chart (`fullMark: 10`).

---

### Critique Constraints

```typescript
const critiqueSchema = z.object({
  composition: z.string().min(50, "Composition critique too short").max(500, "Composition critique too long"),
  lighting: z.string().min(50).max(500),
  technique: z.string().min(50).max(500),
  overall: z.string().min(100, "Overall critique too short").max(800, "Overall critique too long")
});
```

**Rationale:** Natural language critiques should be substantive (50+ chars) but not overwhelming (500 chars max per section, 800 for overall).

---

### Array Constraints

```typescript
const strengthsSchema = z.array(z.string().min(10).max(200))
  .min(3, "At least 3 strengths required")
  .max(6, "At most 6 strengths allowed");

const improvementsSchema = z.array(z.string().min(10).max(200))
  .min(3, "At least 3 improvements required")
  .max(6, "At most 6 improvements allowed");

const learningPathSchema = z.array(z.string().min(10).max(100))
  .min(3, "At least 3 learning items required")
  .max(5, "At most 5 learning items allowed");
```

**Rationale:** Arrays should have consistent cardinality for UI rendering (3-6 items). Individual items should be concise but meaningful.

---

### Bounding Box Constraints

```typescript
const boundingBoxSchema = z.object({
  type: z.enum(['composition', 'lighting', 'focus', 'exposure', 'color']),
  severity: z.enum(['critical', 'moderate', 'minor']),
  x: z.number().min(0).max(100),
  y: z.number().min(0).max(100),
  width: z.number().min(1).max(100),  // Width must be at least 1%
  height: z.number().min(1).max(100), // Height must be at least 1%
  description: z.string().min(10).max(150),
  suggestion: z.string().min(10).max(150)
});

const boundingBoxesSchema = z.array(boundingBoxSchema)
  .max(10, "At most 10 bounding boxes allowed"); // Prevent UI clutter
```

**Rationale:** Percentage coordinates (0-100) for responsive rendering. Limit to 10 boxes to avoid visual overload.

---

### Rationale Constraints

```typescript
const rationaleSchema = z.object({
  observations: z.array(z.string().min(10).max(200)).min(3).max(6),
  reasoningSteps: z.array(z.string().min(20).max(300)).min(3).max(5),
  priorityFixes: z.array(z.string().min(20).max(200)).min(3).max(5)
});
```

**Rationale:** Structured reasoning should be concise but substantive. Observations are shortest (10-200 chars), reasoning steps are most detailed (20-300 chars).

---

### Evidence Constraints

```typescript
const evidenceItemSchema = z.object({
  field: z.string().min(1).max(50),
  source: z.enum(['EXIF', 'CV', 'model']),
  value: z.string().min(1).max(200),
  confidence: z.number().min(0).max(1).optional()
});

const evidenceSchema = z.array(evidenceItemSchema)
  .max(20, "At most 20 evidence items allowed");
```

**Rationale:** Evidence links critique claims to sources. Limit to 20 items to prevent bloat.

---

### Provenance Constraints

```typescript
const provenanceSchema = z.object({
  schema_version: z.string().regex(/^\d+\.\d+$/, "Must be semver (e.g., '2.0')"),
  model_id: z.string().min(1).max(100),
  quantization: z.enum(['Q4_K_M', 'Q5_K_M', 'Q8_0', 'FP16']).optional(),
  timestamp: z.number().int().positive().optional()
});
```

**Rationale:** Provenance enables debugging and comparison. `schema_version` must be semver (e.g., "2.0", "2.1"). `quantization` is Ollama-specific.

---

## 5. Complete Zod Schema (v2)

```typescript
import { z } from 'zod';

// === SCORE SUB-SCHEMA ===
const scoreSchema = z.number().min(0).max(10).multipleOf(0.1);

const scoresSchema = z.object({
  composition: scoreSchema,
  lighting: scoreSchema,
  technique: scoreSchema,
  creativity: scoreSchema,
  subjectImpact: scoreSchema
});

// === CRITIQUE SUB-SCHEMA ===
const critiqueSchema = z.object({
  composition: z.string().min(50).max(500),
  lighting: z.string().min(50).max(500),
  technique: z.string().min(50).max(500),
  overall: z.string().min(100).max(800)
});

// === BOUNDING BOX SUB-SCHEMA ===
const boundingBoxSchema = z.object({
  type: z.enum(['composition', 'lighting', 'focus', 'exposure', 'color']),
  severity: z.enum(['critical', 'moderate', 'minor']),
  x: z.number().min(0).max(100),
  y: z.number().min(0).max(100),
  width: z.number().min(1).max(100),
  height: z.number().min(1).max(100),
  description: z.string().min(10).max(150),
  suggestion: z.string().min(10).max(150)
});

// === RATIONALE SUB-SCHEMA ===
const rationaleSchema = z.object({
  observations: z.array(z.string().min(10).max(200)).min(3).max(6),
  reasoningSteps: z.array(z.string().min(20).max(300)).min(3).max(5),
  priorityFixes: z.array(z.string().min(20).max(200)).min(3).max(5)
});

// === EVIDENCE SUB-SCHEMA ===
const evidenceItemSchema = z.object({
  field: z.string().min(1).max(50),
  source: z.enum(['EXIF', 'CV', 'model']),
  value: z.string().min(1).max(200),
  confidence: z.number().min(0).max(1).optional()
});

// === TOKEN USAGE SUB-SCHEMA ===
const tokenUsageSchema = z.object({
  totalTokens: z.number().int().nonnegative().optional(),
  promptTokens: z.number().int().nonnegative().optional(),
  completionTokens: z.number().int().nonnegative().optional(),
  estimatedCost: z.number().nonnegative().optional()
});

// === MAIN V2 SCHEMA ===
export const photoAnalysisV2Schema = z.object({
  // Provenance
  schema_version: z.string().regex(/^\d+\.\d+$/),
  model_id: z.string().min(1).max(100),
  quantization: z.enum(['Q4_K_M', 'Q5_K_M', 'Q8_0', 'FP16']).optional(),
  timestamp: z.number().int().positive().optional(),

  // Core fields
  scores: scoresSchema,
  critique: critiqueSchema,
  strengths: z.array(z.string().min(10).max(200)).min(3).max(6),
  improvements: z.array(z.string().min(10).max(200)).min(3).max(6),
  learningPath: z.array(z.string().min(10).max(100)).min(3).max(5),
  settingsEstimate: z.object({
    focalLength: z.string().min(1).max(50),
    aperture: z.string().min(1).max(50),
    shutterSpeed: z.string().min(1).max(50),
    iso: z.string().min(1).max(50)
  }),

  // Optional fields
  boundingBoxes: z.array(boundingBoxSchema).max(10).optional(),
  rationale: rationaleSchema,
  evidence: z.array(evidenceItemSchema).max(20).optional(),
  tokenUsage: tokenUsageSchema.optional()
});

export type PhotoAnalysisV2 = z.infer<typeof photoAnalysisV2Schema>;

// === REFUSAL MODE VALIDATION ===
// For refusal cases (all scores = 0.0), allow empty strengths/improvements arrays
export function validatePhotoAnalysisV2(data: unknown): PhotoAnalysisV2 {
  const result = photoAnalysisV2Schema.safeParse(data);

  if (result.success) {
    return result.data;
  }

  // Check if this is a refusal (all scores = 0.0)
  const parsed = data as any;
  const isRefusal = parsed?.scores &&
    Object.values(parsed.scores).every((score: any) => score === 0.0);

  if (isRefusal) {
    // Relax validation for refusal mode: allow empty strengths/improvements
    const refusalSchema = photoAnalysisV2Schema.extend({
      strengths: z.array(z.string()).max(6),  // Remove min(3) constraint
      improvements: z.array(z.string()).max(6) // Remove min(3) constraint
    });

    const refusalResult = refusalSchema.safeParse(data);
    if (refusalResult.success) {
      return refusalResult.data as PhotoAnalysisV2;
    }
  }

  // If not a valid refusal, throw original validation error
  throw new Error(`Schema validation failed: ${JSON.stringify(result.error)}`);
}
```

**Refusal Mode Note:** When model refuses critique (e.g., medical/identity/surveillance subjects), all axis scores should be 0.0, and `strengths`/`improvements` arrays may be empty. The validation function above handles this edge case by relaxing array constraints when refusal is detected.

---

## 6. JSON Schema (Draft-07) for Gemma Prompt

**Use Case:** Instruct Gemma 4 E4B to produce v2-compliant JSON via structured output prompting.

**Note on Refusal Mode (Temporary Split):** This JSON Schema enforces strict constraints (minItems: 3 for arrays) to encourage the model to provide substantive content during prompting. However, client-side validation (via `validatePhotoAnalysisV2()` function in section 5) relaxes these constraints for detected refusal cases (all scores = 0.0), allowing empty `strengths` and `improvements` arrays when the model refuses analysis. This **temporary split** between prompt-time (strict) and runtime (lenient) validation will be unified in Tier 3 with explicit `is_refusal` fields (see 09-validation-and-error-handling-spec.md).

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": [
    "schema_version",
    "model_id",
    "scores",
    "critique",
    "strengths",
    "improvements",
    "learningPath",
    "settingsEstimate",
    "rationale"
  ],
  "properties": {
    "schema_version": {
      "type": "string",
      "pattern": "^\\d+\\.\\d+$",
      "description": "Schema version in semver format (e.g., '2.0')"
    },
    "model_id": {
      "type": "string",
      "minLength": 1,
      "maxLength": 100,
      "description": "Model identifier (e.g., 'gemma-4-e4b')"
    },
    "quantization": {
      "type": "string",
      "enum": ["Q4_K_M", "Q5_K_M", "Q8_0", "FP16"],
      "description": "Quantization level (optional, Ollama-specific)"
    },
    "timestamp": {
      "type": "integer",
      "minimum": 0,
      "description": "Unix timestamp (optional)"
    },
    "scores": {
      "type": "object",
      "required": ["composition", "lighting", "technique", "creativity", "subjectImpact"],
      "properties": {
        "composition": { "type": "number", "minimum": 0, "maximum": 10 },
        "lighting": { "type": "number", "minimum": 0, "maximum": 10 },
        "technique": { "type": "number", "minimum": 0, "maximum": 10 },
        "creativity": { "type": "number", "minimum": 0, "maximum": 10 },
        "subjectImpact": { "type": "number", "minimum": 0, "maximum": 10 }
      }
    },
    "critique": {
      "type": "object",
      "required": ["composition", "lighting", "technique", "overall"],
      "properties": {
        "composition": { "type": "string", "minLength": 50, "maxLength": 500 },
        "lighting": { "type": "string", "minLength": 50, "maxLength": 500 },
        "technique": { "type": "string", "minLength": 50, "maxLength": 500 },
        "overall": { "type": "string", "minLength": 100, "maxLength": 800 }
      }
    },
    "strengths": {
      "type": "array",
      "minItems": 3,
      "maxItems": 6,
      "items": { "type": "string", "minLength": 10, "maxLength": 200 }
    },
    "improvements": {
      "type": "array",
      "minItems": 3,
      "maxItems": 6,
      "items": { "type": "string", "minLength": 10, "maxLength": 200 }
    },
    "learningPath": {
      "type": "array",
      "minItems": 3,
      "maxItems": 5,
      "items": { "type": "string", "minLength": 10, "maxLength": 100 }
    },
    "settingsEstimate": {
      "type": "object",
      "required": ["focalLength", "aperture", "shutterSpeed", "iso"],
      "properties": {
        "focalLength": { "type": "string", "minLength": 1, "maxLength": 50 },
        "aperture": { "type": "string", "minLength": 1, "maxLength": 50 },
        "shutterSpeed": { "type": "string", "minLength": 1, "maxLength": 50 },
        "iso": { "type": "string", "minLength": 1, "maxLength": 50 }
      }
    },
    "boundingBoxes": {
      "type": "array",
      "maxItems": 10,
      "items": {
        "type": "object",
        "required": ["type", "severity", "x", "y", "width", "height", "description", "suggestion"],
        "properties": {
          "type": { "type": "string", "enum": ["composition", "lighting", "focus", "exposure", "color"] },
          "severity": { "type": "string", "enum": ["critical", "moderate", "minor"] },
          "x": { "type": "number", "minimum": 0, "maximum": 100 },
          "y": { "type": "number", "minimum": 0, "maximum": 100 },
          "width": { "type": "number", "minimum": 1, "maximum": 100 },
          "height": { "type": "number", "minimum": 1, "maximum": 100 },
          "description": { "type": "string", "minLength": 10, "maxLength": 150 },
          "suggestion": { "type": "string", "minLength": 10, "maxLength": 150 }
        }
      }
    },
    "rationale": {
      "type": "object",
      "required": ["observations", "reasoningSteps", "priorityFixes"],
      "properties": {
        "observations": {
          "type": "array",
          "minItems": 3,
          "maxItems": 6,
          "items": { "type": "string", "minLength": 10, "maxLength": 200 }
        },
        "reasoningSteps": {
          "type": "array",
          "minItems": 3,
          "maxItems": 5,
          "items": { "type": "string", "minLength": 20, "maxLength": 300 }
        },
        "priorityFixes": {
          "type": "array",
          "minItems": 3,
          "maxItems": 5,
          "items": { "type": "string", "minLength": 20, "maxLength": 200 }
        }
      }
    },
    "evidence": {
      "type": "array",
      "maxItems": 20,
      "items": {
        "type": "object",
        "required": ["field", "source", "value"],
        "properties": {
          "field": { "type": "string", "minLength": 1, "maxLength": 50 },
          "source": { "type": "string", "enum": ["EXIF", "CV", "model"] },
          "value": { "type": "string", "minLength": 1, "maxLength": 200 },
          "confidence": { "type": "number", "minimum": 0, "maximum": 1 }
        }
      }
    },
    "tokenUsage": {
      "type": "object",
      "properties": {
        "totalTokens": { "type": "integer", "minimum": 0 },
        "promptTokens": { "type": "integer", "minimum": 0 },
        "completionTokens": { "type": "integer", "minimum": 0 },
        "estimatedCost": { "type": "number", "minimum": 0 }
      }
    }
  }
}
```

**Note:** Ollama's structured output support is **SPIKE-DEPENDENT** (see `03-runtime-decisions-and-spikes.md` Spike 1). If native structured output is unavailable, enforce schema client-side via Zod/Ajv after parsing raw JSON.

---

## 7. Example Outputs

### Example 1: High-Quality Landscape (v2)

```json
{
  "schema_version": "2.0",
  "model_id": "gemma-4-e4b",
  "quantization": "Q4_K_M",
  "timestamp": 1746547200,
  "scores": {
    "composition": 8.5,
    "lighting": 9.0,
    "technique": 7.5,
    "creativity": 8.0,
    "subjectImpact": 8.5
  },
  "critique": {
    "composition": "Strong use of rule of thirds with horizon at lower third. Leading line from foreground path draws eye to sunset. Balanced framing with negative space in upper left creates breathing room.",
    "lighting": "Golden hour light beautifully captured with warm color temperature (~5500K). Dynamic range well-managed with minimal clipping. Soft diffused light enhances texture in clouds.",
    "technique": "Slight motion blur in clouds suggests 1/120s shutter may be too slow for handheld. Foreground path is slightly underexposed, losing shadow detail. Overall sharpness is good except for cloud edges.",
    "overall": "A compelling sunset landscape that demonstrates strong compositional instincts and excellent timing for golden hour. Minor technical refinements (tripod, graduated ND filter) would elevate this to professional level. Skill level: Intermediate to Advanced."
  },
  "strengths": [
    "Golden hour timing maximizes warm tones and soft light quality",
    "Horizon placement at lower third follows rule of thirds perfectly",
    "Leading line from foreground path creates strong visual flow to sunset",
    "Balanced composition with negative space prevents cluttered feel",
    "Color harmony between warm sky and cool foreground is pleasing"
  ],
  "improvements": [
    "Use tripod or faster shutter (1/250s+) to eliminate cloud motion blur",
    "Apply graduated ND filter to balance sky exposure with foreground",
    "Lift shadows in foreground path by +1 stop to reveal detail",
    "Consider HDR bracketing for extreme dynamic range scenes like this"
  ],
  "learningPath": [
    "Master graduated ND filter technique for high dynamic range landscapes",
    "Practice shutter speed selection for motion vs. sharpness tradeoffs",
    "Study histogram reading to identify and prevent highlight/shadow clipping"
  ],
  "settingsEstimate": {
    "focalLength": "26mm equiv",
    "aperture": "f/1.5",
    "shutterSpeed": "1/120s",
    "iso": "100"
  },
  "boundingBoxes": [
    {
      "type": "exposure",
      "severity": "moderate",
      "x": 65,
      "y": 10,
      "width": 30,
      "height": 20,
      "description": "Overexposed sky in upper right quadrant, losing cloud detail",
      "suggestion": "Reduce highlights by -0.5 stops or use graduated ND filter"
    },
    {
      "type": "focus",
      "severity": "minor",
      "x": 20,
      "y": 75,
      "width": 40,
      "height": 15,
      "description": "Foreground path slightly soft due to motion blur",
      "suggestion": "Use faster shutter (1/250s) or tripod for tack-sharp foreground"
    },
    {
      "type": "exposure",
      "severity": "moderate",
      "x": 10,
      "y": 70,
      "width": 50,
      "height": 25,
      "description": "Underexposed foreground losing shadow detail in path",
      "suggestion": "Lift shadows by +1 stop or use graduated ND filter"
    }
  ],
  "rationale": {
    "observations": [
      "Horizon positioned at lower third, classic landscape composition",
      "Golden hour light creates warm color temperature (~5500K estimated)",
      "High dynamic range scene with bright sky and dark foreground",
      "Slight motion blur visible in cloud edges (upper right quadrant)",
      "EXIF confirms f/1.5 aperture (wide open, shallow DOF risk)"
    ],
    "reasoningSteps": [
      "Evaluated composition against rule of thirds → strong horizon placement",
      "Analyzed lighting quality → golden hour is optimal timing for landscapes",
      "Assessed technical execution → motion blur indicates handheld at 1/120s is borderline",
      "Checked dynamic range via histogram → 12% highlight clipping, 8% shadow clipping",
      "Compared aperture choice → f/1.5 appropriate for low light but risks soft edges at frame corners"
    ],
    "priorityFixes": [
      "Critical: Address highlight clipping in sky (moderate severity, affects cloud detail)",
      "Moderate: Correct foreground underexposure (moderate severity, loses path texture)",
      "Minor: Improve sharpness via faster shutter or tripod (refinement, not critical flaw)"
    ]
  },
  "evidence": [
    {"field": "focalLength", "source": "EXIF", "value": "4.2mm (26mm equiv)"},
    {"field": "aperture", "source": "EXIF", "value": "f/1.5"},
    {"field": "shutterSpeed", "source": "EXIF", "value": "1/120s"},
    {"field": "iso", "source": "EXIF", "value": "100"},
    {"field": "histogram_clipping", "source": "CV", "value": "highlights: 12% clipped, shadows: 8% clipped"},
    {"field": "color_temperature", "source": "CV", "value": "~5500K (warm, golden hour estimated)"},
    {"field": "sharpness_laplacian", "source": "CV", "value": "165.3 (moderate sharpness, motion blur detected)"}
  ],
  "tokenUsage": {
    "totalTokens": 4523,
    "promptTokens": 3200,
    "completionTokens": 1323,
    "estimatedCost": 0.0
  }
}
```

---

### Example 2: Low-Quality Beginner Portrait (v2)

```json
{
  "schema_version": "2.0",
  "model_id": "gemma-4-e4b",
  "quantization": "Q5_K_M",
  "timestamp": 1746547260,
  "scores": {
    "composition": 4.0,
    "lighting": 3.5,
    "technique": 3.0,
    "creativity": 5.0,
    "subjectImpact": 4.5
  },
  "critique": {
    "composition": "Subject is centered (missed rule of thirds opportunity). Background is cluttered with distracting elements (garbage can, electrical outlet). No leading lines or framing devices. Headroom is excessive (1/3 of frame is empty space above head).",
    "lighting": "Harsh overhead fluorescent lighting creates unflattering shadows under eyes and nose. No fill light to balance shadows. Color cast is greenish (fluorescent temperature not corrected). Highlights on forehead are blown out.",
    "technique": "Focus is soft on subject's eyes (critical portrait flaw). Depth of field is too shallow (f/1.8) causing background bokeh to compete with subject. ISO 3200 introduces visible noise in shadows. Shutter speed (1/60s) is borderline for handheld at 50mm equiv.",
    "overall": "This portrait shows enthusiasm but lacks technical fundamentals. Key areas to improve: composition (rule of thirds, background cleanup), lighting (soft diffused light, fill flash), and focus (nailing eye sharpness). With practice on these basics, you'll see rapid improvement. Skill level: Beginner."
  },
  "strengths": [
    "Subject is engaged and making eye contact (good emotional connection)",
    "Attempt at shallow depth of field shows understanding of portrait bokeh concept",
    "Color palette is cohesive (muted tones, not overly saturated)"
  ],
  "improvements": [
    "Position subject off-center using rule of thirds (place eyes at upper-right intersection)",
    "Use soft diffused lighting (window light + reflector, or off-camera flash with softbox)",
    "Focus precisely on nearest eye (use single-point AF, magnify in live view)",
    "Clean up background (remove garbage can, reposition to hide outlet)",
    "Reduce ISO to 400-800 to minimize noise (add more light instead)",
    "Use faster shutter (1/125s+) to eliminate motion blur risk"
  ],
  "learningPath": [
    "Master single-point autofocus for portraits (always focus on nearest eye)",
    "Learn to find and use soft natural light (window light is your friend)",
    "Practice rule of thirds composition (off-center subject positioning)"
  ],
  "settingsEstimate": {
    "focalLength": "50mm equiv",
    "aperture": "f/1.8",
    "shutterSpeed": "1/60s",
    "iso": "3200"
  },
  "boundingBoxes": [
    {
      "type": "composition",
      "severity": "critical",
      "x": 75,
      "y": 40,
      "width": 20,
      "height": 30,
      "description": "Garbage can in background is highly distracting (bright color draws eye away from subject)",
      "suggestion": "Reposition subject or remove garbage can; shoot from different angle"
    },
    {
      "type": "focus",
      "severity": "critical",
      "x": 40,
      "y": 30,
      "width": 15,
      "height": 10,
      "description": "Eyes are soft (out of focus), critical flaw for portraits",
      "suggestion": "Use single-point AF on nearest eye; magnify in live view to confirm sharpness"
    },
    {
      "type": "lighting",
      "severity": "moderate",
      "x": 35,
      "y": 35,
      "width": 20,
      "height": 15,
      "description": "Harsh shadows under eyes from overhead fluorescent lighting",
      "suggestion": "Use fill light (reflector or flash) to soften shadows; shoot near window for soft light"
    },
    {
      "type": "exposure",
      "severity": "moderate",
      "x": 38,
      "y": 22,
      "width": 18,
      "height": 12,
      "description": "Forehead highlights are blown out (overexposed, losing skin texture)",
      "suggestion": "Reduce exposure by -0.7 stops or apply powder to reduce forehead shine"
    }
  ],
  "rationale": {
    "observations": [
      "Subject centered in frame (missed rule of thirds opportunity)",
      "Background cluttered with garbage can (upper right) and electrical outlet (right edge)",
      "Eyes appear soft (focus missed critical point)",
      "Harsh overhead lighting creates unflattering shadows (under eyes, nose)",
      "Greenish color cast from fluorescent lighting (white balance not corrected)"
    ],
    "reasoningSteps": [
      "Evaluated composition → centered subject lacks visual interest; background is distracting",
      "Analyzed lighting quality → harsh overhead fluorescent creates unflattering portrait shadows",
      "Assessed focus → eyes are soft (critical flaw for portraits, always prioritize eye sharpness)",
      "Checked technical settings → ISO 3200 is high (introduces noise), f/1.8 is very shallow (focus precision required)",
      "Compared skill indicators → composition + lighting + focus issues suggest beginner level"
    ],
    "priorityFixes": [
      "Critical: Fix eye focus (use single-point AF, this is non-negotiable for portraits)",
      "Critical: Improve lighting (find soft window light or use fill flash to balance shadows)",
      "Moderate: Clean up background (remove/hide distractions before shooting)",
      "Moderate: Apply rule of thirds (position subject off-center for visual interest)",
      "Minor: Reduce ISO to minimize noise (ISO 3200 is unnecessarily high for this scene)"
    ]
  },
  "evidence": [
    {"field": "focalLength", "source": "EXIF", "value": "50mm equiv"},
    {"field": "aperture", "source": "EXIF", "value": "f/1.8"},
    {"field": "shutterSpeed", "source": "EXIF", "value": "1/60s"},
    {"field": "iso", "source": "EXIF", "value": "3200"},
    {"field": "color_temperature", "source": "EXIF", "value": "4100K (fluorescent, not corrected)"},
    {"field": "sharpness_laplacian", "source": "CV", "value": "78.2 (low sharpness, soft focus on eyes)", "confidence": 0.92},
    {"field": "histogram_clipping", "source": "CV", "value": "highlights: 18% clipped (forehead), shadows: 3% clipped"}
  ],
  "tokenUsage": {
    "totalTokens": 5134,
    "promptTokens": 3400,
    "completionTokens": 1734,
    "estimatedCost": 0.0
  }
}
```

---

### Example 3: Refusal Case (Medical Subject)

```json
{
  "schema_version": "2.0",
  "model_id": "gemma-4-e4b",
  "quantization": "Q4_K_M",
  "timestamp": 1746547320,
  "scores": {
    "composition": 0.0,
    "lighting": 0.0,
    "technique": 0.0,
    "creativity": 0.0,
    "subjectImpact": 0.0
  },
  "critique": {
    "composition": "I cannot provide critique for medical imagery.",
    "lighting": "I cannot provide critique for medical imagery.",
    "technique": "I cannot provide critique for medical imagery.",
    "overall": "I cannot provide photography critique for medical subjects, surgical procedures, or clinical photography. This tool is designed for creative and commercial photography, not medical imaging. For medical photography critique, please consult a certified medical photographer or clinical imaging specialist."
  },
  "strengths": [],
  "improvements": [],
  "learningPath": [
    "For medical photography needs, consult ASMP (American Society of Media Photographers) medical division",
    "Consider professional medical imaging training programs",
    "Use HIPAA-compliant medical imaging software for clinical work"
  ],
  "settingsEstimate": {
    "focalLength": "unknown",
    "aperture": "unknown",
    "shutterSpeed": "unknown",
    "iso": "unknown"
  },
  "boundingBoxes": [],
  "rationale": {
    "observations": [
      "Image content appears to be medical or clinical in nature",
      "This tool is not designed for medical photography critique",
      "Medical imagery requires specialized expertise and HIPAA compliance"
    ],
    "reasoningSteps": [
      "Detected potential medical subject matter in uploaded image",
      "Photography Coach is designed for creative/commercial work, not medical imaging",
      "Refusing critique to avoid providing unqualified medical assessments"
    ],
    "priorityFixes": [
      "Use specialized medical imaging software for clinical photography",
      "Consult certified medical photographer for professional critique",
      "Ensure HIPAA compliance for any patient-related imagery"
    ]
  },
  "evidence": [],
  "tokenUsage": {
    "totalTokens": 892,
    "promptTokens": 650,
    "completionTokens": 242,
    "estimatedCost": 0.0
  }
}
```

---

## 8. TypeScript Type Definitions (v2)

**File:** `types.v2.ts`

```typescript
/**
 * Photography Coach v2 Output Schema Types
 * Generated from 02-output-schema.md
 * Schema Version: 2.0
 */

export interface PhotoAnalysisV2 {
  // Provenance
  schema_version: string;           // "2.0"
  model_id: string;                 // "gemma-4-e4b"
  quantization?: 'Q4_K_M' | 'Q5_K_M' | 'Q8_0' | 'FP16';
  timestamp?: number;               // Unix timestamp

  // Scores (0-10)
  scores: {
    composition: number;
    lighting: number;
    technique: number;
    creativity: number;
    subjectImpact: number;
  };

  // Critique
  critique: {
    composition: string;
    lighting: string;
    technique: string;
    overall: string;
  };

  // Arrays
  strengths: string[];
  improvements: string[];
  learningPath: string[];

  // Settings estimate
  settingsEstimate: {
    focalLength: string;
    aperture: string;
    shutterSpeed: string;
    iso: string;
  };

  // Optional fields
  boundingBoxes?: BoundingBox[];
  rationale: Rationale;
  evidence?: EvidenceItem[];
  tokenUsage?: TokenUsage;
}

export interface BoundingBox {
  type: 'composition' | 'lighting' | 'focus' | 'exposure' | 'color';
  severity: 'critical' | 'moderate' | 'minor';
  x: number;
  y: number;
  width: number;
  height: number;
  description: string;
  suggestion: string;
}

export interface Rationale {
  observations: string[];
  reasoningSteps: string[];
  priorityFixes: string[];
}

export interface EvidenceItem {
  field: string;
  source: 'EXIF' | 'CV' | 'model';
  value: string;
  confidence?: number;
}

export interface TokenUsage {
  totalTokens?: number;
  promptTokens?: number;
  completionTokens?: number;
  estimatedCost?: number;
}
```

---

## Appendix: Open Questions for Tier 2

**Deferred to 04-prompt-and-rationale-spec.md:**
1. How to prompt Gemma 4 E4B to produce `rationale` fields reliably? (Few-shot examples needed)
2. Should `evidence` array be populated by model or deterministic CV layer? (Spike-dependent)
3. What refusal prompts trigger score:0 + empty arrays? (Medical, identity, surveillance, etc.)

**Deferred to 03-runtime-decisions-and-spikes.md:**
1. Does Ollama support native structured output (responseSchema equivalent)? → Spike 1
2. If not, how to enforce schema client-side without excessive prompt engineering? → Zod/Ajv post-parse

**Deferred to 09-evaluation-and-benchmark-spec.md:**
1. How to validate v2 schema quality vs v1 (Gemini baseline)? → Golden image set with ground truth
2. What's acceptable schema validation failure rate? (< 5%? < 10%?)

---

**End of 02-output-schema.md**

**Status:** ✅ Complete - Ready for Tier 1 review

**Next:** 03-runtime-decisions-and-spikes.md (spike definitions, pass/fail criteria, fallbacks)
