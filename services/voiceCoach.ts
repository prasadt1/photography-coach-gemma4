/**
 * voiceCoach.ts — Audio output and voice input for Voice Mode
 *
 * WHY LOCAL GEMMA 4 (NOT CLOUD APIs)?
 * - Blind users need sub-second feedback. Cloud = 2-3 sec latency.
 * - Photography happens offline (subway, forest, concerts).
 * - Zero API costs = sustainable accessibility tool.
 * - Privacy: creative work shouldn't require cloud upload.
 */

// ─── Web Speech API type declarations (browser APIs not fully typed by TS) ────

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognition;
}

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

// ─── Audio Output (Text-to-Speech) ─────────────────────────────────────────────

let lastSpokenText = '';
let storedDetails = '';
let isCancelled = false;
let pendingTimeout: ReturnType<typeof setTimeout> | null = null;

// Resume state for pause/resume functionality
let pausedSentences: string[] = [];
let pausedIndex = 0;
let speechCompleted = false;

// Lock to prevent multiple simultaneous speech sessions
let isCurrentlySpeaking = false;

// ─── Speech Recognition (Voice Commands) ──────────────────────────────────────

let recognition: SpeechRecognition | null = null;
let isListening = false;
let recognitionCallback: ((command: string) => void) | null = null;
let lastCommandTime = 0;
const COMMAND_DEBOUNCE_MS = 2000; // Wait 2 seconds between commands

/**
 * Speak text using Web Speech API
 *
 * Chrome bug workaround: Split text into sentences and speak them sequentially
 * to avoid truncation at periods.
 */
export function isSpeaking(): boolean {
  return isCurrentlySpeaking;
}

/** Load voices early (Chrome needs this before first speak). */
export function primeSpeechVoices(): void {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  const load = () => {
    speechSynthesis.getVoices();
  };
  load();
  speechSynthesis.addEventListener('voiceschanged', load);
}

export function speak(
  text: string,
  rate = 0.95,
  onEnd?: () => void,
  onStart?: () => void,
): void {
  console.log('[voiceCoach] speak() called with:', text.slice(0, 50) + '...');

  // Cancel any existing speech first to prevent overlapping
  if (isCurrentlySpeaking) {
    console.log('[voiceCoach] Cancelling existing speech before starting new');
    speechSynthesis.cancel();
  }
  if (pendingTimeout) {
    clearTimeout(pendingTimeout);
    pendingTimeout = null;
  }

  // Reset state for new speech
  isCancelled = false;
  speechCompleted = false;
  isCurrentlySpeaking = true;

  lastSpokenText = text;

  // Get voices first
  const voices = speechSynthesis.getVoices();

  // If voices aren't loaded yet, wait for them
  if (voices.length === 0) {
    console.log('[voiceCoach] Voices not loaded, waiting...');
    isCurrentlySpeaking = false;
    const onVoices = () => {
      speechSynthesis.removeEventListener('voiceschanged', onVoices);
      if (!isCancelled) {
        speak(text, rate, onEnd, onStart);
      }
    };
    speechSynthesis.addEventListener('voiceschanged', onVoices);
    return;
  }

  const preferredVoice = voices.find(v =>
    v.name.includes('Samantha') ||  // macOS
    v.name.includes('Google US') || // Chrome
    v.name.includes('Microsoft Zira') || // Windows
    (v.lang.startsWith('en') && v.localService)
  ) || voices.find(v => v.lang.startsWith('en'));

  console.log('[voiceCoach] Using voice:', preferredVoice?.name || 'default');

  // Split text into sentences to work around Chrome truncation bug
  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .filter(s => s.trim().length > 0);
  const toSpeak = sentences.length > 0 ? sentences : [text.trim()].filter(Boolean);
  if (toSpeak.length === 0) {
    isCurrentlySpeaking = false;
    return;
  }

  // Store for resume functionality
  pausedSentences = toSpeak;
  pausedIndex = 0;

  console.log('[voiceCoach] Split into', toSpeak.length, 'sentences');

  speakFromIndex(toSpeak, 0, rate, preferredVoice, onEnd, onStart);
}

// Internal function to speak from a specific index
function speakFromIndex(
  sentences: string[],
  startIndex: number,
  rate: number,
  preferredVoice: SpeechSynthesisVoice | null | undefined,
  onEnd?: () => void,
  onStart?: () => void,
): void {
  let currentIndex = startIndex;
  let didFireStart = false;

  const speakNextSentence = () => {
    // Check if cancelled before speaking next sentence
    if (isCancelled) {
      console.log('[voiceCoach] Speech paused at sentence', currentIndex + 1);
      pausedIndex = currentIndex; // Save position for resume
      isCurrentlySpeaking = false;
      return;
    }

    if (currentIndex >= sentences.length) {
      console.log('[voiceCoach] All sentences spoken');
      speechCompleted = true;
      isCurrentlySpeaking = false;
      pausedSentences = [];
      pausedIndex = 0;
      if (onEnd) onEnd();
      return;
    }

    const sentence = sentences[currentIndex];
    console.log(`[voiceCoach] Speaking sentence ${currentIndex + 1}/${sentences.length}:`, sentence);

    const utterance = new SpeechSynthesisUtterance(sentence);
    utterance.rate = rate;
    utterance.pitch = 1;
    utterance.volume = 1;

    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    utterance.onstart = () => {
      if (!didFireStart) {
        didFireStart = true;
        onStart?.();
      }
    };

    utterance.onend = () => {
      if (isCancelled) {
        pausedIndex = currentIndex + 1; // Save next position
        return;
      }
      console.log(`[voiceCoach] Sentence ${currentIndex + 1} completed`);
      currentIndex++;
      pausedIndex = currentIndex; // Track progress
      // Small delay between sentences for natural flow
      pendingTimeout = setTimeout(speakNextSentence, 100);
    };

    utterance.onerror = (e: SpeechSynthesisErrorEvent) => {
      if (isCancelled) {
        pausedIndex = currentIndex + 1;
        return;
      }
      console.error('[voiceCoach] Speech error:', e.error, e);
      if (currentIndex === 0 && e.error === 'not-allowed') {
        isCurrentlySpeaking = false;
        return;
      }
      currentIndex++;
      pausedIndex = currentIndex;
      pendingTimeout = setTimeout(speakNextSentence, 100);
    };

    speechSynthesis.speak(utterance);
  };

  speakNextSentence();
}

/**
 * Resume speech from where it was paused
 * Returns true if there was something to resume, false otherwise
 */
export function resumeSpeech(rate = 0.95): boolean {
  if (pausedSentences.length === 0 || pausedIndex >= pausedSentences.length) {
    console.log('[voiceCoach] Nothing to resume, speech was completed');
    return false;
  }

  // Prevent double-resume
  if (isCurrentlySpeaking) {
    console.log('[voiceCoach] Already speaking, ignoring resume');
    return false;
  }

  console.log('[voiceCoach] Resuming from sentence', pausedIndex + 1, 'of', pausedSentences.length);

  isCancelled = false;
  isCurrentlySpeaking = true;
  if (pendingTimeout) {
    clearTimeout(pendingTimeout);
    pendingTimeout = null;
  }

  const voices = speechSynthesis.getVoices();
  const preferredVoice = voices.find(v =>
    v.name.includes('Samantha') ||
    v.name.includes('Google US') ||
    v.name.includes('Microsoft Zira') ||
    (v.lang.startsWith('en') && v.localService)
  ) || voices.find(v => v.lang.startsWith('en'));

  speakFromIndex(pausedSentences, pausedIndex, rate, preferredVoice);
  return true;
}

/**
 * Check if speech was completed (vs paused mid-way)
 */
export function isSpeechCompleted(): boolean {
  return speechCompleted;
}

// ─── Speech Recognition Functions ─────────────────────────────────────────────

/** iPhone/iPad Safari — continuous recognition is unreliable; we restart on `onend`. */
export function isIosLikeDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  return (
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

/**
 * Start listening for voice commands
 * @param onCommand - Callback when a command is recognized
 * @param continuous - Whether to keep listening after each command
 */
export function startListening(
  onCommand: (command: string) => void,
  continuous = true
): boolean {
  if (typeof window === 'undefined') {
    console.warn('[voiceCoach] Speech recognition not available (SSR)');
    return false;
  }

  const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognitionAPI) {
    console.warn('[voiceCoach] Speech recognition not supported in this browser');
    return false;
  }

  try {
    stopSpeaking();
    const keepListening = continuous;
    const useContinuous = continuous && !isIosLikeDevice();

    recognition = new SpeechRecognitionAPI();
    recognition.continuous = useContinuous;
    recognition.interimResults = false;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;

    recognitionCallback = onCommand;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const last = event.results.length - 1;
      const transcript = event.results[last][0].transcript.toLowerCase().trim();

      console.log('[voiceCoach] Recognized:', transcript);

      // Debounce: ignore commands that come too quickly
      const now = Date.now();
      if (now - lastCommandTime < COMMAND_DEBOUNCE_MS) {
        console.log('[voiceCoach] Ignoring command (too soon after last command)');
        return;
      }
      lastCommandTime = now;

      if (recognitionCallback) {
        recognitionCallback(transcript);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('[voiceCoach] Recognition error:', event.error, event.message);

      // Auto-restart on certain errors
      if (event.error === 'no-speech' || event.error === 'audio-capture') {
        console.log('[voiceCoach] Restarting recognition after error');
        setTimeout(() => {
          if (recognition && isListening) {
            try {
              recognition.start();
            } catch (e) {
              console.warn('[voiceCoach] Could not restart recognition:', e);
            }
          }
        }, 1000);
      }
    };

    recognition.onend = () => {
      console.log('[voiceCoach] Recognition ended');

      // Auto-restart (iOS needs manual restart even when continuous=false)
      if (keepListening && isListening) {
        console.log('[voiceCoach] Restarting recognition');
        setTimeout(() => {
          if (recognition && isListening) {
            try {
              recognition.start();
            } catch (e) {
              console.warn('[voiceCoach] Could not restart recognition:', e);
            }
          }
        }, isIosLikeDevice() ? 200 : 500);
      } else {
        isListening = false;
      }
    };

    recognition.start();
    isListening = true;
    console.log('[voiceCoach] Speech recognition started');
    return true;
  } catch (err) {
    console.error('[voiceCoach] Failed to start recognition:', err);
    return false;
  }
}

/**
 * Stop listening for voice commands
 */
export function stopListening(): void {
  if (recognition) {
    isListening = false;
    try {
      recognition.stop();
      console.log('[voiceCoach] Speech recognition stopped');
    } catch (e) {
      console.warn('[voiceCoach] Error stopping recognition:', e);
    }
    recognition = null;
    recognitionCallback = null;
  }
}

/**
 * Check if currently listening for voice commands
 */
export function isCurrentlyListening(): boolean {
  return isListening;
}

/**
 * Parse a voice command and return the intent
 * Maps various phrasings to standard commands
 */
export function parseVoiceCommand(transcript: string): string | null {
  const lower = transcript.toLowerCase().trim().replace(/[.,!?]/g, '');

  console.log('[voiceCoach] Parsing transcript:', transcript, '-> cleaned:', lower);

  // Affirmative - more lenient, check if it contains the word
  if (/(^|\s)(yes|yeah|yep|sure|ok|okay|correct|right|yup)(\s|$)/i.test(lower)) {
    return 'yes';
  }

  // Negative
  if (/(^|\s)(no|nope|nah)(\s|$)/i.test(lower)) {
    return 'no';
  }

  // Take photo / capture - more lenient
  if (/(take|capture|snap|shoot|open).*(photo|picture|pic|shot|camera)/i.test(lower) ||
      /(photo|picture|capture|snap|camera)/i.test(lower)) {
    return 'take-photo';
  }

  // Retry / retake
  if (/(retry|retake|try again|take another|redo)/i.test(lower)) {
    return 'retry';
  }

  // Copy
  if (/(copy|clipboard)/i.test(lower)) {
    return 'copy';
  }

  // Read tags
  if (/(read|hear).*(tag|hashtag)/i.test(lower)) {
    return 'read-tags';
  }

  // Generate listing
  if (/(generate|create|make).*(listing|description)/i.test(lower)) {
    return 'generate-listing';
  }

  // List another / start over
  if (/(list another|start over|new|begin)/i.test(lower)) {
    return 'start-over';
  }

  // Happy with this / continue
  if (/(happy|satisfied|good|continue|proceed|next)/i.test(lower)) {
    return 'continue';
  }

  console.log('[voiceCoach] Unrecognized command:', lower);
  return null;
}

/**
 * Check if there's paused speech that can be resumed
 */
export function hasPausedSpeech(): boolean {
  return pausedSentences.length > 0 && pausedIndex < pausedSentences.length;
}

/**
 * Clear paused speech state (call on navigation)
 */
export function clearPausedSpeech(): void {
  pausedSentences = [];
  pausedIndex = 0;
  speechCompleted = false;
}

/**
 * Play a short beep sound to confirm photo capture
 */
export function playBeep(): Promise<void> {
  return new Promise((resolve) => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 800; // Hz
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.15);

    setTimeout(resolve, 150);
  });
}

/**
 * Pyramid audio structure:
 * 1. Beep (confirms capture)
 * 2. Gist (quick summary)
 * 3. Details (stored for "more" command)
 */
export async function speakPyramid(gist: string, details?: string): Promise<void> {
  console.log('[voiceCoach] speakPyramid() called');
  console.log('[voiceCoach] Gist:', gist);

  // Store details for later "more" command
  if (details) {
    storedDetails = details;
  }

  // Play beep then speak (beep is very short so shouldn't conflict)
  try {
    await playBeep();
    console.log('[voiceCoach] Beep played');
  } catch (e) {
    console.error('[voiceCoach] Beep failed:', e);
  }

  // Speak gist immediately after beep
  console.log('[voiceCoach] Speaking gist now...');
  speak(gist);
}

/**
 * Repeat last spoken text
 */
export function repeatLast(): void {
  if (lastSpokenText) {
    speak(lastSpokenText);
  } else {
    speak('Nothing to repeat yet. Take a photo first.');
  }
}

/**
 * Speak stored details (for "more" command)
 */
export function speakMore(): void {
  if (storedDetails) {
    speak(storedDetails);
  } else {
    speak('No additional details available.');
  }
}

/**
 * Stop speaking - cancels current speech and prevents queued sentences
 */
let speakQueueTimer: ReturnType<typeof setTimeout> | null = null;

/** Set when the user has gestured; helps post-async speak on Chrome. */
let speechSessionUnlocked = false;

function prepareSpeechSynthesis(): SpeechSynthesis | null {
  if (typeof window === 'undefined' || !window.speechSynthesis) return null;
  const synth = window.speechSynthesis;
  try {
    if (synth.paused) synth.resume();
  } catch {
    /* ignore */
  }
  primeSpeechVoices();
  synth.getVoices();
  return synth;
}

/** Call synchronously inside click/tap handlers so later speak() is not blocked. */
export function unlockSpeechForSession(): void {
  if (!prepareSpeechSynthesis()) return;
  speechSessionUnlocked = true;
}

export function isSpeechSessionUnlocked(): boolean {
  return speechSessionUnlocked;
}

/**
 * Single-utterance speak — reliable on Chrome when triggered from a user gesture.
 * Do NOT call speechSynthesis.cancel() before speak (Chrome drops audio silently).
 */
export function speakNow(
  text: string,
  rate = 0.95,
  onEnd?: () => void,
  onStart?: () => void,
): void {
  if (!text?.trim()) return;
  const synth = prepareSpeechSynthesis();
  if (!synth) return;

  speechSessionUnlocked = true;
  if (speakQueueTimer) {
    clearTimeout(speakQueueTimer);
    speakQueueTimer = null;
  }
  if (pendingTimeout) {
    clearTimeout(pendingTimeout);
    pendingTimeout = null;
  }
  isCancelled = false;
  pausedSentences = [];
  pausedIndex = 0;

  const run = () => {
    const voices = synth.getVoices();
    const preferredVoice =
      voices.find((v) => v.name.includes('Samantha')) ||
      voices.find((v) => v.name.includes('Google US')) ||
      voices.find((v) => v.name.includes('Microsoft Zira')) ||
      voices.find((v) => v.lang.startsWith('en') && v.localService) ||
      voices.find((v) => v.lang.startsWith('en'));

    lastSpokenText = text;
    isCurrentlySpeaking = true;
    speechCompleted = false;

    const utterance = new SpeechSynthesisUtterance(text.trim());
    utterance.rate = rate;
    utterance.volume = 1;
    if (preferredVoice) utterance.voice = preferredVoice;

    utterance.onstart = () => {
      console.log('[voiceCoach] speakNow started');
      onStart?.();
    };
    utterance.onend = () => {
      console.log('[voiceCoach] speakNow ended');
      isCurrentlySpeaking = false;
      speechCompleted = true;
      onEnd?.();
    };
    utterance.onerror = (e: SpeechSynthesisErrorEvent) => {
      isCurrentlySpeaking = false;
      if (e.error === 'canceled' || e.error === 'interrupted') return;
      console.warn('[voiceCoach] speakNow error:', e.error);
      onEnd?.();
    };

    synth.speak(utterance);
  };

  if (synth.getVoices().length === 0) {
    isCurrentlySpeaking = false;
    const onVoices = () => {
      synth.removeEventListener('voiceschanged', onVoices);
      if (!isCancelled) run();
    };
    synth.addEventListener('voiceschanged', onVoices);
    return;
  }

  run();
}

/** Speak in the same turn as a user gesture (Chrome requires this). */
export function speakFromUserGesture(
  text: string,
  rate = 0.95,
  onEnd?: () => void,
  onStart?: () => void,
): void {
  speakNow(text, rate, onEnd, onStart);
}

/** After async work when the session was unlocked by an earlier gesture. */
export function speakAfterUnlock(
  text: string,
  rate = 0.95,
  onEnd?: () => void,
  onStart?: () => void,
): void {
  if (!text?.trim()) return;
  if (speechSessionUnlocked) {
    speakNow(text, rate, onEnd, onStart);
    return;
  }
  speakQueued(text, 180, rate, onEnd, onStart);
}

export function stopSpeaking(): void {
  isCancelled = true;
  isCurrentlySpeaking = false;
  if (pendingTimeout) {
    clearTimeout(pendingTimeout);
    pendingTimeout = null;
  }
  if (speakQueueTimer) {
    clearTimeout(speakQueueTimer);
    speakQueueTimer = null;
  }
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}

/** Stop speech and clear resume queue — use on navigation or mode changes */
export function hardStopVoice(): void {
  stopSpeaking();
  clearPausedSpeech();
  lastSpokenText = '';
}

/**
 * Schedule speech after a short delay so Chrome recovers from speechSynthesis.cancel().
 * Use this after hardStopVoice or navigation — do not call speak() immediately after cancel.
 */
export function speakQueued(text: string, delayMs = 180, rate = 0.95, onEnd?: () => void, onStart?: () => void): void {
  if (!text?.trim()) return;
  if (speakQueueTimer) {
    clearTimeout(speakQueueTimer);
    speakQueueTimer = null;
  }
  primeSpeechVoices();
  speakQueueTimer = setTimeout(() => {
    speakQueueTimer = null;
    isCancelled = false;
    speak(text, rate, onEnd, onStart);
  }, delayMs);
}

// ─── Voice Input (Speech Recognition) ──────────────────────────────────────────

/**
 * Check if speech recognition is supported
 */
export function isSpeechRecognitionSupported(): boolean {
  return 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
}

/**
 * Speak help text for voice commands
 */
export function speakHelp(): void {
  speak('You can say: take photo, repeat, more details, or stop speaking.');
}

// ─── Utility: Parse Gemma response for Voice Mode ──────────────────────────────

/**
 * Artisan Studio JSON response (v3 schema)
 * Matches the JSON output from ARTISAN_ACCESSIBILITY_SYSTEM_PROMPT
 */
export interface ArtisanAnalysisV3 {
  subject: string;
  critique: {
    framing: string;
    lighting: string;
    primary_fix: string;
  };
  // Structured ratings for deterministic comparison (1-10 scale)
  ratings: {
    lighting: number;      // 1-10: quality of lighting
    framing: number;       // 1-10: composition/framing quality
    background: number;    // 1-10: background cleanliness
    focus: number;         // 1-10: subject sharpness
  };
  primary_issue: string;   // Single identified issue ("uneven lighting", "cluttered background", etc.)
  confidence_note: string;
  alt_text: string;
  listing_copy: string;
  ready_to_list: boolean;
  tags?: string[];  // Optional tags for marketplace listing
}

/**
 * Parse the v3 Artisan Studio JSON response
 * Falls back gracefully if JSON parsing fails
 */
export function parseArtisanResponseV3(response: string): ArtisanAnalysisV3 | null {
  try {
    // Strip any markdown code fences if present
    let cleaned = response.trim();
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.slice(7);
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.slice(3);
    }
    if (cleaned.endsWith('```')) {
      cleaned = cleaned.slice(0, -3);
    }
    cleaned = cleaned.trim();

    const parsed = JSON.parse(cleaned) as Partial<ArtisanAnalysisV3>;

    if (!parsed.subject || !parsed.critique) {
      console.warn('[parseArtisanResponseV3] Missing subject or critique');
      return null;
    }

    return {
      subject: parsed.subject,
      critique: {
        framing: parsed.critique.framing ?? '',
        lighting: parsed.critique.lighting ?? '',
        primary_fix: parsed.critique.primary_fix ?? '',
      },
      ratings: parsed.ratings ?? {
        lighting: 0,
        framing: 0,
        background: 0,
        focus: 0,
      },
      primary_issue: parsed.primary_issue ?? '',
      confidence_note: parsed.confidence_note ?? '',
      alt_text: parsed.alt_text ?? '',
      listing_copy: parsed.listing_copy ?? '',
      tags: Array.isArray(parsed.tags) ? parsed.tags : [],
      ready_to_list: Boolean(parsed.ready_to_list),
    };
  } catch (err) {
    console.warn('[parseArtisanResponseV3] JSON parse failed:', err);
    return null;
  }
}

/**
 * Parse the Voice Coach response and extract key parts
 */
export function parseVoiceResponse(response: string): { gist: string; details: string } {
  // Voice mode returns plain text, so we just split by sentence
  const sentences = response.split(/[.!?]+/).filter(s => s.trim().length > 0);

  if (sentences.length === 0) {
    return { gist: 'Unable to analyze photo.', details: '' };
  }

  // First sentence is the gist
  const gist = sentences[0].trim() + '.';

  // Rest is details
  const details = sentences.slice(1).join('. ').trim();

  return { gist, details: details ? details + '.' : '' };
}

/**
 * Parse Quest mode response
 */
export function parseQuestResponse(response: string): {
  reasoning: string;
  verdict: 'PASS' | 'FAIL' | null;
  tip: string;
} {
  const reasoningMatch = response.match(/\[REASONING\]:\s*(.+?)(?=\[VERDICT\]|$)/is);
  const verdictMatch = response.match(/\[VERDICT\]:\s*(PASS|FAIL)/i);
  const tipMatch = response.match(/\[TIP\]:\s*(.+?)$/is);

  return {
    reasoning: reasoningMatch?.[1]?.trim() || '',
    verdict: verdictMatch?.[1]?.toUpperCase() as 'PASS' | 'FAIL' | null,
    tip: tipMatch?.[1]?.trim() || '',
  };
}

/**
 * Parse Sell/Artisan mode response with robust fallbacks
 * Handles both standard format and accessibility format
 */
export function parseSellResponse(response: string): {
  score: number;
  verdict: string;
  productType: string;
  material: string;
  background: string;
  lighting: string;
  productFocus: string;
  compositionTip: string;
  lightingTip: string;
  scaleSuggestion: string;
  stylingIdea: string;
  topIssue: string;
  fix: string;
  descriptionIdea: string;
  altText: string;
  suggestedTags: string[];
  // Accessibility mode fields (optional)
  whatISee?: string;
  colorCheck?: string;
  nextAction?: string;
} {
  console.log('[parseSellResponse] Parsing response of length:', response.length);

  // Helper to extract value with multiple pattern attempts
  const extract = (patterns: RegExp[], fallback: string, fieldName?: string): string => {
    for (const pattern of patterns) {
      const match = response.match(pattern);
      if (match?.[1]?.trim()) {
        const value = match[1].trim().replace(/^["']|["']$/g, '');
        if (fieldName) console.log(`[parseSellResponse] ${fieldName}:`, value);
        return value;
      }
    }
    if (fieldName) console.log(`[parseSellResponse] ${fieldName}: FALLBACK to "${fallback}"`);
    return fallback;
  };

  // Score patterns
  const scorePatterns = [
    /\[LISTING_SCORE\]:\s*(\d+)/i,
    /LISTING_SCORE:\s*(\d+)/i,
    /Score:\s*(\d+)/i,
    /(\d+)\/10/,
  ];

  // Verdict patterns
  const verdictPatterns = [
    /\[VERDICT\]:\s*"?([^"\n\[]+)"?/i,
    /VERDICT:\s*"?([^"\n\[]+)"?/i,
    /verdict[:\s]+["']?([^"\n\[]+)["']?/i,
  ];

  // Top issue patterns
  const issuePatterns = [
    /\[TOP_ISSUE\]:\s*([^\n\[]+)/i,
    /TOP_ISSUE:\s*([^\n\[]+)/i,
    /biggest issue[:\s]+([^\n\[]+)/i,
    /main problem[:\s]+([^\n\[]+)/i,
  ];

  // Fix patterns (includes accessibility TOP_FIX)
  const fixPatterns = [
    /\[TOP_FIX\]:\s*([^\n\[]+)/i,       // Accessibility format
    /TOP_FIX:\s*([^\n\[]+)/i,
    /\[FIX\]:\s*([^\n\[]+)/i,
    /FIX:\s*([^\n\[]+)/i,
    /suggestion[:\s]+([^\n\[]+)/i,
    /recommend[:\s]+([^\n\[]+)/i,
  ];

  // Background patterns
  const bgPatterns = [
    /\[BACKGROUND\]:\s*"?([^"\n\[]+)"?/i,
    /BACKGROUND:\s*"?([^"\n\[]+)"?/i,
    /background[:\s]+["']?([^"\n\[]+)["']?/i,
  ];

  // Lighting patterns (includes accessibility LIGHTING_STATUS)
  const lightPatterns = [
    /\[LIGHTING_STATUS\]:\s*"?([^"\n\[]+)"?/i,  // Accessibility format
    /LIGHTING_STATUS:\s*"?([^"\n\[]+)"?/i,
    /\[LIGHTING\]:\s*"?([^"\n\[]+)"?/i,
    /LIGHTING:\s*"?([^"\n\[]+)"?/i,
    /lighting[:\s]+["']?([^"\n\[]+)["']?/i,
  ];

  // Focus patterns (includes accessibility FRAMING_STATUS)
  const focusPatterns = [
    /\[FRAMING_STATUS\]:\s*"?([^"\n\[]+)"?/i,   // Accessibility format
    /FRAMING_STATUS:\s*"?([^"\n\[]+)"?/i,
    /\[PRODUCT_FOCUS\]:\s*"?([^"\n\[]+)"?/i,
    /PRODUCT_FOCUS:\s*"?([^"\n\[]+)"?/i,
    /product focus[:\s]+["']?([^"\n\[]+)["']?/i,
    /focus[:\s]+["']?([^"\n\[]+)["']?/i,
  ];

  const scoreStr = extract(scorePatterns, '5', 'SCORE');
  const score = Math.min(10, Math.max(1, parseInt(scoreStr, 10) || 5));

  // Normalize verdict to expected values
  let verdict = extract(verdictPatterns, 'Needs Work', 'VERDICT');
  const verdictLower = verdict.toLowerCase();
  if (verdictLower.includes('ready')) {
    verdict = 'Ready to List';
  } else if (verdictLower.includes('retake')) {
    verdict = 'Retake Recommended';
  } else {
    verdict = 'Needs Work';
  }

  // Normalize background
  let background = extract(bgPatterns, 'Needs Review', 'BACKGROUND');
  const bgLower = background.toLowerCase();
  if (bgLower.includes('clean') || bgLower.includes('good') || bgLower.includes('simple')) {
    background = 'Clean';
  } else if (bgLower.includes('clutter')) {
    background = 'Cluttered';
  } else if (bgLower.includes('distract')) {
    background = 'Distracting';
  }

  // Normalize lighting
  let lighting = extract(lightPatterns, 'Needs Review', 'LIGHTING');
  const lightLower = lighting.toLowerCase();
  if (lightLower.includes('good') || lightLower.includes('excellent') || lightLower.includes('well')) {
    lighting = 'Good';
  } else if (lightLower.includes('harsh') || lightLower.includes('shadow')) {
    lighting = 'Harsh shadows';
  } else if (lightLower.includes('dark')) {
    lighting = 'Too dark';
  } else if (lightLower.includes('bright') || lightLower.includes('overexposed')) {
    lighting = 'Too bright';
  } else if (lightLower.includes('uneven')) {
    lighting = 'Uneven';
  }

  // Normalize product focus
  let productFocus = extract(focusPatterns, 'Needs Review', 'PRODUCT_FOCUS');
  const focusLower = productFocus.toLowerCase();
  if (focusLower.includes('clear') || focusLower.includes('good') || focusLower.includes('excellent')) {
    productFocus = 'Clear';
  } else if (focusLower.includes('small')) {
    productFocus = 'Too small';
  } else if (focusLower.includes('center') || focusLower.includes('off')) {
    productFocus = 'Off-center';
  } else if (focusLower.includes('compet')) {
    productFocus = 'Competing elements';
  }

  // Description idea patterns
  const descPatterns = [
    /\[DESCRIPTION_IDEA\]:\s*([^\n\[]+)/i,
    /DESCRIPTION_IDEA:\s*([^\n\[]+)/i,
    /description[:\s]+([^\n\[]+)/i,
  ];

  // Tags patterns
  const tagPatterns = [
    /\[SUGGESTED_TAGS\]:\s*([^\n\[]+)/i,
    /SUGGESTED_TAGS:\s*([^\n\[]+)/i,
    /tags?[:\s]+([^\n\[]+)/i,
    /hashtags?[:\s]+([^\n\[]+)/i,
  ];

  const descriptionIdea = extract(descPatterns, '');
  const tagsRaw = extract(tagPatterns, '');
  const suggestedTags = tagsRaw
    .split(/[,;]/)
    .map(t => t.trim().replace(/^#/, ''))
    .filter(t => t.length > 0 && t.length < 30);

  // New coaching fields patterns
  const productTypePatterns = [
    /\[PRODUCT_TYPE\]:\s*([^\n\[]+)/i,
    /PRODUCT_TYPE:\s*([^\n\[]+)/i,
    /product type[:\s]+([^\n\[]+)/i,
  ];

  const materialPatterns = [
    /\[MATERIAL\]:\s*([^\n\[]+)/i,
    /MATERIAL:\s*([^\n\[]+)/i,
    /material[:\s]+([^\n\[]+)/i,
  ];

  const compositionTipPatterns = [
    /\[COMPOSITION_TIP\]:\s*([^\n\[]+)/i,
    /COMPOSITION_TIP:\s*([^\n\[]+)/i,
    /composition tip[:\s]+([^\n\[]+)/i,
    /composition[:\s]+([^\n\[]+)/i,
  ];

  const lightingTipPatterns = [
    /\[LIGHTING_TIP\]:\s*([^\n\[]+)/i,
    /LIGHTING_TIP:\s*([^\n\[]+)/i,
    /lighting tip[:\s]+([^\n\[]+)/i,
  ];

  const scaleSuggestionPatterns = [
    /\[SCALE_SUGGESTION\]:\s*([^\n\[]+)/i,
    /SCALE_SUGGESTION:\s*([^\n\[]+)/i,
    /scale suggestion[:\s]+([^\n\[]+)/i,
    /scale[:\s]+([^\n\[]+)/i,
  ];

  const stylingIdeaPatterns = [
    /\[STYLING_IDEA\]:\s*([^\n\[]+)/i,
    /STYLING_IDEA:\s*([^\n\[]+)/i,
    /styling idea[:\s]+([^\n\[]+)/i,
    /styling[:\s]+([^\n\[]+)/i,
  ];

  const altTextPatterns = [
    /\[ALT_TEXT\]:\s*([^\n\[]+)/i,
    /ALT_TEXT:\s*([^\n\[]+)/i,
    /alt.?text[:\s]+([^\n\[]+)/i,
  ];

  // Accessibility-specific patterns
  const whatISeePatterns = [
    /\[WHAT_I_SEE\]:\s*([^\n\[]+)/i,
    /WHAT_I_SEE:\s*([^\n\[]+)/i,
  ];

  const colorCheckPatterns = [
    /\[COLOR_CHECK\]:\s*([^\n\[]+)/i,
    /COLOR_CHECK:\s*([^\n\[]+)/i,
  ];

  const nextActionPatterns = [
    /\[NEXT_ACTION\]:\s*([^\n\[]+)/i,
    /NEXT_ACTION:\s*([^\n\[]+)/i,
  ];

  // Extract accessibility fields (may be empty for non-accessibility responses)
  const whatISee = extract(whatISeePatterns, '', 'WHAT_I_SEE');
  const colorCheck = extract(colorCheckPatterns, '', 'COLOR_CHECK');
  const nextAction = extract(nextActionPatterns, '', 'NEXT_ACTION');

  return {
    score,
    verdict,
    productType: extract(productTypePatterns, '', 'PRODUCT_TYPE'),
    material: extract(materialPatterns, '', 'MATERIAL'),
    background,
    lighting,
    productFocus,
    compositionTip: extract(compositionTipPatterns, '', 'COMPOSITION_TIP'),
    lightingTip: extract(lightingTipPatterns, '', 'LIGHTING_TIP'),
    scaleSuggestion: extract(scaleSuggestionPatterns, '', 'SCALE_SUGGESTION'),
    stylingIdea: extract(stylingIdeaPatterns, '', 'STYLING_IDEA'),
    topIssue: extract(issuePatterns, ''),
    fix: extract(fixPatterns, ''),
    descriptionIdea,
    altText: extract(altTextPatterns, '', 'ALT_TEXT'),
    suggestedTags,
    // Accessibility fields (may be undefined for standard responses)
    whatISee: whatISee || undefined,
    colorCheck: colorCheck || undefined,
    nextAction: nextAction || undefined,
  };
}
