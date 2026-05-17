/**
 * Judge-demo speech — WAV files for fixed copy; /api/tts for dynamic analysis (Mac Chrome).
 */

let playbackGeneration = 0;
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

function isPlaybackActive(playId: number): boolean {
  return playId === playbackGeneration;
}

function detachAudioElement(audio: HTMLAudioElement): void {
  audio.onended = null;
  audio.onerror = null;
  audio.onpause = null;
  try {
    audio.pause();
    audio.currentTime = 0;
    audio.removeAttribute('src');
    audio.load();
  } catch {
    /* ignore */
  }
}

/** Stop all judge audio (WAV, TTS API, Web Speech). */
export function judgeStop(): void {
  playbackGeneration += 1;
  setStatus('idle');

  if (typeof window === 'undefined') return;

  if (judgeTtsAbort) {
    judgeTtsAbort.abort();
    judgeTtsAbort = null;
  }

  if (judgeAudio) {
    detachAudioElement(judgeAudio);
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

function playAudioElement(audio: HTMLAudioElement, playId: number, onEnd?: () => void): void {
  if (!isPlaybackActive(playId)) {
    detachAudioElement(audio);
    return;
  }

  judgeAudio = audio;
  setStatus('speaking');

  audio.onended = () => {
    if (!isPlaybackActive(playId)) return;
    if (judgeObjectUrl) {
      URL.revokeObjectURL(judgeObjectUrl);
      judgeObjectUrl = null;
    }
    if (judgeAudio === audio) judgeAudio = null;
    setStatus('idle');
    onEnd?.();
  };

  audio.onerror = () => {
    if (!isPlaybackActive(playId)) return;
    console.warn('[LENS speech] audio playback error');
    setStatus('error', 'audio');
  };

  void audio.play().then(() => {
    if (!isPlaybackActive(playId)) {
      detachAudioElement(audio);
      if (judgeAudio === audio) judgeAudio = null;
      return;
    }
    console.info('[LENS speech] audio playing');
  }).catch((err) => {
    if (!isPlaybackActive(playId)) return;
    console.warn('[LENS speech] audio play blocked:', err);
    setStatus('error', 'audio-blocked');
  });
}

/** Bundled WAV — reliable for fixed welcome/studio scripts. */
export function judgePlayAudio(url: string, onEnd?: () => void): boolean {
  if (typeof window === 'undefined') return false;
  try {
    judgeStop();
    const playId = playbackGeneration;
    const audio = new Audio(url);
    audio.preload = 'auto';
    playAudioElement(audio, playId, onEnd);
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

  const playId = playbackGeneration;

  try {
    judgeTtsAbort = new AbortController();
    const res = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: trimmed.slice(0, 2500) }),
      signal: judgeTtsAbort.signal,
    });

    if (!isPlaybackActive(playId)) return;

    if (!res.ok) {
      throw new Error(`TTS HTTP ${res.status}`);
    }

    const blob = await res.blob();
    if (!isPlaybackActive(playId)) return;

    judgeObjectUrl = URL.createObjectURL(blob);
    const audio = new Audio(judgeObjectUrl);
    playAudioElement(audio, playId, onEnd);
  } catch (err) {
    if (!isPlaybackActive(playId)) return;
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
  const playId = playbackGeneration;

  const run = () => {
    if (!isPlaybackActive(playId)) return;
    const u = new SpeechSynthesisUtterance(text.trim());
    u.lang = 'en-US';
    u.rate = rate;
    u.volume = 1;
    u.onstart = () => {
      if (isPlaybackActive(playId)) setStatus('speaking');
    };
    u.onend = () => {
      if (isPlaybackActive(playId)) {
        setStatus('idle');
        onEnd?.();
      }
    };
    u.onerror = (e) => {
      if (!isPlaybackActive(playId)) return;
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
