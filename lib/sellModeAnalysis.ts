/**
 * Unified SellMode analysis → UI result + voice (samples, upload, cloud, local).
 */

import { extractColourCheckFromSubject, buildArtisanVoiceScript } from '../services/artisanDisplay';
import {
  parseArtisanResponseV3,
  parseSellResponse,
  speakFromUserGesture,
  speakAfterUnlock,
  type ArtisanAnalysisV3,
} from '../services/voiceCoach';
import { isJudgeDemoBuild } from './deploymentProfile';
import {
  judgeSpeakDynamic,
  judgePlayAudio,
  judgeDemoSampleAnalysisAudio,
} from './judgeSpeech';

/** User-facing message when hosted /api/analyze or Ollama Cloud is unavailable. */
export function cloudUnavailableMessage(cloudError?: string): string {
  const hint =
    'Live analysis uses gemma4:31b on Ollama Cloud (vision fallback: gemma3:4b). Local E4B (gemma4:e4b) is in the README quick start.';
  const raw = cloudError?.trim() ?? '';
  const detail = raw.replace(/^Cloud analysis failed:\s*/i, '').trim();

  if (/invalid.*api key|401/i.test(raw)) {
    return `Analysis unavailable: ${detail || 'Invalid Ollama API key'}. Set OLLAMA_API_KEY on the Vercel project and redeploy.`;
  }
  if (!detail || /FUNCTION_INVOCATION_FAILED|server error has occurred/i.test(detail)) {
    return (
      `Analysis unavailable. The /api/analyze route on this Vercel project is not running — check Deployment → Functions logs, redeploy, and set OLLAMA_API_KEY + OLLAMA_TARGET=cloud on the lens-app project. ${hint}`
    );
  }
  if (/NO_API_KEY|not configured/i.test(raw)) {
    return `Analysis unavailable: OLLAMA_API_KEY is not set on this Vercel project. Add it under lens-app-gemma4 → Settings → Environment Variables, then redeploy. ${hint}`;
  }
  if (/gemma4:31b|README quick start/i.test(detail)) {
    return `Analysis unavailable: ${detail}`;
  }
  return `Analysis unavailable: ${detail}. ${hint}`;
}

export interface SellModeResult {
  subject: string;
  framing: string;
  lighting: string;
  primaryFix: string;
  confidenceNote: string;
  altText: string;
  listingCopy: string;
  readyToList: boolean;
  imageBase64: string;
  rawResponse?: string;
  colorCheck?: string;
  tags?: string[];
}

export function sellResultFromV3(
  v3: ArtisanAnalysisV3,
  imageBase64: string,
  rawResponse: string,
): SellModeResult {
  const { sceneDescription, colourCheck } = extractColourCheckFromSubject(v3.subject);
  return {
    subject: sceneDescription || v3.subject,
    colorCheck: colourCheck ?? undefined,
    framing: v3.critique.framing,
    lighting: v3.critique.lighting,
    primaryFix: v3.critique.primary_fix,
    confidenceNote: v3.confidence_note ?? '',
    altText: v3.alt_text ?? '',
    listingCopy: v3.listing_copy ?? '',
    tags: v3.tags ?? [],
    readyToList: Boolean(v3.ready_to_list),
    imageBase64,
    rawResponse,
  };
}

/** Parse cloud/local/demo JSON into the same SellMode result shape as samples. */
export function parseAnalysisToSellResult(
  response: string,
  imageBase64: string,
): SellModeResult {
  const v3 = parseArtisanResponseV3(response);
  if (v3) {
    return sellResultFromV3(v3, imageBase64, response);
  }

  const legacy = parseSellResponse(response);
  if (legacy) {
    const rawSubject = legacy.whatISee || legacy.productType || 'Product photo';
    const { sceneDescription, colourCheck } = extractColourCheckFromSubject(rawSubject);
    return {
      subject: sceneDescription || rawSubject,
      colorCheck: colourCheck ?? undefined,
      framing: legacy.compositionTip || '',
      lighting: legacy.lighting || legacy.lightingTip || '',
      primaryFix: legacy.fix || legacy.topIssue || '',
      confidenceNote: '',
      altText: legacy.altText || '',
      listingCopy: legacy.descriptionIdea || '',
      tags: legacy.suggestedTags ?? [],
      readyToList: (legacy.score ?? 0) >= 8,
      imageBase64,
      rawResponse: response,
    };
  }

  const { sceneDescription, colourCheck } = extractColourCheckFromSubject(response.slice(0, 400));
  return {
    subject: sceneDescription || response.slice(0, 200),
    colorCheck: colourCheck ?? undefined,
    framing: '',
    lighting: '',
    primaryFix: '',
    confidenceNote: '',
    altText: '',
    listingCopy: '',
    readyToList: false,
    imageBase64,
    rawResponse: response,
  };
}

export function buildSellModeVoiceScript(result: SellModeResult): string {
  return buildArtisanVoiceScript({
    sceneDescription: result.subject,
    colourCheck: result.colorCheck,
    framing: result.framing,
    lighting: result.lighting,
    primaryFix: result.primaryFix,
    readyToList: result.readyToList,
    confidenceNote: result.confidenceNote,
  });
}

export function speakSellModeResult(result: SellModeResult, fromUserGesture = false): void {
  const script = buildSellModeVoiceScript(result);
  if (!script.trim()) return;
  if (isJudgeDemoBuild()) {
    const demoWav = judgeDemoSampleAnalysisAudio(result.imageBase64);
    if (demoWav && judgePlayAudio(demoWav)) return;
    void judgeSpeakDynamic(script);
    return;
  }
  if (fromUserGesture) {
    speakFromUserGesture(script);
  } else {
    speakAfterUnlock(script);
  }
}
