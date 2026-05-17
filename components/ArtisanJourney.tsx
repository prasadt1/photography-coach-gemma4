/**
 * ArtisanJourney.tsx — Guided listing flow for blind/low-vision artisans
 *
 * Journey: voice welcome → enable voice → camera → analysis → retake → compare → listing
 *
 * Accessibility-first: semantic HTML, aria-live, focus management, keyboard operable
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Camera, Loader2, CheckCircle2, ArrowRight,
  Lightbulb, Grid3X3, Sun, Copy, FileText, Accessibility,
  AudioLines, Sparkles,
} from 'lucide-react';
import {
  analyzeForSellModeWithFallback,
  warmUpModel,
  warmUpModelViaApi,
  type InferenceSource,
} from '../services/analysisOrchestrator';
import {
  parseArtisanResponseV3,
  speak,
  primeSpeechVoices,
  unlockSpeechForSession,
  stopSpeaking,
  startListening,
  stopListening,
  parseVoiceCommand,
  isCurrentlyListening,
} from '../services/voiceCoach';
import { speakArtisanCoaching } from '../lib/artisanSpeech';
import LiveCameraCapture from './LiveCameraCapture';
import { getArtisanInferenceBadge, OLLAMA_CLOUD_CONFIG, OLLAMA_CONFIG } from '../config';
import {
  extractColourCheckFromSubject,
  buildArtisanVoiceScript,
  getAnalysisStatusCopy,
  type ArtisanCaptureKind,
} from '../services/artisanDisplay';
import { shouldUseTapOnlyDemo } from '../lib/artisanJourneyRoute';
import {
  TAP_BTN_PRIMARY,
  TAP_BTN_SECONDARY,
  TAP_GUIDANCE,
  TAP_HINT_CLASS,
  TAP_LABELS,
} from '../lib/artisanTapGuidance';
import {
  consumeOpenCameraAfterHttps,
  redirectToHttpsForCamera,
} from '../lib/devSecureUrl';

type JourneyPhase =
  | 'demoWelcome'
  | 'voicePrompt'
  | 'firstCapture'
  | 'firstAnalysis'
  | 'retryChoice'
  | 'secondCapture'
  | 'comparison'
  | 'listing';

interface AnalysisResult {
  subject: string;
  sceneDescription: string;
  colourCheck: string | null;
  framing: string;
  lighting: string;
  primaryFix: string;
  // Structured ratings for comparison
  ratings: {
    lighting: number;
    framing: number;
    background: number;
    focus: number;
  };
  primaryIssue: string;  // Single identified issue
  confidenceNote: string;
  altText: string;
  listingCopy: string;
  readyToList: boolean;
  rawResponse: string;
  tags?: string[];
}

// Attempt: each photo + its analysis (app holds the state, model is stateless)
interface Attempt {
  image: string;  // base64
  analysisJSON: AnalysisResult;
  timestamp: number;
}

interface ArtisanJourneyProps {
  voiceEnabled: boolean;
  inferenceSource: InferenceSource;
  onExit: () => void;
}

const ArtisanJourney: React.FC<ArtisanJourneyProps> = ({
  voiceEnabled: voiceEnabledProp,
  inferenceSource: _inferenceSource,
  onExit,
}) => {
  const tapOnlyDemo = shouldUseTapOnlyDemo();

  // Journey state
  const [phase, setPhase] = useState<JourneyPhase>(() =>
    tapOnlyDemo ? 'demoWelcome' : 'voicePrompt',
  );
  const [voiceCommandsEnabled, setVoiceCommandsEnabled] = useState(false);
  const [voiceListeningPrimed, setVoiceListeningPrimed] = useState(false);

  // Attempts array: app maintains session state (model is stateless)
  const [attempts, setAttempts] = useState<Attempt[]>([]);

  // Comparison result
  const [comparisonText, setComparisonText] = useState<string | null>(null);
  const [strongerAttemptIndex, setStrongerAttemptIndex] = useState<number | null>(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showAllTags, setShowAllTags] = useState(false);
  const [currentInferenceSource, setCurrentInferenceSource] = useState<InferenceSource>('demo');
  const [showLiveCamera, setShowLiveCamera] = useState(false);

  // Voice commands (mic) — off on tap-only demo path
  const voiceEnabled = voiceEnabledProp || voiceCommandsEnabled;
  /** Spoken coaching (TTS) — on for voice path and tap-only LAN / ?record=1 demo */
  const coachingEnabled = voiceEnabled || tapOnlyDemo;

  const handleVoiceCommandRef = useRef<(transcript: string) => void>(() => {});

  const primeVoiceListening = useCallback(() => {
    if (tapOnlyDemo || !voiceCommandsEnabled) return;
    unlockSpeechForSession();
    stopSpeaking();
    setVoiceListeningPrimed(true);
    startListening((transcript) => handleVoiceCommandRef.current(transcript), true);
  }, [tapOnlyDemo, voiceCommandsEnabled]);

  const demoWelcomeHeardRef = useRef(false);

  const coachSpeak = useCallback(
    (text: string, onEnd?: () => void, onStart?: () => void) => {
      if (tapOnlyDemo) speakArtisanCoaching(text, onEnd, onStart);
      else speak(text, 0.95, onEnd, onStart);
    },
    [tapOnlyDemo],
  );

  const speakDemoWelcome = useCallback(() => {
    if (demoWelcomeHeardRef.current) return;
    primeSpeechVoices();
    coachSpeak(TAP_GUIDANCE.welcome.tts, undefined, () => {
      demoWelcomeHeardRef.current = true;
    });
  }, [coachSpeak]);

  const handleDemoWelcomeStart = useCallback(() => {
    unlockSpeechForSession();
    const openCamera = () => {
      setPhase('firstCapture');
      setShowLiveCamera(true);
      coachSpeak(TAP_GUIDANCE.camera.tts);
    };
    if (!demoWelcomeHeardRef.current) {
      coachSpeak(TAP_GUIDANCE.welcome.tts, () => {
        demoWelcomeHeardRef.current = true;
        openCamera();
      });
      return;
    }
    stopSpeaking();
    demoWelcomeHeardRef.current = true;
    openCamera();
  }, [coachSpeak]);

  // Refs for accessibility
  const phaseAnnouncerRef = useRef<HTMLDivElement>(null);
  const mainContentRef = useRef<HTMLDivElement>(null);
  const retakeButtonRef = useRef<HTMLButtonElement>(null);
  const listingButtonRef = useRef<HTMLButtonElement>(null);
  const analysisStatusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearAnalysisStatusTimer = useCallback(() => {
    if (analysisStatusTimerRef.current) {
      clearTimeout(analysisStatusTimerRef.current);
      analysisStatusTimerRef.current = null;
    }
  }, []);

  // Cleanup speech and recognition on unmount
  useEffect(() => {
    return () => {
      clearAnalysisStatusTimer();
      stopSpeaking();
      stopListening();
    };
  }, [clearAnalysisStatusTimer]);

  // Preload Gemma while the user reads prompts (reduces cold-start + TTS chop on first photo)
  useEffect(() => {
    if (OLLAMA_CLOUD_CONFIG.enabled) void warmUpModelViaApi();
    else void warmUpModel();
  }, []);

  // Load Enhanced/Samantha before first coaching line (avoids compact default voice on iOS).
  useEffect(() => {
    if (tapOnlyDemo) primeSpeechVoices();
  }, [tapOnlyDemo]);

  /** In-app live camera (getUserMedia). On LAN HTTP, Safari requires HTTPS first. */
  const openLiveCamera = useCallback(
    (voiceLine?: string) => {
      if (redirectToHttpsForCamera()) {
        if (voiceEnabled && voiceLine) speak(voiceLine);
        else if (voiceEnabled) {
          speak(
            'Switching to a secure connection so your in-app camera can open. Accept the certificate warning if Safari asks.',
          );
        }
        return;
      }
      setShowLiveCamera(true);
      if (voiceEnabled && voiceLine) speak(voiceLine);
    },
    [voiceEnabled],
  );

  useEffect(() => {
    if (consumeOpenCameraAfterHttps()) {
      setShowLiveCamera(true);
    }
  }, []);

  // ========== Comparison Logic (App-Side, Deterministic) ==========
  const compareAttempts = useCallback((attempt1: Attempt, attempt2: Attempt): {
    strongerIndex: number;
    improvementText: string;
  } => {
    const a1 = attempt1.analysisJSON;
    const a2 = attempt2.analysisJSON;

    // Check if the primary issue from attempt 1 was resolved in attempt 2
    const primaryIssueResolved = a1.primaryIssue && a2.primaryIssue !== a1.primaryIssue;

    // Compare ratings dimension by dimension
    const lightingImproved = a2.ratings.lighting > a1.ratings.lighting;
    const framingImproved = a2.ratings.framing > a1.ratings.framing;
    const backgroundImproved = a2.ratings.background > a1.ratings.background;
    const focusImproved = a2.ratings.focus > a1.ratings.focus;

    // Count improvements
    const improvementCount = [
      lightingImproved,
      framingImproved,
      backgroundImproved,
      focusImproved,
    ].filter(Boolean).length;

    // Determine stronger attempt
    const strongerIndex = improvementCount >= 2 ? 1 : 0;  // Index in attempts array

    // Generate truthful improvement text
    let improvementText = '';
    if (strongerIndex === 1) {
      const improvements: string[] = [];
      if (lightingImproved) improvements.push('the lighting is better');
      if (framingImproved) improvements.push('the framing improved');
      if (backgroundImproved) improvements.push('the background is cleaner');
      if (focusImproved) improvements.push('the focus is sharper');

      if (primaryIssueResolved) {
        improvementText = `Photo two is the stronger one. ${a1.primaryIssue} was the issue — it's resolved now. ${improvements.join(', and ')}.`;
      } else if (improvements.length > 0) {
        improvementText = `Photo two is the stronger one. ${improvements.join(', and ')}.`;
      } else {
        improvementText = 'Photo two is the stronger one.';
      }
    } else {
      improvementText = 'Photo one is still the stronger one. The second shot didn\'t improve the key issues.';
    }

    return { strongerIndex, improvementText };
  }, []);

  const goToFirstCapture = useCallback(
    (withVoiceCommands: boolean) => {
      if (withVoiceCommands) {
        unlockSpeechForSession();
        setVoiceCommandsEnabled(true);
        setVoiceListeningPrimed(true);
        startListening((transcript) => handleVoiceCommandRef.current(transcript), true);
      }
      void warmUpModelViaApi();
      setPhase('firstCapture');
      openLiveCamera(
        withVoiceCommands
          ? 'Voice commands enabled. Opening your camera now. Position your craft in good light.'
          : 'Opening your camera now. Position your craft in good light.',
      );
    },
    [openLiveCamera],
  );

  /**
   * Handle captured image from getUserMedia canvas
   * This is called with a data URL from LiveCameraCapture
   */
  const handleImageCapture = async (imageDataUrl: string) => {
    setError(null);
    setIsProcessing(true);

    try {
      const captureKind: ArtisanCaptureKind =
        phase === 'firstCapture' ? 'first' : attempts.length >= 2 ? 'replace' : 'compare';
      const isFirstPhoto = captureKind === 'first';
      const analysisStatus = getAnalysisStatusCopy(captureKind);

      clearAnalysisStatusTimer();
      if (coachingEnabled) {
        stopSpeaking();
        analysisStatusTimerRef.current = setTimeout(() => {
          coachSpeak(analysisStatus.voiceAfterDelay);
        }, 5000);
      }

      // Move to analysis phase
      if (isFirstPhoto) {
        setPhase('firstAnalysis');
      } else {
        // Second photo - stay in secondCapture but mark as processing
        // Phase will change to 'comparison' after analysis completes
      }

      // Call Gemma 4
      const { content: response, source, localError } = await analyzeForSellModeWithFallback(
        imageDataUrl,
        'image/jpeg', // getUserMedia canvas captures as JPEG
        true, // Always use blind/low-vision artisan prompts (colour analogies, inches, JSON)
      );

      // Store inference source for badge display
      setCurrentInferenceSource(source);

      // Demo fallback with canned artisan coaching
      let parsed;
      if (source === 'demo' || !response) {
        if (import.meta.env.DEV) {
          const detail = localError ? ` ${localError}` : '';
          setError(
            `Could not reach local Gemma 4 (tried ${OLLAMA_CONFIG.baseUrl}).${detail} ` +
              'First photo can take 1–2 minutes while the model loads. Keep this page open.',
          );
          setIsProcessing(false);
          clearAnalysisStatusTimer();
          return;
        }
        // Add realistic delay to demo mode
        await new Promise(resolve => setTimeout(resolve, 3000));

        // For second photo in demo, make it slightly better to show improvement
        const isSecond = attempts.length > 0;
        parsed = {
          subject: 'I see one handcrafted wool scarf in warm honey brown, similar to dried autumn leaves.',
          critique: {
            framing: isSecond ? 'Perfect framing — subject fills frame' : 'Subject fills frame well',
            lighting: isSecond ? 'Excellent natural light — soft and even' : 'Natural light from window — soft and even',
            primary_fix: isSecond ? 'Ready to list as is' : 'Move 6 inches closer to fill the frame completely',
          },
          ratings: {
            lighting: isSecond ? 9 : 7,
            framing: isSecond ? 9 : 6,
            background: isSecond ? 8 : 8,
            focus: isSecond ? 8 : 7,
          },
          primary_issue: isSecond ? '' : 'framing could be tighter',
          confidence_note: '',
          alt_text: 'Handcrafted item photographed in natural window light',
          listing_copy: 'Lovingly handcrafted with attention to detail. This unique piece brings warmth and character to any space.',
          ready_to_list: isSecond,
          tags: ['handmade', 'artisan', 'craft', 'unique', 'handcrafted'],
        };
      } else {
        // Parse real Gemma output
        parsed = parseArtisanResponseV3(response);
        if (!parsed) {
          setError('Could not parse analysis. Please try again.');
          setIsProcessing(false);
          return;
        }
      }

      const { sceneDescription, colourCheck } = extractColourCheckFromSubject(parsed.subject);

      const analysis: AnalysisResult = {
        subject: parsed.subject,
        sceneDescription,
        colourCheck,
        framing: parsed.critique.framing,
        lighting: parsed.critique.lighting,
        primaryFix: parsed.critique.primary_fix,
        ratings: parsed.ratings || {
          lighting: 5,
          framing: 5,
          background: 5,
          focus: 5,
        },
        primaryIssue: parsed.primary_issue || parsed.critique.primary_fix,
        confidenceNote: parsed.confidence_note,
        altText: parsed.alt_text,
        listingCopy: parsed.listing_copy,
        readyToList: parsed.ready_to_list,
        rawResponse: response,
        tags: parsed.tags || [],
      };

      // Store in attempts array
      const attempt: Attempt = {
        image: imageDataUrl,
        analysisJSON: analysis,
        timestamp: Date.now(),
      };

      if (isFirstPhoto) {
        // First attempt
        setAttempts([attempt]);
        setPhase('retryChoice');

        // Speak analysis results
        if (coachingEnabled) {
          coachSpeak(
            buildArtisanVoiceScript({
              sceneDescription: analysis.sceneDescription,
              colourCheck: analysis.colourCheck,
              lighting: analysis.lighting,
              framing: analysis.framing,
              primaryFix: analysis.primaryFix,
              readyToList: analysis.readyToList,
              confidenceNote: analysis.confidenceNote,
              includeRetakePrompt: !tapOnlyDemo && !analysis.readyToList,
              tapOnlyRetakeCue: tapOnlyDemo && !analysis.readyToList ? TAP_GUIDANCE.retake.ttsSuffix : undefined,
            })
          );
        }
      } else {
        // Second photo, or third+ replaces photo 2 (journey stays two-shot compare)
        const updatedAttempts =
          captureKind === 'replace' ? [attempts[0], attempt] : [...attempts, attempt];
        setAttempts(updatedAttempts);
        setPhase('comparison');

        // App-side deterministic comparison (non-blocking)
        try {
          const { strongerIndex, improvementText } = compareAttempts(
            updatedAttempts[0],
            updatedAttempts[1]
          );

          setStrongerAttemptIndex(strongerIndex);
          setComparisonText(improvementText);

          if (coachingEnabled) {
            coachSpeak(
              tapOnlyDemo
                ? `${improvementText} ${TAP_GUIDANCE.comparison.tts}`
                : improvementText,
            );
          }
        } catch (err) {
          console.warn('[ArtisanJourney] Comparison failed, using fallback:', err);
          // Fallback: assume second is stronger
          setStrongerAttemptIndex(1);
          setComparisonText('Photo two is the stronger one.');

          if (coachingEnabled) {
            coachSpeak(
              tapOnlyDemo
                ? `Photo two is the stronger one. The fix improved the shot. ${TAP_GUIDANCE.comparison.tts}`
                : 'Photo two is the stronger one. The fix improved the shot.',
            );
          }
        }
      }

    } catch (err) {
      console.error('[ArtisanJourney] Analysis failed:', err);
      setError('Failed to analyze photo. Please try again.');
    } finally {
      clearAnalysisStatusTimer();
      setIsProcessing(false);
    }
  };

  // ========== Phase 4: Retry Choice ==========
  const handleRetake = useCallback(() => {
    setPhase('secondCapture');
    if (tapOnlyDemo) {
      setShowLiveCamera(true);
      coachSpeak(TAP_GUIDANCE.camera.tts);
    } else {
      openLiveCamera('Opening camera for a second photo. Apply the fix.');
    }
  }, [openLiveCamera, tapOnlyDemo, coachSpeak]);

  const handleContinueToListing = useCallback(() => {
    setPhase('listing');
    // Tap-only: listing phase effect reads full listing + copy cue (same voice as analysis).
    if (coachingEnabled && !tapOnlyDemo) {
      speak('Generating your listing from the stronger photo.');
    }
  }, [coachingEnabled, tapOnlyDemo]);

  const handleSkipToListing = useCallback(() => {
    handleContinueToListing();
  }, [handleContinueToListing]);

  const copyToClipboard = useCallback((text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    if (coachingEnabled) {
      coachSpeak('Copied to clipboard.');
    }
    setTimeout(() => setCopiedField(null), 2000);
  }, [coachingEnabled, coachSpeak]);

  const handleReadAllTags = useCallback(() => {
    const finalAttempt = attempts[strongerAttemptIndex ?? attempts.length - 1];
    if (finalAttempt?.analysisJSON.tags && finalAttempt.analysisJSON.tags.length > 0) {
      const tagsList = finalAttempt.analysisJSON.tags.join(', ');
      speak(`All tags: ${tagsList}`);
      setShowAllTags(true);
    }
  }, [attempts, strongerAttemptIndex]);

  const copyAllListingText = useCallback(() => {
    const finalAttempt = attempts[strongerAttemptIndex ?? attempts.length - 1];
    if (!finalAttempt) return;
    const a = finalAttempt.analysisJSON;
    const parts = [
      a.listingCopy,
      a.altText ? `Alt text: ${a.altText}` : '',
      a.tags?.length ? `Tags: ${a.tags.join(', ')}` : '',
    ].filter(Boolean);
    copyToClipboard(parts.join('\n\n'), 'all');
  }, [attempts, strongerAttemptIndex, copyToClipboard]);

  // Voice command handler — must stay above all conditional returns (Rules of Hooks)
  const handleVoiceCommand = useCallback((transcript: string) => {
    if (tapOnlyDemo) return;
    const command = parseVoiceCommand(transcript);
    if (!command) return;

    stopSpeaking();

    switch (phase) {
      case 'voicePrompt':
        if (command === 'yes') {
          goToFirstCapture(true);
        } else if (command === 'no') {
          goToFirstCapture(false);
        }
        break;

      case 'firstCapture':
      case 'secondCapture':
        if (command === 'take-photo') {
          if ((window as Window & { __artisanCameraCapture?: () => void }).__artisanCameraCapture) {
            (window as Window & { __artisanCameraCapture?: () => void }).__artisanCameraCapture!();
            speak('Got it. Analyzing now.');
          } else {
            openLiveCamera('Opening camera.');
          }
        }
        break;

      case 'retryChoice':
        if (command === 'yes' || command === 'retry') {
          speak('Opening camera for your second photo.');
          handleRetake();
        } else if (command === 'no' || command === 'continue') {
          handleSkipToListing();
        }
        break;

      case 'comparison':
        if (command === 'continue' || command === 'generate-listing') {
          handleContinueToListing();
          if (voiceEnabled && !tapOnlyDemo) {
            speak('Here is your listing. Say copy to copy everything.');
          }
        }
        break;

      case 'listing':
        if (command === 'copy') {
          copyAllListingText();
        } else if (command === 'read-tags') {
          handleReadAllTags();
        } else if (command === 'start-over') {
          onExit();
        }
        break;
    }
  }, [
    phase,
    voiceEnabled,
    goToFirstCapture,
    openLiveCamera,
    handleRetake,
    handleSkipToListing,
    handleContinueToListing,
    handleReadAllTags,
    copyAllListingText,
    onExit,
    tapOnlyDemo,
  ]);

  handleVoiceCommandRef.current = handleVoiceCommand;

  useEffect(() => {
    if (tapOnlyDemo) return;
    if (!voiceCommandsEnabled) {
      if (isCurrentlyListening()) stopListening();
      return;
    }
    if (!voiceListeningPrimed) return;
    if (!isCurrentlyListening()) {
      startListening((transcript) => handleVoiceCommandRef.current(transcript), true);
    }
  }, [tapOnlyDemo, voiceCommandsEnabled, voiceListeningPrimed]);


  // Tap-only welcome: auto-coach on entry (same speak() voice as listing readout).
  useEffect(() => {
    if (!tapOnlyDemo || phase !== 'demoWelcome') return;
    primeSpeechVoices();
    const t = window.setTimeout(() => speakDemoWelcome(), 400);
    return () => window.clearTimeout(t);
  }, [tapOnlyDemo, phase, speakDemoWelcome]);

  const hasGreeted = useRef(false);
  useEffect(() => {
    if (phase === 'voicePrompt' && !hasGreeted.current) {
      hasGreeted.current = true;
      stopSpeaking();
      setTimeout(() => {
        speak(
          'Welcome to L.E.N.S. Artisan Studio. I will help you photograph your craft and build a listing. Tap Yes to enable voice commands, or No to use buttons only.'
        );
      }, 500);
    }
  }, [phase]);

  useEffect(() => {
    if (phase === 'retryChoice' && retakeButtonRef.current) {
      retakeButtonRef.current.focus();
    } else if (phase === 'listing' && listingButtonRef.current) {
      listingButtonRef.current.focus();
    } else if (mainContentRef.current) {
      mainContentRef.current.focus();
    }
  }, [phase]);

  const hasSpokenListing = useRef(false);
  useEffect(() => {
    if (phase !== 'listing') {
      hasSpokenListing.current = false;
      return;
    }
    if (!coachingEnabled || hasSpokenListing.current) return;

    const finalAttempt = attempts[strongerAttemptIndex ?? attempts.length - 1];
    if (!finalAttempt) return;

    hasSpokenListing.current = true;
    const a = finalAttempt.analysisJSON;
    const closingCue = tapOnlyDemo
      ? TAP_GUIDANCE.listing.ttsSuffix
      : voiceCommandsEnabled
        ? 'Tap copy listing for Etsy, or say copy.'
        : 'Tap copy listing for Etsy.';
    const voiceText = [
      'Your listing is ready.',
      a.listingCopy,
      a.altText ? `Alt text: ${a.altText}` : '',
      a.tags?.length ? `Tags: ${a.tags.slice(0, 5).join(', ')}` : '',
      closingCue,
    ].filter(Boolean).join(' ');
    coachSpeak(voiceText);
  }, [phase, coachingEnabled, tapOnlyDemo, voiceCommandsEnabled, attempts, strongerAttemptIndex, coachSpeak]);

  // ========== Render Phases ==========

  // Error state - MUST be checked FIRST
  if (error) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-12" ref={mainContentRef} tabIndex={-1}>
        <div className="rounded-2xl bg-red-50 border-2 border-red-200 p-8 text-center" role="alert" aria-live="assertive">
          <p className="text-red-700 font-medium mb-4">{error}</p>
          <button
            onClick={() => {
              setError(null);
              setPhase('firstCapture');
              setIsProcessing(false);
            }}
            className="px-6 py-3 bg-[#C06B45] hover:bg-[#A6552F] text-white rounded-full font-semibold"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Tap-only demo welcome (LAN / ?record=1)
  if (phase === 'demoWelcome') {
    return (
      <div
        className="max-w-2xl mx-auto px-6 py-16 text-center"
        ref={mainContentRef}
        tabIndex={-1}
        onPointerDown={() => {
          unlockSpeechForSession();
          speakDemoWelcome();
        }}
      >
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#C06B45] text-white text-sm font-bold uppercase tracking-wide mb-6">
            <AudioLines className="w-4 h-4" />
            Voice-guided coaching
          </div>
          <h1 className="text-4xl md:text-5xl font-bold font-serif text-[#241F18] leading-tight mb-4">
            {TAP_GUIDANCE.welcome.title}
          </h1>
          <p className={`${TAP_HINT_CLASS} mb-8`}>{TAP_GUIDANCE.welcome.hint}</p>
        </div>
        <button
          type="button"
          onClick={handleDemoWelcomeStart}
          className={`${TAP_BTN_PRIMARY} max-w-md mx-auto`}
          aria-label={TAP_LABELS.start}
        >
          {TAP_LABELS.start}
        </button>
        <div role="status" aria-live="polite" className="sr-only">
          {TAP_GUIDANCE.welcome.hint}
        </div>
      </div>
    );
  }

  // Phase 0: Voice Prompt (standard path — not LAN demo)
  if (phase === 'voicePrompt') {
    return (
      <div className="max-w-2xl mx-auto px-6 py-16 text-center" ref={mainContentRef} tabIndex={-1}>
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#C06B45] text-white text-sm font-bold uppercase tracking-wide mb-6">
            <AudioLines className="w-4 h-4" />
            Voice-First Coaching
          </div>
          <h1 className="text-4xl md:text-5xl font-bold font-serif text-[#241F18] leading-tight mb-4">
            Turn on voice commands?
          </h1>
          <p className="text-lg text-[#3D362B] leading-relaxed max-w-xl mx-auto mb-8">
            Tap Yes to enable voice coaching, or use buttons only.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onPointerDown={() => unlockSpeechForSession()}
            onClick={() => goToFirstCapture(true)}
            className="inline-flex items-center gap-3 px-8 py-4 bg-[#C06B45] hover:bg-[#A6552F] text-white rounded-full text-lg font-bold shadow-xl transition-colors focus:outline-none focus:ring-4 focus:ring-[#C06B45]/50"
            aria-label="Enable voice commands"
          >
            <AudioLines className="w-5 h-5" />
            <span>Yes, Enable Voice</span>
          </button>

          <button
            onClick={() => goToFirstCapture(false)}
            className="inline-flex items-center gap-3 px-8 py-4 bg-[#F4ECDC] border-2 border-[#D8CDB8] hover:border-[#C06B45] text-[#241F18] rounded-full text-lg font-bold transition-colors focus:outline-none focus:ring-4 focus:ring-[#C06B45]/50"
            aria-label="Use buttons instead"
          >
            <span>No, Use Buttons</span>
          </button>
        </div>

        <div
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className="sr-only"
        >
          Welcome to L.E.N.S. Would you like to enable voice commands?
        </div>
      </div>
    );
  }


  // Camera capture (live view opens right after voice prompt)
  if (phase === 'firstCapture' || phase === 'secondCapture') {
    const isSecond = phase === 'secondCapture';
    const isReplaceShot = isSecond && attempts.length >= 2;
    const processingKind: ArtisanCaptureKind = isSecond
      ? isReplaceShot
        ? 'replace'
        : 'compare'
      : 'first';
    const processingStatus = getAnalysisStatusCopy(processingKind);
    const promptText = isSecond && attempts[0]?.analysisJSON?.primaryFix
      ? `Remember: ${attempts[0].analysisJSON.primaryFix}`
      : 'Position your craft in good light';

    // Show live camera if requested
    if (showLiveCamera) {
      return (
        <LiveCameraCapture
          onCapture={(imageDataUrl) => {
            setShowLiveCamera(false);
            handleImageCapture(imageDataUrl);
          }}
          onClose={() => setShowLiveCamera(false)}
          tapOnlyHero={tapOnlyDemo}
          tapHint={tapOnlyDemo ? TAP_GUIDANCE.camera.hint : undefined}
          promptText={promptText}
          buttonLabel={TAP_LABELS.takePhoto}
        />
      );
    }

    // Show processing screen if analyzing second photo
    if (isSecond && isProcessing) {
      return (
        <div className="max-w-2xl mx-auto px-6 py-12" ref={mainContentRef} tabIndex={-1}>
          <div
            className="rounded-2xl bg-[#F4ECDC] border-2 border-[#D8CDB8] p-12 text-center"
            role="status"
            aria-live="polite"
            aria-busy="true"
          >
            <Loader2 className="w-12 h-12 text-[#C06B45] animate-spin mx-auto mb-4" />
            <p className="text-xl font-bold text-[#241F18] mb-2">
              {processingStatus.screenTitle}
            </p>
            <p className="text-[#3D362B]">{processingStatus.screenDetail}</p>
          </div>
        </div>
      );
    }

    // Camera launch screen
    return (
      <div className="max-w-2xl mx-auto px-6 py-12" ref={mainContentRef} tabIndex={-1}>
        <div className="rounded-2xl bg-[#F4ECDC] border-2 border-[#D8CDB8] p-12 text-center">
          <Camera className="w-16 h-16 text-[#C06B45] mx-auto mb-6" />
          <h2 className="text-2xl font-bold text-[#241F18] mb-3">
            {isSecond
              ? isReplaceShot
                ? 'Take another photo'
                : 'Take your second photo'
              : 'Take your first photo'}
          </h2>
          <p className="text-[#3D362B] mb-6">{promptText}</p>

          <button
            onPointerDown={() => {
              if (voiceCommandsEnabled) primeVoiceListening();
            }}
            onClick={() => openLiveCamera('Opening camera. ' + promptText)}
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#C06B45] hover:bg-[#A6552F] text-white rounded-full font-semibold focus:outline-none focus:ring-4 focus:ring-[#C06B45]/50"
            aria-label={isSecond ? "Open camera for second photo" : "Open camera for first photo"}
          >
            <Camera className="w-5 h-5" />
            <span>Open Camera</span>
          </button>

          {voiceCommandsEnabled && (
            <p className="text-sm text-[#3D362B] mt-4">
              Say "take photo" or tap the button above
            </p>
          )}
        </div>
      </div>
    );
  }

  // Phase 3: First Analysis (processing)
  if (phase === 'firstAnalysis' && isProcessing) {
    const firstStatus = getAnalysisStatusCopy('first');
    return (
      <div className="max-w-2xl mx-auto px-6 py-12" ref={mainContentRef} tabIndex={-1}>
        <div
          className="rounded-2xl bg-[#F4ECDC] border-2 border-[#D8CDB8] p-12 text-center"
          role="status"
          aria-live="polite"
          aria-busy="true"
        >
          <Loader2 className="w-12 h-12 text-[#C06B45] animate-spin mx-auto mb-4" />
          <p className="text-xl font-bold text-[#241F18] mb-2">{firstStatus.screenTitle}</p>
          <p className="text-[#3D362B]">{firstStatus.screenDetail}</p>
        </div>
      </div>
    );
  }

  // Phase 4: Retry Choice
  if (phase === 'retryChoice' && attempts.length > 0) {
    const currentAttempt = attempts[attempts.length - 1];
    const analysis = currentAttempt.analysisJSON;

    return (
      <div className="max-w-4xl mx-auto px-6 py-8" ref={mainContentRef} tabIndex={-1}>
        {/* Photo + Analysis */}
        <div className="flex flex-col md:flex-row gap-6 mb-8">
          <div className="w-full md:w-96 shrink-0 rounded-2xl overflow-hidden border-2 border-[#D8CDB8]">
            <img
              src={currentAttempt.image}
              alt={currentAttempt.analysisJSON.sceneDescription || 'Your craft photo'}
              className="w-full object-contain"
            />
          </div>

          <div className="flex-1 space-y-4">
            <div className="flex flex-wrap gap-2 items-center">
              <div
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border-2 ${
                  analysis.readyToList
                    ? 'bg-[#A9B8BE] text-[#241F18] border-[#2F4858]'
                    : 'bg-amber-100 text-amber-700 border-amber-200'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span className="text-sm font-bold">
                  {analysis.readyToList ? 'Ready to List' : 'One fix will strengthen this'}
                </span>
              </div>

              {/* Inference source badge */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#F4ECDC] border border-[#D8CDB8]">
                <Sparkles className="w-3 h-3 text-[#3D362B]" />
                <span className="text-xs font-medium text-[#3D362B]">
                  {getArtisanInferenceBadge(currentInferenceSource)}
                </span>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-[#3D362B] uppercase tracking-wider mb-2">
                What I See
              </p>
              <p className="text-xl font-semibold text-[#241F18]">
                {analysis.sceneDescription}
              </p>
            </div>

            {analysis.colourCheck && (
              <div
                className="p-5 rounded-2xl bg-[#F4ECDC] border-2 border-[#C06B45]/40"
                role="region"
                aria-label="Colour check"
              >
                <p className="text-xs font-semibold text-[#AB3B24] uppercase tracking-wider mb-2">
                  Colour check
                </p>
                <p className="text-lg font-semibold text-[#241F18]">{analysis.colourCheck}</p>
                <p className="text-sm text-[#3D362B] mt-1">
                  Confirm this matches how your product looks in person.
                </p>
              </div>
            )}

            {analysis.confidenceNote?.trim() && (
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200" role="note">
                <p className="text-xs font-semibold text-[#78350F] uppercase tracking-wider mb-1">
                  Honesty note
                </p>
                <p className="text-sm text-[#241F18]">{analysis.confidenceNote}</p>
              </div>
            )}

            {analysis.primaryFix && !analysis.readyToList && (
              <div className="p-5 rounded-2xl bg-[#A9B8BE] border-2 border-[#2F4858]">
                <div className="flex items-center gap-2 mb-2">
                  <Lightbulb className="w-4 h-4 text-[#2F4858]" />
                  <p className="text-xs font-bold text-[#241F18] uppercase tracking-wider">
                    Your Next Step
                  </p>
                </div>
                <p className="text-[#241F18]">{analysis.primaryFix}</p>
              </div>
            )}

            {/* Framing + Lighting */}
            {(analysis.framing || analysis.lighting) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {analysis.framing && (
                  <div className="p-4 rounded-xl bg-[#F4ECDC] border border-[#D8CDB8]">
                    <div className="flex items-center gap-2 mb-2">
                      <Grid3X3 className="w-3.5 h-3.5 text-[#3D362B]" />
                      <p className="text-xs font-semibold text-[#3D362B] uppercase tracking-wider">
                        Framing
                      </p>
                    </div>
                    <p className="text-sm text-[#241F18]">{analysis.framing}</p>
                  </div>
                )}
                {analysis.lighting && (
                  <div className="p-4 rounded-xl bg-[#F4ECDC] border border-[#D8CDB8]">
                    <div className="flex items-center gap-2 mb-2">
                      <Sun className="w-3.5 h-3.5 text-[#3D362B]" />
                      <p className="text-xs font-semibold text-[#3D362B] uppercase tracking-wider">
                        Lighting
                      </p>
                    </div>
                    <p className="text-sm text-[#241F18]">{analysis.lighting}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Choice buttons */}
        <div
          className="flex flex-col sm:flex-row gap-4 justify-center"
          role="group"
          aria-label="Choose next action"
        >
          {!analysis.readyToList && (
            <button
              ref={retakeButtonRef}
              onClick={handleRetake}
              className={
                tapOnlyDemo
                  ? `${TAP_BTN_PRIMARY} inline-flex items-center justify-center gap-2`
                  : 'inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#C06B45] hover:bg-[#A6552F] text-white rounded-full font-semibold focus:outline-none focus:ring-4 focus:ring-[#C06B45]/50'
              }
              aria-label={tapOnlyDemo ? TAP_LABELS.takeAnotherPhoto : 'Retake photo with the suggested fix'}
            >
              <Camera className="w-5 h-5" />
              <span>{tapOnlyDemo ? TAP_LABELS.takeAnotherPhoto : 'Retake with Fix'}</span>
            </button>
          )}
          <button
            ref={!analysis.readyToList ? undefined : retakeButtonRef}
            onClick={handleSkipToListing}
            className={
              tapOnlyDemo
                ? `${TAP_BTN_SECONDARY} inline-flex items-center justify-center gap-2`
                : 'inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#F4ECDC] border-2 border-[#D8CDB8] hover:border-[#C06B45] text-[#241F18] rounded-full font-semibold focus:outline-none focus:ring-4 focus:ring-[#C06B45]/50'
            }
            aria-label="Skip to listing generation"
          >
            <span>I'm happy with this</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {tapOnlyDemo && !analysis.readyToList && (
          <p className={`${TAP_HINT_CLASS} mt-6`}>{TAP_GUIDANCE.retake.hint}</p>
        )}

        {/* Voice prompt hint */}
        {voiceCommandsEnabled && !tapOnlyDemo && !analysis.readyToList && (
          <p className="text-center text-sm text-[#3D362B] mt-4">
            <AudioLines className="inline w-4 h-4 mr-1" />
            Say "yes" to retake or tap the button above
          </p>
        )}

        {/* ARIA announcer */}
        <div
          ref={phaseAnnouncerRef}
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className="sr-only"
        >
          Analysis complete. {analysis.sceneDescription}.
          {analysis.colourCheck ? `Colour check: ${analysis.colourCheck}.` : ''}
          {analysis.confidenceNote ? `Note: ${analysis.confidenceNote}.` : ''}
          {analysis.readyToList
            ? 'Ready to list.'
            : `Next step: ${analysis.primaryFix}`}
        </div>
      </div>
    );
  }

  // Phase 6: Comparison
  if (phase === 'comparison' && attempts.length >= 2 && strongerAttemptIndex !== null) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-8" ref={mainContentRef} tabIndex={-1}>
        <h2 className="text-2xl font-bold text-[#241F18] mb-2">Photo Comparison</h2>
        <p className="text-[#3D362B] mb-6">Same craft, two shots</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {attempts.map((attempt, idx) => {
            const isStronger = idx === strongerAttemptIndex;
            return (
              <div
                key={idx}
                className={`rounded-2xl overflow-hidden border-2 ${
                  isStronger
                    ? 'border-[#2F4858] bg-[#A9B8BE]'
                    : 'border-[#D8CDB8] bg-[#F4ECDC] opacity-70'
                }`}
              >
                <div className="relative">
                  <img
                    src={attempt.image}
                    alt={`Photo ${idx + 1}`}
                    className="w-full h-64 object-cover"
                  />
                  <div className="absolute top-3 left-3 px-3 py-1 bg-white/90 rounded-full text-xs font-bold">
                    Photo {idx + 1}
                  </div>
                  {isStronger && (
                    <div className="absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1 bg-[#2F4858] text-white rounded-full text-xs font-bold">
                      <Sparkles className="w-3 h-3" />
                      <span>Stronger</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="rounded-2xl bg-[#F4ECDC] border-2 border-[#D8CDB8] p-6 mb-6">
          <p className="text-[#241F18] mb-4">
            {comparisonText || `Photo ${strongerAttemptIndex + 1} is the stronger one.`}
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleContinueToListing}
              className={
                tapOnlyDemo
                  ? `${TAP_BTN_PRIMARY} inline-flex items-center justify-center gap-2`
                  : 'inline-flex items-center gap-2 px-6 py-3 bg-[#C06B45] hover:bg-[#A6552F] text-white rounded-full font-semibold focus:outline-none focus:ring-4 focus:ring-[#C06B45]/50'
              }
              aria-label={tapOnlyDemo ? TAP_LABELS.continueToListing : 'Generate listing from stronger photo'}
            >
              <span>{tapOnlyDemo ? TAP_LABELS.continueToListing : 'Generate Listing'}</span>
              <ArrowRight className="w-5 h-5" />
            </button>
            {!tapOnlyDemo && (
              <button
                type="button"
                onClick={() => {
                  setPhase('secondCapture');
                  if (coachingEnabled) {
                    speak('Opening camera for another attempt.');
                  }
                }}
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#F4ECDC] border-2 border-[#D8CDB8] hover:border-[#C06B45] text-[#241F18] rounded-full font-semibold focus:outline-none focus:ring-4 focus:ring-[#C06B45]/50"
              >
                <Camera className="w-4 h-4" />
                <span>Try Another Photo</span>
              </button>
            )}
          </div>
        </div>

        {tapOnlyDemo && (
          <p className={`${TAP_HINT_CLASS} mt-6`}>{TAP_GUIDANCE.comparison.hint}</p>
        )}

        <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
          {comparisonText || `Photo ${strongerAttemptIndex + 1} is stronger.`}
        </div>
      </div>
    );
  }


  // Phase 7: Listing
  if (phase === 'listing') {
    const finalAttempt = attempts[strongerAttemptIndex ?? attempts.length - 1];

    if (!finalAttempt) {
      return (
        <div className="max-w-2xl mx-auto px-6 py-12" ref={mainContentRef} tabIndex={-1}>
          <div className="rounded-2xl bg-amber-50 border-2 border-amber-200 p-8 text-center" role="alert">
            <p className="text-amber-800 font-medium mb-4">No photo selected for listing.</p>
            <button
              onClick={() => setPhase('firstCapture')}
              className="px-6 py-3 bg-[#C06B45] hover:bg-[#A6552F] text-white rounded-full font-semibold"
            >
              Start Over
            </button>
          </div>
        </div>
      );
    }

    const analysis = finalAttempt.analysisJSON;

    return (
      <div className="max-w-4xl mx-auto px-6 py-8" ref={mainContentRef} tabIndex={-1}>
        <h2 className="text-2xl font-bold text-[#241F18] mb-2">Your marketplace listing</h2>
        <p className="text-[#3D362B] mb-6">
          From your stronger photo — copy and paste into Etsy or Shopify.
        </p>

        <div className="flex flex-col md:flex-row gap-6 mb-8">
          <div className="w-full md:w-80 shrink-0 rounded-2xl overflow-hidden border-2 border-[#2F4858] bg-[#A9B8BE]">
            <img
              src={finalAttempt.image}
              alt="Winning product photo"
              className="w-full object-contain"
            />
          </div>

          <div className="flex-1">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#A9B8BE] border-2 border-[#2F4858] text-[#241F18] mb-4">
              <CheckCircle2 className="w-4 h-4" />
              <span className="text-sm font-bold">Ready to list</span>
            </div>
            <p className="text-lg font-semibold text-[#241F18]">{analysis.subject}</p>
          </div>
        </div>

        <div className="rounded-2xl bg-[#F4ECDC] border-2 border-[#D8CDB8] p-6 mb-6">
          <div className="flex items-center gap-2 mb-6">
            <FileText className="w-4 h-4 text-[#C06B45]" />
            <h3 className="text-sm font-bold text-[#241F18] uppercase tracking-wider">Listing assets</h3>
          </div>

          <div className="space-y-5">
            {analysis.listingCopy && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-[#3D362B] uppercase tracking-wider">Product description</p>
                  <button
                    onClick={() => copyToClipboard(analysis.listingCopy, 'description')}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                      copiedField === 'description' ? 'bg-[#A9B8BE] text-[#241F18]' : 'bg-[#ECE3D2] hover:bg-[#D8CDB8] text-[#3D362B]'
                    }`}
                    aria-label="Copy product description"
                  >
                    {copiedField === 'description' ? (
                      <><CheckCircle2 className="w-3 h-3" /> Copied</>
                    ) : (
                      <><Copy className="w-3 h-3" /> Copy</>
                    )}
                  </button>
                </div>
                <p className="text-[#241F18] bg-[#ECE3D2] rounded-xl p-4 text-sm">{analysis.listingCopy}</p>
              </div>
            )}

            {analysis.altText && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-[#3D362B] uppercase tracking-wider flex items-center gap-1.5">
                    <Accessibility className="w-3 h-3" /> Alt text
                  </p>
                  <button
                    onClick={() => copyToClipboard(analysis.altText, 'altText')}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                      copiedField === 'altText' ? 'bg-[#A9B8BE] text-[#241F18]' : 'bg-[#ECE3D2] hover:bg-[#D8CDB8] text-[#3D362B]'
                    }`}
                    aria-label="Copy alt text"
                  >
                    {copiedField === 'altText' ? (
                      <><CheckCircle2 className="w-3 h-3" /> Copied</>
                    ) : (
                      <><Copy className="w-3 h-3" /> Copy</>
                    )}
                  </button>
                </div>
                <p className="text-[#241F18] bg-[#ECE3D2] rounded-xl p-4 text-sm">{analysis.altText}</p>
              </div>
            )}

                        <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-[#3D362B] uppercase tracking-wider">
                  Marketplace tags
                </p>
                {analysis.tags && analysis.tags.length > 0 && (
                  <button
                    onClick={handleReadAllTags}
                    className="text-xs font-semibold text-[#C06B45] hover:text-[#A6552F] underline"
                    aria-label="Read all tags aloud"
                  >
                    Read aloud
                  </button>
                )}
              </div>
              {analysis.tags && analysis.tags.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {(showAllTags ? analysis.tags : analysis.tags.slice(0, 12)).map((tag) => (
                    <span
                      key={tag}
                      className="px-3 py-1 rounded-full bg-[#ECE3D2] border border-[#D8CDB8] text-sm text-[#241F18]"
                    >
                      {tag}
                    </span>
                  ))}
                  {!showAllTags && analysis.tags.length > 12 && (
                    <button
                      type="button"
                      onClick={() => setShowAllTags(true)}
                      className="px-3 py-1 text-sm font-semibold text-[#C06B45] underline"
                    >
                      +{analysis.tags.length - 12} more
                    </button>
                  )}
                </div>
              ) : (
                <p className="text-sm text-[#3D362B] bg-[#ECE3D2] rounded-xl p-4">
                  No tags returned — add 5–8 Etsy search terms from your description.
                </p>
              )}
            </div>
          </div>
        </div>

        {tapOnlyDemo && (
          <p className={`${TAP_HINT_CLASS} mb-6`}>{TAP_GUIDANCE.listing.hint}</p>
        )}

        <div className="flex flex-wrap gap-3 justify-center">
          <button
            ref={listingButtonRef}
            onClick={copyAllListingText}
            className={
              tapOnlyDemo
                ? `${TAP_BTN_PRIMARY} inline-flex items-center justify-center gap-2`
                : 'inline-flex items-center gap-2 px-6 py-3 bg-[#C06B45] hover:bg-[#A6552F] text-white rounded-full font-semibold focus:outline-none focus:ring-4 focus:ring-[#C06B45]/50'
            }
            aria-label={tapOnlyDemo ? TAP_LABELS.copyListing : 'Copy all listing text for Etsy'}
          >
            <Copy className="w-5 h-5" />
            <span>
              {copiedField === 'all'
                ? 'Copied!'
                : tapOnlyDemo
                  ? TAP_LABELS.copyListing
                  : 'Copy listing for Etsy'}
            </span>
          </button>
          <button
            onClick={onExit}
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#F4ECDC] border-2 border-[#D8CDB8] hover:border-[#C06B45] text-[#241F18] rounded-full font-semibold"
            aria-label="Finish and return"
          >
            Done
          </button>
        </div>

        <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
          Listing ready. {analysis.listingCopy}
        </div>
      </div>
    );
  }


  // Fallback - This should never show, but if it does, we need to know why
  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      <div className="rounded-2xl bg-yellow-50 border-2 border-yellow-200 p-8">
        <h2 className="text-xl font-bold text-yellow-800 mb-4">Unexpected State - Debug Info</h2>
        <div className="space-y-2 text-sm text-left">
          <p><strong>Phase:</strong> {phase}</p>
          <p><strong>Attempts:</strong> {attempts.length}</p>
          <p><strong>Stronger Index:</strong> {strongerAttemptIndex ?? 'null'}</p>
          <p><strong>Is Processing:</strong> {isProcessing ? 'yes' : 'no'}</p>
          <p><strong>Show Live Camera:</strong> {showLiveCamera ? 'yes' : 'no'}</p>
          <p><strong>Voice Enabled:</strong> {voiceEnabled ? 'yes' : 'no'}</p>
          <p className="pt-4 text-xs text-gray-600">
            This fallback should never render. If you see this, something is wrong with the phase logic.
          </p>
        </div>
        <button
          onClick={() => {
            setPhase('firstCapture');
            setAttempts([]);
            setStrongerAttemptIndex(null);
          }}
          className="mt-6 px-6 py-3 bg-yellow-600 text-white rounded-full"
        >
          Reset and Start Over
        </button>
      </div>
    </div>
  );
};

export default ArtisanJourney;
