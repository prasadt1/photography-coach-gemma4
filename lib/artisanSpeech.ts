/**
 * Artisan journey TTS — one coaching voice for welcome → listing (sentence-chunked).
 */

import {
  speakCoaching,
  primeSpeechVoices,
  unlockSpeechForSession,
  isSpeechSessionUnlocked,
} from '../services/voiceCoach';

export { primeSpeechVoices, unlockSpeechForSession, isSpeechSessionUnlocked };

/** Listing-style readout for tap-only demo and post-gesture coaching. */
export function speakArtisanCoaching(
  text: string,
  onEnd?: () => void,
  onStart?: () => void,
): void {
  speakCoaching(text, onEnd, onStart);
}
