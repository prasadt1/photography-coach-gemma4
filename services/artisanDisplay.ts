/**
 * Display helpers for Artisan journey — colour check extraction & voice scripts.
 * Does not change the model JSON schema.
 */

export interface ColourCheckSplit {
  sceneDescription: string;
  colourCheck: string | null;
}

const COLOUR_ANALOGY_RE =
  /(?:,\s*)?(?:(?:primary\s+)?colou?rs?\s+(?:is|are|of)\s+)?(.+?\b(?:similar to|like|reading (?:as|like)|close to)\s+[^.,]+)/i;

/** Pull colour analogy out of subject line when the model folded it in */
export function extractColourCheckFromSubject(subject: string): ColourCheckSplit {
  const trimmed = subject.trim();
  const match = trimmed.match(COLOUR_ANALOGY_RE);
  if (!match || match.index === undefined) {
    return { sceneDescription: trimmed, colourCheck: null };
  }

  const colourCheck = match[1].trim().replace(/^and\s+/i, '');
  const sceneDescription = trimmed.slice(0, match.index).replace(/[,;]\s*$/, '').trim();

  if (!sceneDescription || sceneDescription.length < 8) {
    return { sceneDescription: trimmed, colourCheck: colourCheck || null };
  }

  return { sceneDescription, colourCheck };
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
