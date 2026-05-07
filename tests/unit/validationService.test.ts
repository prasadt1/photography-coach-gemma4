/**
 * Unit tests: validationService.ts
 * Coverage: valid schema, missing fields, score range, refusal handling,
 *           is_refusal flag, implicit refusal detection.
 */

import { describe, it, expect } from 'vitest';
import { validateV2Schema, isImplicitRefusal, ValidationError } from '../../services/validationService';
import type { PhotoAnalysisV2 } from '../../types.v2';

// ─── Fixtures ──────────────────────────────────────────────────────────────────

const VALID_ANALYSIS: PhotoAnalysisV2 = {
  schema_version: '2.0',
  model_id: 'gemma-4-e4b',
  quantization: 'Q4_K_M',
  timestamp: Date.now(),
  scores: { composition: 7.5, lighting: 8.0, technique: 6.5, creativity: 7.0, subjectImpact: 8.5 },
  critique: {
    composition: 'Strong rule-of-thirds placement with effective leading lines.',
    lighting: 'Golden hour light wraps the subject beautifully with minimal clipping.',
    technique: 'Sharp focus on the subject with slightly soft background edges.',
    overall: 'A technically solid shot with strong emotional impact. Minor technique refinements would elevate it further.',
  },
  strengths: ['Strong subject isolation', 'Excellent golden hour light', 'Clear emotional narrative'],
  improvements: ['Slight underexposure in shadows', 'Foreground distraction at bottom left', 'Horizon slightly tilted'],
  learningPath: ['Study exposure bracketing', 'Practice horizon levelling', 'Experiment with leading lines'],
  settingsEstimate: { focalLength: '85mm', aperture: 'f/2.8', shutterSpeed: '1/500s', iso: '400' },
  boundingBoxes: [
    { type: 'composition', severity: 'minor', x: 5, y: 80, width: 20, height: 15, description: 'Distracting foreground element', suggestion: 'Reframe to exclude or use a lower angle' },
  ],
  rationale: {
    observations: ['Subject is well-lit and centred', 'Background bokeh is pleasing', 'Horizon has a slight tilt'],
    reasoningSteps: ['Checked exposure histogram for clipping', 'Evaluated rule-of-thirds grid placement', 'Assessed background simplicity'],
    priorityFixes: ['Correct horizon tilt first (biggest structural issue)', 'Lift shadows slightly in post', 'Crop out foreground distraction'],
  },
};

const REFUSAL_ANALYSIS: PhotoAnalysisV2 = {
  schema_version: '2.0',
  model_id: 'gemma-4-e4b',
  scores: { composition: 0, lighting: 0, technique: 0, creativity: 0, subjectImpact: 0 },
  critique: { composition: 'N/A', lighting: 'N/A', technique: 'N/A', overall: 'N/A' },
  strengths: [],
  improvements: [],
  learningPath: [],
  settingsEstimate: { focalLength: 'unknown', aperture: 'unknown', shutterSpeed: 'unknown', iso: 'unknown' },
  rationale: { observations: [], reasoningSteps: [], priorityFixes: [] },
  is_refusal: true,
  refusal_reason: 'Image appears to contain medical content; cannot provide photography critique.',
  refusal_category: 'medical',
};

// ─── Valid schema ──────────────────────────────────────────────────────────────

describe('validateV2Schema — valid input', () => {
  it('passes a complete valid analysis', () => {
    const result = validateV2Schema(VALID_ANALYSIS);
    expect(result.schema_version).toBe('2.0');
    expect(result.model_id).toBe('gemma-4-e4b');
    expect(result.scores.composition).toBe(7.5);
    expect(result.strengths).toHaveLength(3);
  });

  it('passes with optional fields omitted', () => {
    const minimal = { ...VALID_ANALYSIS };
    delete (minimal as any).boundingBoxes;
    delete (minimal as any).evidence;
    delete (minimal as any).tokenUsage;
    delete (minimal as any).quantization;
    delete (minimal as any).timestamp;
    expect(() => validateV2Schema(minimal)).not.toThrow();
  });

  it('passes a valid refusal response (empty arrays allowed)', () => {
    const result = validateV2Schema(REFUSAL_ANALYSIS);
    expect(result.is_refusal).toBe(true);
    expect(result.refusal_category).toBe('medical');
    expect(result.strengths).toHaveLength(0);
  });
});

// ─── Score validation ──────────────────────────────────────────────────────────

describe('validateV2Schema — score ranges', () => {
  it('passes scores at boundaries (0 and 10)', () => {
    const edge = { ...VALID_ANALYSIS, scores: { composition: 0, lighting: 10, technique: 5, creativity: 0.1, subjectImpact: 9.9 } };
    expect(() => validateV2Schema(edge)).not.toThrow();
  });

  it('rejects score above 10', () => {
    const bad = { ...VALID_ANALYSIS, scores: { ...VALID_ANALYSIS.scores, composition: 10.1 } };
    expect(() => validateV2Schema(bad)).toThrow(ValidationError);
  });

  it('rejects negative score', () => {
    const bad = { ...VALID_ANALYSIS, scores: { ...VALID_ANALYSIS.scores, lighting: -0.1 } };
    expect(() => validateV2Schema(bad)).toThrow(ValidationError);
  });

  it('rejects non-number score', () => {
    const bad = { ...VALID_ANALYSIS, scores: { ...VALID_ANALYSIS.scores, technique: 'good' as any } };
    expect(() => validateV2Schema(bad)).toThrow(ValidationError);
  });
});

// ─── Required fields ───────────────────────────────────────────────────────────

describe('validateV2Schema — required fields', () => {
  it('rejects missing schema_version', () => {
    const bad = { ...VALID_ANALYSIS } as any;
    delete bad.schema_version;
    expect(() => validateV2Schema(bad)).toThrow(ValidationError);
  });

  it('rejects missing scores', () => {
    const bad = { ...VALID_ANALYSIS } as any;
    delete bad.scores;
    expect(() => validateV2Schema(bad)).toThrow(ValidationError);
  });

  it('rejects missing rationale', () => {
    const bad = { ...VALID_ANALYSIS } as any;
    delete bad.rationale;
    expect(() => validateV2Schema(bad)).toThrow(ValidationError);
  });

  it('rejects missing critique fields', () => {
    const bad = { ...VALID_ANALYSIS, critique: { composition: 'ok', lighting: 'ok', technique: 'ok' } as any };
    expect(() => validateV2Schema(bad)).toThrow(ValidationError);
  });

  it('accepts short critique strings (warning only — refusal compat)', () => {
    // Schema allows short strings (e.g. refusal "N/A" placeholders).
    // Non-refusal short critiques produce a console.warn, not a throw.
    const ok = { ...VALID_ANALYSIS, critique: { ...VALID_ANALYSIS.critique, overall: 'Ok' } };
    expect(() => validateV2Schema(ok)).not.toThrow();
  });
});

// ─── Bounding box validation ───────────────────────────────────────────────────

describe('validateV2Schema — bounding boxes', () => {
  it('rejects bounding box with invalid type enum', () => {
    const bad = {
      ...VALID_ANALYSIS,
      boundingBoxes: [{ ...VALID_ANALYSIS.boundingBoxes![0], type: 'invalid' as any }],
    };
    expect(() => validateV2Schema(bad)).toThrow(ValidationError);
  });

  it('rejects bounding box coordinates out of 0-100 range', () => {
    const bad = {
      ...VALID_ANALYSIS,
      boundingBoxes: [{ ...VALID_ANALYSIS.boundingBoxes![0], x: 101 }],
    };
    expect(() => validateV2Schema(bad)).toThrow(ValidationError);
  });

  it('passes empty boundingBoxes array', () => {
    const ok = { ...VALID_ANALYSIS, boundingBoxes: [] };
    expect(() => validateV2Schema(ok)).not.toThrow();
  });
});

// ─── Refusal detection ────────────────────────────────────────────────────────

describe('isImplicitRefusal', () => {
  it('returns true when is_refusal is explicitly true', () => {
    expect(isImplicitRefusal(REFUSAL_ANALYSIS)).toBe(true);
  });

  it('returns true when all scores are near zero (implicit signal)', () => {
    const implicit = { ...VALID_ANALYSIS, scores: { composition: 0, lighting: 0, technique: 0, creativity: 0, subjectImpact: 0 } };
    expect(isImplicitRefusal(implicit)).toBe(true);
  });

  it('returns false for a normal analysis', () => {
    expect(isImplicitRefusal(VALID_ANALYSIS)).toBe(false);
  });

  it('returns false for a low-scoring but valid analysis (not refusal)', () => {
    const lowScore = { ...VALID_ANALYSIS, scores: { composition: 1, lighting: 1, technique: 1, creativity: 1, subjectImpact: 1 } };
    expect(isImplicitRefusal(lowScore)).toBe(false);
  });
});

// ─── Null / garbage input ─────────────────────────────────────────────────────

describe('validateV2Schema — bad input types', () => {
  it('rejects null', () => {
    expect(() => validateV2Schema(null)).toThrow(ValidationError);
  });

  it('rejects empty object', () => {
    expect(() => validateV2Schema({})).toThrow(ValidationError);
  });

  it('rejects array', () => {
    expect(() => validateV2Schema([])).toThrow(ValidationError);
  });

  it('rejects string', () => {
    expect(() => validateV2Schema('{"schema_version":"2.0"}')).toThrow(ValidationError);
  });
});
