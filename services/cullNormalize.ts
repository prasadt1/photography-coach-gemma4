/**
 * Maps a minimal Ollama "cull batch" JSON response into a full PhotoAnalysisV2
 * so validation, UI, and XMP export stay unchanged.
 */

import { SCHEMA_VERSION } from '../config';
import { PhotoAnalysisV2, BoundingBox } from '../types.v2';

const PAD_CRITIQUE = 'Pass 1 cull placeholder from quick scan — run Deep Critique for full rationale.';
const PAD_OBSERVATION = 'Pass 1 cull captured only a quick signal. This line is a placeholder from the cull pass; run Deep Critique for detailed observations.';
const PAD_STRENGTH = 'Pass 1 cull quick-signal note (not a full critique). Run Deep Critique before final editing decisions.';
const PAD_IMPROVEMENT = 'Pass 1 cull placeholder suggestion. Run Deep Critique on this photo to get precise fix-by-fix guidance.';
const PAD_LEARNING = 'Review lighting and composition fundamentals.';

function padMinChars(s: string, min: number, fallback: string): string {
  const t = (s ?? '').trim();
  if (t.length >= min) return t;
  return fallback.length >= min ? fallback.slice(0, Math.max(min, fallback.length)) : `${fallback} ${'…'}`.slice(0, min);
}

function padStringArray(arr: unknown, count: number, filler: string): string[] {
  const base = Array.isArray(arr) ? arr.filter((x): x is string => typeof x === 'string').map(s => s.trim()).filter(Boolean) : [];
  const out = [...base];
  while (out.length < count) {
    out.push(filler);
  }
  return out.slice(0, count);
}

function coerceBoundingBoxes(raw: unknown): BoundingBox[] | undefined {
  if (!Array.isArray(raw) || raw.length === 0) return undefined;
  const boxes: BoundingBox[] = [];
  for (const item of raw.slice(0, 1)) {
    if (!item || typeof item !== 'object') continue;
    const b = item as Record<string, unknown>;
    const type = ['composition', 'lighting', 'focus', 'exposure', 'color'].includes(String(b.type))
      ? (b.type as BoundingBox['type'])
      : 'composition';
    const severity = ['critical', 'moderate', 'minor'].includes(String(b.severity))
      ? (b.severity as BoundingBox['severity'])
      : 'moderate';
    const x = Number(b.x);
    const y = Number(b.y);
    const width = Number(b.width);
    const height = Number(b.height);
    const description = padMinChars(String(b.description ?? ''), 5, 'Issue noted here');
    const suggestion = padMinChars(String(b.suggestion ?? ''), 5, 'Adjust framing or exposure');
    if ([x, y, width, height].every(n => Number.isFinite(n))) {
      boxes.push({
        type,
        severity,
        x: Math.max(0, Math.min(100, x)),
        y: Math.max(0, Math.min(100, y)),
        width: Math.max(0, Math.min(100, width)),
        height: Math.max(0, Math.min(100, height)),
        description,
        suggestion,
      });
    }
  }
  return boxes.length ? boxes : undefined;
}

/**
 * Expand minimal cull JSON into a complete PhotoAnalysisV2-shaped object.
 * Caller must still run validateV2Schema().
 */
export function normalizeCullToPhotoAnalysisV2(
  raw: Record<string, unknown>,
  tokenUsage: PhotoAnalysisV2['tokenUsage'],
): Partial<PhotoAnalysisV2> {
  const scores = raw.scores as PhotoAnalysisV2['scores'] | undefined;
  if (!scores || typeof scores !== 'object') {
    throw new Error('Cull response missing scores');
  }

  const critiqueRaw = raw.critique as PhotoAnalysisV2['critique'] | undefined;
  const critique: PhotoAnalysisV2['critique'] = {
    composition: padMinChars(String(critiqueRaw?.composition ?? ''), 1, PAD_CRITIQUE),
    lighting: padMinChars(String(critiqueRaw?.lighting ?? ''), 1, PAD_CRITIQUE),
    technique: padMinChars(String(critiqueRaw?.technique ?? ''), 1, PAD_CRITIQUE),
    overall: padMinChars(String(critiqueRaw?.overall ?? critiqueRaw?.composition ?? ''), 1, 'Cull summary unavailable.'),
  };

  const rationaleRaw = raw.rationale as { observations?: string[] } | undefined;
  const observations = padStringArray(rationaleRaw?.observations, 3, PAD_OBSERVATION);

  const strengths = padStringArray(raw.strengths, 3, PAD_STRENGTH);
  const improvements = padStringArray(raw.improvements, 3, PAD_IMPROVEMENT);
  const learningPath = padStringArray(raw.learningPath, 3, PAD_LEARNING);

  const boundingBoxes = coerceBoundingBoxes(raw.boundingBoxes);

  return {
    schema_version: SCHEMA_VERSION,
    model_id: typeof raw.model_id === 'string' ? raw.model_id : 'gemma-4-e4b',
    scores,
    critique,
    strengths,
    improvements,
    learningPath,
    settingsEstimate: {
      focalLength: 'unknown',
      aperture: 'unknown',
      shutterSpeed: 'unknown',
      iso: 'unknown',
    },
    rationale: {
      observations,
      reasoningSteps: [
        observations[0] ?? PAD_OBSERVATION,
        observations[1] ?? PAD_OBSERVATION,
        observations[2] ?? PAD_OBSERVATION,
      ],
      priorityFixes: [
        improvements[0] ?? PAD_IMPROVEMENT,
        improvements[1] ?? PAD_IMPROVEMENT,
        improvements[2] ?? PAD_IMPROVEMENT,
      ],
    },
    boundingBoxes,
    is_refusal: Boolean(raw.is_refusal),
    tokenUsage,
  };
}
