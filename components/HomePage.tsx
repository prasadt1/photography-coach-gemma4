/**
 * HomePage.tsx — L.E.N.S. Landing Page
 *
 * Ultra-compact 5-section layout. Minimal scrolling, tight spacing.
 */

import React, { useState, useEffect } from 'react';
import {
  AudioLines, Camera, WifiOff, BadgeCheck,
  ArrowRight, Sparkles, Shield, Loader2, Cloud, Heart,
  User, Wrench, Smartphone, Target, Plus,
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
    <div className="min-h-[100dvh] bg-[#F5F3ED]">
      {/* Compact header bar */}
      <header className="border-b border-warmgray-200 bg-[#F5F3ED]/95 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg overflow-hidden shadow-sm ring-1 ring-terracotta-200 bg-[#F5F3ED]">
              <img src="/lens-logo.svg" alt="L.E.N.S." className="w-full h-full object-contain p-1" />
            </div>
            <div>
              <h1 className="text-base font-bold font-serif text-warmgray-900">L.E.N.S.</h1>
              <p className="text-[9px] text-terracotta-600 font-semibold tracking-wider uppercase">
                Local Edge Native Studio
              </p>
            </div>
          </div>

          {onVoiceToggle && (
            <button
              onClick={onVoiceToggle}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${
                voiceEnabled
                  ? 'bg-terracotta-500 border-terracotta-500 text-white'
                  : 'bg-[#F5F3ED] border-warmgray-300 text-warmgray-700'
              }`}
              aria-pressed={voiceEnabled}
            >
              <AudioLines className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Voice {voiceEnabled ? 'ON' : 'OFF'}</span>
            </button>
          )}
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6">
        {/* ========== HERO: Compact, inline image ========== */}
        <section className="py-8 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <div>
            {/* Large prominent badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-terracotta-500 text-white text-sm font-bold uppercase tracking-wide mb-4 shadow-lg">
              <Heart className="w-4 h-4" />
              For blind & low-vision artisans
            </div>

            <h2 className="text-3xl md:text-4xl font-bold font-serif text-warmgray-900 leading-tight mb-3">
              Your craft deserves<br />
              <span className="text-terracotta-600">photos that sell</span>
            </h2>

            <p className="text-base text-warmgray-700 leading-relaxed mb-4">
              Voice-guided photography coaching. Hear what's working, what isn't, and exactly how to fix it.
            </p>

            {/* Status badge */}
            <div className="mb-4">
              {connectionState === 'connecting' ? (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-warmgray-100 border border-warmgray-200 text-warmgray-600 text-xs">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>Detecting...</span>
                </div>
              ) : inferenceSource === 'local' ? (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-forest-50 border border-forest-200 text-forest-700 text-xs font-semibold">
                  <BadgeCheck className="w-3 h-3" />
                  <span>Gemma 4 Ready</span>
                </div>
              ) : inferenceSource === 'cloud' ? (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold">
                  <Cloud className="w-3 h-3" />
                  <span>Cloud Ready</span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-warmgray-100 border border-warmgray-200 text-warmgray-600 text-xs font-semibold">
                  <Sparkles className="w-3 h-3" />
                  <span>Demo Mode</span>
                </div>
              )}
            </div>

            <button
              onClick={() => onSelectMode('sell')}
              className="group inline-flex items-center gap-2 px-6 py-3 bg-terracotta-500 hover:bg-terracotta-600 text-white rounded-full text-base font-bold shadow-lg transition-all"
            >
              <Camera className="w-4 h-4" />
              <span>Enter Artisan Studio</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          {/* Hero image - inline, not background */}
          <div className="rounded-2xl overflow-hidden shadow-xl border-2 border-warmgray-200">
            <img
              src="/images-homepage/Wood.jpg"
              alt="Artisan hands at work"
              className="w-full h-64 md:h-80 object-cover"
            />
          </div>
        </section>

        {/* ========== THREE PILLARS ========== */}
        <section className="py-8 border-t border-warmgray-200">
          <h3 className="text-2xl font-bold font-serif text-warmgray-900 text-center mb-2">
            The whole product
          </h3>
          <p className="text-sm text-warmgray-600 text-center mb-6">
            Built for makers — your craft, your voice, your terms.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-lg p-5 bg-[#EBE8DD] border border-warmgray-200">
              <div className="w-10 h-10 rounded-lg bg-terracotta-100 flex items-center justify-center mb-3">
                <User className="w-5 h-5 text-terracotta-600" />
              </div>
              <h4 className="text-lg font-bold font-serif text-warmgray-900 mb-1">The artisan</h4>
              <p className="text-xs text-warmgray-600 mb-1 font-medium">human · made by you</p>
              <p className="text-sm text-warmgray-600">You make beautiful things. L.E.N.S. helps you show them.</p>
            </div>

            <div className="rounded-lg p-5 bg-[#EBE8DD] border border-warmgray-200">
              <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center mb-3">
                <Wrench className="w-5 h-5 text-amber-600" />
              </div>
              <h4 className="text-lg font-bold font-serif text-warmgray-900 mb-1">The craft</h4>
              <p className="text-xs text-warmgray-600 mb-1 font-medium">the work itself</p>
              <p className="text-sm text-warmgray-600">Wood, textiles, clay, metal — marketplace-ready photos.</p>
            </div>

            <div className="rounded-lg p-5 bg-[#EBE8DD] border border-warmgray-200">
              <div className="w-10 h-10 rounded-lg bg-forest-100 flex items-center justify-center mb-3">
                <Smartphone className="w-5 h-5 text-forest-600" />
              </div>
              <h4 className="text-lg font-bold font-serif text-warmgray-900 mb-1">Local & private</h4>
              <p className="text-xs text-warmgray-600 mb-1 font-medium">tech · on your device</p>
              <p className="text-sm text-warmgray-600">On your device. Nothing leaves. No tracking.</p>
            </div>
          </div>
        </section>

        {/* ========== HOW IT WORKS ========== */}
        <section className="py-8 border-t border-warmgray-200">
          <h3 className="text-2xl font-bold font-serif text-warmgray-900 text-center mb-2">
            Voice-guided in 3 steps
          </h3>
          <p className="text-sm text-warmgray-600 text-center mb-6">
            Real-time feedback. No reading, no guessing.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            <div className="rounded-xl p-8 bg-[#EBE8DD] border border-warmgray-200 text-center">
              <div className="w-16 h-16 mx-auto rounded-full bg-terracotta-100 flex items-center justify-center mb-3">
                <AudioLines className="w-8 h-8 text-terracotta-600" />
              </div>
              <p className="text-lg font-serif font-bold text-warmgray-900">The app, speaking</p>
              <p className="text-xs text-warmgray-600 mt-1">Real-time voice feedback</p>
            </div>

            <div className="space-y-3">
              <div className="flex gap-3 items-start">
                <div className="w-7 h-7 rounded-full bg-terracotta-500 text-white flex items-center justify-center font-bold text-sm shrink-0">1</div>
                <div>
                  <h4 className="text-sm font-bold text-warmgray-900 mb-0.5">Take a photo</h4>
                  <p className="text-xs text-warmgray-600">Use your phone. No special setup.</p>
                </div>
              </div>

              <div className="flex gap-3 items-start">
                <div className="w-7 h-7 rounded-full bg-terracotta-500 text-white flex items-center justify-center font-bold text-sm shrink-0">2</div>
                <div>
                  <h4 className="text-sm font-bold text-warmgray-900 mb-0.5">Hear what's working</h4>
                  <p className="text-xs text-warmgray-600">Lighting, framing, focus described aloud.</p>
                </div>
              </div>

              <div className="flex gap-3 items-start">
                <div className="w-7 h-7 rounded-full bg-terracotta-500 text-white flex items-center justify-center font-bold text-sm shrink-0">3</div>
                <div>
                  <h4 className="text-sm font-bold text-warmgray-900 mb-0.5">Get one clear fix</h4>
                  <p className="text-xs text-warmgray-600">"Move camera 6 inches left" — not abstract.</p>
                </div>
              </div>

              <button
                onClick={handleVoicePreview}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-warmgray-100 hover:bg-warmgray-50 text-warmgray-700 text-xs font-semibold"
              >
                <AudioLines className="w-3.5 h-3.5 text-terracotta-500" />
                <span>Preview voice</span>
              </button>
            </div>
          </div>
        </section>

        {/* ========== THE CRAFT ========== */}
        <section className="py-8 border-t border-warmgray-200">
          <h3 className="text-2xl font-bold font-serif text-warmgray-900 text-center mb-2">
            For every maker
          </h3>
          <p className="text-sm text-warmgray-600 text-center mb-6">
            Wood, textiles, ceramics, metalwork — L.E.N.S. understands your craft.
          </p>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="group rounded-lg overflow-hidden border border-warmgray-200 bg-[#EBE8DD] hover:shadow-md transition-shadow">
              <div className="aspect-square overflow-hidden">
                <img
                  src="/images-homepage/Wood-work.jpg"
                  alt="Woodwork"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
              </div>
              <div className="p-2 text-center">
                <p className="text-sm font-bold text-warmgray-900">Wood</p>
              </div>
            </div>

            <div className="group rounded-lg overflow-hidden border border-warmgray-200 bg-[#EBE8DD] hover:shadow-md transition-shadow">
              <div className="aspect-square overflow-hidden">
                <img
                  src="/demo-samples/sample-1.jpg"
                  alt="Textiles"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
              </div>
              <div className="p-2 text-center">
                <p className="text-sm font-bold text-warmgray-900">Wool</p>
              </div>
            </div>

            <div className="group rounded-lg overflow-hidden border border-warmgray-200 bg-[#EBE8DD] hover:shadow-md transition-shadow">
              <div className="aspect-square overflow-hidden">
                <img
                  src="/images-homepage/Clay.jpg"
                  alt="Pottery"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
              </div>
              <div className="p-2 text-center">
                <p className="text-sm font-bold text-warmgray-900">Clay</p>
              </div>
            </div>

            <div className="group rounded-lg overflow-hidden border border-warmgray-200 bg-[#EBE8DD] hover:shadow-md transition-shadow">
              <div className="aspect-square overflow-hidden">
                <img
                  src="/images-homepage/Weave.jpg"
                  alt="Weaving"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
              </div>
              <div className="p-2 text-center">
                <p className="text-sm font-bold text-warmgray-900">Weave</p>
              </div>
            </div>

            <div className="group rounded-lg border-2 border-dashed border-warmgray-300 bg-[#EBE8DD] hover:border-terracotta-400 hover:bg-terracotta-50/30 transition-all">
              <div className="aspect-square flex flex-col items-center justify-center p-3">
                <div className="w-10 h-10 rounded-full bg-warmgray-100 border border-warmgray-300 flex items-center justify-center mb-2 group-hover:bg-terracotta-100 group-hover:border-terracotta-300">
                  <Plus className="w-5 h-5 text-warmgray-500 group-hover:text-terracotta-600" />
                </div>
                <p className="text-sm font-bold text-warmgray-700 group-hover:text-terracotta-700">More...</p>
              </div>
              <div className="p-2 text-center">
                <p className="text-xs text-warmgray-500">All crafts</p>
              </div>
            </div>
          </div>
        </section>

        {/* ========== CTA ========== */}
        <section className="py-8 border-t border-warmgray-200 text-center">
          <h3 className="text-2xl font-bold font-serif text-warmgray-900 mb-2">Ready to list?</h3>
          <p className="text-base text-warmgray-600 mb-5">
            Get marketplace-ready photos with voice-guided coaching.
          </p>

          <button
            onClick={() => onSelectMode('sell')}
            className="group inline-flex items-center gap-2 px-7 py-3 bg-terracotta-500 hover:bg-terracotta-600 text-white rounded-full text-base font-bold shadow-xl transition-all mb-4"
          >
            <Camera className="w-4 h-4" />
            <span>Enter Artisan Studio</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>

          <div className="flex flex-wrap items-center justify-center gap-5 mb-5 text-xs">
            <div className="flex items-center gap-1 text-warmgray-600">
              <WifiOff className="w-3.5 h-3.5" />
              <span className="font-semibold">Offline</span>
            </div>
            <div className="flex items-center gap-1 text-warmgray-600">
              <Shield className="w-3.5 h-3.5" />
              <span className="font-semibold">Private</span>
            </div>
            <div className="flex items-center gap-1 text-warmgray-600">
              <Sparkles className="w-3.5 h-3.5" />
              <span className="font-semibold">Free</span>
            </div>
          </div>

          <div className="pt-5 border-t border-warmgray-200 max-w-md mx-auto">
            <p className="text-xs text-warmgray-500 mb-2">
              <strong className="text-warmgray-700">For sighted photographers:</strong> Detailed critique?
            </p>
            <button
              onClick={() => onSelectMode('studio')}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#EBE8DD] border border-warmgray-300 hover:border-forest-400 text-warmgray-700 hover:text-forest-700 rounded-full text-xs font-semibold"
            >
              <Target className="w-3.5 h-3.5" />
              <span>Visit Studio Mode</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </section>
      </div>

      {/* Footer */}
      <footer className="py-6 bg-[#EBE8DD] border-t border-warmgray-200 mt-8">
        <div className="max-w-7xl mx-auto px-6 text-center space-y-4">
          <p className="text-base text-warmgray-700 leading-relaxed">
            Built for the{' '}
            <a
              href="https://www.kaggle.com/competitions/gemma-4-good-hackathon"
              target="_blank"
              rel="noopener noreferrer"
              className="text-terracotta-600 hover:text-terracotta-700 underline font-bold"
            >
              Gemma 4 Good Hackathon
            </a>
            {' '}· Digital Equity & Inclusivity Track
          </p>

          {/* Powered by - with logos */}
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-warmgray-600">
            <div className="flex items-center gap-2">
              <span className="font-medium">Powered by</span>
              <a
                href="https://ai.google.dev/gemma"
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold text-terracotta-600 hover:text-terracotta-700 underline"
              >
                Gemma 4
              </a>
              <span className="text-warmgray-400">via</span>
              <a
                href="https://ollama.com"
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold text-terracotta-600 hover:text-terracotta-700 underline"
              >
                Ollama
              </a>
            </div>
            <span className="text-warmgray-400">·</span>
            <div className="flex items-center gap-2">
              <span className="font-medium">Voice via</span>
              <span className="font-semibold text-warmgray-700">Web Speech API</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
