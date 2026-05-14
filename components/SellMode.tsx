/**
 * SellMode.tsx — Artisan Studio
 *
 * Voice-guided photography coaching for marketplace sellers.
 * Designed for low-vision artisans who create beautiful handmade work.
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Camera, Package, Loader2, CheckCircle2, AlertTriangle,
  Lightbulb, RotateCcw, Sun, Focus, Image as ImageIcon, Sparkles,
  Grid3X3, FileText, Accessibility, Copy, Volume2,
} from 'lucide-react';
import { analyzeForSellMode } from '../services/analysisOrchestrator';
import { parseSellResponse, parseArtisanResponseV3, speak } from '../services/voiceCoach';
import { DEMO_RESPONSES, DemoResponse, simulateProcessing, getComparisonSamples } from '../src/data/demoResponses';

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
  ollamaReady,
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
  const [isDemoMode, setIsDemoMode] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Demo Mode: handle sample selection with pre-recorded v3 response
  const handleDemoSampleSelect = useCallback(async (sample: DemoResponse) => {
    setError(null);
    setIsAnalyzing(true);
    setResult(null);
    setIsDemoMode(true);

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

    // Voice feedback - v3 format: subject → framing → lighting → primary fix → verdict
    const voiceText = [
      r.subject,
      r.critique.framing,
      r.critique.lighting,
      r.critique.primary_fix,
      r.confidence_note || '',
      r.ready_to_list ? 'This photo is ready to list.' : 'Make this fix, then take another shot.',
    ].filter(Boolean).join(' ');

    speak(voiceText);
    setIsAnalyzing(false);
  }, []);

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
                v3Parsed.critique.framing,
                v3Parsed.critique.lighting,
                v3Parsed.critique.primary_fix,
                v3Parsed.ready_to_list ? 'This photo is ready to list.' : 'Make this fix, then take another shot.',
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

        // Voice feedback: subject → framing → lighting → primary fix
        if (voiceEnabled) {
          const voiceText = [
            v3Parsed.subject,
            v3Parsed.critique.framing,
            v3Parsed.critique.lighting,
            v3Parsed.critique.primary_fix,
            v3Parsed.confidence_note || '',
            v3Parsed.ready_to_list ? 'This photo is ready to list.' : 'Make this fix, then take another shot.',
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
    setIsDemoMode(false);
  };


  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-orange-950/20 text-slate-200 p-4 md:p-8">
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

      {/* Header */}
      <header className="flex items-center justify-between mb-6 max-w-4xl mx-auto">
        <button
          onClick={onBack}
          className="px-4 py-2 rounded-xl text-sm font-semibold bg-slate-800 hover:bg-slate-700 transition-all"
          aria-label="Go back to home page"
        >
          ← Back
        </button>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/30">
            <Package className="w-5 h-5 text-amber-400" />
            <span className="text-sm font-bold text-amber-300">Artisan Studio</span>
          </div>
          {(ollamaReady === false || isDemoMode) && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/20 border border-purple-500/40">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span className="text-xs font-bold text-purple-300">Demo Mode</span>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto">
        {/* Info Card */}
        <div className="bg-slate-800/60 backdrop-blur-sm rounded-3xl border border-slate-700/50 p-6 md:p-8 mb-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center shrink-0">
              <Package className="w-7 h-7 text-orange-400" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
                Artisan Studio
              </h1>
              <p className="text-slate-400">
                For blind and low-vision artisans. Hear what's working in your product photos, what isn't,
                and exactly how to fix it — so your handmade goods earn the price they deserve.
              </p>
            </div>
          </div>
        </div>

        {/* Demo Mode: PRIMARY action when Ollama is offline */}
        {ollamaReady === false && !result && !isAnalyzing && (
          <div className="bg-gradient-to-br from-purple-900/30 to-indigo-900/20 border-2 border-purple-500/40 rounded-2xl p-6 mb-6">
            {/* Honest Demo Mode Badge */}
            <div className="flex items-start gap-3 mb-4 p-3 bg-purple-950/50 rounded-xl border border-purple-500/20">
              <Sparkles className="w-5 h-5 text-purple-400 mt-0.5 shrink-0" />
              <div>
                <h2 className="text-base font-bold text-purple-200 mb-1">Demo Mode</h2>
                <p className="text-purple-200/60 text-xs leading-relaxed">
                  Playing back real Gemma 4 E4B responses recorded locally.
                  <a href="https://github.com/prasadt1/photography-coach-gemma4#quick-start" target="_blank" rel="noopener noreferrer" className="text-purple-400 underline ml-1">
                    Install Ollama
                  </a> for live analysis on your own photos.
                </p>
              </div>
            </div>

            <h3 className="text-lg font-bold text-white mb-2">Try Demo Mode</h3>
            <p className="text-purple-100/70 text-sm mb-6">
              Select a sample product photo to experience how L.E.N.S. coaches artisans with voice feedback.
            </p>

            {/* Sample Products Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {DEMO_RESPONSES.map((sample) => (
                <button
                  key={sample.id}
                  onClick={() => handleDemoSampleSelect(sample)}
                  className="group relative h-48 rounded-xl overflow-hidden border-2 border-purple-500/30 hover:border-purple-400 transition-all hover:scale-[1.02]"
                >
                  <img
                    src={sample.imagePath}
                    alt={sample.label}
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/30 to-transparent" />
                  <div className="absolute bottom-3 left-3 right-3">
                    <span className="text-xs font-bold text-purple-400 uppercase tracking-wider">{sample.category}</span>
                    <p className="text-white font-semibold">{sample.label}</p>
                    {sample.isComparisonSample && (
                      <span className="text-[10px] text-purple-300 mt-1 block">Part of comparison pair</span>
                    )}
                  </div>
                </button>
              ))}
            </div>

            {/* Compare Two Photos - Demo Mode */}
            <div className="pt-4 border-t border-purple-500/20">
              <p className="text-sm text-purple-200/60 mb-3">
                Or try the comparison feature with our pre-built sample pair:
              </p>
              <button
                onClick={() => {
                  // TODO: Wire to Compare panel with demo samples
                  const comparisonSamples = getComparisonSamples();
                  if (comparisonSamples.length >= 2) {
                    console.log('[Demo] Compare samples:', comparisonSamples[0].label, 'vs', comparisonSamples[1].label);
                    // For now, just analyze the first comparison sample
                    handleDemoSampleSelect(comparisonSamples[0]);
                  }
                }}
                className="flex items-center gap-2 px-4 py-2.5 bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/40 rounded-xl text-purple-200 font-semibold text-sm transition-all"
              >
                <ImageIcon className="w-4 h-4" />
                Compare two photos of the same product
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-900/30 border border-red-500/30 rounded-2xl p-6 text-center mb-6" role="alert" aria-live="assertive">
            <p className="text-red-300">{error}</p>
            <button
              onClick={handleRetry}
              className="mt-4 px-6 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm font-semibold transition-colors"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Result display */}
        {result && (
          <div className="space-y-6 mb-6" role="region" aria-label="Analysis results" aria-live="polite">
            {/* Photo + Verdict Row */}
            <div className="flex flex-col md:flex-row gap-6">
              {/* Photo */}
              <div className="w-full md:w-64 h-64 rounded-2xl overflow-hidden border border-slate-700 shrink-0">
                <img
                  src={result.imageBase64}
                  alt="Product photo"
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Verdict Card - v3 style */}
              <div className="flex-1 space-y-4">
                {/* Ready to List / Not Ready */}
                <div className={`rounded-2xl p-6 ${result.readyToList ? 'bg-emerald-500/20 border-emerald-500/50' : 'bg-amber-500/20 border-amber-500/50'} border-2`}>
                  <div className="flex items-center gap-4">
                    {result.readyToList ? (
                      <CheckCircle2 className="w-12 h-12 text-emerald-400" />
                    ) : (
                      <AlertTriangle className="w-12 h-12 text-amber-400" />
                    )}
                    <div>
                      <p className={`text-2xl font-bold ${result.readyToList ? 'text-emerald-300' : 'text-amber-300'}`}>
                        {result.readyToList ? 'Ready to List' : 'Needs One Fix'}
                      </p>
                      <p className="text-slate-400 text-sm mt-1">
                        {result.readyToList
                          ? 'This photo meets marketplace standards.'
                          : 'Make the fix below, then take another shot.'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Subject - what's in frame */}
                <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                  <div className="flex items-center gap-2 mb-2">
                    <Package className="w-4 h-4 text-slate-400" />
                    <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">What I See</span>
                  </div>
                  <p className="text-white font-medium">{result.subject}</p>
                </div>
              </div>
            </div>

            {/* Critique: Framing + Lighting */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {result.framing && (
                <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700">
                  <div className="flex items-center gap-2 mb-3">
                    <Grid3X3 className="w-5 h-5 text-cyan-400" />
                    <h3 className="font-semibold text-cyan-300">Framing</h3>
                  </div>
                  <p className="text-slate-300">{result.framing}</p>
                </div>
              )}

              {result.lighting && (
                <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700">
                  <div className="flex items-center gap-2 mb-3">
                    <Sun className="w-5 h-5 text-yellow-400" />
                    <h3 className="font-semibold text-yellow-300">Lighting</h3>
                  </div>
                  <p className="text-slate-300">{result.lighting}</p>
                </div>
              )}
            </div>

            {/* Primary Fix - the one action to take */}
            {result.primaryFix && !result.readyToList && (
              <div className="bg-gradient-to-br from-emerald-900/30 to-teal-900/20 rounded-2xl border-2 border-emerald-500/40 p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                    <Lightbulb className="w-5 h-5 text-emerald-400" />
                  </div>
                  <h3 className="text-lg font-bold text-emerald-300">Your Next Step</h3>
                </div>
                <p className="text-lg text-white leading-relaxed">{result.primaryFix}</p>
              </div>
            )}

            {/* Confidence Note - if anything couldn't be judged */}
            {result.confidenceNote && (
              <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-600/50 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-slate-500 mt-0.5 shrink-0" />
                <p className="text-sm text-slate-400">{result.confidenceNote}</p>
              </div>
            )}

            {/* Marketing Assets: Alt-text + Listing Copy */}
            {(result.altText || result.listingCopy) && (
              <div className="bg-gradient-to-br from-amber-900/20 to-orange-900/20 rounded-2xl border border-amber-500/30 p-6">
                <h3 className="text-lg font-bold text-amber-300 mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Listing Assets
                </h3>

                {result.listingCopy && (
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs text-amber-400/70 uppercase font-semibold tracking-wider">
                        Product Description
                      </p>
                      <button
                        onClick={() => copyToClipboard(result.listingCopy, 'description')}
                        className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-semibold transition-all ${
                          copiedField === 'description'
                            ? 'bg-emerald-500/20 text-emerald-300 scale-110'
                            : 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300'
                        }`}
                        aria-label={copiedField === 'description' ? 'Description copied' : 'Copy description'}
                      >
                        {copiedField === 'description' ? (
                          <>
                            <CheckCircle2 className="w-3 h-3" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            Copy
                          </>
                        )}
                      </button>
                    </div>
                    <p className="text-slate-200 bg-slate-900/50 rounded-lg p-3 text-sm">
                      {result.listingCopy}
                    </p>
                  </div>
                )}

                {result.altText && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs text-amber-400/70 uppercase font-semibold tracking-wider">
                        <Accessibility className="w-3 h-3 inline mr-1" />
                        Alt-Text
                      </p>
                      <button
                        onClick={() => copyToClipboard(result.altText, 'altText')}
                        className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-semibold transition-all ${
                          copiedField === 'altText'
                            ? 'bg-emerald-500/20 text-emerald-300 scale-110'
                            : 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300'
                        }`}
                        aria-label={copiedField === 'altText' ? 'Alt text copied' : 'Copy alt text'}
                      >
                        {copiedField === 'altText' ? (
                          <>
                            <CheckCircle2 className="w-3 h-3" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            Copy
                          </>
                        )}
                      </button>
                    </div>
                    <p className="text-slate-200 bg-slate-900/50 rounded-lg p-3 text-sm">
                      {result.altText}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Legacy: Photography Coach Tips (only show if legacy fields present) */}
            {(result.compositionTip || result.lightingTip || result.scaleSuggestion || result.stylingIdea) && (
              <div className="bg-gradient-to-br from-cyan-900/20 to-teal-900/20 rounded-2xl border border-cyan-500/30 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-cyan-300 flex items-center gap-2">
                    <Camera className="w-5 h-5" />
                    Additional Tips
                  </h3>
                  <button
                    onClick={speakTips}
                    disabled={isSpeaking}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                      isSpeaking
                        ? 'bg-cyan-500/30 text-cyan-300 cursor-wait'
                        : 'bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 hover:scale-105'
                    }`}
                  >
                    <Volume2 className={`w-4 h-4 ${isSpeaking ? 'animate-pulse' : ''}`} />
                    {isSpeaking ? 'Speaking...' : 'Hear Tips'}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {result.compositionTip && (
                    <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-800">
                      <p className="text-xs text-cyan-400 uppercase font-semibold mb-2">Composition</p>
                      <p className="text-sm text-slate-300">{result.compositionTip}</p>
                    </div>
                  )}
                  {result.lightingTip && (
                    <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-800">
                      <p className="text-xs text-yellow-400 uppercase font-semibold mb-2">Lighting</p>
                      <p className="text-sm text-slate-300">{result.lightingTip}</p>
                    </div>
                  )}
                  {result.scaleSuggestion && (
                    <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-800">
                      <p className="text-xs text-violet-400 uppercase font-semibold mb-2">Scale</p>
                      <p className="text-sm text-slate-300">{result.scaleSuggestion}</p>
                    </div>
                  )}
                  {result.stylingIdea && (
                    <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-800">
                      <p className="text-xs text-pink-400 uppercase font-semibold mb-2">Styling</p>
                      <p className="text-sm text-slate-300">{result.stylingIdea}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Legacy: Tags (only show if present) */}
            {result.suggestedTags && result.suggestedTags.length > 0 && (
              <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700/50">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs text-slate-400 uppercase font-semibold">Suggested Tags</p>
                  <button
                    onClick={() => copyToClipboard(result.suggestedTags!.map(t => `#${t}`).join(' '), 'tags')}
                    className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-semibold transition-all ${
                      copiedField === 'tags'
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                    }`}
                  >
                    {copiedField === 'tags' ? 'Copied!' : 'Copy All'}
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {result.suggestedTags.map((tag, i) => (
                    <span key={i} className="px-3 py-1 bg-slate-700/50 rounded-full text-sm text-slate-300">
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-4">
              <button
                onClick={handleRetry}
                className="flex items-center gap-2 px-6 py-3 bg-slate-700 hover:bg-slate-600 rounded-xl text-sm font-semibold transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                Try Another Photo
              </button>
            </div>
          </div>
        )}

        {/* Upload area */}
        {!result && !isAnalyzing && (
          <button
            onClick={handleCapture}
            disabled={ollamaReady === false}
            className="w-full h-64 md:h-80 rounded-3xl border-2 border-dashed border-slate-600 hover:border-orange-500/50
              bg-slate-800/30 hover:bg-slate-800/50 transition-all duration-300
              flex flex-col items-center justify-center gap-4 group
              disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-slate-600"
            aria-label="Take or upload a product photo for analysis"
          >
            <div className="w-20 h-20 rounded-2xl bg-orange-500/20 border border-orange-500/30
              flex items-center justify-center group-hover:scale-110 transition-transform">
              <Camera className="w-10 h-10 text-orange-400" />
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-white mb-1">Upload Product Photo</p>
              <p className="text-slate-400">Get instant feedback on your listing photo</p>
            </div>
          </button>
        )}

        {/* Analyzing state */}
        {isAnalyzing && (
          <div
            className="w-full h-64 md:h-80 rounded-3xl border-2 border-orange-500/30
            bg-slate-800/50 flex flex-col items-center justify-center gap-4"
            role="status"
            aria-live="polite"
            aria-busy="true"
          >
            <Loader2 className="w-12 h-12 text-orange-400 animate-spin" aria-hidden="true" />
            <div className="text-center">
              <p className="text-xl font-bold text-white mb-1">Analyzing Product Photo...</p>
              <p className="text-slate-400">Checking background, lighting, and focus</p>
            </div>
          </div>
        )}

        {/* Tips section */}
        <div className="mt-8 bg-slate-800/40 rounded-2xl border border-slate-700/50 p-6">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">
            Quick Tips for Better Product Photos
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-slate-700 flex items-center justify-center shrink-0">
                <ImageIcon className="w-4 h-4 text-slate-400" />
              </div>
              <div>
                <p className="font-semibold text-slate-300">Clean Background</p>
                <p className="text-slate-500">Use white, solid colors, or uncluttered surfaces</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-slate-700 flex items-center justify-center shrink-0">
                <Sun className="w-4 h-4 text-slate-400" />
              </div>
              <div>
                <p className="font-semibold text-slate-300">Natural Light</p>
                <p className="text-slate-500">Shoot near a window, avoid harsh shadows</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-slate-700 flex items-center justify-center shrink-0">
                <Focus className="w-4 h-4 text-slate-400" />
              </div>
              <div>
                <p className="font-semibold text-slate-300">Fill the Frame</p>
                <p className="text-slate-500">Product should take up 80%+ of the image</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center mt-12 text-sm text-slate-600 max-w-4xl mx-auto">
        <p>Voice-guided coaching for Etsy, eBay, Poshmark, and more. 100% local, 100% private.</p>
      </footer>
    </div>
  );
};

export default SellMode;
