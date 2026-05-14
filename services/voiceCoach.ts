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

/**
 * Speak text using Web Speech API
 *
 * Chrome bug workaround: Split text into sentences and speak them sequentially
 * to avoid truncation at periods.
 */
export function speak(text: string, rate = 0.95, onEnd?: () => void): void {
  console.log('[voiceCoach] speak() called with:', text.slice(0, 50) + '...');

  // Reset cancellation flag when starting new speech
  isCancelled = false;
  if (pendingTimeout) {
    clearTimeout(pendingTimeout);
    pendingTimeout = null;
  }

  lastSpokenText = text;

  // Get voices first
  const voices = speechSynthesis.getVoices();

  // If voices aren't loaded yet, wait for them
  if (voices.length === 0) {
    console.log('[voiceCoach] Voices not loaded, waiting...');
    speechSynthesis.onvoiceschanged = () => {
      if (!isCancelled) {
        speak(text, rate, onEnd);
      }
    };
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

  console.log('[voiceCoach] Split into', sentences.length, 'sentences');

  let currentIndex = 0;

  const speakNextSentence = () => {
    // Check if cancelled before speaking next sentence
    if (isCancelled) {
      console.log('[voiceCoach] Speech cancelled, stopping');
      return;
    }

    if (currentIndex >= sentences.length) {
      console.log('[voiceCoach] All sentences spoken');
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

    utterance.onend = () => {
      if (isCancelled) return;
      console.log(`[voiceCoach] Sentence ${currentIndex + 1} completed`);
      currentIndex++;
      // Small delay between sentences for natural flow
      pendingTimeout = setTimeout(speakNextSentence, 100);
    };

    utterance.onerror = (e: any) => {
      if (isCancelled) return;
      console.error('[voiceCoach] Speech error:', e.error, e);
      // Try next sentence even if this one failed
      currentIndex++;
      pendingTimeout = setTimeout(speakNextSentence, 100);
    };

    speechSynthesis.speak(utterance);
  };

  // Start speaking
  speakNextSentence();
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
export function stopSpeaking(): void {
  console.log('[voiceCoach] stopSpeaking() called');
  isCancelled = true;
  if (pendingTimeout) {
    clearTimeout(pendingTimeout);
    pendingTimeout = null;
  }
  speechSynthesis.cancel();
}

// ─── Voice Input (Speech Recognition) ──────────────────────────────────────────

type VoiceCommand = 'capture' | 'repeat' | 'more' | 'stop' | 'help' | 'unknown';

interface VoiceInputCallbacks {
  onCapture?: () => void;
  onRepeat?: () => void;
  onMore?: () => void;
  onStop?: () => void;
  onHelp?: () => void;
  onTranscript?: (text: string) => void;
}

let recognitionInstance: SpeechRecognition | null = null;

/**
 * Check if speech recognition is supported
 */
export function isSpeechRecognitionSupported(): boolean {
  return 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
}

/**
 * Parse transcript to voice command
 */
function parseCommand(transcript: string): VoiceCommand {
  const text = transcript.toLowerCase().trim();

  if (text.includes('take') || text.includes('capture') || text.includes('shoot') || text.includes('photo')) {
    return 'capture';
  }
  if (text.includes('repeat') || text.includes('again') || text.includes('say that')) {
    return 'repeat';
  }
  if (text.includes('more') || text.includes('detail') || text.includes('explain')) {
    return 'more';
  }
  if (text.includes('stop') || text.includes('quiet') || text.includes('silence')) {
    return 'stop';
  }
  if (text.includes('help') || text.includes('commands') || text.includes('what can')) {
    return 'help';
  }

  return 'unknown';
}

/**
 * Start listening for voice commands
 */
export function startListening(callbacks: VoiceInputCallbacks): (() => void) | null {
  if (!isSpeechRecognitionSupported()) {
    console.warn('Speech recognition not supported in this browser');
    return null;
  }

  const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition;
  const recognition = new SpeechRecognition();

  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.lang = 'en-US';
  recognition.maxAlternatives = 1;

  recognition.onresult = (event: SpeechRecognitionEvent) => {
    const transcript = event.results[0][0].transcript;
    callbacks.onTranscript?.(transcript);

    const command = parseCommand(transcript);

    switch (command) {
      case 'capture':
        callbacks.onCapture?.();
        break;
      case 'repeat':
        callbacks.onRepeat?.();
        break;
      case 'more':
        callbacks.onMore?.();
        break;
      case 'stop':
        callbacks.onStop?.();
        break;
      case 'help':
        callbacks.onHelp?.();
        break;
    }
  };

  recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
    console.warn('Speech recognition error:', event.error);
  };

  recognition.start();
  recognitionInstance = recognition;

  // Return cleanup function
  return () => {
    recognition.stop();
    recognitionInstance = null;
  };
}

/**
 * Stop listening
 */
export function stopListening(): void {
  if (recognitionInstance) {
    recognitionInstance.stop();
    recognitionInstance = null;
  }
}

/**
 * Speak help instructions
 */
export function speakHelp(): void {
  speak(
    'Voice commands available: Say "take photo" to capture. ' +
    'Say "repeat" to hear the last feedback again. ' +
    'Say "more" for additional details. ' +
    'Say "stop" to silence me.'
  );
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
  confidence_note: string;
  alt_text: string;
  listing_copy: string;
  ready_to_list: boolean;
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

    const parsed = JSON.parse(cleaned) as ArtisanAnalysisV3;

    // Validate required fields exist
    if (!parsed.subject || !parsed.critique || !parsed.alt_text) {
      console.warn('[parseArtisanResponseV3] Missing required fields');
      return null;
    }

    return parsed;
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
