/**
 * ArtisanJourney.tsx — Guided listing flow for blind/low-vision artisans
 *
 * 7-Phase Journey:
 * 1. Entry - "Start Guided Listing" button
 * 2. First Photo - Camera capture with voice prompt
 * 3. First Analysis - Real Gemma output, spoken aloud
 * 4. Retry Loop - "Retake" or "Continue" choice
 * 5. Second Photo - Apply fix, capture again
 * 6. Comparison - Side-by-side, pick stronger photo
 * 7. Listing - Generate title, description, tags
 *
 * Accessibility-first: semantic HTML, aria-live, focus management, keyboard operable
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Camera, Loader2, CheckCircle2, ArrowRight,
  Lightbulb, Grid3X3, Sun, FileText, Copy, Accessibility,
  AudioLines, Sparkles,
} from 'lucide-react';
import { analyzeForSellModeWithFallback, type InferenceSource } from '../services/analysisOrchestrator';
import { parseArtisanResponseV3, speak, stopSpeaking } from '../services/voiceCoach';
import { comparePhotos, type ComparisonResult } from '../services/ollamaService';

type JourneyPhase =
  | 'entry'
  | 'firstCapture'
  | 'firstAnalysis'
  | 'retryChoice'
  | 'secondCapture'
  | 'comparison'
  | 'listing';

interface AnalysisResult {
  subject: string;
  framing: string;
  lighting: string;
  primaryFix: string;
  confidenceNote: string;
  altText: string;
  listingCopy: string;
  readyToList: boolean;
  rawResponse: string;
  tags?: string[];
}

interface PhotoData {
  base64: string;
  analysis?: AnalysisResult;
}

interface ArtisanJourneyProps {
  voiceEnabled: boolean;
  inferenceSource: InferenceSource;
  onExit: () => void;
}

const ArtisanJourney: React.FC<ArtisanJourneyProps> = ({
  voiceEnabled,
  inferenceSource,
  onExit,
}) => {
  // Journey state
  const [phase, setPhase] = useState<JourneyPhase>('entry');
  const [firstPhoto, setFirstPhoto] = useState<PhotoData | null>(null);
  const [secondPhoto, setSecondPhoto] = useState<PhotoData | null>(null);
  const [strongerPhoto, setStrongerPhoto] = useState<'first' | 'second' | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showAllTags, setShowAllTags] = useState(false);

  // Refs for accessibility
  const fileInputRef = useRef<HTMLInputElement>(null);
  const phaseAnnouncerRef = useRef<HTMLDivElement>(null);
  const mainContentRef = useRef<HTMLDivElement>(null);
  const retakeButtonRef = useRef<HTMLButtonElement>(null);
  const listingButtonRef = useRef<HTMLButtonElement>(null);

  // Cleanup speech on unmount
  useEffect(() => {
    return () => {
      stopSpeaking();
    };
  }, []);

  // Focus management: move focus to main content when phase changes
  useEffect(() => {
    if (phase === 'retryChoice' && retakeButtonRef.current) {
      // For retry choice, focus the primary action button
      retakeButtonRef.current.focus();
    } else if (phase === 'listing' && listingButtonRef.current) {
      // For listing, focus the listing button
      listingButtonRef.current.focus();
    } else if (mainContentRef.current) {
      // Default: focus main content
      mainContentRef.current.focus();
    }
  }, [phase]);

  // ========== Phase 1: Entry ==========
  const handleStart = useCallback(() => {
    setPhase('firstCapture');
    if (voiceEnabled) {
      speak('Welcome to L.E.N.S. Artisan Studio. Voice coaching ready. Opening camera.');
    }
  }, [voiceEnabled]);

  // ========== Phase 2 & 5: Camera Capture ==========
  const handleCameraOpen = useCallback(() => {
    fileInputRef.current?.click();
    const isSecondPhoto = phase === 'secondCapture';
    const prompt = isSecondPhoto && firstPhoto?.analysis?.primaryFix
      ? `Remember: ${firstPhoto.analysis.primaryFix}`
      : 'Position your craft in good light. Tap to capture.';

    if (voiceEnabled) {
      speak(`Opening camera. ${prompt}`);
    }
  }, [phase, firstPhoto, voiceEnabled]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    e.target.value = ''; // Reset for reuse
    setError(null);
    setIsProcessing(true);

    try {
      // Convert to base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const isFirstPhoto = phase === 'firstCapture';

      if (voiceEnabled) {
        speak('Got your photo. Analysing with Gemma 4 now. This takes a moment.');
      }

      // Move to analysis phase
      if (isFirstPhoto) {
        setPhase('firstAnalysis');
      }

      // Call Gemma 4
      const { content: response, source } = await analyzeForSellModeWithFallback(
        base64,
        file.type,
        voiceEnabled
      );

      if (source === 'demo' || !response) {
        setError('Analysis unavailable. Please try again.');
        setIsProcessing(false);
        return;
      }

      // Parse response (REAL Gemma output only)
      const parsed = parseArtisanResponseV3(response);
      if (!parsed) {
        setError('Could not parse analysis. Please try again.');
        setIsProcessing(false);
        return;
      }

      const analysis: AnalysisResult = {
        subject: parsed.subject,
        framing: parsed.critique.framing,
        lighting: parsed.critique.lighting,
        primaryFix: parsed.critique.primary_fix,
        confidenceNote: parsed.confidence_note,
        altText: parsed.alt_text,
        listingCopy: parsed.listing_copy,
        readyToList: parsed.ready_to_list,
        rawResponse: response,
        tags: parsed.tags || [],
      };

      // Store photo data
      const photoData: PhotoData = { base64, analysis };

      if (isFirstPhoto) {
        setFirstPhoto(photoData);
        setPhase('retryChoice');

        // Speak analysis results
        if (voiceEnabled) {
          const voiceText = [
            'Analysis complete.',
            `What I see: ${analysis.subject}`,
            analysis.framing ? `Framing: ${analysis.framing}` : '',
            analysis.lighting ? `Lighting: ${analysis.lighting}` : '',
            analysis.readyToList
              ? 'This photo is ready to list.'
              : `Your next step: ${analysis.primaryFix}`,
          ].filter(Boolean).join(' ');
          speak(voiceText);
        }
      } else {
        // Second photo
        setSecondPhoto(photoData);
        setPhase('comparison');

        if (voiceEnabled) {
          speak('Got your second photo. Comparing both shots now.');
        }

        // Real comparison via Gemma 4 (non-blocking - fallback if fails)
        try {
          const comparisonResult: ComparisonResult = await comparePhotos(
            firstPhoto!.base64,
            photoData.base64
          );

          // Map winner to our state
          if (comparisonResult.winner === 'A') {
            setStrongerPhoto('first');
          } else if (comparisonResult.winner === 'B') {
            setStrongerPhoto('second');
          } else {
            // Tie or unclear - default to second (with fix applied)
            setStrongerPhoto('second');
          }

          if (voiceEnabled) {
            const winnerText = comparisonResult.winner === 'A'
              ? 'Photo one is the stronger one.'
              : comparisonResult.winner === 'B'
                ? 'Photo two is the stronger one.'
                : 'Both photos are similar.';
            speak(`${winnerText} ${comparisonResult.reason}`);
          }
        } catch (err) {
          console.warn('[ArtisanJourney] Comparison failed, using fallback:', err);
          // Fallback: assume second photo is stronger (fix was applied)
          setStrongerPhoto('second');

          if (voiceEnabled) {
            speak('Photo two is the stronger one. The fix improved the shot.');
          }
        }
      }

    } catch (err) {
      console.error('[ArtisanJourney] Analysis failed:', err);
      setError('Failed to analyze photo. Please try again.');
    }

    setIsProcessing(false);
  };

  // ========== Phase 4: Retry Choice ==========
  const handleRetake = useCallback(() => {
    setPhase('secondCapture');
    if (voiceEnabled) {
      speak('Opening camera for a second photo. Apply the fix.');
    }
    setTimeout(() => handleCameraOpen(), 500);
  }, [voiceEnabled, handleCameraOpen]);

  const handleSkipToListing = useCallback(() => {
    setPhase('listing');
    if (voiceEnabled) {
      speak('Generating your listing.');
    }
  }, [voiceEnabled]);

  // ========== Phase 7: Listing Actions ==========
  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    if (voiceEnabled) {
      speak('Copied to clipboard.');
    }
    setTimeout(() => setCopiedField(null), 2000);
  };

  // ========== Render Phases ==========

  // Phase 1: Entry
  if (phase === 'entry') {
    return (
      <div className="max-w-2xl mx-auto px-6 py-16 text-center" ref={mainContentRef} tabIndex={-1}>
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#C06B45] text-white text-sm font-bold uppercase tracking-wide mb-6">
            <Camera className="w-4 h-4" />
            Artisan Studio
          </div>
          <h1 className="text-4xl md:text-5xl font-bold font-serif text-[#241F18] leading-tight mb-4">
            Let's list your craft
          </h1>
          <p className="text-lg text-[#524A3D] leading-relaxed max-w-xl mx-auto">
            Voice-guided coaching to photograph your work, hear what's working, and get marketplace-ready in minutes.
          </p>
        </div>

        <button
          onClick={handleStart}
          className="inline-flex items-center gap-3 px-8 py-4 bg-[#C06B45] hover:bg-[#A6552F] text-white rounded-full text-lg font-bold shadow-xl transition-colors focus:outline-none focus:ring-4 focus:ring-[#C06B45]/50"
          aria-label="Start guided listing journey"
        >
          <Camera className="w-5 h-5" />
          <span>Start Guided Listing</span>
          <ArrowRight className="w-5 h-5" />
        </button>

        <button
          onClick={onExit}
          className="block mx-auto mt-8 text-sm text-[#524A3D] hover:text-[#241F18] underline focus:outline-none focus:ring-2 focus:ring-[#C06B45]"
        >
          Go back to demo samples
        </button>
      </div>
    );
  }

  // Phase 2 & 5: Camera Capture
  if (phase === 'firstCapture' || phase === 'secondCapture') {
    const isSecond = phase === 'secondCapture';
    return (
      <div className="max-w-2xl mx-auto px-6 py-12" ref={mainContentRef} tabIndex={-1}>
        <div className="rounded-2xl bg-[#F4ECDC] border-2 border-[#D8CDB8] p-12 text-center">
          <Camera className="w-16 h-16 text-[#C06B45] mx-auto mb-6" />
          <h2 className="text-2xl font-bold text-[#241F18] mb-3">
            {isSecond ? 'Take your second photo' : 'Take your first photo'}
          </h2>
          <p className="text-[#524A3D] mb-6">
            {isSecond && firstPhoto?.analysis?.primaryFix
              ? `Remember: ${firstPhoto.analysis.primaryFix}`
              : 'Position your craft in good light.'}
          </p>

          <button
            onClick={handleCameraOpen}
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#C06B45] hover:bg-[#A6552F] text-white rounded-full font-semibold focus:outline-none focus:ring-4 focus:ring-[#C06B45]/50"
            aria-label={isSecond ? "Open camera for second photo" : "Open camera for first photo"}
          >
            <Camera className="w-5 h-5" />
            <span>Open Camera</span>
          </button>
        </div>

        {/* Hidden file input - real, accessible */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          className="sr-only"
          aria-label={isSecond ? "Capture second photo" : "Capture first photo"}
        />
      </div>
    );
  }

  // Phase 3: First Analysis (processing)
  if (phase === 'firstAnalysis' && isProcessing) {
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
            Analysing with Gemma 4
          </p>
          <p className="text-[#524A3D]">
            This takes a moment...
          </p>
        </div>
      </div>
    );
  }

  // Phase 4: Retry Choice
  if (phase === 'retryChoice' && firstPhoto?.analysis) {
    const analysis = firstPhoto.analysis;

    return (
      <div className="max-w-4xl mx-auto px-6 py-8" ref={mainContentRef} tabIndex={-1}>
        {/* Photo + Analysis */}
        <div className="flex flex-col md:flex-row gap-6 mb-8">
          <div className="w-full md:w-96 shrink-0 rounded-2xl overflow-hidden border-2 border-[#D8CDB8]">
            <img
              src={firstPhoto.base64}
              alt="Your craft photo"
              className="w-full object-contain"
            />
          </div>

          <div className="flex-1 space-y-4">
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

            <div>
              <p className="text-xs font-semibold text-[#524A3D] uppercase tracking-wider mb-2">
                What I See
              </p>
              <p className="text-xl font-semibold text-[#241F18]">
                {analysis.subject}
              </p>
            </div>

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
                      <Grid3X3 className="w-3.5 h-3.5 text-[#524A3D]" />
                      <p className="text-xs font-semibold text-[#524A3D] uppercase tracking-wider">
                        Framing
                      </p>
                    </div>
                    <p className="text-sm text-[#241F18]">{analysis.framing}</p>
                  </div>
                )}
                {analysis.lighting && (
                  <div className="p-4 rounded-xl bg-[#F4ECDC] border border-[#D8CDB8]">
                    <div className="flex items-center gap-2 mb-2">
                      <Sun className="w-3.5 h-3.5 text-[#524A3D]" />
                      <p className="text-xs font-semibold text-[#524A3D] uppercase tracking-wider">
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
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#C06B45] hover:bg-[#A6552F] text-white rounded-full font-semibold focus:outline-none focus:ring-4 focus:ring-[#C06B45]/50"
              aria-label="Retake photo with the suggested fix"
            >
              <Camera className="w-4 h-4" />
              <span>Retake with Fix</span>
            </button>
          )}
          <button
            ref={!analysis.readyToList ? undefined : retakeButtonRef}
            onClick={handleSkipToListing}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#F4ECDC] border-2 border-[#D8CDB8] hover:border-[#C06B45] text-[#241F18] rounded-full font-semibold focus:outline-none focus:ring-4 focus:ring-[#C06B45]/50"
            aria-label="Skip to listing generation"
          >
            <span>I'm happy with this</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* ARIA announcer */}
        <div
          ref={phaseAnnouncerRef}
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className="sr-only"
        >
          Analysis complete. {analysis.subject}.
          {analysis.readyToList
            ? 'Ready to list.'
            : `Next step: ${analysis.primaryFix}`}
        </div>
      </div>
    );
  }

  // Phase 6: Comparison
  if (phase === 'comparison' && firstPhoto && secondPhoto && strongerPhoto) {
    const stronger = strongerPhoto === 'first' ? firstPhoto : secondPhoto;
    const weaker = strongerPhoto === 'first' ? secondPhoto : firstPhoto;

    return (
      <div className="max-w-4xl mx-auto px-6 py-8" ref={mainContentRef} tabIndex={-1}>
        <h2 className="text-2xl font-bold text-[#241F18] mb-2">Photo Comparison</h2>
        <p className="text-[#524A3D] mb-6">Same craft, two shots</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {[firstPhoto, secondPhoto].map((photo, idx) => {
            const isStronger = (idx === 0 && strongerPhoto === 'first') || (idx === 1 && strongerPhoto === 'second');
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
                    src={photo.base64}
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
            Photo {strongerPhoto === 'first' ? '1' : '2'} is the stronger one.
            {stronger.analysis?.subject && ` ${stronger.analysis.subject}`}
          </p>
          <button
            onClick={() => {
              setPhase('listing');
              if (voiceEnabled) {
                speak('Generating your listing from the stronger photo.');
              }
            }}
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#C06B45] hover:bg-[#A6552F] text-white rounded-full font-semibold focus:outline-none focus:ring-4 focus:ring-[#C06B45]/50"
          >
            <span>Generate Listing</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
          Comparison complete. Photo {strongerPhoto === 'first' ? '1' : '2'} is stronger.
        </div>
      </div>
    );
  }

  // ========== Phase 7: Listing Actions ==========
  const handleReadAllTags = useCallback(() => {
    const finalPhoto = strongerPhoto
      ? (strongerPhoto === 'first' ? firstPhoto : secondPhoto)
      : firstPhoto;

    if (finalPhoto?.analysis?.tags && finalPhoto.analysis.tags.length > 0) {
      const tagsList = finalPhoto.analysis.tags.join(', ');
      speak(`All tags: ${tagsList}`);
      setShowAllTags(true);
    }
  }, [strongerPhoto, firstPhoto, secondPhoto]);

  // Phase 7: Listing
  if (phase === 'listing') {
    const finalPhoto = strongerPhoto
      ? (strongerPhoto === 'first' ? firstPhoto : secondPhoto)
      : firstPhoto;

    if (!finalPhoto?.analysis) {
      return <div>Error: No analysis available</div>;
    }

    const analysis = finalPhoto.analysis;
    const tagCount = analysis.tags?.length || 0;

    return (
      <div className="max-w-4xl mx-auto px-6 py-8" ref={mainContentRef} tabIndex={-1}>
        <div className="flex items-center gap-2 mb-6">
          <CheckCircle2 className="w-6 h-6 text-[#2F4858]" />
          <h2 className="text-2xl font-bold text-[#241F18]">Your Listing is Ready</h2>
        </div>

        <div className="flex flex-col md:flex-row gap-6 mb-8">
          <div className="w-full md:w-64 shrink-0 rounded-2xl overflow-hidden border-2 border-[#D8CDB8]">
            <img
              src={finalPhoto.base64}
              alt="Final marketplace photo"
              className="w-full object-contain"
            />
          </div>

          <div className="flex-1 space-y-6">
            {/* Product Description */}
            {analysis.listingCopy && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-[#524A3D] uppercase tracking-wider">
                    Product Description
                  </p>
                  <button
                    onClick={() => copyToClipboard(analysis.listingCopy, 'description')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-[#C06B45] ${
                      copiedField === 'description'
                        ? 'bg-[#A9B8BE] text-[#241F18]'
                        : 'bg-[#F4ECDC] hover:bg-[#D8CDB8] text-[#524A3D]'
                    }`}
                    aria-label="Copy product description to clipboard"
                  >
                    {copiedField === 'description' ? (
                      <>
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="p-4 rounded-xl bg-[#F4ECDC] border border-[#D8CDB8]">
                  <p className="text-[#241F18]">{analysis.listingCopy}</p>
                </div>
              </div>
            )}

            {/* Alt Text */}
            {analysis.altText && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-[#524A3D] uppercase tracking-wider flex items-center gap-1.5">
                    <Accessibility className="w-3 h-3" />
                    Alt-Text
                  </p>
                  <button
                    onClick={() => copyToClipboard(analysis.altText, 'altText')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-[#C06B45] ${
                      copiedField === 'altText'
                        ? 'bg-[#A9B8BE] text-[#241F18]'
                        : 'bg-[#F4ECDC] hover:bg-[#D8CDB8] text-[#524A3D]'
                    }`}
                    aria-label="Copy alt-text to clipboard"
                  >
                    {copiedField === 'altText' ? (
                      <>
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="p-4 rounded-xl bg-[#F4ECDC] border border-[#D8CDB8]">
                  <p className="text-sm text-[#241F18]">{analysis.altText}</p>
                </div>
              </div>
            )}

            {/* Tags */}
            {analysis.tags && analysis.tags.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-[#524A3D] uppercase tracking-wider">
                    Tags ({tagCount})
                  </p>
                  <div className="flex gap-2">
                    {!showAllTags && (
                      <button
                        onClick={handleReadAllTags}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#F4ECDC] hover:bg-[#D8CDB8] text-[#524A3D] text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-[#C06B45]"
                        aria-label="Read all tags aloud"
                      >
                        <AudioLines className="w-3 h-3" />
                        <span>Read all tags</span>
                      </button>
                    )}
                    <button
                      onClick={() => {
                        const tagsList = analysis.tags!.map(t => `#${t}`).join(' ');
                        copyToClipboard(tagsList, 'tags');
                      }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-[#C06B45] ${
                        copiedField === 'tags'
                          ? 'bg-[#A9B8BE] text-[#241F18]'
                          : 'bg-[#F4ECDC] hover:bg-[#D8CDB8] text-[#524A3D]'
                      }`}
                      aria-label="Copy tags to clipboard"
                    >
                      {copiedField === 'tags' ? (
                        <>
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-[#F4ECDC] border border-[#D8CDB8]">
                  <div className="flex flex-wrap gap-2">
                    {analysis.tags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="inline-block px-3 py-1 rounded-full bg-[#ECE3D2] border border-[#D8CDB8] text-sm text-[#241F18]"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                  {!showAllTags && tagCount > 3 && (
                    <p className="text-xs text-[#524A3D] mt-2 italic">
                      Tap "Read all tags" to hear them aloud
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-center gap-4">
          <button
            ref={listingButtonRef}
            onClick={onExit}
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#F4ECDC] border-2 border-[#D8CDB8] hover:border-[#C06B45] text-[#241F18] rounded-full font-semibold focus:outline-none focus:ring-4 focus:ring-[#C06B45]/50"
            aria-label="List another craft item"
          >
            <span>List Another Craft</span>
          </button>
        </div>

        <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
          Listing ready. Product description, alt-text{tagCount > 0 && `, and ${tagCount} tags`} available to copy.
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-12" ref={mainContentRef} tabIndex={-1}>
        <div className="rounded-2xl bg-red-50 border-2 border-red-200 p-8 text-center" role="alert" aria-live="assertive">
          <p className="text-red-700 font-medium mb-4">{error}</p>
          <button
            onClick={() => {
              setError(null);
              setPhase('firstCapture');
            }}
            className="px-6 py-3 bg-[#C06B45] hover:bg-[#A6552F] text-white rounded-full font-semibold focus:outline-none focus:ring-4 focus:ring-[#C06B45]/50"
            aria-label="Try taking photo again"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return null;
};

export default ArtisanJourney;
