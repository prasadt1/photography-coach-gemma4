/**
 * HomePage.tsx — L.E.N.S. Landing Page
 *
 * Warm, craft-forward design for blind and low-vision artisans.
 * Lead with humanity: craft hands, warm neutrals, accessibility-first.
 */

import React, { useState, useEffect } from 'react';
import {
  AudioLines, Camera, WifiOff, BadgeCheck,
  ArrowRight, Sparkles, Shield,
  Volume2, VolumeX, Loader2, Cloud, Heart,
} from 'lucide-react';
import { OperationalMode } from '../types.v2';
import { speak } from '../services/voiceCoach';
import { detectInferenceSource, type InferenceSource } from '../services/analysisOrchestrator';

interface HomePageProps {
  onSelectMode: (mode: OperationalMode) => void;
  ollamaReady: boolean | null;
  stats: {
    streak: number;
    xp: number;
    photosAnalyzed: number;
  };
  voiceEnabled?: boolean;
  onVoiceToggle?: () => void;
}

const HomePage: React.FC<HomePageProps> = ({ onSelectMode, ollamaReady: _ollamaReady, stats: _stats, voiceEnabled = false, onVoiceToggle }) => {
  const [connectionState, setConnectionState] = useState<'connecting' | 'ready'>('connecting');
  const [inferenceSource, setInferenceSource] = useState<InferenceSource | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setConnectionState('ready');
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (connectionState === 'ready') {
      detectInferenceSource().then(setInferenceSource);
    }
  }, [connectionState]);

  const handleVoicePreview = () => {
    speak('Voice coaching activated. I will describe what I see in your photos and guide you to better shots.');
  };

  return (
    <div className="min-h-[100dvh] bg-cream-50 text-warmgray-900 relative">
      {/* Hero Section with Craft Imagery */}
      <div className="relative">
        {/* Background: Real craft image - hands knitting */}
        <div className="absolute inset-0 h-[60vh] overflow-hidden">
          <img
            src="/demo-samples/sample-1.jpg"
            alt=""
            className="w-full h-full object-cover"
            aria-hidden="true"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-sand-50/60 via-sand-50/85 to-sand-50" />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto px-6 pt-8 pb-16">
          {/* Header */}
          <header className="flex items-center justify-between mb-16">
            <div className="flex items-center gap-4">
              <div className="relative w-16 h-16 md:w-20 md:h-20 rounded-2xl overflow-hidden shadow-lg ring-2 ring-terracotta-200">
                <img src="/lens-logo.png" alt="L.E.N.S." className="w-full h-full object-cover" />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold font-serif text-warmgray-900 tracking-wide">
                  L.E.N.S.
                </h1>
                <p className="text-xs text-terracotta-600 font-medium tracking-wider uppercase">
                  Local Edge Native Studio
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {onVoiceToggle && (
                <button
                  onClick={onVoiceToggle}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold border-2 ${
                    voiceEnabled
                      ? 'bg-terracotta-500 border-terracotta-500 text-white shadow-lg'
                      : 'bg-sand-50 border-warmgray-200 text-warmgray-600 hover:border-terracotta-300 hover:text-terracotta-600'
                  }`}
                  aria-pressed={voiceEnabled}
                  aria-label={voiceEnabled ? 'Voice feedback enabled' : 'Enable voice feedback'}
                >
                  {voiceEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                  <span className="hidden sm:inline">{voiceEnabled ? 'Voice ON' : 'Voice'}</span>
                </button>
              )}
            </div>
          </header>

          {/* Hero Content */}
          <div className="max-w-2xl">
            <p className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-terracotta-100 text-terracotta-700 text-xs font-semibold uppercase tracking-wider mb-6">
              <Heart className="w-3.5 h-3.5" />
              For blind & low-vision artisans
            </p>

            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold font-serif text-warmgray-900 leading-[1.1] mb-6">
              Your craft deserves<br />
              <span className="text-terracotta-600">photos that sell</span>
            </h2>

            <p className="text-xl text-warmgray-600 leading-relaxed mb-8 max-w-xl">
              L.E.N.S. describes your product photos aloud and guides you to marketplace-ready shots — on your own terms, on your own device.
            </p>

            {/* Status Badge */}
            <div className="mb-10">
              {connectionState === 'connecting' ? (
                <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-warmgray-100 border border-warmgray-200 text-warmgray-500 text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Detecting AI engine...</span>
                </div>
              ) : inferenceSource === 'local' ? (
                <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-forest-50 border-2 border-forest-200 text-forest-700 text-sm font-medium">
                  <BadgeCheck className="w-4 h-4" />
                  <span>Gemma 4 Ready · 100% Private</span>
                </div>
              ) : inferenceSource === 'cloud' ? (
                <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-blue-50 border-2 border-blue-200 text-blue-700 text-sm font-medium">
                  <Cloud className="w-4 h-4" />
                  <span>Ollama Cloud · Real Gemma Analysis</span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-warmgray-100 border border-warmgray-200 text-warmgray-600 text-sm font-medium">
                  <Sparkles className="w-4 h-4" />
                  <span>Demo Mode · Try Sample Photos</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main CTA Section */}
      <div className="relative z-10 max-w-4xl mx-auto px-6 -mt-8">
        {/* Primary CTA: Enter Artisan Studio */}
        <button
          onClick={() => onSelectMode('sell')}
          className="group w-full text-left rounded-3xl p-8 md:p-10 bg-sand-50 border-2 border-warmgray-200 shadow-xl shadow-warmgray-200/50 hover:border-terracotta-300 hover:shadow-2xl hover:shadow-terracotta-200/30 card-transition mb-8"
          aria-label="Enter Artisan Studio - Voice-guided product photography"
        >
          <div className="flex flex-col md:flex-row md:items-center gap-6">
            <div className="w-16 h-16 rounded-2xl bg-terracotta-100 border border-terracotta-200 flex items-center justify-center shrink-0">
              <Camera className="w-8 h-8 text-terracotta-600" />
            </div>

            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-terracotta-100 text-terracotta-700 border border-terracotta-200">
                  Voice-Guided
                </span>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-700 border border-amber-200">
                  Accessibility-First
                </span>
              </div>

              <h3 className="text-2xl md:text-3xl font-bold font-serif text-warmgray-900 mb-2">
                Enter Artisan Studio
              </h3>
              <p className="text-warmgray-600 text-lg leading-relaxed">
                Hear what's working in your product photos, what isn't, and exactly how to fix it.
              </p>
            </div>

            <div className="flex items-center gap-2 text-terracotta-600 font-semibold text-lg">
              <span className="hidden md:inline">Start</span>
              <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Feature list */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 pt-6 border-t border-warmgray-100">
            <div className="flex items-center gap-2 text-sm text-warmgray-600">
              <AudioLines className="w-4 h-4 text-terracotta-500" />
              <span>Voice feedback</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-warmgray-600">
              <Camera className="w-4 h-4 text-terracotta-500" />
              <span>Framing tips</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-warmgray-600">
              <Sparkles className="w-4 h-4 text-terracotta-500" />
              <span>Alt-text ready</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-warmgray-600">
              <Shield className="w-4 h-4 text-terracotta-500" />
              <span>100% private</span>
            </div>
          </div>
        </button>

        {/* Voice Preview Button */}
        <button
          onClick={handleVoicePreview}
          className="w-full flex items-center justify-center gap-3 p-5 rounded-2xl bg-warmgray-100 border border-warmgray-200 hover:bg-warmgray-50 hover:border-terracotta-200 group mb-12"
          aria-label="Click to hear a voice preview"
        >
          <AudioLines className="w-5 h-5 text-terracotta-500 group-hover:scale-105 transition-transform" />
          <p className="text-warmgray-700 text-sm">
            <strong className="text-warmgray-900">Hear how it works:</strong> Click to preview voice feedback
          </p>
        </button>

        {/* Trust Badges */}
        <div className="flex flex-wrap items-center justify-center gap-8 py-8 border-y border-warmgray-200 mb-10">
          <div className="flex items-center gap-2 text-warmgray-600">
            <WifiOff className="w-5 h-5" />
            <span className="font-medium">Works Offline</span>
          </div>
          <div className="flex items-center gap-2 text-warmgray-600">
            <Shield className="w-5 h-5" />
            <span className="font-medium">100% Private</span>
          </div>
          <div className="flex items-center gap-2 text-warmgray-600">
            <Sparkles className="w-5 h-5" />
            <span className="font-medium">Free Forever</span>
          </div>
        </div>

        {/* Footer */}
        <footer className="text-center pb-10 space-y-3">
          <p className="text-sm text-warmgray-500">
            Built for the{' '}
            <a
              href="https://www.kaggle.com/competitions/gemma-4-good-hackathon"
              target="_blank"
              rel="noopener noreferrer"
              className="text-terracotta-600 hover:text-terracotta-700 underline"
            >
              Gemma 4 Good Hackathon
            </a>
            {' '}· Digital Equity & Inclusivity Track
          </p>
          <p className="text-xs text-warmgray-400">
            Powered by Gemma 4 via Ollama · Voice via Web Speech API
          </p>
        </footer>
      </div>
    </div>
  );
};

export default HomePage;
