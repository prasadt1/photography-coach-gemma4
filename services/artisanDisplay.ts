/**
 * Display helpers for Artisan journey — colour check extraction & voice scripts.
 * Does not change the model JSON schema.
 */

import { GEMMA_4_CLOUD_LABEL, GEMMA_4_E4B } from '../lib/branding';
import { isJudgeDemoBuild } from '../lib/deploymentProfile';
import type { InferenceSource } from '../config';

export type ArtisanCaptureKind = 'first' | 'compare' | 'replace';

function analysisModelLabel(source?: InferenceSource): string {
  if (source === 'local') return GEMMA_4_E4B;
  if (isJudgeDemoBuild()) return GEMMA_4_CLOUD_LABEL;
  return GEMMA_4_E4B;
}

/** Screen + voice copy while inference runs (first / 2nd photo / 3rd+ retake). */
export function getAnalysisStatusCopy(
  kind: ArtisanCaptureKind,
  source?: InferenceSource,
): {
  screenTitle: string;
  screenDetail: string;
  /** Spoken on Take Photo (user gesture) — Samantha / analysis voice. */
  voiceOnCapture: string;
  voiceAfterDelay: string;
} {
  const model = analysisModelLabel(source);
  const timingFirst =
    'This usually takes twenty to thirty seconds. The very first run may take a little longer while the model loads.';
  const timingNext = 'This usually takes twenty to thirty seconds.';

  switch (kind) {
    case 'first':
      return {
        screenTitle: `Analysing with ${model}`,
        screenDetail: `${model} is studying your photo. ${timingFirst}`,
        voiceOnCapture: `Analysing your photo with ${model}. ${timingFirst}`,
        voiceAfterDelay: `Still analysing your photo with ${model}. ${timingNext}`,
      };
    case 'compare':
      return {
        screenTitle: `Analysing with ${model}`,
        screenDetail: `Comparing both photos to find the stronger shot. ${timingNext}`,
        voiceOnCapture: `Comparing both photos with ${model}. ${timingNext}`,
        voiceAfterDelay: `Still comparing your photos with ${model}. ${timingNext}`,
      };
    case 'replace':
      return {
        screenTitle: `Analysing with ${model}`,
        screenDetail: `Analysing your new photo and comparing it to your first shot. ${timingNext}`,
        voiceOnCapture: `Analysing your new photo and comparing it to your first shot. ${timingNext}`,
        voiceAfterDelay: `Still analysing and comparing your photos. ${timingNext}`,
      };
  }
}

export interface ColourCheckSplit {
  sceneDescription: string;
  colourCheck: string | null;
}

/** Where colour/analogy detail typically starts in a subject line */
const COLOR_DETAIL_START =
  /\b(?:the\s+)?(?:primary\s+)?colou?rs?\s+(?:is|are|of)\b|\bcolou?rs?\s+like\b|\b(?:muted|warm|cool|deep|burnt|dark|light)\s+\w+\s+colou?r\b|\bsimilar\s+to\b|\breading\s+(?:as|like)\b/i;

/**
 * Split subject into product identity (What I see) vs colour confirmation (Colour check).
 * Avoids repeating the same colour copy in both blocks.
 */
export function extractColourCheckFromSubject(subject: string): ColourCheckSplit {
  const trimmed = subject.trim();
  const idx = trimmed.search(COLOR_DETAIL_START);

  if (idx < 0) {
    return { sceneDescription: trimmed, colourCheck: null };
  }

  let sceneDescription = trimmed.slice(0, idx).replace(/[,;]\s*$/, '').trim();
  const colourCheck = trimmed.slice(idx).replace(/^[,;\s]+/, '').trim();

  // If split left "What I see" too short, use first sentence only for scene
  if (sceneDescription.length < 12) {
    const firstSentence = trimmed.match(/^[^.!?]+[.!?]/)?.[0]?.trim();
    if (firstSentence && firstSentence.length >= 12 && firstSentence.length < trimmed.length) {
      sceneDescription = firstSentence.replace(/[,;]\s*$/, '').trim();
      const rest = trimmed.slice(firstSentence.length).replace(/^[,;\s]+/, '').trim();
      return {
        sceneDescription,
        colourCheck: rest.length > 0 ? rest : null,
      };
    }
    return { sceneDescription: trimmed, colourCheck: null };
  }

  return {
    sceneDescription,
    colourCheck: colourCheck.length > 0 ? colourCheck : null,
  };
}

export interface ArtisanVoiceInput {
  sceneDescription: string;
  colourCheck?: string | null;
  lighting?: string;
  framing?: string;
  primaryFix?: string;
  readyToList?: boolean;
  confidenceNote?: string;
  includeRetakePrompt?: boolean;
  /** Tap-only demo: spoken retake cue matches on-screen button label */
  tapOnlyRetakeCue?: string;
}

export function buildArtisanVoiceScript(input: ArtisanVoiceInput): string {
  const parts: string[] = ['Analysis complete.'];

  parts.push(`What I see: ${input.sceneDescription}`);

  if (input.colourCheck) {
    parts.push(`Colour check: ${input.colourCheck}`);
  }

  if (input.lighting) {
    parts.push(`Lighting: ${input.lighting}`);
  }
  if (input.framing) {
    parts.push(`Framing: ${input.framing}`);
  }

  const note = input.confidenceNote?.trim();
  if (note) {
    parts.push(`Note: ${note.startsWith('I ') ? note : `I could not judge clearly — ${note}`}`);
  }

  if (input.readyToList) {
    parts.push('This photo is ready to list.');
  } else if (input.primaryFix) {
    parts.push(`Your next step: ${input.primaryFix}`);
    if (input.tapOnlyRetakeCue) {
      parts.push(input.tapOnlyRetakeCue);
    } else if (input.includeRetakePrompt) {
      parts.push('Say yes to try again, or no to continue.');
    }
  }

  return parts.filter(Boolean).join(' ');
}
