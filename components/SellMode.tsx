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
  Upload, HelpCircle, AudioLines,
} from 'lucide-react';
import { analyzeForSellModeWithFallback, detectInferenceSource, type InferenceSource } from '../services/analysisOrchestrator';
import { parseSellResponse, parseArtisanResponseV3, speak, stopSpeaking, resumeSpeech, hasPausedSpeech, isSpeechCompleted, clearPausedSpeech } from '../services/voiceCoach';
import { DEMO_RESPONSES, DemoResponse, simulateProcessing, getComparisonSamples, DEMO_COMPARISON_RESULT } from '../src/data/demoResponses';
import { ComparisonResult } from '../services/ollamaService';
import Header from './Header';
import Footer from './Footer';

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

  const handleTutorial = () => {
    const tutorialText = `Welcome to the Artisan Studio. Here's how to use this tool.
    First, you can try one of our sample photos to see how Gemma 4 analyzes your craft photography.
    Just tap or click on any of the sample images below.
    The analysis will tell you what's working in your photo, what needs improvement, and exactly how to fix it.
    You'll hear feedback about framing, lighting, and composition.
    If the photo is ready for your online shop, we'll let you know and provide alt-text and a product description you can copy.
    If you want to analyze your own photo, scroll down to find the upload button.
    Your photo will be analyzed completely on your device - nothing leaves your phone or computer.
    Everything is private and works offline.
    That's it! Select a sample to get started, or upload your own craft photo.`;
    speak(tutorialText);
  };

  return (
    <div className="min-h-[100dvh] bg-[#ECE3D2] text-[#241F18]">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
        aria-label="Take or select a product photo"
      />

      <Header
        showBack
        onBack={handleBack}
        backLabel={result || showCompare ? "Go back" : "Return home"}
        voiceEnabled={voiceEnabled}
        onVoiceToggle={onVoiceToggle}
        inferenceSource={inferenceSource}
        showInferenceStatus={sourceDetected}
      />

      <div className="max-w-4xl mx-auto px-6 py-8 md:py-12">

        <main role="main">
          {/* Title Section */}
          {!result && !isAnalyzing && !showCompare && (
            <div className="mb-10">
              <p className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#A9B8BE] text-[#241F18] text-xs font-semibold uppercase tracking-wider mb-4">
                <Camera className="w-3.5 h-3.5" />
                Artisan Studio
              </p>
              <h1 className="text-3xl md:text-4xl font-bold font-serif text-[#241F18] leading-tight mb-3">
                Hear what your photo needs
              </h1>
              <p className="text-lg text-[#241F18] leading-relaxed max-w-2xl mb-4">
                Take a photo of your work and hear exactly what's working and how to improve it — no sighted help needed. <span className="text-[#2F4858] font-semibold">New here? Start with a sample below.</span>
              </p>

              {/* Compact How It Works */}
              <div className="flex flex-wrap items-center gap-3 mb-4 text-sm">
                <span className="text-[#524A3D] font-medium">How it works:</span>
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#F4ECDC] border border-[#D8CDB8]">
                  <Camera className="w-3 h-3 text-[#2F4858]" />
                  <span className="text-xs font-semibold text-[#241F18]">Take photo</span>
                </div>
                <ArrowRight className="w-3 h-3 text-[#524A3D]" />
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#F4ECDC] border border-[#D8CDB8]">
                  <AudioLines className="w-3 h-3 text-[#2F4858]" />
                  <span className="text-xs font-semibold text-[#241F18]">Hear feedback</span>
                </div>
                <ArrowRight className="w-3 h-3 text-[#524A3D]" />
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#F4ECDC] border border-[#D8CDB8]">
                  <FileText className="w-3 h-3 text-[#2F4858]" />
                  <span className="text-xs font-semibold text-[#241F18]">Get listing copy</span>
                </div>
              </div>

              <button
                onClick={handleTutorial}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#F4ECDC] border-2 border-[#D8CDB8] text-[#241F18] hover:border-[#C06B45] hover:bg-[#A9B8BE] focus:outline-none focus:ring-2 focus:ring-[#C06B45]"
                aria-label="Play audio guide: how to use this page"
              >
                <HelpCircle className="w-4 h-4" />
                <span className="text-sm font-semibold">Play audio guide</span>
              </button>
            </div>
          )}

          {/* HERO: Demo Samples Grid */}
          {sourceDetected && !result && !isAnalyzing && !showCompare && (
            <div className="space-y-10">
              {/* Demo Samples - THE HERO */}
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-bold text-[#241F18] mb-1">Try a Sample</h2>
                    <p className="text-sm text-[#524A3D]">Real Gemma 4 E4B responses, generated locally via Ollama</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {DEMO_RESPONSES.map((sample) => (
                    <button
                      key={sample.id}
                      onClick={() => handleDemoSampleSelect(sample)}
                      className="group text-left rounded-2xl bg-[#F4ECDC] border-2 border-[#D8CDB8] overflow-hidden hover:border-[#C06B45] hover:shadow-xl hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-[#C06B45] card-transition"
                      aria-label={`Analyze ${sample.label}`}
                    >
                      <div className="relative h-52 overflow-hidden">
                        <img
                          src={sample.imagePath}
                          alt={sample.label}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#241F18]/60 via-transparent to-transparent" />
                        <div className="absolute bottom-4 left-4 right-4">
                          <span className="inline-block px-2.5 py-1 rounded-full bg-[#F4ECDC]/90 text-[10px] font-bold uppercase tracking-wider text-[#241F18] mb-2">
                            {sample.category}
                          </span>
                          <p className="text-white font-semibold text-lg">{sample.label}</p>
                        </div>
                      </div>
                      <div className="p-4 flex items-center justify-between bg-[#F4ECDC]">
                        <span className="text-sm font-medium text-[#524A3D]">See analysis</span>
                        <ArrowRight className="w-4 h-4 text-[#C06B45] group-hover:translate-x-1 transition-transform" />
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
                className="flex items-center gap-3 text-[#524A3D] hover:text-[#C06B45] group"
                aria-label="Compare two photos"
              >
                <div className="w-10 h-10 rounded-full bg-[#F4ECDC] border border-[#D8CDB8] flex items-center justify-center group-hover:border-[#C06B45]">
                  <ImageIcon className="w-4 h-4" />
                </div>
                <span className="text-sm font-medium">Compare two photos of the same product</span>
                <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
              </button>

              {/* SECONDARY: Upload Section */}
              {inferenceSource !== 'demo' && (
                <div className="pt-8 border-t-2 border-[#D8CDB8]">
                  <p className="text-sm text-[#524A3D] mb-4">
                    Want to try your own photo? Upload one below for {inferenceSource === 'cloud' ? 'cloud' : 'local'} analysis.
                    {inferenceSource === 'cloud' && (
                      <span className="block mt-2 text-xs italic">
                        Note: Ollama Cloud is available for demo purposes only — to show how Gemma 4 works without installing Ollama locally. For private, offline analysis, install Ollama on your device.
                      </span>
                    )}
                  </p>
                  <button
                    onClick={handleCapture}
                    className="w-full rounded-2xl border-2 border-dashed border-[#D8CDB8] bg-[#F4ECDC] hover:border-[#C06B45] hover:bg-[#F4ECDC] p-8 flex flex-col items-center gap-4 focus:outline-none focus:ring-2 focus:ring-[#C06B45] group"
                    aria-label="Upload your own photo"
                  >
                    <div className="w-14 h-14 rounded-2xl bg-[#F4ECDC] border border-[#D8CDB8] flex items-center justify-center group-hover:bg-[#A9B8BE] group-hover:border-[#2F4858]">
                      <Upload className="w-6 h-6 text-[#524A3D] group-hover:text-[#C06B45]" />
                    </div>
                    <div className="text-center">
                      <p className="text-base font-semibold text-[#241F18] mb-1">Upload your photo</p>
                      <p className="text-sm text-[#524A3D]">
                        {inferenceSource === 'cloud' ? 'Analyzed via Ollama Cloud' : '100% private, on-device'}
                      </p>
                    </div>
                  </button>
                </div>
              )}

              {/* Demo mode notice */}
              {inferenceSource === 'demo' && (
                <div className="flex items-start gap-3 p-5 rounded-2xl bg-[#F4ECDC] border border-[#D8CDB8]">
                  <Sparkles className="w-5 h-5 text-[#C06B45] mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm text-[#241F18]">
                      <strong className="text-[#241F18]">Demo Mode</strong> — These are real Gemma 4 E4B responses captured from local Ollama.
                      <a href="https://github.com/prasadt1/photography-coach-gemma4#quick-start" target="_blank" rel="noopener noreferrer" className="text-[#C06B45] hover:text-[#C06B45] underline ml-1">
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
            <div className="rounded-2xl bg-[#F4ECDC] border-2 border-[#D8CDB8] p-12 text-center" role="status" aria-live="polite">
              <Loader2 className="w-12 h-12 text-[#C06B45] animate-spin mx-auto mb-4" />
              <p className="text-xl font-bold text-[#241F18] mb-2">
                {inferenceSource === 'local' ? 'Analyzing locally...' : inferenceSource === 'cloud' ? 'Analyzing via cloud...' : 'Preparing analysis...'}
              </p>
              <p className="text-[#524A3D]">
                {inferenceSource === 'local' ? 'Gemma 4 E4B · Nothing leaves your device' : inferenceSource === 'cloud' ? 'Gemma 4 via Ollama Cloud' : 'Demo response'}
              </p>
            </div>
          )}

          {/* Compare Panel */}
          {showCompare && demoCompareResult && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-[#241F18]">Photo Comparison</h2>
                  <p className="text-sm text-[#524A3D] mt-1">Same product, different shots</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {getComparisonSamples().map((sample, idx) => {
                  const label = idx === 0 ? 'A' : 'B';
                  const isWinner = demoCompareResult.winner === label;
                  return (
                    <div key={sample.id} className={`rounded-2xl overflow-hidden border-2 ${isWinner ? 'border-[#2F4858] bg-[#A9B8BE]' : 'border-[#D8CDB8] bg-[#F4ECDC] opacity-80'}`}>
                      <div className="relative">
                        <img src={sample.imagePath} alt={sample.label} className="w-full h-48 object-cover" />
                        <div className="absolute top-3 left-3 px-2.5 py-1 bg-[#F4ECDC]/90 rounded-full text-xs font-bold">{label}</div>
                        {isWinner && (
                          <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 bg-[#A9B8BE]0 text-white rounded-full text-xs font-bold">
                            <CheckCircle2 className="w-3 h-3" /> Winner
                          </div>
                        )}
                      </div>
                      <p className="p-4 text-sm font-medium text-[#241F18]">{sample.label}</p>
                    </div>
                  );
                })}
              </div>

              <div className="rounded-2xl bg-[#F4ECDC] border-2 border-[#D8CDB8] p-6">
                <div className="flex items-center gap-2 mb-4">
                  <CheckCircle2 className="w-5 h-5 text-[#2F4858]" />
                  <h3 className="text-lg font-bold text-[#241F18]">Winner: Photo {demoCompareResult.winner}</h3>
                </div>
                <p className="text-[#524A3D] mb-6">{demoCompareResult.reason}</p>
                <button
                  onClick={() => {
                    const winner = getComparisonSamples().find((_, idx) => (idx === 0 && demoCompareResult.winner === 'A') || (idx === 1 && demoCompareResult.winner === 'B'));
                    if (winner) { setShowCompare(false); setDemoCompareResult(null); handleDemoSampleSelect(winner); }
                  }}
                  className="flex items-center gap-2 px-6 py-3 bg-[#C06B45] hover:bg-[#A6552F] text-white rounded-full text-sm font-semibold"
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
              <button onClick={handleRetry} className="px-5 py-2.5 bg-[#F4ECDC] border-2 border-[#D8CDB8] hover:border-[#D8CDB8] rounded-full text-sm font-semibold text-[#241F18]">
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
                <div className="w-full md:w-96 shrink-0 rounded-2xl overflow-hidden border-2 border-[#D8CDB8] bg-[#F4ECDC]">
                  <img src={result.imageBase64} alt="Product photo" className="w-full object-contain" />
                </div>

                <div className="flex-1 space-y-4">
                  <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${
                    result.readyToList ? 'bg-[#A9B8BE] text-[#241F18] border-2 border-[#2F4858]' : 'bg-amber-100 text-amber-700 border-2 border-amber-200'
                  }`}>
                    {result.readyToList ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                    <span className="text-sm font-bold">{result.readyToList ? 'Ready to List' : 'Needs One Fix'}</span>
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-[#524A3D] uppercase tracking-wider mb-2">What I See</p>
                    <p className="text-xl font-semibold text-[#241F18]">{result.subject}</p>
                  </div>

                  {result.primaryFix && !result.readyToList && (
                    <div className="p-5 rounded-2xl bg-[#A9B8BE] border-2 border-[#2F4858]">
                      <div className="flex items-center gap-2 mb-2">
                        <Lightbulb className="w-4 h-4 text-[#2F4858]" />
                        <p className="text-xs font-bold text-[#241F18] uppercase tracking-wider">Your Next Step</p>
                      </div>
                      <p className="text-[#241F18]">{result.primaryFix}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Critique Details */}
              {(result.framing || result.lighting) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {result.framing && (
                    <div className="p-5 rounded-2xl bg-[#F4ECDC] border-2 border-[#D8CDB8]">
                      <div className="flex items-center gap-2 mb-3">
                        <Grid3X3 className="w-4 h-4 text-[#524A3D]" />
                        <p className="text-xs font-semibold text-[#524A3D] uppercase tracking-wider">Framing</p>
                      </div>
                      <p className="text-[#241F18]">{result.framing}</p>
                    </div>
                  )}
                  {result.lighting && (
                    <div className="p-5 rounded-2xl bg-[#F4ECDC] border-2 border-[#D8CDB8]">
                      <div className="flex items-center gap-2 mb-3">
                        <Sun className="w-4 h-4 text-[#524A3D]" />
                        <p className="text-xs font-semibold text-[#524A3D] uppercase tracking-wider">Lighting</p>
                      </div>
                      <p className="text-[#241F18]">{result.lighting}</p>
                    </div>
                  )}
                </div>
              )}

              {result.confidenceNote && (
                <div className="flex items-start gap-3 p-4 rounded-xl bg-[#F4ECDC] border border-[#D8CDB8]">
                  <AlertTriangle className="w-4 h-4 text-[#524A3D] mt-0.5 shrink-0" />
                  <p className="text-sm text-[#524A3D]">{result.confidenceNote}</p>
                </div>
              )}

              {/* Listing Assets */}
              {(result.altText || result.listingCopy) && (
                <div className="rounded-2xl bg-[#F4ECDC] border-2 border-[#D8CDB8] p-6">
                  <div className="flex items-center gap-2 mb-6">
                    <FileText className="w-4 h-4 text-[#C06B45]" />
                    <h3 className="text-sm font-bold text-[#241F18] uppercase tracking-wider">Listing Assets</h3>
                  </div>

                  <div className="space-y-5">
                    {result.listingCopy && (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs font-semibold text-[#524A3D] uppercase tracking-wider">Product Description</p>
                          <button
                            onClick={() => copyToClipboard(result.listingCopy, 'description')}
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                              copiedField === 'description' ? 'bg-[#A9B8BE] text-[#241F18]' : 'bg-[#F4ECDC] hover:bg-[#D8CDB8] text-[#524A3D]'
                            }`}
                          >
                            {copiedField === 'description' ? <><CheckCircle2 className="w-3 h-3" /> Copied</> : <><Copy className="w-3 h-3" /> Copy</>}
                          </button>
                        </div>
                        <p className="text-[#241F18] bg-[#F4ECDC] rounded-xl p-4 text-sm">{result.listingCopy}</p>
                      </div>
                    )}

                    {result.altText && (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs font-semibold text-[#524A3D] uppercase tracking-wider flex items-center gap-1.5">
                            <Accessibility className="w-3 h-3" /> Alt-Text
                          </p>
                          <button
                            onClick={() => copyToClipboard(result.altText, 'altText')}
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                              copiedField === 'altText' ? 'bg-[#A9B8BE] text-[#241F18]' : 'bg-[#F4ECDC] hover:bg-[#D8CDB8] text-[#524A3D]'
                            }`}
                          >
                            {copiedField === 'altText' ? <><CheckCircle2 className="w-3 h-3" /> Copied</> : <><Copy className="w-3 h-3" /> Copy</>}
                          </button>
                        </div>
                        <p className="text-[#241F18] bg-[#F4ECDC] rounded-xl p-4 text-sm">{result.altText}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Try Another */}
              <div className="flex justify-center pt-4">
                <button
                  onClick={handleRetry}
                  className="flex items-center gap-2 px-6 py-3 bg-[#F4ECDC] border-2 border-[#D8CDB8] hover:border-[#C06B45] rounded-full text-sm font-semibold text-[#241F18]"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Analyze Another Photo</span>
                </button>
              </div>
            </div>
          )}
        </main>
      </div>

      <Footer />
    </div>
  );
};

export default SellMode;
