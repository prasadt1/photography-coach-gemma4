/**
 * VoiceMode.tsx — Audio-first photography coaching for accessibility
 *
 * Designed for:
 * - Visually impaired photographers
 * - Hands-free shooting (tripod, walking around)
 * - Anyone who prefers listening to reading
 *
 * Uses clock-face spatial directions (accessibility standard)
 *
 * Desktop: Webcam capture
 * Mobile: Direct camera capture via file input
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Camera, Volume2, VolumeX, Mic, MicOff, RotateCcw, HelpCircle,
  Loader2, Sun, Moon, Video, VideoOff, Upload,
} from 'lucide-react';
import {
  speak,
  speakPyramid,
  repeatLast,
  speakMore,
  stopSpeaking,
  speakHelp,
  startListening,
  stopListening,
  isSpeechRecognitionSupported,
  parseVoiceResponse,
} from '../services/voiceCoach';
import { analyzeForVoiceMode } from '../services/analysisOrchestrator';

interface VoiceModeProps {
  onBack: () => void;
  ollamaReady: boolean | null;
}

// Detect if we're on mobile
const isMobile = () => {
  if (typeof window === 'undefined') return false;
  return /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

const VoiceMode: React.FC<VoiceModeProps> = ({ onBack, ollamaReady }) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [lastFeedback, setLastFeedback] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [highContrast, setHighContrast] = useState(false);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Webcam state (desktop only)
  const [webcamActive, setWebcamActive] = useState(false);
  const [webcamError, setWebcamError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const stopListeningRef = useRef<(() => void) | null>(null);
  const welcomeSpokenRef = useRef(false);

  const mobile = isMobile();

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopSpeaking();
      stopListening();
      stopWebcam();
    };
  }, []);

  // Welcome message on mount (only once)
  useEffect(() => {
    if (ollamaReady && !isMuted && !welcomeSpokenRef.current) {
      welcomeSpokenRef.current = true;
      setTimeout(() => {
        const msg = mobile
          ? 'Voice Coach ready. Tap the large button to take a photo.'
          : 'Voice Coach ready. Start your webcam or upload a photo.';
        speak(msg);
      }, 500);
    }
  }, [ollamaReady, isMuted, mobile]);

  // ─── Webcam functions ────────────────────────────────────────────────────────

  const startWebcam = useCallback(async () => {
    try {
      setWebcamError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;

        // Wait for video metadata to load (ensures dimensions are set)
        await new Promise<void>((resolve) => {
          if (!videoRef.current) return resolve();

          const onLoadedMetadata = () => {
            console.log('[VoiceMode] Video metadata loaded:',
              videoRef.current?.videoWidth, 'x', videoRef.current?.videoHeight);
            resolve();
          };

          if (videoRef.current.readyState >= 1) {
            // Metadata already loaded
            onLoadedMetadata();
          } else {
            videoRef.current.addEventListener('loadedmetadata', onLoadedMetadata, { once: true });
          }
        });

        await videoRef.current.play();
        console.log('[VoiceMode] Video playing');
      }
      setWebcamActive(true);
      if (!isMuted) {
        speak('Webcam started. Press space or tap to capture.');
      }
    } catch (err: any) {
      console.error('[VoiceMode] Webcam error:', err);
      setWebcamError(err.message || 'Could not access webcam');
      if (!isMuted) {
        speak('Could not access webcam. Please check permissions.');
      }
    }
  }, [isMuted]);

  const stopWebcam = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setWebcamActive(false);
  }, []);

  // ─── Analysis function (defined before captureFromWebcam which uses it) ──────

  const analyzeImage = useCallback(async (base64: string, mimeType: string) => {
    setError(null);
    setIsAnalyzing(true);
    setLastFeedback(null);

    try {
      console.log('[VoiceMode] Calling analyzeForVoiceMode...');
      const response = await analyzeForVoiceMode(base64, mimeType);
      console.log('[VoiceMode] Raw response:', response);

      const { gist, details } = parseVoiceResponse(response);
      console.log('[VoiceMode] Parsed gist:', gist);
      console.log('[VoiceMode] Parsed details:', details);
      setLastFeedback(response);

      if (!isMuted) {
        await speakPyramid(gist, details);
      }
    } catch (err: any) {
      console.error('[VoiceMode] Analysis failed:', err);
      console.error('[VoiceMode] Error message:', err?.message);
      const errorMsg = err.message?.includes('ollama') || err.message?.includes('ECONNREFUSED')
        ? 'Ollama is not running. Please start Ollama and try again.'
        : `Analysis failed: ${err?.message || 'Unknown error'}`;
      setError(errorMsg);
      if (!isMuted) {
        speak(errorMsg);
      }
    } finally {
      setIsAnalyzing(false);
    }
  }, [isMuted]);

  const captureFromWebcam = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) {
      console.error('[VoiceMode] Video or canvas ref missing');
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;

    console.log('[VoiceMode] CAPTURE ATTEMPT - Video dimensions:', video.videoWidth, 'x', video.videoHeight);
    console.log('[VoiceMode] Video readyState:', video.readyState);
    console.log('[VoiceMode] Video paused:', video.paused);

    // Check if video has valid dimensions
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      console.error('[VoiceMode] Video not ready - dimensions are 0, waiting 500ms and retrying...');

      // Wait a bit and retry once
      await new Promise(resolve => setTimeout(resolve, 500));

      console.log('[VoiceMode] RETRY - Video dimensions:', video.videoWidth, 'x', video.videoHeight);

      if (video.videoWidth === 0 || video.videoHeight === 0) {
        setError('Webcam not ready. Please wait a moment and try again.');
        return;
      }
    }

    // Set canvas size to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame to canvas
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.error('[VoiceMode] Could not get canvas context');
      return;
    }
    ctx.drawImage(video, 0, 0);

    // Convert to base64
    const base64 = canvas.toDataURL('image/jpeg', 0.85);
    console.log('[VoiceMode] Base64 length:', base64.length);
    console.log('[VoiceMode] Base64 prefix:', base64.slice(0, 50));

    // Analyze the captured image
    await analyzeImage(base64, 'image/jpeg');
  }, [analyzeImage]);

  // ─── File upload handler ─────────────────────────────────────────────────────

  const handleCapture = useCallback(() => {
    if (webcamActive) {
      captureFromWebcam();
    } else {
      fileInputRef.current?.click();
    }
  }, [webcamActive, captureFromWebcam]);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      await analyzeImage(base64, file.type);
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [analyzeImage]);

  // ─── Keyboard shortcuts ──────────────────────────────────────────────────────

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch (e.key) {
        case ' ':
          e.preventDefault();
          if (!isAnalyzing && ollamaReady) {
            handleCapture();
          }
          break;
        case 'r':
        case 'R':
          repeatLast();
          break;
        case 'm':
        case 'M':
          speakMore();
          break;
        case 'Escape':
          stopSpeaking();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAnalyzing, ollamaReady, handleCapture]);

  // ─── Voice commands ──────────────────────────────────────────────────────────

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
      stopListeningRef.current = null;
      setIsListening(false);
      setTranscript(null);
    } else {
      const success = startListening((transcript: string) => {
        setTranscript(transcript);
        const lower = transcript.toLowerCase();
        if (lower.includes('capture') || lower.includes('take') || lower.includes('photo')) {
          handleCapture();
        } else if (lower.includes('repeat')) {
          !isMuted && repeatLast();
        } else if (lower.includes('more') || lower.includes('detail')) {
          !isMuted && speakMore();
        } else if (lower.includes('stop') || lower.includes('quiet')) {
          stopSpeaking();
        } else if (lower.includes('help')) {
          !isMuted && speakHelp();
        }
      }, true);
      if (success) {
        stopListeningRef.current = stopListening;
        setIsListening(true);
        if (!isMuted) {
          speak('Listening. Say a command.');
        }
      } else {
        if (!isMuted) {
          speak('Voice input not supported in this browser.');
        }
      }
    }
  }, [isListening, handleCapture, isMuted]);

  const handleRepeat = useCallback(() => {
    if (!isMuted) repeatLast();
  }, [isMuted]);

  const handleMore = useCallback(() => {
    if (!isMuted) speakMore();
  }, [isMuted]);

  const handleHelp = useCallback(() => {
    console.log('[VoiceMode] Help button clicked, isMuted:', isMuted);
    if (!isMuted) {
      speakHelp();
    }
  }, [isMuted]);

  const toggleMute = useCallback(() => {
    if (!isMuted) stopSpeaking();
    setIsMuted(!isMuted);
  }, [isMuted]);

  // ─── Render ──────────────────────────────────────────────────────────────────

  const bgClass = highContrast
    ? 'bg-black'
    : 'bg-gradient-to-b from-slate-900 to-slate-950';

  const textClass = highContrast
    ? 'text-white'
    : 'text-slate-200';

  return (
    <div className={`min-h-screen ${bgClass} ${textClass} p-4 md:p-8 flex flex-col`}>
      {/* Hidden elements */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
        aria-label="Take or select a photo"
      />
      <canvas ref={canvasRef} className="hidden" />

      {/* Header */}
      <header className="flex items-center justify-between mb-6">
        <button
          onClick={onBack}
          className={`px-4 py-2 rounded-xl text-lg font-semibold transition-all
            ${highContrast
              ? 'bg-white text-black hover:bg-gray-200'
              : 'bg-slate-800 hover:bg-slate-700'
            }`}
          aria-label="Go back to mode selection"
        >
          ← Back
        </button>

        <div className="flex items-center gap-2">
          {/* High Contrast Toggle */}
          <button
            onClick={() => setHighContrast(!highContrast)}
            className={`p-3 rounded-xl transition-all
              ${highContrast
                ? 'bg-white text-black'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            aria-label={highContrast ? 'Switch to normal contrast' : 'Switch to high contrast'}
            title="Toggle high contrast"
          >
            {highContrast ? <Sun className="w-6 h-6" /> : <Moon className="w-6 h-6" />}
          </button>

          {/* Mute Toggle */}
          <button
            onClick={toggleMute}
            className={`p-3 rounded-xl transition-all
              ${isMuted
                ? 'bg-red-600 text-white'
                : highContrast
                  ? 'bg-white text-black'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            aria-label={isMuted ? 'Unmute voice feedback' : 'Mute voice feedback'}
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center gap-6">
        {/* Status */}
        <div className="text-center mb-4">
          <h1 className={`text-2xl md:text-4xl font-bold mb-2 ${highContrast ? 'text-white' : 'text-white'}`}>
            🎤 Voice Coach
          </h1>
          <p className={`text-lg ${highContrast ? 'text-gray-300' : 'text-slate-400'}`}>
            {ollamaReady === false
              ? 'Ollama offline — start Ollama to use'
              : ollamaReady === null
                ? 'Checking Ollama...'
                : isAnalyzing
                  ? 'Analyzing your photo...'
                  : webcamActive
                    ? 'Press SPACE or tap video to capture'
                    : mobile
                      ? 'Tap below to take a photo'
                      : 'Start webcam or upload a photo'
            }
          </p>
        </div>

        {/* Webcam Preview (desktop) */}
        {!mobile && webcamActive && (
          <div className="relative w-full max-w-2xl aspect-video rounded-2xl overflow-hidden border-4 border-purple-500/50 shadow-2xl">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
              onClick={handleCapture}
            />
            {isAnalyzing && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <Loader2 className="w-16 h-16 text-white animate-spin" />
              </div>
            )}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-black/70 rounded-full text-sm">
              Tap video or press SPACE to capture
            </div>
          </div>
        )}

        {/* Webcam Toggle (desktop only) */}
        {!mobile && !webcamActive && (
          <div className="flex gap-4 mb-4">
            <button
              onClick={startWebcam}
              disabled={ollamaReady === false}
              className={`flex items-center gap-3 px-6 py-4 rounded-2xl text-lg font-semibold transition-all
                disabled:opacity-50 disabled:cursor-not-allowed
                ${highContrast
                  ? 'bg-white text-black border-4 border-black'
                  : 'bg-purple-600 hover:bg-purple-500 text-white'
                }`}
            >
              <Video className="w-6 h-6" />
              Start Webcam
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isAnalyzing || ollamaReady === false}
              className={`flex items-center gap-3 px-6 py-4 rounded-2xl text-lg font-semibold transition-all
                disabled:opacity-50 disabled:cursor-not-allowed
                ${highContrast
                  ? 'bg-white text-black border-4 border-black'
                  : 'bg-slate-700 hover:bg-slate-600 text-white'
                }`}
            >
              <Upload className="w-6 h-6" />
              Upload Photo
            </button>
          </div>
        )}

        {/* Stop Webcam button */}
        {!mobile && webcamActive && (
          <button
            onClick={stopWebcam}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-semibold"
          >
            <VideoOff className="w-4 h-4" />
            Stop Webcam
          </button>
        )}

        {/* Webcam Error */}
        {webcamError && (
          <div className={`text-center p-4 rounded-xl max-w-md
            ${highContrast ? 'bg-red-900 text-white' : 'bg-red-900/50 text-red-300'}`}
            role="alert"
          >
            {webcamError}
          </div>
        )}

        {/* Giant Capture Button (mobile, or desktop without webcam) */}
        {(mobile || (!mobile && !webcamActive)) && (
          <button
            onClick={handleCapture}
            disabled={isAnalyzing || ollamaReady === false}
            className={`w-full max-w-md h-48 md:h-64 rounded-3xl text-3xl md:text-4xl font-bold transition-all
              flex flex-col items-center justify-center gap-4 shadow-2xl
              focus:outline-none focus:ring-8 focus:ring-yellow-400
              disabled:opacity-50 disabled:cursor-not-allowed
              ${highContrast
                ? 'bg-white text-black active:bg-gray-300'
                : 'bg-gradient-to-br from-brand-500 to-emerald-500 text-white active:from-brand-600 active:to-emerald-600'
              }`}
            aria-label="Take photo and hear feedback"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-16 h-16 animate-spin" />
                <span>Analyzing...</span>
              </>
            ) : (
              <>
                <Camera className="w-16 h-16" />
                <span>{mobile ? 'TAP TO SHOOT' : 'UPLOAD PHOTO'}</span>
              </>
            )}
          </button>
        )}

        {/* Error Display */}
        {error && (
          <div className={`text-center p-4 rounded-xl max-w-md
            ${highContrast ? 'bg-red-900 text-white' : 'bg-red-900/50 text-red-300'}`}
            role="alert"
          >
            {error}
          </div>
        )}

        {/* Last Feedback Display (for sighted users) */}
        {lastFeedback && !isAnalyzing && (
          <div className={`text-center p-4 rounded-xl max-w-md
            ${highContrast ? 'bg-gray-900 border-2 border-white' : 'bg-slate-800/50 border border-slate-700'}`}
          >
            <p className="text-lg">{lastFeedback}</p>
          </div>
        )}

        {/* Secondary Actions */}
        <div className="flex flex-wrap justify-center gap-4 mt-4">
          {/* Repeat Button */}
          <button
            onClick={handleRepeat}
            disabled={!lastFeedback}
            className={`flex items-center gap-2 px-6 py-4 rounded-2xl text-lg font-semibold transition-all
              disabled:opacity-40 disabled:cursor-not-allowed
              ${highContrast
                ? 'bg-white text-black border-4 border-black'
                : 'bg-slate-800 hover:bg-slate-700'
              }`}
            aria-label="Repeat last feedback"
          >
            <RotateCcw className="w-6 h-6" />
            Repeat
          </button>

          {/* More Details Button */}
          <button
            onClick={handleMore}
            disabled={!lastFeedback}
            className={`flex items-center gap-2 px-6 py-4 rounded-2xl text-lg font-semibold transition-all
              disabled:opacity-40 disabled:cursor-not-allowed
              ${highContrast
                ? 'bg-white text-black border-4 border-black'
                : 'bg-slate-800 hover:bg-slate-700'
              }`}
            aria-label="Hear more details"
          >
            <Volume2 className="w-6 h-6" />
            More
          </button>

          {/* Voice Input Toggle */}
          {isSpeechRecognitionSupported() && (
            <button
              onClick={toggleListening}
              className={`flex items-center gap-2 px-6 py-4 rounded-2xl text-lg font-semibold transition-all
                ${isListening
                  ? 'bg-red-600 text-white animate-pulse'
                  : highContrast
                    ? 'bg-white text-black border-4 border-black'
                    : 'bg-slate-800 hover:bg-slate-700'
                }`}
              aria-label={isListening ? 'Stop listening' : 'Start voice commands'}
            >
              {isListening ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
              {isListening ? 'Stop' : 'Voice'}
            </button>
          )}

          {/* Help Button */}
          <button
            onClick={handleHelp}
            className={`flex items-center gap-2 px-6 py-4 rounded-2xl text-lg font-semibold transition-all
              ${highContrast
                ? 'bg-white text-black border-4 border-black'
                : 'bg-slate-800 hover:bg-slate-700'
              }`}
            aria-label="Hear voice commands help"
          >
            <HelpCircle className="w-6 h-6" />
            Help
          </button>
        </div>

        {/* Transcript Display */}
        {transcript && (
          <div className={`text-center p-3 rounded-xl mt-4
            ${highContrast ? 'bg-yellow-500 text-black' : 'bg-slate-800 text-slate-300'}`}
          >
            <span className="text-sm">Heard: "{transcript}"</span>
          </div>
        )}

        {/* Keyboard shortcuts hint (desktop) */}
        {!mobile && (
          <div className={`text-center text-sm mt-4 ${highContrast ? 'text-gray-400' : 'text-slate-600'}`}>
            <p>Keyboard: <kbd className="px-2 py-1 bg-slate-800 rounded text-xs">SPACE</kbd> capture · <kbd className="px-2 py-1 bg-slate-800 rounded text-xs">R</kbd> repeat · <kbd className="px-2 py-1 bg-slate-800 rounded text-xs">M</kbd> more · <kbd className="px-2 py-1 bg-slate-800 rounded text-xs">ESC</kbd> stop</p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className={`text-center mt-6 text-sm ${highContrast ? 'text-gray-400' : 'text-slate-500'}`}>
        <p>Voice Coach uses clock-face directions (e.g., "subject at 3 o'clock")</p>
        <p className="mt-1">All processing happens locally on your device. 100% private.</p>
      </footer>
    </div>
  );
};

export default VoiceMode;
