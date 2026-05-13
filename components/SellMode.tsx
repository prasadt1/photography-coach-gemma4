/**
 * SellMode.tsx — Artisan Studio
 *
 * Voice-guided photography coaching for marketplace sellers.
 * Designed for low-vision artisans who create beautiful handmade work.
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Camera, Package, Loader2, CheckCircle2, AlertTriangle, XCircle,
  Lightbulb, RotateCcw, Sun, Focus, Image as ImageIcon, Sparkles,
  Grid3X3, Ruler, Palette, FileText, Accessibility, Copy, Volume2,
} from 'lucide-react';
import { analyzeForSellMode } from '../services/analysisOrchestrator';
import { parseSellResponse, speak } from '../services/voiceCoach';

interface SellModeProps {
  onBack: () => void;
  ollamaReady: boolean | null;
  voiceEnabled?: boolean;
  preloadedImage?: string | null;
  onImageProcessed?: () => void;
}

interface SellResult {
  score: number;
  verdict: string;
  productType: string;
  material: string;
  topIssue: string;
  fix: string;
  background: string;
  lighting: string;
  productFocus: string;
  compositionTip: string;
  lightingTip: string;
  scaleSuggestion: string;
  stylingIdea: string;
  descriptionIdea: string;
  altText: string;
  suggestedTags: string[];
  imageBase64: string;
  rawResponse?: string; // For debugging
  // Accessibility mode fields
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

  const fileInputRef = useRef<HTMLInputElement>(null);

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

          const parsed = parseSellResponse(response);
          setResult({
            ...parsed,
            imageBase64: preloadedImage,
            rawResponse: response,
          });

          // Voice feedback if enabled (use accessibility-specific fields when available)
          if (voiceEnabled && parsed.verdict) {
            const voiceText = parsed.whatISee
              ? // Accessibility mode: descriptive-first
                `${parsed.whatISee} ` +
                `${parsed.colorCheck ? parsed.colorCheck + ' ' : ''}` +
                `${parsed.fix ? parsed.fix + ' ' : ''}` +
                `${parsed.nextAction || 'Would you like to take another shot?'}`
              : // Standard mode
                `Listing score: ${parsed.score} out of 10. ${parsed.verdict}. ` +
                `${parsed.topIssue ? `Top issue: ${parsed.topIssue}. ` : ''}` +
                `${parsed.compositionTip ? `Composition tip: ${parsed.compositionTip}. ` : ''}` +
                `${parsed.lightingTip ? `Lighting tip: ${parsed.lightingTip}. ` : ''}`;
            speak(voiceText);
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

      const parsed = parseSellResponse(response);
      console.log('[Artisan] Parsed result:', parsed);

      setResult({
        ...parsed,
        imageBase64: base64,
        rawResponse: response, // Store for debugging
      });

      // Voice feedback if enabled (use accessibility-specific fields when available)
      if (voiceEnabled && parsed.verdict) {
        const voiceText = parsed.whatISee
          ? // Accessibility mode: descriptive-first
            `${parsed.whatISee} ` +
            `${parsed.colorCheck ? parsed.colorCheck + ' ' : ''}` +
            `${parsed.fix ? parsed.fix + ' ' : ''}` +
            `${parsed.nextAction || 'Would you like to take another shot?'}`
          : // Standard mode
            `Listing score: ${parsed.score} out of 10. ${parsed.verdict}. ` +
            `${parsed.topIssue ? `Top issue: ${parsed.topIssue}. ` : ''}` +
            `${parsed.compositionTip ? `Composition tip: ${parsed.compositionTip}. ` : ''}` +
            `${parsed.lightingTip ? `Lighting tip: ${parsed.lightingTip}. ` : ''}`;
        speak(voiceText);
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
  };

  // Score color and icon based on value
  const getScoreStyle = (score: number) => {
    if (score >= 8) return { color: 'text-emerald-400', bg: 'bg-emerald-500/20', border: 'border-emerald-500/50' };
    if (score >= 5) return { color: 'text-amber-400', bg: 'bg-amber-500/20', border: 'border-amber-500/50' };
    return { color: 'text-rose-400', bg: 'bg-rose-500/20', border: 'border-rose-500/50' };
  };

  const getVerdictStyle = (verdict: string) => {
    const v = verdict.toLowerCase();
    if (v.includes('ready')) return { icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/20' };
    if (v.includes('needs')) return { icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/20' };
    return { icon: XCircle, color: 'text-rose-400', bg: 'bg-rose-500/20' };
  };

  const getAssessmentStyle = (value: string) => {
    const v = value.toLowerCase();
    if (v.includes('good') || v.includes('clean') || v.includes('clear') || v.includes('excellent')) {
      return 'text-emerald-400';
    }
    if (v.includes('ok') || v.includes('acceptable') || v.includes('moderate')) {
      return 'text-amber-400';
    }
    return 'text-rose-400';
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

        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/30">
          <Package className="w-5 h-5 text-amber-400" />
          <span className="text-sm font-bold text-amber-300">Artisan Studio</span>
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

        {/* Status messages */}
        {ollamaReady === false && (
          <div className="bg-red-900/30 border border-red-500/30 rounded-2xl p-6 text-center mb-6" role="alert">
            <p className="text-red-300">Ollama is offline. Start Ollama to use Artisan Studio.</p>
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
            {/* Score + Verdict Row */}
            <div className="flex flex-col md:flex-row gap-6">
              {/* Photo */}
              <div className="w-full md:w-64 h-64 rounded-2xl overflow-hidden border border-slate-700 shrink-0">
                <img
                  src={result.imageBase64}
                  alt="Product photo"
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Score Card */}
              <div className="flex-1 space-y-4">
                {/* Big Score */}
                <div className={`rounded-2xl p-6 ${getScoreStyle(result.score).bg} border ${getScoreStyle(result.score).border}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-400 font-semibold uppercase tracking-wider mb-1">
                        Listing Score
                      </p>
                      <div className="flex items-baseline gap-2">
                        <span className={`text-5xl font-bold ${getScoreStyle(result.score).color}`}>
                          {result.score}
                        </span>
                        <span className="text-2xl text-slate-500">/10</span>
                      </div>
                    </div>

                    {/* Verdict Badge */}
                    <div className={`flex items-center gap-2 px-4 py-2 rounded-xl ${getVerdictStyle(result.verdict).bg}`}>
                      {React.createElement(getVerdictStyle(result.verdict).icon, {
                        className: `w-6 h-6 ${getVerdictStyle(result.verdict).color}`,
                      })}
                      <span className={`font-bold ${getVerdictStyle(result.verdict).color}`}>
                        {result.verdict}
                      </span>
                    </div>
                  </div>

                  {/* Score bar */}
                  <div className="mt-4 h-3 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${
                        result.score >= 8 ? 'bg-emerald-500' :
                        result.score >= 5 ? 'bg-amber-500' : 'bg-rose-500'
                      }`}
                      style={{ width: `${result.score * 10}%` }}
                    />
                  </div>
                </div>

                {/* Quick assessments */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                    <div className="flex items-center gap-2 mb-2">
                      <ImageIcon className="w-4 h-4 text-slate-500" />
                      <span className="text-xs text-slate-500 font-semibold uppercase">Background</span>
                    </div>
                    <p className={`font-semibold ${getAssessmentStyle(result.background)}`}>
                      {result.background}
                    </p>
                  </div>
                  <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                    <div className="flex items-center gap-2 mb-2">
                      <Sun className="w-4 h-4 text-slate-500" />
                      <span className="text-xs text-slate-500 font-semibold uppercase">Lighting</span>
                    </div>
                    <p className={`font-semibold ${getAssessmentStyle(result.lighting)}`}>
                      {result.lighting}
                    </p>
                  </div>
                  <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                    <div className="flex items-center gap-2 mb-2">
                      <Focus className="w-4 h-4 text-slate-500" />
                      <span className="text-xs text-slate-500 font-semibold uppercase">Focus</span>
                    </div>
                    <p className={`font-semibold ${getAssessmentStyle(result.productFocus)}`}>
                      {result.productFocus}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Product Info */}
            {(result.productType || result.material) && (
              <div className="bg-slate-800/30 rounded-xl border border-slate-700/50 p-4 flex flex-wrap gap-4">
                {result.productType && (
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-slate-500" />
                    <span className="text-sm text-slate-400">Product:</span>
                    <span className="text-sm text-white font-medium">{result.productType}</span>
                  </div>
                )}
                {result.material && (
                  <div className="flex items-center gap-2">
                    <Palette className="w-4 h-4 text-slate-500" />
                    <span className="text-sm text-slate-400">Material:</span>
                    <span className="text-sm text-white font-medium">{result.material}</span>
                  </div>
                )}
              </div>
            )}

            {/* Top Issue + Fix */}
            {(result.topIssue || result.fix) && (
              <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-6">
                {result.topIssue && (
                  <div className="mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="w-5 h-5 text-amber-400" />
                      <h3 className="font-semibold text-amber-300">Top Issue</h3>
                    </div>
                    <p className="text-slate-300">{result.topIssue}</p>
                  </div>
                )}

                {result.fix && (
                  <div className="pt-4 border-t border-slate-700">
                    <div className="flex items-center gap-2 mb-2">
                      <Lightbulb className="w-5 h-5 text-emerald-400" />
                      <h3 className="font-semibold text-emerald-300">How to Fix</h3>
                    </div>
                    <p className="text-slate-300">{result.fix}</p>
                  </div>
                )}
              </div>
            )}

            {/* Photography Coach Tips */}
            {(result.compositionTip || result.lightingTip || result.scaleSuggestion || result.stylingIdea) && (
              <div className="bg-gradient-to-br from-cyan-900/20 to-teal-900/20 rounded-2xl border border-cyan-500/30 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-cyan-300 flex items-center gap-2">
                    <Camera className="w-5 h-5" />
                    Photography Coach Tips
                  </h3>

                  {/* Voice readout button */}
                  <button
                    onClick={speakTips}
                    disabled={isSpeaking}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                      isSpeaking
                        ? 'bg-cyan-500/30 text-cyan-300 cursor-wait'
                        : 'bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 hover:scale-105'
                    }`}
                    title="Read tips aloud (works best in Chrome/Safari)"
                  >
                    <Volume2 className={`w-4 h-4 ${isSpeaking ? 'animate-pulse' : ''}`} />
                    {isSpeaking ? 'Speaking...' : 'Hear Tips'}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {result.compositionTip && (
                    <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-800">
                      <div className="flex items-center gap-2 mb-2">
                        <Grid3X3 className="w-4 h-4 text-cyan-400" />
                        <span className="text-xs text-cyan-400 uppercase font-semibold tracking-wider">Composition</span>
                      </div>
                      <p className="text-sm text-slate-300">{result.compositionTip}</p>
                    </div>
                  )}

                  {result.lightingTip && (
                    <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-800">
                      <div className="flex items-center gap-2 mb-2">
                        <Sun className="w-4 h-4 text-yellow-400" />
                        <span className="text-xs text-yellow-400 uppercase font-semibold tracking-wider">Lighting</span>
                      </div>
                      <p className="text-sm text-slate-300">{result.lightingTip}</p>
                    </div>
                  )}

                  {result.scaleSuggestion && (
                    <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-800">
                      <div className="flex items-center gap-2 mb-2">
                        <Ruler className="w-4 h-4 text-violet-400" />
                        <span className="text-xs text-violet-400 uppercase font-semibold tracking-wider">Scale Reference</span>
                      </div>
                      <p className="text-sm text-slate-300">{result.scaleSuggestion}</p>
                    </div>
                  )}

                  {result.stylingIdea && (
                    <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-800">
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="w-4 h-4 text-pink-400" />
                        <span className="text-xs text-pink-400 uppercase font-semibold tracking-wider">Styling Idea</span>
                      </div>
                      <p className="text-sm text-slate-300">{result.stylingIdea}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Marketing Help - Description, Tags & Alt-text */}
            {(result.descriptionIdea || result.suggestedTags.length > 0 || result.altText) && (
              <div className="bg-gradient-to-br from-amber-900/20 to-orange-900/20 rounded-2xl border border-amber-500/30 p-6">
                <h3 className="text-lg font-bold text-amber-300 mb-4 flex items-center gap-2">
                  <Sparkles className="w-5 h-5" />
                  Marketing Help
                </h3>

                {result.descriptionIdea && (
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs text-amber-400/70 uppercase font-semibold tracking-wider">
                        <FileText className="w-3 h-3 inline mr-1" />
                        Suggested Product Description
                      </p>
                      <button
                        onClick={() => copyToClipboard(result.descriptionIdea, 'description')}
                        className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-semibold transition-all ${
                          copiedField === 'description'
                            ? 'bg-emerald-500/20 text-emerald-300 scale-110'
                            : 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300'
                        }`}
                        aria-label={copiedField === 'description' ? 'Description copied to clipboard' : 'Copy product description to clipboard'}
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
                    <p className="text-slate-200 bg-slate-900/50 rounded-lg p-3 text-sm italic">
                      "{result.descriptionIdea}"
                    </p>
                  </div>
                )}

                {result.altText && (
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs text-amber-400/70 uppercase font-semibold tracking-wider">
                        <Accessibility className="w-3 h-3 inline mr-1" />
                        Alt-Text for Accessibility
                      </p>
                      <button
                        onClick={() => copyToClipboard(result.altText, 'altText')}
                        className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-semibold transition-all ${
                          copiedField === 'altText'
                            ? 'bg-emerald-500/20 text-emerald-300 scale-110'
                            : 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300'
                        }`}
                        aria-label={copiedField === 'altText' ? 'Alt text copied to clipboard' : 'Copy alt text to clipboard'}
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

                {result.suggestedTags.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs text-amber-400/70 uppercase font-semibold tracking-wider">
                        Suggested Tags
                      </p>
                      <button
                        onClick={() => copyToClipboard(result.suggestedTags.map(t => `#${t}`).join(' '), 'tags')}
                        className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-semibold transition-all ${
                          copiedField === 'tags'
                            ? 'bg-emerald-500/20 text-emerald-300 scale-110'
                            : 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300'
                        }`}
                        aria-label={copiedField === 'tags' ? 'Tags copied to clipboard' : 'Copy all tags to clipboard'}
                      >
                        {copiedField === 'tags' ? (
                          <>
                            <CheckCircle2 className="w-3 h-3" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            Copy All
                          </>
                        )}
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {result.suggestedTags.map((tag, i) => (
                        <span
                          key={i}
                          className="px-3 py-1 bg-amber-500/20 border border-amber-500/30 rounded-full text-sm text-amber-300"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
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
