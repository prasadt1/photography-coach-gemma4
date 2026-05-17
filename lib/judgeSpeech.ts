/**
 * Minimal speech for the judge demo — isolated from voiceCoach stop/cancel/queue logic.
 * Chrome breaks when speechSynthesis.cancel() runs before speak() in the same gesture.
 */

let utteranceSeq = 0;

function pickVoice(synth: SpeechSynthesis): SpeechSynthesisVoice | null {
  const voices = synth.getVoices();
  return (
    voices.find((v) => v.name.includes('Google US')) ||
    voices.find((v) => v.name.includes('Samantha')) ||
    voices.find((v) => v.lang.startsWith('en')) ||
    null
  );
}

/** Speak one phrase — call only from click/tap handlers or right after a click unlocked the session. */
export function judgeSpeak(text: string, rate = 0.95, onEnd?: () => void): void {
  if (typeof window === 'undefined' || !text?.trim()) return;
  const synth = window.speechSynthesis;
  if (!synth) return;

  const seq = ++utteranceSeq;

  try {
    if (synth.paused) synth.resume();
  } catch {
    /* ignore */
  }

  const run = () => {
    if (seq !== utteranceSeq) return;
    const u = new SpeechSynthesisUtterance(text.trim());
    u.rate = rate;
    u.volume = 1;
    const voice = pickVoice(synth);
    if (voice) u.voice = voice;
    u.onend = () => {
      if (seq === utteranceSeq) onEnd?.();
    };
    u.onerror = (e) => {
      if (seq !== utteranceSeq) return;
      if (e.error !== 'canceled' && e.error !== 'interrupted') {
        console.warn('[judgeSpeech]', e.error);
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
    return;
  }

  run();
}

/** Stop judge speech only — does not touch voiceCoach queues. */
export function judgeStop(): void {
  utteranceSeq += 1;
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
}
