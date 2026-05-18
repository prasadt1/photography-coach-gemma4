/**
 * Natural coach TTS via /api/tts (Edge neural) — LAN dev + Vercel judge deploy.
 * Falls back to Web Speech when offline or API unavailable.
 */

/** US female coach — matches Ava (Enhanced) on iOS Live Speech. */
export const GUIDE_NEURAL_VOICE = 'en-US-AvaNeural';

let guideAbort: AbortController | null = null;
let guideObjectUrl: string | null = null;
let guideAudio: HTMLAudioElement | null = null;
let guidePlayGeneration = 0;

function cleanupGuideAudio(): void {
  if (guideAbort) {
    guideAbort.abort();
    guideAbort = null;
  }
  if (guideAudio) {
    guideAudio.pause();
    guideAudio.onended = null;
    guideAudio.onerror = null;
    guideAudio = null;
  }
  if (guideObjectUrl) {
    URL.revokeObjectURL(guideObjectUrl);
    guideObjectUrl = null;
  }
}

export function stopGuideNeural(): void {
  guidePlayGeneration += 1;
  cleanupGuideAudio();
}

/** Returns true if neural audio played. */
export async function speakGuideNeural(
  text: string,
  onEnd?: () => void,
  onStart?: () => void,
): Promise<boolean> {
  const trimmed = text?.trim();
  if (!trimmed || typeof window === 'undefined') return false;

  const generation = ++guidePlayGeneration;
  cleanupGuideAudio();

  try {
    guideAbort = new AbortController();
    const res = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: trimmed.slice(0, 2500), voice: GUIDE_NEURAL_VOICE }),
      signal: guideAbort.signal,
    });

    if (!res.ok) throw new Error(`TTS HTTP ${res.status}`);

    const blob = await res.blob();
    if (generation !== guidePlayGeneration) return false;

    guideObjectUrl = URL.createObjectURL(blob);
    const audio = new Audio(guideObjectUrl);
    guideAudio = audio;

    audio.onplay = () => {
      if (generation !== guidePlayGeneration) {
        audio.pause();
        return;
      }
      console.log('[guideNeuralTts] playing', GUIDE_NEURAL_VOICE);
      onStart?.();
    };
    audio.onended = () => {
      if (generation !== guidePlayGeneration) return;
      cleanupGuideAudio();
      onEnd?.();
    };
    audio.onerror = () => {
      if (generation !== guidePlayGeneration) return;
      cleanupGuideAudio();
      onEnd?.();
    };

    await audio.play();
    if (generation !== guidePlayGeneration) return false;
    return true;
  } catch (err) {
    if ((err as Error).name !== 'AbortError') {
      console.warn('[guideNeuralTts] neural TTS failed, will use Web Speech:', err);
    }
    cleanupGuideAudio();
    return false;
  }
}
