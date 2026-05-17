/**
 * Judge-demo speech — WAV files for fixed copy; /api/tts for dynamic analysis (Mac Chrome).
 */

let utteranceSeq = 0;
let judgeAudio: HTMLAudioElement | null = null;
let judgeTtsAbort: AbortController | null = null;
let judgeObjectUrl: string | null = null;

export type JudgeSpeechStatus = 'idle' | 'speaking' | 'error';

let statusListener: ((status: JudgeSpeechStatus, detail?: string) => void) | null = null;

export function setJudgeSpeechStatusListener(
  fn: ((status: JudgeSpeechStatus, detail?: string) => void) | null,
): void {
  statusListener = fn;
}

function setStatus(status: JudgeSpeechStatus, detail?: string): void {
  statusListener?.(status, detail);
}

/** Stop all judge audio (WAV, TTS API, Web Speech). */
export function judgeStop(): void {
  utteranceSeq += 1;
  setStatus('idle');

  if (typeof window === 'undefined') return;

  if (judgeTtsAbort) {
    judgeTtsAbort.abort();
    judgeTtsAbort = null;
  }

  if (judgeAudio) {
    judgeAudio.pause();
    judgeAudio.currentTime = 0;
    judgeAudio.removeAttribute('src');
    judgeAudio.load();
    judgeAudio = null;
  }

  if (judgeObjectUrl) {
    URL.revokeObjectURL(judgeObjectUrl);
    judgeObjectUrl = null;
  }

  try {
    window.speechSynthesis?.cancel();
  } catch {
    /* ignore */
  }
}

export function primeJudgeSpeech(): void {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  const synth = window.speechSynthesis;
  try {
    if (synth.paused) synth.resume();
  } catch {
    /* ignore */
  }
  synth.getVoices();
}

function playAudioElement(audio: HTMLAudioElement, onEnd?: () => void): void {
  judgeAudio = audio;
  setStatus('speaking');
  audio.onended = () => {
    if (judgeObjectUrl) {
      URL.revokeObjectURL(judgeObjectUrl);
      judgeObjectUrl = null;
    }
    judgeAudio = null;
    setStatus('idle');
    onEnd?.();
  };
  audio.onerror = () => {
    console.warn('[LENS speech] audio playback error');
    setStatus('error', 'audio');
  };
  void audio.play().then(() => {
    console.info('[LENS speech] audio playing');
  }).catch((err) => {
    console.warn('[LENS speech] audio play blocked:', err);
    setStatus('error', 'audio-blocked');
  });
}

/** Bundled WAV — reliable for fixed welcome/studio scripts. */
export function judgePlayAudio(url: string, onEnd?: () => void): boolean {
  if (typeof window === 'undefined') return false;
  try {
    judgeStop();
    const audio = new Audio(url);
    audio.preload = 'auto';
    playAudioElement(audio, onEnd);
    return true;
  } catch (err) {
    console.warn('[LENS speech] audio error:', err);
    return false;
  }
}

/** Dynamic copy via server TTS (MP3) — works when Web Speech is silent on Mac Chrome. */
export async function judgeSpeakDynamic(text: string, onEnd?: () => void): Promise<void> {
  const trimmed = text?.trim();
  if (!trimmed || typeof window === 'undefined') return;

  judgeStop();
  primeJudgeSpeech();

  const seq = ++utteranceSeq;

  try {
    judgeTtsAbort = new AbortController();
    const res = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: trimmed.slice(0, 2500) }),
      signal: judgeTtsAbort.signal,
    });

    if (seq !== utteranceSeq) return;

    if (!res.ok) {
      throw new Error(`TTS HTTP ${res.status}`);
    }

    const blob = await res.blob();
    if (seq !== utteranceSeq) return;

    judgeObjectUrl = URL.createObjectURL(blob);
    const audio = new Audio(judgeObjectUrl);
    playAudioElement(audio, onEnd);
  } catch (err) {
    if (seq !== utteranceSeq) return;
    if ((err as Error).name === 'AbortError') return;
    console.warn('[LENS speech] API TTS failed, trying Web Speech:', err);
    judgeSpeak(trimmed, 1, onEnd);
  }
}

/** Web Speech fallback only. */
export function judgeSpeak(text: string, rate = 1, onEnd?: () => void): void {
  if (typeof window === 'undefined' || !text?.trim()) return;
  const synth = window.speechSynthesis;
  if (!synth) {
    setStatus('error', 'unavailable');
    return;
  }

  judgeStop();
  primeJudgeSpeech();
  const seq = ++utteranceSeq;

  const run = () => {
    if (seq !== utteranceSeq) return;
    const u = new SpeechSynthesisUtterance(text.trim());
    u.lang = 'en-US';
    u.rate = rate;
    u.volume = 1;
    u.onstart = () => {
      if (seq === utteranceSeq) setStatus('speaking');
    };
    u.onend = () => {
      if (seq === utteranceSeq) {
        setStatus('idle');
        onEnd?.();
      }
    };
    u.onerror = (e) => {
      if (seq !== utteranceSeq) return;
      if (e.error !== 'canceled' && e.error !== 'interrupted') {
        console.warn('[LENS speech] Web Speech error:', e.error);
        setStatus('error', e.error);
      }
    };
    synth.speak(u);
  };

  if (synth.getVoices().length === 0) {
    const onVoices = () => {
      synth.removeEventListener('voiceschanged', onVoices);
      run();
    };
    synth.addEventListener('voiceschanged', onVoices);
    synth.getVoices();
    window.setTimeout(run, 80);
    return;
  }

  run();
}

/** Bundled demo sample analysis audio (offline, no API). */
export function judgeDemoSampleAnalysisAudio(imagePathOrBase64: string): string | null {
  const m = imagePathOrBase64.match(/sample-([1-3])/);
  if (!m) return null;
  return `/audio/demo-sample-${m[1]}-analysis.wav`;
}
