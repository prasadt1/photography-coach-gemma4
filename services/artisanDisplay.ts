/**
 * Display helpers for Artisan journey — colour check extraction & voice scripts.
 * Does not change the model JSON schema.
 */

import { GEMMA_4_E4B } from '../lib/branding';

export type ArtisanCaptureKind = 'first' | 'compare' | 'replace';

/** Screen + delayed voice copy while Gemma 4 E4B runs (first / 2nd photo / 3rd+ retake). */
export function getAnalysisStatusCopy(kind: ArtisanCaptureKind): {
  screenTitle: string;
  screenDetail: string;
  voiceAfterDelay: string;
} {
  switch (kind) {
    case 'first':
      return {
        screenTitle: `Analysing with ${GEMMA_4_E4B}`,
        screenDetail:
          `${GEMMA_4_E4B} is studying your photo. The first run can take up to a minute while the model loads in memory.`,
        voiceAfterDelay:
          `${GEMMA_4_E4B} is analysing your photo. This can take up to a minute on the first run.`,
      };
    case 'compare':
      return {
        screenTitle: `Analysing with ${GEMMA_4_E4B}`,
        screenDetail: 'Comparing both photos to find the stronger shot...',
        voiceAfterDelay:
          `Comparing both photos with ${GEMMA_4_E4B} to find the stronger shot. This may take up to a minute.`,
      };
    case 'replace':
      return {
        screenTitle: `Analysing with ${GEMMA_4_E4B}`,
        screenDetail: 'Analysing your new photo and comparing it to your first shot...',
        voiceAfterDelay:
          'Analysing your new photo and comparing it to your first shot. This may take up to a minute.',
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
    if (input.includeRetakePrompt) {
      parts.push('Say yes to try again, or no to continue.');
    }
  }

  return parts.filter(Boolean).join(' ');
}
