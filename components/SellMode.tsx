/**
 * SellMode.tsx — Artisan Studio
 *
 * Voice-guided photography coaching for marketplace sellers.
 * Designed for blind and low-vision artisans who create beautiful handmade work.
 *
 * Design: Warm craft palette, editorial typography, accessibility-first.
 * Hierarchy: Demo samples are HERO, upload is secondary.
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Camera, Loader2, CheckCircle2, AlertTriangle,
  Lightbulb, RotateCcw, Sun, Image as ImageIcon, Sparkles,
  Grid3X3, FileText, Accessibility, Copy, ArrowRight,
  ChevronLeft, Upload, Cloud, Volume2, VolumeX,
} from 'lucide-react';
import { analyzeForSellModeWithFallback, detectInferenceSource, type InferenceSource } from '../services/analysisOrchestrator';
import { parseSellResponse, parseArtisanResponseV3, speak, stopSpeaking, resumeSpeech, hasPausedSpeech, isSpeechCompleted, clearPausedSpeech } from '../services/voiceCoach';
import { DEMO_RESPONSES, DemoResponse, simulateProcessing, getComparisonSamples, DEMO_COMPARISON_RESULT } from '../src/data/demoResponses';
import { ComparisonResult } from '../services/ollamaService';

interface SellModeProps {
  onBack: () => void;
  ollamaReady: boolean | null;
  voiceEnabled?: boolean;
  onVoiceToggle?: () => void;
  preloadedImage?: string | null;
  onImageProcessed?: () => void;
}

interface SellResult {
  subject: string;
  framing: string;
  lighting: string;
  primaryFix: string;
  confidenceNote: string;
  altText: string;
  listingCopy: string;
  readyToList: boolean;
  imageBase64: string;
  rawResponse?: string;
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
  ollamaReady: _ollamaReady,
  voiceEnabled = false,
  onVoiceToggle,
  preloadedImage = null,
  onImageProcessed,
}) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<SellResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [processedPreload, setProcessedPreload] = useState(false);
  const [showCompare, setShowCompare] = useState(false);
  const [demoCompareResult, setDemoCompareResult] = useState<ComparisonResult | null>(null);
  const [inferenceSource, setInferenceSource] = useState<InferenceSource>('demo');
  const [sourceDetected, setSourceDetected] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      stopSpeaking();
      clearPausedSpeech();
    };
  }, []);

  useEffect(() => {
    detectInferenceSource().then((source) => {
      setInferenceSource(source);
      setSourceDetected(true);
    });
  }, []);

  useEffect(() => {
    if (!voiceEnabled) {
      stopSpeaking();
    } else {
      if (hasPausedSpeech()) {
        resumeSpeech();
      } else if (result && isSpeechCompleted()) {
        speak('Voice mode on.');
      }
    }
  }, [voiceEnabled, result]);

  const handleDemoSampleSelect = useCallback(async (sample: DemoResponse) => {
    setError(null);
    setIsAnalyzing(true);
    setResult(null);
    await simulateProcessing();
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
    if (voiceEnabled) {
      const voiceText = [
        r.subject,
        `Framing: ${r.critique.framing}`,
        `Lighting: ${r.critique.lighting}`,
        r.ready_to_list ? 'This photo is ready to list.' : `Your next step: ${r.critique.primary_fix}`,
        r.confidence_note || '',
        r.alt_text ? `Alt text: ${r.alt_text}` : '',
        r.listing_copy ? `Product description: ${r.listing_copy}` : '',
      ].filter(Boolean).join(' ');
      speak(voiceText);
    }
    setIsAnalyzing(false);
  }, [voiceEnabled]);

  useEffect(() => {
    if (preloadedImage && !processedPreload && !isAnalyzing) {
      setProcessedPreload(true);
      onImageProcessed?.();
      const analyzePreloaded = async () => {
        setError(null);
        setIsAnalyzing(true);
        setResult(null);
        try {
          const { content: response, source } = await analyzeForSellModeWithFallback(preloadedImage, 'image/jpeg', voiceEnabled);
          setInferenceSource(source);
          if (source === 'demo' || !response) {
            setError('Analysis unavailable. Try a demo sample.');
            setIsAnalyzing(false);
            return;
          }
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
                v3Parsed.ready_to_list ? 'Ready to list.' : `Next step: ${v3Parsed.critique.primary_fix}`,
              ].filter(Boolean).join(' ');
              speak(voiceText);
            }
          } else {
            const parsed = parseSellResponse(response);
            if (parsed) {
              setResult({
                // Spread legacy fields first, then override required fields
                ...parsed,
                subject: parsed.whatISee || parsed.productType || 'Product photo',
                framing: parsed.compositionTip || '',
                lighting: parsed.lighting || parsed.lightingTip || '',
                primaryFix: parsed.fix || parsed.topIssue || '',
                confidenceNote: '',
                altText: parsed.altText || '',
                listingCopy: parsed.descriptionIdea || '',
                readyToList: (parsed.score ?? 0) >= 8,
                imageBase64: preloadedImage,
                rawResponse: response,
              });
              if (voiceEnabled && parsed.whatISee) {
                speak(parsed.whatISee);
              }
            } else {
              setResult({
                subject: response.slice(0, 200),
                framing: '',
                lighting: '',
                primaryFix: '',
                confidenceNote: '',
                altText: '',
                listingCopy: '',
                readyToList: false,
                imageBase64: preloadedImage,
                rawResponse: response,
              });
            }
          }
        } catch (err) {
          setError('Analysis failed. Please try again.');
        }
        setIsAnalyzing(false);
      };
      analyzePreloaded();
    }
  }, [preloadedImage, processedPreload, isAnalyzing, voiceEnabled, onImageProcessed]);

  const handleCapture = () => fileInputRef.current?.click();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setError(null);
    setIsAnalyzing(true);
    setResult(null);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const { content: response, source } = await analyzeForSellModeWithFallback(base64, file.type, voiceEnabled);
      setInferenceSource(source);
      if (source === 'demo' || !response) {
        setError('Cloud analysis unavailable. Try a demo sample instead.');
        setIsAnalyzing(false);
        return;
      }
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
          imageBase64: base64,
          rawResponse: response,
        });
        if (voiceEnabled) {
          const voiceText = [
            v3Parsed.subject,
            `Framing: ${v3Parsed.critique.framing}`,
            `Lighting: ${v3Parsed.critique.lighting}`,
            v3Parsed.ready_to_list ? 'Ready to list.' : `Next step: ${v3Parsed.critique.primary_fix}`,
          ].filter(Boolean).join(' ');
          speak(voiceText);
        }
      } else {
        const parsed = parseSellResponse(response);
        if (parsed) {
          setResult({
            // Spread legacy fields first, then override required fields
            ...parsed,
            subject: parsed.whatISee || parsed.productType || 'Product photo',
            framing: parsed.compositionTip || '',
            lighting: parsed.lighting || parsed.lightingTip || '',
            primaryFix: parsed.fix || parsed.topIssue || '',
            confidenceNote: '',
            altText: parsed.altText || '',
            listingCopy: parsed.descriptionIdea || '',
            readyToList: (parsed.score ?? 0) >= 8,
            imageBase64: base64,
            rawResponse: response,
          });
          if (voiceEnabled && parsed.whatISee) speak(parsed.whatISee);
        } else {
          setResult({
            subject: response.slice(0, 200),
            framing: '', lighting: '', primaryFix: '', confidenceNote: '',
            altText: '', listingCopy: '', readyToList: false,
            imageBase64: base64, rawResponse: response,
          });
        }
      }
    } catch (err) {
      console.error('[SellMode] Analysis failed:', err);
      setError('Failed to analyze photo. Please try again.');
    }
    setIsAnalyzing(false);
  };

  const handleBack = () => {
    if (result || showCompare) {
      setResult(null);
      setShowCompare(false);
      setDemoCompareResult(null);
      setError(null);
      stopSpeaking();
      clearPausedSpeech();
    } else {
      onBack();
    }
  };

  const handleRetry = () => {
    setResult(null);
    setError(null);
    setShowCompare(false);
    setDemoCompareResult(null);
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <div className="min-h-[100dvh] bg-[#E7E6DB] text-[#2A2A22]">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
        aria-label="Take or select a product photo"
      />

      <div className="max-w-4xl mx-auto px-6 py-8 md:py-12">
        {/* Header */}
        <header className="flex items-center justify-between mb-10">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#F1F0E9] border-2 border-[#D5D3C5] text-[#2A2A22] hover:border-[#BC6A45] hover:text-[#BC6A45] focus:outline-none focus:ring-2 focus:ring-[#BC6A45]"
            aria-label={result || showCompare ? "Go back" : "Return home"}
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="text-sm font-semibold">Back</span>
          </button>

          <div className="flex items-center gap-3">
            {/* Voice Toggle */}
            {onVoiceToggle && (
              <button
                onClick={onVoiceToggle}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold border-2 ${
                  voiceEnabled
                    ? 'bg-[#BC6A45] border-[#BC6A45] text-white shadow-lg'
                    : 'bg-[#F1F0E9] border-[#D5D3C5] text-[#6B6A5E] hover:border-[#BC6A45] hover:text-[#BC6A45]'
                }`}
                aria-pressed={voiceEnabled}
                aria-label={voiceEnabled ? 'Voice feedback enabled' : 'Enable voice feedback'}
              >
                {voiceEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                <span className="hidden sm:inline">{voiceEnabled ? 'Voice ON' : 'Voice'}</span>
              </button>
            )}

            {/* Status Badge */}
            {sourceDetected && (
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border-2 ${
                inferenceSource === 'local'
                  ? 'bg-[#BAC29C] border-[#6E7E50] text-[#2A2A22]'
                  : inferenceSource === 'cloud'
                    ? 'bg-blue-50 border-blue-200 text-blue-700'
                    : 'bg-[#F1F0E9] border-[#D5D3C5] text-[#6B6A5E]'
              }`}>
                {inferenceSource === 'local' ? (
                  <>
                    <div className="w-2 h-2 rounded-full bg-[#6E7E50] animate-pulse" />
                    <span className="text-xs font-semibold">Local · Private</span>
                  </>
                ) : inferenceSource === 'cloud' ? (
                  <>
                    <Cloud className="w-3.5 h-3.5" />
                    <span className="text-xs font-semibold">Cloud · Gemma 4</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span className="text-xs font-semibold">Demo Mode</span>
                  </>
                )}
              </div>
            )}
          </div>
        </header>

        <main role="main">
          {/* Title Section */}
          {!result && !isAnalyzing && !showCompare && (
            <div className="mb-10">
              <p className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#BAC29C] text-[#2A2A22] text-xs font-semibold uppercase tracking-wider mb-4">
                <Camera className="w-3.5 h-3.5" />
                Artisan Studio
              </p>
              <h1 className="text-3xl md:text-4xl font-bold font-serif text-[#2A2A22] leading-tight mb-3">
                Hear what your photo needs
              </h1>
              <p className="text-lg text-[#6B6A5E] leading-relaxed max-w-xl">
                Select a sample to see real Gemma 4 analysis, or upload your own photo.
              </p>
            </div>
          )}

          {/* HERO: Demo Samples Grid */}
          {sourceDetected && !result && !isAnalyzing && !showCompare && (
            <div className="space-y-10">
              {/* Demo Samples - THE HERO */}
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-bold text-[#2A2A22] mb-1">Try a Sample</h2>
                    <p className="text-sm text-[#6B6A5E]">Real Gemma 4 E4B responses, generated locally via Ollama</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {DEMO_RESPONSES.map((sample) => (
                    <button
                      key={sample.id}
                      onClick={() => handleDemoSampleSelect(sample)}
                      className="group text-left rounded-2xl bg-[#F1F0E9] border-2 border-[#D5D3C5] overflow-hidden hover:border-[#BC6A45] hover:shadow-xl hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-[#BC6A45] card-transition"
                      aria-label={`Analyze ${sample.label}`}
                    >
                      <div className="relative h-52 overflow-hidden">
                        <img
                          src={sample.imagePath}
                          alt={sample.label}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#2A2A22]/60 via-transparent to-transparent" />
                        <div className="absolute bottom-4 left-4 right-4">
                          <span className="inline-block px-2.5 py-1 rounded-full bg-[#F1F0E9]/90 text-[10px] font-bold uppercase tracking-wider text-[#2A2A22] mb-2">
                            {sample.category}
                          </span>
                          <p className="text-white font-semibold text-lg">{sample.label}</p>
                        </div>
                      </div>
                      <div className="p-4 flex items-center justify-between bg-[#F1F0E9]">
                        <span className="text-sm font-medium text-[#6B6A5E]">See analysis</span>
                        <ArrowRight className="w-4 h-4 text-[#BC6A45] group-hover:translate-x-1 transition-transform" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Compare Option */}
              <button
                onClick={() => {
                  setShowCompare(true);
                  setDemoCompareResult(DEMO_COMPARISON_RESULT);
                }}
                className="flex items-center gap-3 text-[#6B6A5E] hover:text-[#BC6A45] group"
                aria-label="Compare two photos"
              >
                <div className="w-10 h-10 rounded-full bg-[#F1F0E9] border border-[#D5D3C5] flex items-center justify-center group-hover:border-[#BC6A45]">
                  <ImageIcon className="w-4 h-4" />
                </div>
                <span className="text-sm font-medium">Compare two photos of the same product</span>
                <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
              </button>

              {/* SECONDARY: Upload Section */}
              {inferenceSource !== 'demo' && (
                <div className="pt-8 border-t-2 border-[#D5D3C5]">
                  <p className="text-sm text-[#6B6A5E] mb-4">
                    Want to try your own photo? Upload one below for {inferenceSource === 'cloud' ? 'cloud' : 'local'} analysis.
                  </p>
                  <button
                    onClick={handleCapture}
                    className="w-full rounded-2xl border-2 border-dashed border-[#D5D3C5] bg-[#F1F0E9] hover:border-[#BC6A45] hover:bg-[#F1F0E9] p-8 flex flex-col items-center gap-4 focus:outline-none focus:ring-2 focus:ring-[#BC6A45] group"
                    aria-label="Upload your own photo"
                  >
                    <div className="w-14 h-14 rounded-2xl bg-[#F1F0E9] border border-[#D5D3C5] flex items-center justify-center group-hover:bg-[#BAC29C] group-hover:border-[#6E7E50]">
                      <Upload className="w-6 h-6 text-[#6B6A5E] group-hover:text-[#BC6A45]" />
                    </div>
                    <div className="text-center">
                      <p className="text-base font-semibold text-[#2A2A22] mb-1">Upload your photo</p>
                      <p className="text-sm text-[#6B6A5E]">
                        {inferenceSource === 'cloud' ? 'Analyzed via Ollama Cloud' : '100% private, on-device'}
                      </p>
                    </div>
                  </button>
                </div>
              )}

              {/* Demo mode notice */}
              {inferenceSource === 'demo' && (
                <div className="flex items-start gap-3 p-5 rounded-2xl bg-[#F1F0E9] border border-[#D5D3C5]">
                  <Sparkles className="w-5 h-5 text-[#BC6A45] mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm text-[#2A2A22]">
                      <strong className="text-[#2A2A22]">Demo Mode</strong> — These are real Gemma 4 E4B responses captured from local Ollama.
                      <a href="https://github.com/prasadt1/photography-coach-gemma4#quick-start" target="_blank" rel="noopener noreferrer" className="text-[#BC6A45] hover:text-[#BC6A45] underline ml-1">
                        Install Ollama
                      </a> for live analysis.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Analyzing State */}
          {isAnalyzing && (
            <div className="rounded-2xl bg-[#F1F0E9] border-2 border-[#D5D3C5] p-12 text-center" role="status" aria-live="polite">
              <Loader2 className="w-12 h-12 text-[#BC6A45] animate-spin mx-auto mb-4" />
              <p className="text-xl font-bold text-[#2A2A22] mb-2">
                {inferenceSource === 'local' ? 'Analyzing locally...' : inferenceSource === 'cloud' ? 'Analyzing via cloud...' : 'Preparing analysis...'}
              </p>
              <p className="text-[#6B6A5E]">
                {inferenceSource === 'local' ? 'Gemma 4 E4B · Nothing leaves your device' : inferenceSource === 'cloud' ? 'Gemma 4 via Ollama Cloud' : 'Demo response'}
              </p>
            </div>
          )}

          {/* Compare Panel */}
          {showCompare && demoCompareResult && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-[#2A2A22]">Photo Comparison</h2>
                  <p className="text-sm text-[#6B6A5E] mt-1">Same product, different shots</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {getComparisonSamples().map((sample, idx) => {
                  const label = idx === 0 ? 'A' : 'B';
                  const isWinner = demoCompareResult.winner === label;
                  return (
                    <div key={sample.id} className={`rounded-2xl overflow-hidden border-2 ${isWinner ? 'border-[#6E7E50] bg-[#BAC29C]' : 'border-[#D5D3C5] bg-[#F1F0E9] opacity-80'}`}>
                      <div className="relative">
                        <img src={sample.imagePath} alt={sample.label} className="w-full h-48 object-cover" />
                        <div className="absolute top-3 left-3 px-2.5 py-1 bg-[#F1F0E9]/90 rounded-full text-xs font-bold">{label}</div>
                        {isWinner && (
                          <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 bg-[#BAC29C]0 text-white rounded-full text-xs font-bold">
                            <CheckCircle2 className="w-3 h-3" /> Winner
                          </div>
                        )}
                      </div>
                      <p className="p-4 text-sm font-medium text-[#2A2A22]">{sample.label}</p>
                    </div>
                  );
                })}
              </div>

              <div className="rounded-2xl bg-[#F1F0E9] border-2 border-[#D5D3C5] p-6">
                <div className="flex items-center gap-2 mb-4">
                  <CheckCircle2 className="w-5 h-5 text-[#6E7E50]" />
                  <h3 className="text-lg font-bold text-[#2A2A22]">Winner: Photo {demoCompareResult.winner}</h3>
                </div>
                <p className="text-[#6B6A5E] mb-6">{demoCompareResult.reason}</p>
                <button
                  onClick={() => {
                    const winner = getComparisonSamples().find((_, idx) => (idx === 0 && demoCompareResult.winner === 'A') || (idx === 1 && demoCompareResult.winner === 'B'));
                    if (winner) { setShowCompare(false); setDemoCompareResult(null); handleDemoSampleSelect(winner); }
                  }}
                  className="flex items-center gap-2 px-6 py-3 bg-[#BC6A45] hover:bg-[#A4572F] text-white rounded-full text-sm font-semibold"
                >
                  <span>Analyze Winner</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="rounded-2xl bg-red-50 border-2 border-red-200 p-8 text-center" role="alert">
              <AlertTriangle className="w-10 h-10 text-red-500 mx-auto mb-4" />
              <p className="text-red-700 font-medium mb-4">{error}</p>
              <button onClick={handleRetry} className="px-5 py-2.5 bg-[#F1F0E9] border-2 border-[#D5D3C5] hover:border-[#D5D3C5] rounded-full text-sm font-semibold text-[#2A2A22]">
                Try Again
              </button>
            </div>
          )}

          {/* ARIA announcements */}
          <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
            {isAnalyzing && 'Analyzing your photo. Please wait.'}
            {result && !result.readyToList && `Analysis complete. ${result.subject}. Next step: ${result.primaryFix}`}
            {result && result.readyToList && `Analysis complete. ${result.subject}. Ready to list.`}
          </div>

          {/* Result Display */}
          {result && (
            <div className="space-y-8">
              {/* Photo + Verdict */}
              <div className="flex flex-col md:flex-row gap-6">
                <div className="w-full md:w-72 shrink-0 rounded-2xl overflow-hidden border-2 border-[#D5D3C5] bg-[#F1F0E9]">
                  <img src={result.imageBase64} alt="Product photo" className="w-full h-64 object-cover" />
                </div>

                <div className="flex-1 space-y-4">
                  <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${
                    result.readyToList ? 'bg-[#BAC29C] text-[#2A2A22] border-2 border-[#6E7E50]' : 'bg-amber-100 text-amber-700 border-2 border-amber-200'
                  }`}>
                    {result.readyToList ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                    <span className="text-sm font-bold">{result.readyToList ? 'Ready to List' : 'Needs One Fix'}</span>
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-[#6B6A5E] uppercase tracking-wider mb-2">What I See</p>
                    <p className="text-xl font-semibold text-[#2A2A22]">{result.subject}</p>
                  </div>

                  {result.primaryFix && !result.readyToList && (
                    <div className="p-5 rounded-2xl bg-[#BAC29C] border-2 border-[#6E7E50]">
                      <div className="flex items-center gap-2 mb-2">
                        <Lightbulb className="w-4 h-4 text-[#6E7E50]" />
                        <p className="text-xs font-bold text-[#2A2A22] uppercase tracking-wider">Your Next Step</p>
                      </div>
                      <p className="text-[#2A2A22]">{result.primaryFix}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Critique Details */}
              {(result.framing || result.lighting) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {result.framing && (
                    <div className="p-5 rounded-2xl bg-[#F1F0E9] border-2 border-[#D5D3C5]">
                      <div className="flex items-center gap-2 mb-3">
                        <Grid3X3 className="w-4 h-4 text-[#6B6A5E]" />
                        <p className="text-xs font-semibold text-[#6B6A5E] uppercase tracking-wider">Framing</p>
                      </div>
                      <p className="text-[#2A2A22]">{result.framing}</p>
                    </div>
                  )}
                  {result.lighting && (
                    <div className="p-5 rounded-2xl bg-[#F1F0E9] border-2 border-[#D5D3C5]">
                      <div className="flex items-center gap-2 mb-3">
                        <Sun className="w-4 h-4 text-[#6B6A5E]" />
                        <p className="text-xs font-semibold text-[#6B6A5E] uppercase tracking-wider">Lighting</p>
                      </div>
                      <p className="text-[#2A2A22]">{result.lighting}</p>
                    </div>
                  )}
                </div>
              )}

              {result.confidenceNote && (
                <div className="flex items-start gap-3 p-4 rounded-xl bg-[#F1F0E9] border border-[#D5D3C5]">
                  <AlertTriangle className="w-4 h-4 text-[#6B6A5E] mt-0.5 shrink-0" />
                  <p className="text-sm text-[#6B6A5E]">{result.confidenceNote}</p>
                </div>
              )}

              {/* Listing Assets */}
              {(result.altText || result.listingCopy) && (
                <div className="rounded-2xl bg-[#F1F0E9] border-2 border-[#D5D3C5] p-6">
                  <div className="flex items-center gap-2 mb-6">
                    <FileText className="w-4 h-4 text-[#BC6A45]" />
                    <h3 className="text-sm font-bold text-[#2A2A22] uppercase tracking-wider">Listing Assets</h3>
                  </div>

                  <div className="space-y-5">
                    {result.listingCopy && (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs font-semibold text-[#6B6A5E] uppercase tracking-wider">Product Description</p>
                          <button
                            onClick={() => copyToClipboard(result.listingCopy, 'description')}
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                              copiedField === 'description' ? 'bg-[#BAC29C] text-[#2A2A22]' : 'bg-[#F1F0E9] hover:bg-[#D5D3C5] text-[#6B6A5E]'
                            }`}
                          >
                            {copiedField === 'description' ? <><CheckCircle2 className="w-3 h-3" /> Copied</> : <><Copy className="w-3 h-3" /> Copy</>}
                          </button>
                        </div>
                        <p className="text-[#2A2A22] bg-[#F1F0E9] rounded-xl p-4 text-sm">{result.listingCopy}</p>
                      </div>
                    )}

                    {result.altText && (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs font-semibold text-[#6B6A5E] uppercase tracking-wider flex items-center gap-1.5">
                            <Accessibility className="w-3 h-3" /> Alt-Text
                          </p>
                          <button
                            onClick={() => copyToClipboard(result.altText, 'altText')}
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                              copiedField === 'altText' ? 'bg-[#BAC29C] text-[#2A2A22]' : 'bg-[#F1F0E9] hover:bg-[#D5D3C5] text-[#6B6A5E]'
                            }`}
                          >
                            {copiedField === 'altText' ? <><CheckCircle2 className="w-3 h-3" /> Copied</> : <><Copy className="w-3 h-3" /> Copy</>}
                          </button>
                        </div>
                        <p className="text-[#2A2A22] bg-[#F1F0E9] rounded-xl p-4 text-sm">{result.altText}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Try Another */}
              <div className="flex justify-center pt-4">
                <button
                  onClick={handleRetry}
                  className="flex items-center gap-2 px-6 py-3 bg-[#F1F0E9] border-2 border-[#D5D3C5] hover:border-[#BC6A45] rounded-full text-sm font-semibold text-[#2A2A22]"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Analyze Another Photo</span>
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default SellMode;
