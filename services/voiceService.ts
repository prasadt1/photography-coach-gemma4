/**
 * voiceService.ts — Browser-native voice via Web Speech API.
 *
 * Speak the critique (TTS) and dictate questions to the mentor (STT).
 * Zero extra dependencies — uses the platform's built-in speech engines.
 * Works in Chrome/Edge/Safari. No model downloads, no network calls.
 */

// ─── Capability detection ─────────────────────────────────────────────────────

export function isTTSAvailable(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

export function isSTTAvailable(): boolean {
  return typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);
}

// ─── Text-to-Speech ──────────────────────────────────────────────────────────


export interface SpeakOptions {
  rate?: number;     // 0.1 to 10, default 1
  pitch?: number;    // 0 to 2, default 1
  volume?: number;   // 0 to 1, default 1
  lang?: string;     // e.g. "en-US"
  onEnd?: () => void;
  onStart?: () => void;
  onError?: (err: SpeechSynthesisErrorEvent) => void;
}

/**
 * Speak the given text aloud using the browser's default TTS engine.
 * Cancels any in-progress speech before starting.
 */
export function speak(text: string, opts: SpeakOptions = {}): void {
  if (!isTTSAvailable()) return;
  cancelSpeech();
  const utt = new SpeechSynthesisUtterance(text);
  utt.rate = opts.rate ?? 1;
  utt.pitch = opts.pitch ?? 1;
  utt.volume = opts.volume ?? 1;
  utt.lang = opts.lang ?? 'en-US';
  if (opts.onEnd) utt.onend = opts.onEnd;
  if (opts.onStart) utt.onstart = opts.onStart;
  if (opts.onError) utt.onerror = opts.onError;
  window.speechSynthesis.speak(utt);
}

export function cancelSpeech(): void {
  if (!isTTSAvailable()) return;
  window.speechSynthesis.cancel();
}

export function isSpeaking(): boolean {
  return isTTSAvailable() && window.speechSynthesis.speaking;
}

// ─── Speech-to-Text ──────────────────────────────────────────────────────────

type SpeechRecognitionConstructor = new () => SpeechRecognition;

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: any) => void) | null;
  onerror: ((event: any) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}

function getSpeechRecognition(): SpeechRecognitionConstructor | null {
  if (typeof window === 'undefined') return null;
  // @ts-expect-error - vendor-prefixed
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

export interface ListenOptions {
  lang?: string;
  onResult?: (text: string, isFinal: boolean) => void;
  onError?: (err: string) => void;
  onEnd?: () => void;
  onStart?: () => void;
}

/**
 * Start listening for speech. Returns a stop() function.
 * Single-shot recognition — stops after one utterance or call to stop().
 */
export function listen(opts: ListenOptions = {}): (() => void) | null {
  const SR = getSpeechRecognition();
  if (!SR) {
    opts.onError?.('Speech recognition not supported in this browser');
    return null;
  }

  const recognition = new SR();
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.lang = opts.lang ?? 'en-US';

  recognition.onstart = () => opts.onStart?.();
  recognition.onend = () => opts.onEnd?.();
  recognition.onerror = (e: any) => opts.onError?.(e.error || 'Speech recognition error');
  recognition.onresult = (e: any) => {
    let transcript = '';
    let isFinal = false;
    for (let i = e.resultIndex; i < e.results.length; i++) {
      transcript += e.results[i][0].transcript;
      if (e.results[i].isFinal) isFinal = true;
    }
    opts.onResult?.(transcript.trim(), isFinal);
  };

  try {
    recognition.start();
  } catch (err) {
    opts.onError?.((err as Error).message);
    return null;
  }

  return () => {
    try { recognition.stop(); } catch {}
  };
}
