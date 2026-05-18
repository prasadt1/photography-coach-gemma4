/**
 * Artisan journey TTS — guide voice (UI cues) vs analysis voice (feedback + listing).
 */

import {
  speakGuideCoaching,
  speakGuideFromUserGesture,
  speakAnalysisCoaching,
  primeSpeechVoices,
  unlockSpeechForSession,
  isSpeechSessionUnlocked,
} from '../services/voiceCoach';

export { stopGuideNeural } from './guideNeuralTts';

export {
  primeSpeechVoices,
  unlockSpeechForSession,
  isSpeechSessionUnlocked,
  speakGuideFromUserGesture,
};

/** Welcome, camera hints, tap instructions. */
export function speakArtisanGuide(
  text: string,
  onEnd?: () => void,
  onStart?: () => void,
): void {
  speakGuideCoaching(text, onEnd, onStart);
}

/** Photo analysis and marketplace listing readout. */
export function speakArtisanAnalysis(
  text: string,
  onEnd?: () => void,
  onStart?: () => void,
): void {
  speakAnalysisCoaching(text, onEnd, onStart);
}
