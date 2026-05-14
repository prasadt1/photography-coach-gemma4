/**
 * SellMode.tsx — Artisan Studio
 *
 * Voice-guided photography coaching for marketplace sellers.
 * Designed for blind and low-vision artisans who create beautiful handmade work.
 *
 * Design: Soft Structuralism vibe with warm artisan palette.
 * Premium double-bezel architecture with generous whitespace.
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Camera, Loader2, CheckCircle2, AlertTriangle,
  Lightbulb, RotateCcw, Sun, Focus, Image as ImageIcon, Sparkles,
  Grid3X3, FileText, Accessibility, Copy, Volume2, ArrowRight,
  ChevronLeft,
} from 'lucide-react';
import { analyzeForSellMode, detectInferenceSource, type InferenceSource } from '../services/analysisOrchestrator';
import { parseSellResponse, parseArtisanResponseV3, speak, stopSpeaking, resumeSpeech, hasPausedSpeech, isSpeechCompleted, clearPausedSpeech } from '../services/voiceCoach';
import { DEMO_RESPONSES, DemoResponse, simulateProcessing, getComparisonSamples, DEMO_COMPARISON_RESULT } from '../src/data/demoResponses';
import { ComparisonResult } from '../services/ollamaService';

interface SellModeProps {
  onBack: () => void;
  ollamaReady: boolean | null;
  voiceEnabled?: boolean;
  preloadedImage?: string | null;
  onImageProcessed?: () => void;
}

interface SellResult {
  // Core v3 fields (Artisan Studio JSON schema)
  subject: string;              // "I see three ceramic vases"
  framing: string;              // Primary framing/clutter issue
  lighting: string;             // Primary lighting/color issue
  primaryFix: string;           // One actionable physical correction
  confidenceNote: string;       // What couldn't be judged
  altText: string;              // 15-25 word alt-text
  listingCopy: string;          // 2-3 sentence description
  readyToList: boolean;         // true/false

  // Display helpers
  imageBase64: string;
  rawResponse?: string;         // For debugging

  // Legacy fields (for backward compat with demo mode / old responses)
  score?: number;
  verdict?: string;
  productType?: string;
  material?: string;
  topIssue?: string;
  fix?: string;
  background?: string;
  productFocus?: string;
  compositionTip?: string;
  lightingTip?: string;
  scaleSuggestion?: string;
  stylingIdea?: string;
  descriptionIdea?: string;
  suggestedTags?: string[];
  whatISee?: string;
  colorCheck?: string;
  nextAction?: string;
}

const SellMode: React.FC<SellModeProps> = ({
  onBack,
  ollamaReady: _ollamaReady, // Deprecated: now using detectInferenceSource()
  voiceEnabled = false,
  preloadedImage = null,
  onImageProcessed,
}) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<SellResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [processedPreload, setProcessedPreload] = useState(false);
  const [showCompare, setShowCompare] = useState(false);
  const [demoCompareResult, setDemoCompareResult] = useState<ComparisonResult | null>(null);
  const [inferenceSource, setInferenceSource] = useState<InferenceSource>('demo');
  const [sourceDetected, setSourceDetected] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Stop speaking and clear state when component unmounts (leaving the page)
  useEffect(() => {
    return () => {
      stopSpeaking();
      clearPausedSpeech();
    };
  }, []);

  // Detect inference source on mount (local Ollama vs cloud vs demo)
  useEffect(() => {
    detectInferenceSource().then((source) => {
      setInferenceSource(source);
      setSourceDetected(true);
      console.log('[SellMode] Inference source detected:', source);
    });
  }, []);

  // Handle voice toggle: pause when OFF, resume when ON
  useEffect(() => {
    if (!voiceEnabled) {
      // Turning OFF: pause speech
      stopSpeaking();
      setIsSpeaking(false);
    } else {
      // Turning ON: try to resume, or announce if completed
      if (hasPausedSpeech()) {
        // Resume from where we left off
        setIsSpeaking(true);
        resumeSpeech();
      } else if (result && isSpeechCompleted()) {
        // Analysis complete, just announce voice is on
        speak('Voice mode on.');
      }
      // If no result yet, voice will start when analysis completes
    }
  }, [voiceEnabled, result]);

  // Demo Mode: handle sample selection with pre-recorded v3 response
  const handleDemoSampleSelect = useCallback(async (sample: DemoResponse) => {
    setError(null);
    setIsAnalyzing(true);
    setResult(null);

    // Simulate ~2s "Analyzing locally with Gemma 4 E4B..." delay
    await simulateProcessing();

    // Map v3 DemoResponse to SellResult
    const r = sample.response;
    setResult({
      subject: r.subject,
      framing: r.critique.framing,
      lighting: r.critique.lighting,
      primaryFix: r.critique.primary_fix,
      confidenceNote: r.confidence_note,
      altText: r.alt_text,
      listingCopy: r.listing_copy,
      readyToList: r.ready_to_list,
      imageBase64: sample.imagePath,
      rawResponse: JSON.stringify(r),
    });

    // Voice feedback - full v3 format with all listing assets
    if (voiceEnabled) {
      const voiceText = [
        // What I see
        r.subject,
        // Critique
        `Framing: ${r.critique.framing}`,
        `Lighting: ${r.critique.lighting}`,
        // Primary fix or ready verdict
        r.ready_to_list
          ? 'This photo is ready to list.'
          : `Your next step: ${r.critique.primary_fix}`,
        // Confidence note if any
        r.confidence_note || '',
        // Listing assets
        r.alt_text ? `Alt text for your listing: ${r.alt_text}` : '',
        r.listing_copy ? `Product description: ${r.listing_copy}` : '',
      ].filter(Boolean).join(' ');

      speak(voiceText);
    }
    setIsAnalyzing(false);
  }, [voiceEnabled]);

  // Auto-analyze preloaded image from Studio mode ("Optimize for Marketplace" flow)
  useEffect(() => {
    if (preloadedImage && !processedPreload && !isAnalyzing) {
      setProcessedPreload(true);
      onImageProcessed?.();

      // Auto-trigger analysis
      const analyzePreloaded = async () => {
        setError(null);
        setIsAnalyzing(true);
        setResult(null);

        try {
          const response = await analyzeForSellMode(preloadedImage, 'image/jpeg', voiceEnabled);
          console.log('[Artisan] Auto-analysis from Studio (accessibility mode:', voiceEnabled, '):', response);

          // Try v3 JSON parsing first
          const v3Parsed = parseArtisanResponseV3(response);

          if (v3Parsed) {
            setResult({
              subject: v3Parsed.subject,
              framing: v3Parsed.critique.framing,
              lighting: v3Parsed.critique.lighting,
              primaryFix: v3Parsed.critique.primary_fix,
              confidenceNote: v3Parsed.confidence_note,
              altText: v3Parsed.alt_text,
              listingCopy: v3Parsed.listing_copy,
              readyToList: v3Parsed.ready_to_list,
              imageBase64: preloadedImage,
              rawResponse: response,
            });

            if (voiceEnabled) {
              const voiceText = [
                v3Parsed.subject,
                `Framing: ${v3Parsed.critique.framing}`,
                `Lighting: ${v3Parsed.critique.lighting}`,
                v3Parsed.ready_to_list
                  ? 'This photo is ready to list.'
                  : `Your next step: ${v3Parsed.critique.primary_fix}`,
                v3Parsed.confidence_note || '',
                v3Parsed.alt_text ? `Alt text: ${v3Parsed.alt_text}` : '',
                v3Parsed.listing_copy ? `Product description: ${v3Parsed.listing_copy}` : '',
              ].filter(Boolean).join(' ');
              speak(voiceText);
            }
          } else {
            const parsed = parseSellResponse(response);
            setResult({
              subject: parsed.whatISee || parsed.productType || 'Product photo',
              framing: parsed.productFocus || '',
              lighting: parsed.lighting || '',
              primaryFix: parsed.fix || parsed.topIssue || '',
              confidenceNote: '',
              altText: parsed.altText,
              listingCopy: parsed.descriptionIdea,
              readyToList: parsed.verdict?.toLowerCase().includes('ready') || false,
              imageBase64: preloadedImage,
              rawResponse: response,
              score: parsed.score,
              verdict: parsed.verdict,
              productType: parsed.productType,
              material: parsed.material,
              topIssue: parsed.topIssue,
              fix: parsed.fix,
              background: parsed.background,
              productFocus: parsed.productFocus,
              compositionTip: parsed.compositionTip,
              lightingTip: parsed.lightingTip,
              scaleSuggestion: parsed.scaleSuggestion,
              stylingIdea: parsed.stylingIdea,
              descriptionIdea: parsed.descriptionIdea,
              suggestedTags: parsed.suggestedTags,
              whatISee: parsed.whatISee,
              colorCheck: parsed.colorCheck,
              nextAction: parsed.nextAction,
            });

            if (voiceEnabled && parsed.verdict) {
              const voiceText = parsed.whatISee
                ? `${parsed.whatISee} ${parsed.colorCheck || ''} ${parsed.fix || ''}`
                : `Listing score: ${parsed.score} out of 10. ${parsed.verdict}.`;
              speak(voiceText);
            }
          }
        } catch (err: any) {
          console.error('[SellMode] Auto-analysis failed:', err);
          setError('Failed to analyze photo. Please try again.');
        } finally {
          setIsAnalyzing(false);
        }
      };

      analyzePreloaded();
    }
  }, [preloadedImage, processedPreload, isAnalyzing, onImageProcessed, voiceEnabled]);

  // Copy to clipboard with visual feedback
  const copyToClipboard = useCallback(async (text: string, fieldName: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  }, []);

  // Speak tips aloud using the existing voiceCoach.speak() function
  const speakTips = useCallback(() => {
    if (!result) return;

    console.log('[SellMode] speakTips called');

    // Check if speech synthesis is supported
    if (!('speechSynthesis' in window)) {
      console.error('[SellMode] Speech synthesis not supported in this browser');
      alert('Speech synthesis is not supported in your browser. Please try Chrome, Safari, or Edge.');
      return;
    }

    setIsSpeaking(true);

    // Build speech text from available tips
    const tips: string[] = [];
    if (result.compositionTip) tips.push(`Composition tip: ${result.compositionTip}`);
    if (result.lightingTip) tips.push(`Lighting tip: ${result.lightingTip}`);
    if (result.scaleSuggestion) tips.push(`Scale suggestion: ${result.scaleSuggestion}`);
    if (result.stylingIdea) tips.push(`Styling idea: ${result.stylingIdea}`);

    const speechText = tips.join('. ');
    console.log('[SellMode] Speech text:', speechText);

    // Diagnostic: Check voice status
    const voices = speechSynthesis.getVoices();
    console.log('[SellMode] Voices available:', voices.length);
    console.log('[SellMode] Speech state:', {
      speaking: speechSynthesis.speaking,
      pending: speechSynthesis.pending,
      paused: speechSynthesis.paused
    });

    // Use the existing speak() function from voiceCoach.ts
    speak(speechText, 0.9, () => {
      console.log('[SellMode] Speech completed');
      setIsSpeaking(false);
    });

    // Fallback: Auto-reset after 10 seconds if speech doesn't trigger onend
    setTimeout(() => {
      if (isSpeaking) {
        console.warn('[SellMode] Speech timeout - resetting state');
        setIsSpeaking(false);
      }
    }, 10000);
  }, [result, isSpeaking]);

  const handleCapture = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setIsAnalyzing(true);
    setResult(null);

    try {
      // Convert to base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      // Run analysis (use accessibility prompts when voice mode is enabled)
      const response = await analyzeForSellMode(base64, file.type, voiceEnabled);
      console.log('[Artisan] Raw AI response (accessibility mode:', voiceEnabled, '):', response);

      // Try v3 JSON parsing first (new schema), fall back to legacy parser
      const v3Parsed = parseArtisanResponseV3(response);

      if (v3Parsed) {
        console.log('[Artisan] v3 JSON parsed successfully:', v3Parsed);
        setResult({
          subject: v3Parsed.subject,
          framing: v3Parsed.critique.framing,
          lighting: v3Parsed.critique.lighting,
          primaryFix: v3Parsed.critique.primary_fix,
          confidenceNote: v3Parsed.confidence_note,
          altText: v3Parsed.alt_text,
          listingCopy: v3Parsed.listing_copy,
          readyToList: v3Parsed.ready_to_list,
          imageBase64: base64,
          rawResponse: response,
        });

        // Voice feedback - full analysis with listing assets
        if (voiceEnabled) {
          const voiceText = [
            v3Parsed.subject,
            `Framing: ${v3Parsed.critique.framing}`,
            `Lighting: ${v3Parsed.critique.lighting}`,
            v3Parsed.ready_to_list
              ? 'This photo is ready to list.'
              : `Your next step: ${v3Parsed.critique.primary_fix}`,
            v3Parsed.confidence_note || '',
            v3Parsed.alt_text ? `Alt text: ${v3Parsed.alt_text}` : '',
            v3Parsed.listing_copy ? `Product description: ${v3Parsed.listing_copy}` : '',
          ].filter(Boolean).join(' ');
          speak(voiceText);
        }
      } else {
        // Fall back to legacy parser
        console.log('[Artisan] v3 parse failed, using legacy parser');
        const parsed = parseSellResponse(response);
        console.log('[Artisan] Legacy parsed result:', parsed);

        setResult({
          subject: parsed.whatISee || parsed.productType || 'Product photo',
          framing: parsed.productFocus || '',
          lighting: parsed.lighting || '',
          primaryFix: parsed.fix || parsed.topIssue || '',
          confidenceNote: '',
          altText: parsed.altText,
          listingCopy: parsed.descriptionIdea,
          readyToList: parsed.verdict?.toLowerCase().includes('ready') || false,
          imageBase64: base64,
          rawResponse: response,
          // Legacy fields for backward compat
          score: parsed.score,
          verdict: parsed.verdict,
          productType: parsed.productType,
          material: parsed.material,
          topIssue: parsed.topIssue,
          fix: parsed.fix,
          background: parsed.background,
          productFocus: parsed.productFocus,
          compositionTip: parsed.compositionTip,
          lightingTip: parsed.lightingTip,
          scaleSuggestion: parsed.scaleSuggestion,
          stylingIdea: parsed.stylingIdea,
          descriptionIdea: parsed.descriptionIdea,
          suggestedTags: parsed.suggestedTags,
          whatISee: parsed.whatISee,
          colorCheck: parsed.colorCheck,
          nextAction: parsed.nextAction,
        });

        // Voice feedback for legacy mode
        if (voiceEnabled && parsed.verdict) {
          const voiceText = parsed.whatISee
            ? `${parsed.whatISee} ${parsed.colorCheck || ''} ${parsed.fix || ''} ${parsed.nextAction || 'Would you like to take another shot?'}`
            : `Listing score: ${parsed.score} out of 10. ${parsed.verdict}. ${parsed.topIssue ? `Top issue: ${parsed.topIssue}.` : ''} ${parsed.compositionTip || ''}`;
          speak(voiceText);
        }
      }
    } catch (err: any) {
      console.error('[SellMode] Analysis failed:', err);
      const errorMsg = err.message?.includes('ollama') || err.message?.includes('ECONNREFUSED')
        ? 'Ollama is not running. Please start Ollama and try again.'
        : 'Failed to analyze photo. Please try again.';
      setError(errorMsg);
    } finally {
      setIsAnalyzing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [voiceEnabled]);

  const handleRetry = () => {
    setResult(null);
    setError(null);
    setShowCompare(false);
    setDemoCompareResult(null);
  };

  // Back button: if showing result/compare, go back to sample selection; otherwise go home
  const handleBack = () => {
    stopSpeaking();
    clearPausedSpeech();
    if (result || showCompare) {
      handleRetry();
    } else {
      onBack();
    }
  };


  return (
    <div className="min-h-[100dvh] bg-slate-900 text-slate-200 relative">
      {/* Warm gradient background - matches main app but with artisan warmth */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-1/4 w-[600px] h-[600px] bg-terracotta-500/10 rounded-full blur-[150px]" />
        <div className="absolute bottom-1/4 left-0 w-[500px] h-[500px] bg-amber-500/8 rounded-full blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 w-[400px] h-[400px] bg-orange-500/5 rounded-full blur-[100px] -translate-x-1/2 -translate-y-1/2" />
      </div>

      {/* Skip to main content link for screen readers */}
      <a
        href="#artisan-main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-terracotta-600 focus:text-white focus:rounded-xl focus:outline-none focus:ring-2 focus:ring-terracotta-400"
      >
        Skip to main content
      </a>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
        aria-label="Take or select a product photo"
      />

      <div className="relative z-10 max-w-4xl mx-auto px-4 py-8 md:py-12">
        {/* Header - Clean, minimal */}
        <header className="flex items-center justify-between mb-12" role="banner">
          <button
            onClick={handleBack}
            className="group flex items-center gap-2 px-4 py-2.5 rounded-full bg-slate-800/80 border border-slate-700/60 text-slate-300 hover:text-white hover:border-slate-600 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-terracotta-500 focus:ring-offset-2 focus:ring-offset-slate-900"
            style={{ transition: 'all 300ms cubic-bezier(0.32, 0.72, 0, 1)' }}
            aria-label={result || showCompare ? "Go back to sample selection" : "Go back to home page"}
          >
            <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5" style={{ transition: 'transform 200ms cubic-bezier(0.32, 0.72, 0, 1)' }} />
            <span className="text-sm font-medium">Back</span>
          </button>

          <div className="flex items-center gap-3">
            {/* Inference Source Badge */}
            {sourceDetected && (
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${
                inferenceSource === 'local'
                  ? 'bg-emerald-500/10 border-emerald-500/30'
                  : inferenceSource === 'cloud'
                    ? 'bg-blue-500/10 border-blue-500/30'
                    : 'bg-slate-800/60 border-slate-700'
              }`}>
                {inferenceSource === 'local' ? (
                  <>
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-xs font-semibold text-emerald-300 tracking-wide">Local · Private</span>
                  </>
                ) : inferenceSource === 'cloud' ? (
                  <>
                    <div className="w-2 h-2 rounded-full bg-blue-400" />
                    <span className="text-xs font-semibold text-blue-300 tracking-wide">Cloud · Real Gemma 4</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-xs font-semibold text-slate-300 tracking-wide">Demo</span>
                  </>
                )}
              </div>
            )}
          </div>
        </header>

        {/* Hero Section - Premium editorial feel */}
        <main id="artisan-main" role="main">
          {/* Title Section - Large, confident typography */}
          <div className="mb-12 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-terracotta-500/20 border border-terracotta-500/30 mb-6">
              <Camera className="w-3.5 h-3.5 text-terracotta-400" />
              <span className="text-[11px] font-semibold text-terracotta-300 uppercase tracking-[0.15em]">Artisan Studio</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight leading-[1.1] mb-4">
              Hear what your photo needs
            </h1>
            <p className="text-lg text-slate-400 leading-relaxed max-w-xl">
              Voice-guided coaching for blind and low-vision artisans. Get spoken feedback on framing, lighting, and colors — plus ready-to-use listing copy.
            </p>
          </div>

          {/* Demo Mode: Sample Selection — shows when no real inference available */}
          {sourceDetected && inferenceSource === 'demo' && !result && !isAnalyzing && !showCompare && (
            <div className="space-y-8">
              {/* Demo Notice - Subtle, integrated */}
              <div className="flex items-start gap-3 p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60">
                <Sparkles className="w-5 h-5 text-terracotta-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    <span className="font-semibold text-white">Demo Mode</span> — Playing back real Gemma 4 E4B responses. For live analysis,{' '}
                    <a href="https://github.com/prasadt1/photography-coach-gemma4#quick-start" target="_blank" rel="noopener noreferrer" className="text-terracotta-400 hover:text-terracotta-300 underline decoration-terracotta-500/50 underline-offset-2">
                      install Ollama locally
                    </a>.
                  </p>
                </div>
              </div>

              {/* Sample Grid - Double-bezel architecture */}
              <div>
                <p className="text-sm font-semibold text-slate-500 uppercase tracking-[0.15em] mb-4">Select a sample</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {DEMO_RESPONSES.map((sample) => (
                    <button
                      key={sample.id}
                      onClick={() => handleDemoSampleSelect(sample)}
                      className="group relative rounded-[1.5rem] bg-slate-800/60 p-1.5 ring-1 ring-slate-700/60 hover:ring-terracotta-500/50 focus:outline-none focus:ring-2 focus:ring-terracotta-500 focus:ring-offset-2 focus:ring-offset-slate-900"
                      style={{ transition: 'all 400ms cubic-bezier(0.32, 0.72, 0, 1)' }}
                      aria-label={`Analyze ${sample.label} - ${sample.category}`}
                    >
                      {/* Inner container - the "core" */}
                      <div className="relative h-44 rounded-[calc(1.5rem-0.375rem)] overflow-hidden bg-slate-900">
                        <img
                          src={sample.imagePath}
                          alt={sample.label}
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/20 to-transparent" />
                      </div>
                      {/* Label outside card - gallery style */}
                      <div className="px-2 pt-3 pb-1">
                        <span className="text-[10px] font-semibold text-terracotta-400 uppercase tracking-[0.12em]">{sample.category}</span>
                        <p className="text-sm font-semibold text-white">{sample.label}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Compare Option - Subtle secondary action */}
              <div className="pt-6 border-t border-slate-700/60">
                <button
                  onClick={() => {
                    setShowCompare(true);
                    setDemoCompareResult(DEMO_COMPARISON_RESULT);
                  }}
                  className="group flex items-center gap-3 text-slate-400 hover:text-white focus:outline-none focus:text-terracotta-400"
                  style={{ transition: 'color 200ms cubic-bezier(0.32, 0.72, 0, 1)' }}
                  aria-label="Compare two photos of the same product"
                >
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-slate-800 group-hover:bg-slate-700 border border-slate-700" style={{ transition: 'background-color 200ms cubic-bezier(0.32, 0.72, 0, 1)' }}>
                    <ImageIcon className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-medium">Compare two photos</span>
                  <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0" style={{ transition: 'all 200ms cubic-bezier(0.32, 0.72, 0, 1)' }} />
                </button>
              </div>
            </div>
          )}

          {/* Demo Compare Panel */}
          {showCompare && demoCompareResult && (
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-white tracking-tight">Photo Comparison</h2>
                  <p className="text-sm text-slate-400 mt-1">Same product, different shots — which is better?</p>
                </div>
                <button
                  onClick={() => {
                    setShowCompare(false);
                    setDemoCompareResult(null);
                  }}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full focus:outline-none focus:ring-2 focus:ring-terracotta-500"
                  style={{ transition: 'all 200ms cubic-bezier(0.32, 0.72, 0, 1)' }}
                  aria-label="Close comparison view"
                >
                  <span className="sr-only">Close</span>
                  <span aria-hidden="true" className="text-xl leading-none">&times;</span>
                </button>
              </div>

              {/* Side by side images - Double bezel */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {getComparisonSamples().map((sample, idx) => {
                  const label = idx === 0 ? 'A' : 'B';
                  const isWinner = demoCompareResult.winner === label;
                  return (
                    <div
                      key={sample.id}
                      className={`rounded-[1.5rem] p-1.5 ring-1 ${
                        isWinner ? 'bg-emerald-500/10 ring-emerald-500/50' : 'bg-slate-800/60 ring-slate-700/60 opacity-75'
                      }`}
                    >
                      <div className="relative rounded-[calc(1.5rem-0.375rem)] overflow-hidden">
                        <img
                          src={sample.imagePath}
                          alt={sample.label}
                          className="w-full h-48 object-cover"
                        />
                        <div className="absolute top-3 left-3 px-2.5 py-1 bg-slate-900/90 backdrop-blur-sm rounded-full text-xs font-bold text-white">
                          {label}
                        </div>
                        {isWinner && (
                          <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500 text-white rounded-full text-xs font-bold">
                            <CheckCircle2 className="w-3 h-3" />
                            Winner
                          </div>
                        )}
                      </div>
                      <p className="px-2 pt-3 pb-1 text-sm font-medium text-slate-200">{sample.label}</p>
                    </div>
                  );
                })}
              </div>

              {/* Comparison Result */}
              <div className="rounded-2xl bg-slate-800/60 border border-slate-700/60 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-lg font-bold text-white">
                    Winner: Photo {demoCompareResult.winner}
                  </h3>
                </div>
                <p className="text-slate-300 mb-6 leading-relaxed">{demoCompareResult.reason}</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-700/50">
                    <p className="text-xs font-semibold uppercase text-slate-500 tracking-wider mb-3">Photo A</p>
                    <ul className="space-y-2">
                      {demoCompareResult.strengths_a.map((s, i) => (
                        <li key={i} className="text-sm text-slate-300 flex items-start gap-2">
                          <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-slate-500 shrink-0" />
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                    <p className="text-xs font-semibold uppercase text-emerald-400 tracking-wider mb-3">Photo B</p>
                    <ul className="space-y-2">
                      {demoCompareResult.strengths_b.map((s, i) => (
                        <li key={i} className="text-sm text-slate-300 flex items-start gap-2">
                          <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {demoCompareResult.recommendation && (
                  <div className="p-4 rounded-xl bg-terracotta-500/10 border border-terracotta-500/30">
                    <p className="text-xs font-semibold uppercase text-terracotta-400 tracking-wider mb-2">Recommendation</p>
                    <p className="text-sm text-slate-200">{demoCompareResult.recommendation}</p>
                  </div>
                )}

                {/* Action: Analyze the winner */}
                <div className="mt-6 flex justify-center">
                  <button
                    onClick={() => {
                      const winner = getComparisonSamples().find((_, idx) =>
                        (idx === 0 && demoCompareResult.winner === 'A') ||
                        (idx === 1 && demoCompareResult.winner === 'B')
                      );
                      if (winner) {
                        setShowCompare(false);
                        setDemoCompareResult(null);
                        handleDemoSampleSelect(winner);
                      }
                    }}
                    className="group flex items-center gap-3 px-6 py-3 bg-terracotta-600 hover:bg-terracotta-500 text-white rounded-full text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-terracotta-500 focus:ring-offset-2 focus:ring-offset-slate-900"
                    style={{ transition: 'all 300ms cubic-bezier(0.32, 0.72, 0, 1)' }}
                    aria-label="Analyze the winning photo for listing"
                  >
                    <span>Analyze Winner for Listing</span>
                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-white/10 group-hover:bg-white/20" style={{ transition: 'background-color 200ms cubic-bezier(0.32, 0.72, 0, 1)' }}>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </div>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="rounded-2xl bg-red-500/10 border border-red-500/30 p-6 text-center" role="alert" aria-live="assertive">
              <AlertTriangle className="w-8 h-8 text-red-400 mx-auto mb-3" />
              <p className="text-red-300 font-medium mb-4">{error}</p>
              <button
                onClick={handleRetry}
                className="px-5 py-2.5 bg-slate-800 border border-slate-700 hover:border-slate-600 rounded-full text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-slate-900"
                style={{ transition: 'all 300ms cubic-bezier(0.32, 0.72, 0, 1)' }}
                aria-label="Try again"
              >
                Try Again
              </button>
            </div>
          )}

          {/* ARIA-live region for screen reader announcements */}
          <div
            role="status"
            aria-live="polite"
            aria-atomic="true"
            className="sr-only"
          >
            {isAnalyzing && 'Analyzing your photo with Gemma 4 E4B. Please wait.'}
            {result && !result.readyToList && `Analysis complete. ${result.subject}. Your next step: ${result.primaryFix}`}
            {result && result.readyToList && `Analysis complete. ${result.subject}. This photo is ready to list.`}
          </div>

          {/* Result Display */}
          {result && (
            <div className="space-y-8" role="region" aria-label="Analysis results">
              {/* Photo + Verdict - Editorial split */}
              <div className="flex flex-col md:flex-row gap-6">
                {/* Photo - Double bezel */}
                <div className="w-full md:w-72 shrink-0 rounded-[1.5rem] bg-slate-800/60 p-1.5 ring-1 ring-slate-700/60">
                  <div className="rounded-[calc(1.5rem-0.375rem)] overflow-hidden">
                    <img
                      src={result.imageBase64}
                      alt="Product photo"
                      className="w-full h-64 object-cover"
                    />
                  </div>
                </div>

                {/* Verdict */}
                <div className="flex-1 space-y-4">
                  {/* Status Badge */}
                  <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${
                    result.readyToList
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  }`}>
                    {result.readyToList ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : (
                      <AlertTriangle className="w-4 h-4" />
                    )}
                    <span className="text-sm font-bold">
                      {result.readyToList ? 'Ready to List' : 'Needs One Fix'}
                    </span>
                  </div>

                  {/* Subject - what's in frame */}
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">What I See</p>
                    <p className="text-xl font-semibold text-white leading-relaxed">{result.subject}</p>
                  </div>

                  {/* Primary Fix - if not ready */}
                  {result.primaryFix && !result.readyToList && (
                    <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30">
                      <div className="flex items-center gap-2 mb-2">
                        <Lightbulb className="w-4 h-4 text-emerald-400" />
                        <p className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Your Next Step</p>
                      </div>
                      <p className="text-base text-slate-200 leading-relaxed">{result.primaryFix}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Critique Details - Clean grid */}
              {(result.framing || result.lighting) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {result.framing && (
                    <div className="p-5 rounded-2xl bg-slate-800/60 border border-slate-700/60">
                      <div className="flex items-center gap-2 mb-3">
                        <Grid3X3 className="w-4 h-4 text-slate-500" />
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Framing</p>
                      </div>
                      <p className="text-slate-300 leading-relaxed">{result.framing}</p>
                    </div>
                  )}
                  {result.lighting && (
                    <div className="p-5 rounded-2xl bg-slate-800/60 border border-slate-700/60">
                      <div className="flex items-center gap-2 mb-3">
                        <Sun className="w-4 h-4 text-slate-500" />
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Lighting</p>
                      </div>
                      <p className="text-slate-300 leading-relaxed">{result.lighting}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Confidence Note */}
              {result.confidenceNote && (
                <div className="flex items-start gap-3 p-4 rounded-xl bg-slate-800/40 border border-slate-700/50">
                  <AlertTriangle className="w-4 h-4 text-slate-500 mt-0.5 shrink-0" />
                  <p className="text-sm text-slate-400">{result.confidenceNote}</p>
                </div>
              )}

              {/* Listing Assets */}
              {(result.altText || result.listingCopy) && (
                <div className="rounded-2xl bg-slate-800/60 border border-slate-700/60 p-6">
                  <div className="flex items-center gap-2 mb-6">
                    <FileText className="w-4 h-4 text-terracotta-400" />
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">Listing Assets</h3>
                  </div>

                  <div className="space-y-5">
                    {result.listingCopy && (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                            Product Description
                          </p>
                          <button
                            onClick={() => copyToClipboard(result.listingCopy, 'description')}
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                              copiedField === 'description'
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                            }`}
                            style={{ transition: 'all 200ms cubic-bezier(0.32, 0.72, 0, 1)' }}
                            aria-label={copiedField === 'description' ? 'Description copied' : 'Copy description'}
                          >
                            {copiedField === 'description' ? (
                              <>
                                <CheckCircle2 className="w-3 h-3" />
                                Copied
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                Copy
                              </>
                            )}
                          </button>
                        </div>
                        <p className="text-slate-300 bg-slate-900/50 rounded-xl p-4 text-sm leading-relaxed">
                          {result.listingCopy}
                        </p>
                      </div>
                    )}

                    {result.altText && (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                            <Accessibility className="w-3 h-3" />
                            Alt-Text
                          </p>
                          <button
                            onClick={() => copyToClipboard(result.altText, 'altText')}
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                              copiedField === 'altText'
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                            }`}
                            style={{ transition: 'all 200ms cubic-bezier(0.32, 0.72, 0, 1)' }}
                            aria-label={copiedField === 'altText' ? 'Alt text copied' : 'Copy alt text'}
                          >
                            {copiedField === 'altText' ? (
                              <>
                                <CheckCircle2 className="w-3 h-3" />
                                Copied
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                Copy
                              </>
                            )}
                          </button>
                        </div>
                        <p className="text-slate-300 bg-slate-900/50 rounded-xl p-4 text-sm leading-relaxed">
                          {result.altText}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Legacy Tips Section */}
              {(result.compositionTip || result.lightingTip || result.scaleSuggestion || result.stylingIdea) && (
                <div className="rounded-2xl bg-slate-800/60 border border-slate-700/60 p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                      <Camera className="w-4 h-4 text-slate-500" />
                      <h3 className="text-sm font-bold text-white uppercase tracking-wider">Additional Tips</h3>
                    </div>
                    <button
                      onClick={speakTips}
                      disabled={isSpeaking}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold ${
                        isSpeaking
                          ? 'bg-slate-700 text-slate-400 cursor-wait'
                          : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                      }`}
                      style={{ transition: 'all 200ms cubic-bezier(0.32, 0.72, 0, 1)' }}
                    >
                      <Volume2 className={`w-3.5 h-3.5 ${isSpeaking ? 'animate-pulse' : ''}`} />
                      {isSpeaking ? 'Speaking...' : 'Hear Tips'}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {result.compositionTip && (
                      <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-700/50">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Composition</p>
                        <p className="text-sm text-slate-300">{result.compositionTip}</p>
                      </div>
                    )}
                    {result.lightingTip && (
                      <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-700/50">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Lighting</p>
                        <p className="text-sm text-slate-300">{result.lightingTip}</p>
                      </div>
                    )}
                    {result.scaleSuggestion && (
                      <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-700/50">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Scale</p>
                        <p className="text-sm text-slate-300">{result.scaleSuggestion}</p>
                      </div>
                    )}
                    {result.stylingIdea && (
                      <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-700/50">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Styling</p>
                        <p className="text-sm text-slate-300">{result.stylingIdea}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Legacy Tags */}
              {result.suggestedTags && result.suggestedTags.length > 0 && (
                <div className="p-5 rounded-2xl bg-slate-800/60 border border-slate-700/60">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Suggested Tags</p>
                    <button
                      onClick={() => copyToClipboard(result.suggestedTags!.map(t => `#${t}`).join(' '), 'tags')}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                        copiedField === 'tags'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                      }`}
                      style={{ transition: 'all 200ms cubic-bezier(0.32, 0.72, 0, 1)' }}
                    >
                      {copiedField === 'tags' ? 'Copied' : 'Copy All'}
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {result.suggestedTags.map((tag, i) => (
                      <span key={i} className="px-3 py-1.5 bg-slate-700 rounded-full text-sm text-slate-300 font-medium">
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Button - Premium pill with nested icon */}
              <div className="flex gap-4 pt-4" role="group" aria-label="Photo actions">
                <button
                  onClick={handleRetry}
                  className="group flex items-center gap-3 px-6 py-3 bg-terracotta-600 hover:bg-terracotta-500 text-white rounded-full font-semibold focus:outline-none focus:ring-2 focus:ring-terracotta-500 focus:ring-offset-2 focus:ring-offset-slate-900"
                  style={{ transition: 'all 300ms cubic-bezier(0.32, 0.72, 0, 1)' }}
                  aria-label="Try another photo"
                >
                  <RotateCcw className="w-4 h-4" aria-hidden="true" />
                  <span>Try Another Photo</span>
                </button>
              </div>
            </div>
          )}

          {/* Upload Area - When no result and real inference is available (local or cloud) */}
          {!result && !isAnalyzing && sourceDetected && inferenceSource !== 'demo' && !showCompare && (
            <button
              onClick={handleCapture}
              className="group w-full rounded-[2rem] bg-slate-800/60 p-2 ring-1 ring-slate-700/60 hover:ring-terracotta-500/50 focus:outline-none focus:ring-2 focus:ring-terracotta-500 focus:ring-offset-2 focus:ring-offset-slate-900"
              style={{ transition: 'all 400ms cubic-bezier(0.32, 0.72, 0, 1)' }}
              aria-label="Take or upload a product photo for analysis"
            >
              {/* Inner core */}
              <div className="rounded-[calc(2rem-0.5rem)] border-2 border-dashed border-slate-600 group-hover:border-terracotta-500/50 bg-slate-900/50 py-20 flex flex-col items-center justify-center gap-4" style={{ transition: 'border-color 300ms cubic-bezier(0.32, 0.72, 0, 1)' }}>
                <div className="w-16 h-16 rounded-2xl bg-terracotta-500/20 border border-terracotta-500/30 flex items-center justify-center group-hover:scale-105" style={{ transition: 'transform 300ms cubic-bezier(0.32, 0.72, 0, 1)' }}>
                  <Camera className="w-8 h-8 text-terracotta-400" />
                </div>
                <div className="text-center px-4">
                  <p className="text-xl font-bold text-white mb-2">Take or upload a photo</p>
                  <p className="text-slate-400 text-sm leading-relaxed max-w-sm">
                    I'll tell you what's working, what isn't, and exactly how to fix it — all on your device.
                  </p>
                </div>
              </div>
            </button>
          )}

          {/* Analyzing State */}
          {isAnalyzing && (
            <div
              className="rounded-[2rem] bg-slate-800/60 p-2 ring-1 ring-terracotta-500/30"
              role="status"
              aria-live="polite"
              aria-busy="true"
            >
              <div className="rounded-[calc(2rem-0.5rem)] bg-slate-900/80 py-20 flex flex-col items-center justify-center gap-4">
                <Loader2 className="w-10 h-10 text-terracotta-400 animate-spin" aria-hidden="true" />
                <div className="text-center">
                  <p className="text-xl font-bold text-white mb-1">
                    {inferenceSource === 'local'
                      ? 'Analyzing on your device'
                      : inferenceSource === 'cloud'
                        ? 'Analyzing via Ollama Cloud'
                        : 'Preparing demo analysis'}
                  </p>
                  <p className="text-slate-400 text-sm">
                    {inferenceSource === 'local'
                      ? 'Gemma 4 E4B · Nothing leaves your device'
                      : inferenceSource === 'cloud'
                        ? 'Gemma 4 31B · Real AI analysis'
                        : 'Demo Mode · Sample response'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Tips Section - Clean, minimal */}
          <div className="mt-16 pt-8 border-t border-slate-700/60">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-[0.15em] mb-6">
              Quick Tips for Better Product Photos
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0">
                  <ImageIcon className="w-4 h-4 text-slate-400" />
                </div>
                <div>
                  <p className="font-semibold text-white text-sm">Clean Background</p>
                  <p className="text-slate-400 text-sm mt-0.5">White, solid colors, or uncluttered surfaces</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0">
                  <Sun className="w-4 h-4 text-slate-400" />
                </div>
                <div>
                  <p className="font-semibold text-white text-sm">Natural Light</p>
                  <p className="text-slate-400 text-sm mt-0.5">Near a window, avoiding harsh shadows</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0">
                  <Focus className="w-4 h-4 text-slate-400" />
                </div>
                <div>
                  <p className="font-semibold text-white text-sm">Fill the Frame</p>
                  <p className="text-slate-400 text-sm mt-0.5">Product should take up 80%+ of the image</p>
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="text-center mt-16 text-sm text-slate-500">
          <p>Voice-guided coaching for Etsy, eBay, Poshmark, and more.</p>
          <p className="text-slate-600 mt-1">100% local, 100% private.</p>
        </footer>
      </div>
    </div>
  );
};

export default SellMode;
