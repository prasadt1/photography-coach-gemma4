/**
 * Judge-demo speech — minimal Web Speech API, isolated from voiceCoach.
 * Chrome/macOS: use pointerdown+click primer, en-US, system default voice (no .voice assign).
 */

let utteranceSeq = 0;
let voicesPrimed = false;

/** Call on first pointerdown anywhere (App mounts this for judge builds). */
export function primeJudgeSpeech(): void {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  voicesPrimed = true;
  const synth = window.speechSynthesis;
  try {
    if (synth.paused) synth.resume();
  } catch {
    /* ignore */
  }
  synth.getVoices();
}

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

/** Speak one phrase — invoke from click/pointerdown handler. */
export function judgeSpeak(text: string, rate = 1, onEnd?: () => void): void {
  if (typeof window === 'undefined' || !text?.trim()) return;
  const synth = window.speechSynthesis;
  if (!synth) {
    console.warn('[LENS speech] Web Speech API not available');
    setStatus('error', 'unavailable');
    return;
  }

  primeJudgeSpeech();
  const seq = ++utteranceSeq;

  const run = () => {
    if (seq !== utteranceSeq) return;

    const u = new SpeechSynthesisUtterance(text.trim());
    u.lang = 'en-US';
    u.rate = rate;
    u.volume = 1;
    u.pitch = 1;

    u.onstart = () => {
      if (seq !== utteranceSeq) return;
      console.info('[LENS speech] started');
      setStatus('speaking');
    };
    u.onend = () => {
      if (seq !== utteranceSeq) return;
      console.info('[LENS speech] ended');
      setStatus('idle');
      onEnd?.();
    };
    u.onerror = (e) => {
      if (seq !== utteranceSeq) return;
      if (e.error === 'canceled' || e.error === 'interrupted') {
        setStatus('idle');
        return;
      }
      console.warn('[LENS speech] error:', e.error);
      setStatus('error', e.error);
    };

    try {
      if (synth.paused) synth.resume();
    } catch {
      /* ignore */
    }

    synth.speak(u);

    // Chrome sometimes queues but never starts — nudge once after a short delay.
    window.setTimeout(() => {
      if (seq !== utteranceSeq) return;
      if (!synth.speaking && !synth.pending) {
        console.info('[LENS speech] retry (Chrome nudge)');
        try {
          synth.resume();
          synth.speak(u);
        } catch {
          /* ignore */
        }
      }
    }, 250);
  };

  if (!voicesPrimed || synth.getVoices().length === 0) {
    voicesPrimed = true;
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

export function judgeStop(): void {
  utteranceSeq += 1;
  setStatus('idle');
  if (typeof window === 'undefined') return;
  judgeAudio?.pause();
  if (window.speechSynthesis) window.speechSynthesis.cancel();
}

let judgeAudio: HTMLAudioElement | null = null;

/**
 * Play a bundled WAV/AIFF — reliable when Web Speech is silent (common on Chrome/macOS).
 * Returns true if playback started.
 */
export function judgePlayAudio(url: string, onEnd?: () => void): boolean {
  if (typeof window === 'undefined') return false;
  try {
    judgeStop();
    const audio = new Audio(url);
    judgeAudio = audio;
    audio.preload = 'auto';
    setStatus('speaking');
    audio.onended = () => {
      setStatus('idle');
      onEnd?.();
    };
    audio.onerror = () => {
      console.warn('[LENS speech] audio file failed:', url);
      setStatus('error', 'audio');
    };
    void audio.play().then(() => {
      console.info('[LENS speech] audio playing:', url);
    }).catch((err) => {
      console.warn('[LENS speech] audio play blocked:', err);
      setStatus('error', 'audio-blocked');
    });
    return true;
  } catch (err) {
    console.warn('[LENS speech] audio error:', err);
    return false;
  }
}
