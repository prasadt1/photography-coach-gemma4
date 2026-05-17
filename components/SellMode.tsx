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
import { speak, speakFromUserGesture, stopSpeaking, hardStopVoice, clearPausedSpeech } from '../services/voiceCoach';
import { judgeSpeak, judgeStop } from '../lib/judgeSpeech';
import {
  type SellModeResult,
  sellResultFromV3,
  parseAnalysisToSellResult,
  speakSellModeResult,
} from '../lib/sellModeAnalysis';
import type { ArtisanAnalysisV3 } from '../services/voiceCoach';
import { getAnalyzingStatus, getUploadHint } from '../config';
import { showStudioModeEntry } from '../lib/launchRoute';
import { isJudgeDemoBuild } from '../lib/deploymentProfile';
import { GEMMA_4_E4B, OLLAMA_CLOUD, getArtisanStudioWelcomeScript } from '../lib/branding';
import MarketplaceListingPreview, { buildMarketplaceListingDraft } from './MarketplaceListingPreview';
import { DEMO_RESPONSES, DemoResponse, simulateProcessing, getComparisonSamples, DEMO_COMPARISON_RESULT } from '../src/data/demoResponses';
import { ComparisonResult } from '../services/ollamaService';
import Header from './Header';
import Footer from './Footer';
import ArtisanJourney from './ArtisanJourney';

interface SellModeProps {
  onBack: () => void;
  ollamaReady: boolean | null;
  voiceEnabled?: boolean;
  onVoiceToggle?: () => void;
  preloadedImage?: string | null;
  onImageProcessed?: () => void;
}

type SellResult = SellModeResult;

function cloudUnavailableMessage(cloudError?: string): string {
  const hint =
    'Live upload uses gemma4:31b on Ollama Cloud (vision fallback: gemma3:4b). Local E4B (gemma4:e4b) is in the README quick start.';
  const raw = cloudError?.trim() ?? '';
  const detail = raw.replace(/^Cloud analysis failed:\s*/i, '').trim();

  if (/invalid.*api key|401/i.test(raw)) {
    return `Analysis unavailable: ${detail || 'Invalid Ollama API key'}. Set OLLAMA_API_KEY on the Vercel project and redeploy.`;
  }
  if (!detail || /FUNCTION_INVOCATION_FAILED|server error has occurred/i.test(detail)) {
    return `Analysis unavailable. The /api/analyze serverless function failed to start (redeploy after latest push; ensure OLLAMA_API_KEY is set). ${hint}`;
  }
  if (/gemma4:31b|README quick start/i.test(detail)) {
    return `Analysis unavailable: ${detail}`;
  }
  return `Analysis unavailable: ${detail}. ${hint}`;
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
  const [showGuidedJourney, setShowGuidedJourney] = useState(
    () => !preloadedImage && !isJudgeDemoBuild(),
  );

  const fileInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    detectInferenceSource().then((source) => {
      setInferenceSource(source);
      setSourceDetected(true);
    });
  }, []);

  useEffect(() => {
    if (preloadedImage) setShowGuidedJourney(false);
  }, [preloadedImage]);

  useEffect(() => {
    if (!voiceEnabled) {
      if (isJudgeDemoBuild()) judgeStop();
      else hardStopVoice();
    }
  }, [voiceEnabled]);

  const handleDemoSampleSelect = useCallback(async (sample: DemoResponse) => {
    if (voiceEnabled) {
      if (isJudgeDemoBuild()) judgeSpeak('Analyzing your sample. One moment.');
      else speakFromUserGesture('Analyzing your sample. One moment.');
    }
    setError(null);
    setIsAnalyzing(true);
    setResult(null);
    await simulateProcessing();
    const r = sample.response;
    const v3Payload = {
      ...r,
      ratings: { lighting: 0, framing: 0, background: 0, focus: 0 },
      primary_issue: '',
      tags: [] as string[],
    } as ArtisanAnalysisV3;
    const sellRes = sellResultFromV3(v3Payload, sample.imagePath, JSON.stringify(r));
    setResult(sellRes);
    setIsAnalyzing(false);
    if (voiceEnabled) {
      speakSellModeResult(sellRes);
    }
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
          const { content: response, source, cloudError } = await analyzeForSellModeWithFallback(
            preloadedImage,
            'image/jpeg',
            true,
          );
          setInferenceSource(source);
          if (source === 'demo' || !response) {
            setError(cloudUnavailableMessage(cloudError));
            setIsAnalyzing(false);
            return;
          }
          const sellRes = parseAnalysisToSellResult(response, preloadedImage);
          setResult(sellRes);
          if (voiceEnabled) {
            speakSellModeResult(sellRes);
          }
        } catch (err) {
          setError('Analysis failed. Please try again.');
        }
        setIsAnalyzing(false);
      };
      analyzePreloaded();
    }
  }, [preloadedImage, processedPreload, isAnalyzing, voiceEnabled, onImageProcessed]);

  const handleCapture = () => {
    if (isJudgeDemoBuild()) judgeStop();
    else {
      stopSpeaking();
      clearPausedSpeech();
    }
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    if (voiceEnabled && isJudgeDemoBuild()) {
      judgeSpeak('Analyzing your photo. One moment.');
    } else if (voiceEnabled) {
      speakFromUserGesture('Analyzing your photo. One moment.');
    } else {
      stopSpeaking();
      clearPausedSpeech();
    }
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
      const { content: response, source, cloudError } = await analyzeForSellModeWithFallback(
        base64,
        file.type,
        true,
      );
      setInferenceSource(source);
      if (source === 'demo' || !response) {
        setError(cloudUnavailableMessage(cloudError));
        setIsAnalyzing(false);
        return;
      }
      const sellRes = parseAnalysisToSellResult(response, base64);
      setResult(sellRes);
      if (voiceEnabled) {
        speakSellModeResult(sellRes);
      }
    } catch (err) {
      console.error('[SellMode] Analysis failed:', err);
      setError('Failed to analyze photo. Please try again.');
    }
    setIsAnalyzing(false);
  };

  const handleBack = () => {
    if (showGuidedJourney) {
      if (showStudioModeEntry()) {
        setShowGuidedJourney(false);
        stopSpeaking();
        clearPausedSpeech();
      } else {
        if (isJudgeDemoBuild()) judgeStop();
        else hardStopVoice();
        onBack();
      }
    } else if (result || showCompare) {
      setResult(null);
      setShowCompare(false);
      setDemoCompareResult(null);
      setError(null);
      if (isJudgeDemoBuild()) judgeStop();
      else {
        stopSpeaking();
        clearPausedSpeech();
      }
    } else {
      if (isJudgeDemoBuild()) judgeStop();
      else hardStopVoice();
      onBack();
    }
  };

  const handleRetry = () => {
    stopSpeaking();
    clearPausedSpeech();
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
    if (isJudgeDemoBuild()) {
      if (voiceEnabled) judgeSpeak(getArtisanStudioWelcomeScript());
      return;
    }
    const tutorialText = `Welcome to the Artisan Studio. Here's how to use this tool.
    First, you can try one of our sample photos to see how ${GEMMA_4_E4B} analyzes your craft photography.
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

      <main id="main-content" className="max-w-4xl mx-auto px-6 py-8 md:py-12">

        {/* Guided Journey Mode */}
        {showGuidedJourney && (
          <ArtisanJourney
            voiceEnabled={voiceEnabled}
            inferenceSource={inferenceSource}
            onExit={() => setShowGuidedJourney(false)}
          />
        )}

        {/* Demo Samples Mode (existing) */}
        {!showGuidedJourney && (
        <>
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
                Take a photo of your work and hear exactly what's working and how to improve it — no sighted help needed. <span className="text-[#2F4858] font-semibold">New here? Try a sample below.</span>
              </p>

              <button
                type="button"
                onClick={() => setShowGuidedJourney(true)}
                className="inline-flex items-center gap-2 text-sm text-[#2F4858] font-semibold underline mb-6 focus:outline-none focus:ring-2 focus:ring-[#C06B45] rounded"
              >
                <Sparkles className="w-4 h-4" />
                Start voice-guided listing journey
              </button>

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
                <span className="text-sm font-semibold">
                  {isJudgeDemoBuild() ? 'Hear page guide' : 'Play audio guide'}
                </span>
              </button>
            </div>
          )}

          {/* HERO: Demo Samples Grid */}
          {sourceDetected && !result && !isAnalyzing && !showCompare && (
            <div className="space-y-10">
              {isJudgeDemoBuild() && (
                <div className="rounded-2xl border-2 border-[#C06B45] bg-gradient-to-br from-[#FFF8F0] to-[#F4ECDC] p-5">
                  <p className="text-xs font-bold uppercase tracking-wider text-[#C06B45] mb-1">Sell on Etsy</p>
                  <p className="text-sm text-[#241F18] leading-relaxed">
                    There is no separate listing page — after you <strong>try a sample</strong> below, scroll to the{' '}
                    <strong>Etsy listing draft</strong> card (title, description, tags) and tap{' '}
                    <strong>Hear listing draft</strong> so judges hear what artisans would paste into Etsy or Shopify.
                  </p>
                </div>
              )}

              {/* Demo Samples - THE HERO */}
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-bold text-[#241F18] mb-1">Try a Sample</h2>
                    <p className="text-sm text-[#524A3D]">
                      {isJudgeDemoBuild()
                        ? `Recorded ${GEMMA_4_E4B} (local Mac) — upload uses live ${OLLAMA_CLOUD}`
                        : `Real ${GEMMA_4_E4B} responses via Ollama on your device`}
                    </p>
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
                  stopSpeaking();
                  clearPausedSpeech();
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
              <div className="pt-8 border-t-2 border-[#D8CDB8]">
                <p className="text-sm text-[#524A3D] mb-4">
                  Want to try your own photo? Upload one below for analysis.
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
                      {getUploadHint(inferenceSource)}
                    </p>
                  </div>
                </button>
              </div>

            </div>
          )}

          {/* Analyzing State */}
          {isAnalyzing && (
            <div className="rounded-2xl bg-[#F4ECDC] border-2 border-[#D8CDB8] p-12 text-center" role="status" aria-live="polite">
              <Loader2 className="w-12 h-12 text-[#C06B45] animate-spin mx-auto mb-4" />
              <p className="text-xl font-bold text-[#241F18] mb-2">
                {getAnalyzingStatus(inferenceSource).title}
              </p>
              <p className="text-[#524A3D]">
                {getAnalyzingStatus(inferenceSource).subtitle}
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

                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold text-[#524A3D] uppercase tracking-wider mb-2">What I See</p>
                      <p className="text-xl font-semibold text-[#241F18]">{result.subject}</p>
                    </div>
                    {voiceEnabled && (
                      <button
                        type="button"
                        onClick={() => speakSellModeResult(result, true)}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-[#2F4858] text-white text-xs font-semibold shrink-0"
                      >
                        <AudioLines className="w-4 h-4" />
                        Hear analysis
                      </button>
                    )}
                  </div>

                  {result.colorCheck && (
                    <div className="p-5 rounded-2xl bg-[#F4ECDC] border-2 border-[#C06B45]/40">
                      <p className="text-xs font-semibold text-[#AB3B24] uppercase tracking-wider mb-2">Colour check</p>
                      <p className="text-[#241F18]">{result.colorCheck}</p>
                    </div>
                  )}

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
                    {result.tags && result.tags.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-[#524A3D] uppercase tracking-wider mb-2">Marketplace tags</p>
                        <p className="text-sm text-[#241F18]">{result.tags.join(', ')}</p>
                      </div>
                    )}

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

              {(result.listingCopy || result.altText) && (
                <div id="etsy-listing-draft">
                <MarketplaceListingPreview
                  draft={buildMarketplaceListingDraft({
                    subject: result.subject,
                    listingCopy: result.listingCopy,
                    altText: result.altText,
                    tags: result.tags,
                    readyToList: result.readyToList,
                    primaryFix: result.primaryFix,
                  })}
                  voiceEnabled={voiceEnabled}
                />
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
        </>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default SellMode;
