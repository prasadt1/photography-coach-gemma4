/**
 * HomePage.tsx — L.E.N.S. Landing Page
 *
 * 5-section structure: Hero → Three Pillars → How It Works → The Craft → CTA
 * Compact layout, warm peachy-cream palette, real artisan imagery.
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
    <div className="min-h-[100dvh] bg-[#FBF6F0] text-warmgray-900">
      {/* ========== SECTION 1: HERO ========== */}
      <section className="relative min-h-[75vh] flex items-center">
        {/* Background craft image */}
        <div className="absolute inset-0 overflow-hidden">
          <img
            src="/images-homepage/Wood.jpg"
            alt=""
            className="w-full h-full object-cover"
            aria-hidden="true"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#FBF6F0]/80 via-[#FBF6F0]/90 to-[#FBF6F0]" />
        </div>

        <div className="relative z-10 max-w-6xl mx-auto px-6 py-6 w-full">
          {/* Compact top bar: Logo + Voice toggle */}
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl overflow-hidden shadow-md ring-2 ring-terracotta-200 bg-[#FBF6F0]">
                <img src="/lens-logo.png" alt="L.E.N.S." className="w-full h-full object-cover" />
              </div>
              <div>
                <h1 className="text-lg md:text-xl font-bold font-serif text-warmgray-900 tracking-wide">
                  L.E.N.S.
                </h1>
                <p className="text-[10px] text-terracotta-600 font-semibold tracking-wider uppercase">
                  Local Edge Native Studio
                </p>
              </div>
            </div>

            {onVoiceToggle && (
              <button
                onClick={onVoiceToggle}
                className={`flex items-center gap-2 px-3 py-2 rounded-full text-sm font-semibold border-2 shadow-sm ${
                  voiceEnabled
                    ? 'bg-terracotta-500 border-terracotta-500 text-white'
                    : 'bg-[#FBF6F0] border-warmgray-300 text-warmgray-700 hover:border-terracotta-400'
                }`}
                aria-pressed={voiceEnabled}
              >
                <AudioLines className="w-4 h-4" />
                <span className="hidden sm:inline text-xs">Voice {voiceEnabled ? 'ON' : 'OFF'}</span>
              </button>
            )}
          </div>

          {/* Hero content - compact */}
          <div className="max-w-2xl">
            {/* Larger, more prominent badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-terracotta-500 text-white text-sm font-bold uppercase tracking-wider mb-5 shadow-lg">
              <Heart className="w-4 h-4" />
              For blind & low-vision artisans
            </div>

            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold font-serif text-warmgray-900 leading-[1.1] mb-4">
              Your craft deserves<br />
              <span className="text-terracotta-600">photos that sell</span>
            </h2>

            <p className="text-lg md:text-xl text-warmgray-700 leading-relaxed mb-6 max-w-xl">
              Voice-guided photography coaching. Hear what's working, what isn't, and exactly how to fix it.
            </p>

            {/* Status badge - compact */}
            <div className="mb-6">
              {connectionState === 'connecting' ? (
                <div className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-warmgray-100 border border-warmgray-200 text-warmgray-600 text-xs">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Detecting AI...</span>
                </div>
              ) : inferenceSource === 'local' ? (
                <div className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-forest-50 border border-forest-200 text-forest-700 text-xs font-semibold">
                  <BadgeCheck className="w-3.5 h-3.5" />
                  <span>Gemma 4 Ready · 100% Private</span>
                </div>
              ) : inferenceSource === 'cloud' ? (
                <div className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold">
                  <Cloud className="w-3.5 h-3.5" />
                  <span>Cloud · Real Analysis</span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-warmgray-100 border border-warmgray-200 text-warmgray-600 text-xs font-semibold">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Demo · Try Samples</span>
                </div>
              )}
            </div>

            {/* Primary CTA - compact */}
            <button
              onClick={() => onSelectMode('sell')}
              className="group inline-flex items-center gap-3 px-7 py-3.5 bg-terracotta-500 hover:bg-terracotta-600 text-white rounded-full text-lg font-bold shadow-xl hover:shadow-2xl transition-all"
            >
              <Camera className="w-5 h-5" />
              <span>Enter Artisan Studio</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </section>

      {/* ========== SECTION 2: THREE PILLARS ========== */}
      <section className="py-12 bg-[#F5EDE3]">
        <div className="max-w-6xl mx-auto px-6">
          <h3 className="text-2xl md:text-3xl font-bold font-serif text-warmgray-900 text-center mb-3">
            The whole product, at a glance
          </h3>
          <p className="text-base text-warmgray-600 text-center mb-8 max-w-2xl mx-auto">
            L.E.N.S. is built for makers — your craft, your voice, your terms.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* The Artisan */}
            <div className="rounded-xl p-6 bg-[#FBF6F0] border border-warmgray-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-lg bg-terracotta-100 border border-terracotta-200 flex items-center justify-center mb-4">
                <User className="w-6 h-6 text-terracotta-600" />
              </div>
              <h4 className="text-xl font-bold font-serif text-warmgray-900 mb-2">The artisan</h4>
              <p className="text-warmgray-600 text-sm leading-relaxed mb-1 font-medium">human · made by you</p>
              <p className="text-warmgray-600 text-sm leading-relaxed">
                You make beautiful things. L.E.N.S. helps you show them.
              </p>
            </div>

            {/* The Craft */}
            <div className="rounded-xl p-6 bg-[#FBF6F0] border border-warmgray-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-lg bg-amber-100 border border-amber-200 flex items-center justify-center mb-4">
                <Wrench className="w-6 h-6 text-amber-600" />
              </div>
              <h4 className="text-xl font-bold font-serif text-warmgray-900 mb-2">The craft</h4>
              <p className="text-warmgray-600 text-sm leading-relaxed mb-1 font-medium">the work itself</p>
              <p className="text-warmgray-600 text-sm leading-relaxed">
                Textiles, wood, clay, metal — marketplace-ready photos.
              </p>
            </div>

            {/* Local & Private */}
            <div className="rounded-xl p-6 bg-[#FBF6F0] border border-warmgray-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-lg bg-forest-100 border border-forest-200 flex items-center justify-center mb-4">
                <Smartphone className="w-6 h-6 text-forest-600" />
              </div>
              <h4 className="text-xl font-bold font-serif text-warmgray-900 mb-2">Local & private</h4>
              <p className="text-warmgray-600 text-sm leading-relaxed mb-1 font-medium">tech · on your device</p>
              <p className="text-warmgray-600 text-sm leading-relaxed">
                On your device. Nothing leaves. No cloud, no tracking.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ========== SECTION 3: HOW IT WORKS ========== */}
      <section className="py-12 bg-[#FBF6F0]">
        <div className="max-w-6xl mx-auto px-6">
          <h3 className="text-2xl md:text-3xl font-bold font-serif text-warmgray-900 text-center mb-3">
            Voice-guided, in three steps
          </h3>
          <p className="text-base text-warmgray-600 text-center mb-8 max-w-2xl mx-auto">
            Real-time feedback on your photos. No reading, no guessing.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            {/* Visual mockup - compact */}
            <div className="rounded-2xl p-10 bg-[#F5EDE3] border border-warmgray-200 flex items-center justify-center">
              <div className="text-center">
                <div className="w-20 h-20 mx-auto rounded-full bg-terracotta-100 border border-terracotta-200 flex items-center justify-center mb-4">
                  <AudioLines className="w-10 h-10 text-terracotta-600" />
                </div>
                <p className="text-xl font-serif font-bold text-warmgray-900">The app, speaking</p>
                <p className="text-warmgray-600 text-sm mt-1">Real-time voice feedback</p>
              </div>
            </div>

            {/* Steps - compact */}
            <div className="space-y-5">
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-terracotta-500 text-white flex items-center justify-center font-bold text-base shrink-0">
                  1
                </div>
                <div>
                  <h4 className="text-base font-bold text-warmgray-900 mb-1">Take a photo</h4>
                  <p className="text-warmgray-600 text-sm leading-relaxed">
                    Use your phone or camera. No special setup.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-terracotta-500 text-white flex items-center justify-center font-bold text-base shrink-0">
                  2
                </div>
                <div>
                  <h4 className="text-base font-bold text-warmgray-900 mb-1">Hear what's working</h4>
                  <p className="text-warmgray-600 text-sm leading-relaxed">
                    Gemma 4 describes lighting, framing, focus aloud.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-terracotta-500 text-white flex items-center justify-center font-bold text-base shrink-0">
                  3
                </div>
                <div>
                  <h4 className="text-base font-bold text-warmgray-900 mb-1">Get one clear fix</h4>
                  <p className="text-warmgray-600 text-sm leading-relaxed">
                    Actionable: "Move camera 6 inches left" — not abstract.
                  </p>
                </div>
              </div>

              <button
                onClick={handleVoicePreview}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-warmgray-100 border border-warmgray-300 hover:bg-warmgray-50 text-warmgray-700 text-sm font-semibold transition-colors"
              >
                <AudioLines className="w-4 h-4 text-terracotta-500" />
                <span>Preview voice</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ========== SECTION 4: THE CRAFT ========== */}
      <section className="py-12 bg-[#F5EDE3]">
        <div className="max-w-6xl mx-auto px-6">
          <h3 className="text-2xl md:text-3xl font-bold font-serif text-warmgray-900 text-center mb-3">
            For every kind of maker
          </h3>
          <p className="text-base text-warmgray-600 text-center mb-8">
            Woodwork, textiles, ceramics, metalwork — L.E.N.S. understands your craft.
          </p>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {/* Wood */}
            <div className="group rounded-xl overflow-hidden border border-warmgray-200 bg-[#FBF6F0] hover:shadow-lg transition-shadow">
              <div className="aspect-square overflow-hidden">
                <img
                  src="/images-homepage/Wood.jpg"
                  alt=""
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <div className="p-3 text-center">
                <p className="text-base font-bold text-warmgray-900">Wood</p>
              </div>
            </div>

            {/* Wool */}
            <div className="group rounded-xl overflow-hidden border border-warmgray-200 bg-[#FBF6F0] hover:shadow-lg transition-shadow">
              <div className="aspect-square overflow-hidden">
                <img
                  src="/demo-samples/sample-1.jpg"
                  alt=""
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <div className="p-3 text-center">
                <p className="text-base font-bold text-warmgray-900">Wool</p>
              </div>
            </div>

            {/* Clay */}
            <div className="group rounded-xl overflow-hidden border border-warmgray-200 bg-[#FBF6F0] hover:shadow-lg transition-shadow">
              <div className="aspect-square overflow-hidden">
                <img
                  src="/images-homepage/Clay.jpg"
                  alt=""
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <div className="p-3 text-center">
                <p className="text-base font-bold text-warmgray-900">Clay</p>
              </div>
            </div>

            {/* Weave */}
            <div className="group rounded-xl overflow-hidden border border-warmgray-200 bg-[#FBF6F0] hover:shadow-lg transition-shadow">
              <div className="aspect-square overflow-hidden">
                <img
                  src="/images-homepage/Weave.jpg"
                  alt=""
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <div className="p-3 text-center">
                <p className="text-base font-bold text-warmgray-900">Weave</p>
              </div>
            </div>

            {/* More... */}
            <div className="group rounded-xl overflow-hidden border-2 border-dashed border-warmgray-300 bg-[#FBF6F0] hover:border-terracotta-400 hover:bg-terracotta-50/30 transition-all cursor-pointer">
              <div className="aspect-square flex flex-col items-center justify-center p-4">
                <div className="w-12 h-12 rounded-full bg-warmgray-100 border border-warmgray-300 flex items-center justify-center mb-2 group-hover:bg-terracotta-100 group-hover:border-terracotta-300">
                  <Plus className="w-6 h-6 text-warmgray-500 group-hover:text-terracotta-600" />
                </div>
                <p className="text-base font-bold text-warmgray-700 group-hover:text-terracotta-700">More...</p>
              </div>
              <div className="p-3 text-center">
                <p className="text-xs text-warmgray-500">All crafts welcome</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========== SECTION 5: CTA ========== */}
      <section className="py-12 bg-[#FBF6F0]">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h3 className="text-2xl md:text-3xl font-bold font-serif text-warmgray-900 mb-4">
            Ready to list?
          </h3>
          <p className="text-lg text-warmgray-600 mb-6 max-w-2xl mx-auto">
            Get marketplace-ready product photos with voice-guided coaching.
          </p>

          {/* Primary CTA */}
          <button
            onClick={() => onSelectMode('sell')}
            className="group inline-flex items-center gap-3 px-8 py-4 bg-terracotta-500 hover:bg-terracotta-600 text-white rounded-full text-lg font-bold shadow-2xl hover:shadow-3xl transition-all mb-5"
          >
            <Camera className="w-5 h-5" />
            <span>Enter Artisan Studio</span>
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>

          {/* Trust badges - compact */}
          <div className="flex flex-wrap items-center justify-center gap-6 mb-6">
            <div className="flex items-center gap-1.5 text-warmgray-600 text-sm">
              <WifiOff className="w-4 h-4" />
              <span className="font-semibold">Offline</span>
            </div>
            <div className="flex items-center gap-1.5 text-warmgray-600 text-sm">
              <Shield className="w-4 h-4" />
              <span className="font-semibold">Private</span>
            </div>
            <div className="flex items-center gap-1.5 text-warmgray-600 text-sm">
              <Sparkles className="w-4 h-4" />
              <span className="font-semibold">Free</span>
            </div>
          </div>

          {/* Secondary: Studio Mode - compact */}
          <div className="pt-6 border-t border-warmgray-200">
            <p className="text-xs text-warmgray-500 mb-3">
              <strong className="text-warmgray-700">For sighted photographers:</strong> Detailed critique with scores?
            </p>
            <button
              onClick={() => onSelectMode('studio')}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#F5EDE3] border border-warmgray-300 hover:border-forest-400 text-warmgray-700 hover:text-forest-700 rounded-full text-sm font-semibold transition-colors"
            >
              <Target className="w-4 h-4" />
              <span>Visit Studio Mode</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </section>

      {/* ========== FOOTER - compact ========== */}
      <footer className="py-8 bg-[#F5EDE3] border-t border-warmgray-200">
        <div className="max-w-6xl mx-auto px-6 text-center space-y-3">
          <p className="text-base text-warmgray-600 leading-relaxed">
            Built for the{' '}
            <a
              href="https://www.kaggle.com/competitions/gemma-4-good-hackathon"
              target="_blank"
              rel="noopener noreferrer"
              className="text-terracotta-600 hover:text-terracotta-700 underline font-semibold"
            >
              Gemma 4 Good Hackathon
            </a>
            {' '}· Digital Equity Track
          </p>
          <p className="text-sm text-warmgray-500">
            Powered by Gemma 4 via Ollama · Voice via Web Speech API
          </p>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
