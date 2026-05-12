/**
 * validationService.ts — Zod-based v2 schema validation
 * Runtime validation for PhotoAnalysisV2 responses from Gemma 4.
 *
 * Sources: docs/specs/09-validation-and-error-handling-spec.md
 *          docs/specs/02-output-schema.md
 */

import { z } from 'zod';
import { PhotoAnalysisV2 } from '../types.v2';

// ─── Zod schemas ──────────────────────────────────────────────────────────────

const BoundingBoxSchema = z.object({
  type: z.enum(['composition', 'lighting', 'focus', 'exposure', 'color']),
  severity: z.enum(['critical', 'moderate', 'minor']),
  x: z.number().min(0).max(100),
  y: z.number().min(0).max(100),
  width: z.number().min(0).max(100),
  height: z.number().min(0).max(100),
  description: z.string().min(5),
  suggestion: z.string().min(5),
});

const EvidenceItemSchema = z.object({
  field: z.string(),
  source: z.enum(['EXIF', 'CV', 'model']),
  value: z.string(),
  confidence: z.number().min(0).max(1).optional(),
});

const TokenUsageSchema = z.object({
  totalTokens: z.number().optional(),
  promptTokens: z.number().optional(),
  completionTokens: z.number().optional(),
  estimatedCost: z.number().optional(),
});

const ScoreSchema = z.number().min(0).max(10);

const ScoreBreakdownSchema = z.object({
  composition: ScoreSchema,
  lighting: ScoreSchema,
  technique: ScoreSchema,
  creativity: ScoreSchema,
  subjectImpact: ScoreSchema,
});

// Critique strings require a full sentence for normal analyses;
// for refusals the model emits short placeholders like "N/A" which is fine.
const CritiqueStringSchema = z.string().min(1);
const CritiqueSchema = z.object({
  composition: CritiqueStringSchema,
  lighting:    CritiqueStringSchema,
  technique:   CritiqueStringSchema,
  overall:     CritiqueStringSchema,
});

const RationaleSchema = z.object({
  observations: z.array(z.string()),
  reasoningSteps: z.array(z.string()),
  priorityFixes: z.array(z.string()),
});

const CameraSettingsSchema = z.object({
  focalLength: z.string(),
  aperture: z.string(),
  shutterSpeed: z.string(),
  iso: z.string(),
});

/**
 * Full v2 schema validation.
 * For refusal responses (is_refusal: true), arrays are allowed to be empty.
 */
const PhotoAnalysisV2Schema = z.object({
  schema_version: z.string(),
  model_id: z.string(),
  quantization: z.string().optional(),
  timestamp: z.number().optional(),

  scores: ScoreBreakdownSchema,
  critique: CritiqueSchema,

  strengths: z.array(z.string()),
  improvements: z.array(z.string()),
  learningPath: z.array(z.string()),

  settingsEstimate: CameraSettingsSchema,
  boundingBoxes: z.array(BoundingBoxSchema).optional(),

  rationale: RationaleSchema,
  evidence: z.array(EvidenceItemSchema).optional(),
  tokenUsage: TokenUsageSchema.optional(),

  is_refusal: z.boolean().optional(),
  refusal_reason: z.string().optional(),
  refusal_category: z.enum(['medical', 'identity', 'surveillance', 'inappropriate', 'other']).optional(),
});

// ─── Public validation function ────────────────────────────────────────────────

/**
 * Validate and coerce a raw Gemma output into PhotoAnalysisV2.
 * Throws a descriptive error if required fields are missing or wrong type.
 */
export function validateV2Schema(raw: unknown): PhotoAnalysisV2 {
  const result = PhotoAnalysisV2Schema.safeParse(raw);

  if (!result.success) {
    const issues = result.error.issues
      .slice(0, 5)
      .map(i => `${i.path.join('.')}: ${i.message}`)
      .join('; ');
    throw new ValidationError(`Schema validation failed: ${issues}`, result.error.issues);
  }

  const data = result.data;

  // Post-parse quality checks (warnings only, not thrown)
  const warnings: string[] = [];

  if (!data.is_refusal) {
    if (data.strengths.length < 3) warnings.push(`strengths has ${data.strengths.length} items (expect 3+)`);
    if (data.improvements.length < 3) warnings.push(`improvements has ${data.improvements.length} items (expect 3+)`);
    if (data.learningPath.length < 3) warnings.push(`learningPath has ${data.learningPath.length} items (expect 3+)`);
    if (data.rationale.observations.length < 3) warnings.push('rationale.observations < 3 items');
    if (data.rationale.reasoningSteps.length < 3) warnings.push('rationale.reasoningSteps < 3 items');
    if (data.rationale.priorityFixes.length < 3) warnings.push('rationale.priorityFixes < 3 items');
    for (const [key, val] of Object.entries(data.critique) as [string, string][]) {
      if (val.length < 10) warnings.push(`critique.${key} is very short (${val.length} chars); expected ≥10`);
    }
  }

  if (warnings.length > 0) {
    console.warn('[validationService] Schema warnings:', warnings.join('; '));
  }

  return data as PhotoAnalysisV2;
}

/**
 * Quick check whether a response looks like a refusal (all scores near 0).
 * Used as a secondary detection signal alongside explicit is_refusal field.
 */
export function isImplicitRefusal(analysis: PhotoAnalysisV2): boolean {
  if (analysis.is_refusal) return true;
  const scores = Object.values(analysis.scores);
  return scores.every(s => s < 0.5);
}

// ─── Error type ───────────────────────────────────────────────────────────────

export class ValidationError extends Error {
  constructor(message: string, public issues: z.ZodIssue[]) {
    super(message);
    this.name = 'ValidationError';
  }
}
