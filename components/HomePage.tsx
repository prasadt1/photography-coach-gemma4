/**
 * HomePage.tsx — L.E.N.S. Landing Page
 *
 * 5-section structure: Hero → Three Pillars → How It Works → The Craft → CTA
 * Warm craft palette, real artisan imagery, accessibility-first.
 */

import React, { useState, useEffect } from 'react';
import {
  AudioLines, Camera, WifiOff, BadgeCheck,
  ArrowRight, Sparkles, Shield, Loader2, Cloud, Heart,
  User, Wrench, Smartphone, Target,
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
    <div className="min-h-[100dvh] bg-sand-50 text-warmgray-900">
      {/* ========== SECTION 1: HERO ========== */}
      <section className="relative min-h-[90vh] flex items-center">
        {/* Background craft image */}
        <div className="absolute inset-0 overflow-hidden">
          <img
            src="/images-homepage/Carpenter Working on Wooden Frame.jpg"
            alt=""
            className="w-full h-full object-cover"
            aria-hidden="true"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-sand-50/70 via-sand-50/85 to-sand-50" />
        </div>

        <div className="relative z-10 max-w-6xl mx-auto px-6 py-12 w-full">
          {/* Top bar: Logo + Voice toggle */}
          <div className="flex items-center justify-between mb-16">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl overflow-hidden shadow-lg ring-2 ring-terracotta-200 bg-sand-50">
                <img src="/lens-logo.png" alt="L.E.N.S." className="w-full h-full object-cover" />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold font-serif text-warmgray-900 tracking-wide">
                  L.E.N.S.
                </h1>
                <p className="text-xs text-terracotta-600 font-semibold tracking-wider uppercase">
                  Local Edge Native Studio
                </p>
              </div>
            </div>

            {onVoiceToggle && (
              <button
                onClick={onVoiceToggle}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold border-2 shadow-sm ${
                  voiceEnabled
                    ? 'bg-terracotta-500 border-terracotta-500 text-white'
                    : 'bg-sand-50 border-warmgray-300 text-warmgray-700 hover:border-terracotta-400'
                }`}
                aria-pressed={voiceEnabled}
              >
                <AudioLines className="w-4 h-4" />
                <span className="hidden sm:inline">Voice {voiceEnabled ? 'ON' : 'OFF'}</span>
              </button>
            )}
          </div>

          {/* Hero content */}
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-terracotta-100 border border-terracotta-200 text-terracotta-700 text-xs font-bold uppercase tracking-wider mb-6">
              <Heart className="w-3.5 h-3.5" />
              For blind & low-vision artisans
            </div>

            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold font-serif text-warmgray-900 leading-[1.1] mb-6">
              Your craft deserves<br />
              <span className="text-terracotta-600">photos that sell</span>
            </h2>

            <p className="text-xl md:text-2xl text-warmgray-700 leading-relaxed mb-10 max-w-xl">
              Voice-guided photography coaching. Hear what's working, what isn't, and exactly how to fix it — on your device, 100% private.
            </p>

            {/* Status badge */}
            <div className="mb-10">
              {connectionState === 'connecting' ? (
                <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-warmgray-100 border border-warmgray-200 text-warmgray-600 text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Detecting AI engine...</span>
                </div>
              ) : inferenceSource === 'local' ? (
                <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-forest-50 border-2 border-forest-200 text-forest-700 text-sm font-semibold">
                  <BadgeCheck className="w-4 h-4" />
                  <span>Gemma 4 Ready · 100% Private</span>
                </div>
              ) : inferenceSource === 'cloud' ? (
                <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-blue-50 border-2 border-blue-200 text-blue-700 text-sm font-semibold">
                  <Cloud className="w-4 h-4" />
                  <span>Ollama Cloud · Real Analysis</span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-warmgray-100 border border-warmgray-200 text-warmgray-600 text-sm font-semibold">
                  <Sparkles className="w-4 h-4" />
                  <span>Demo Mode · Try Samples</span>
                </div>
              )}
            </div>

            {/* Primary CTA */}
            <button
              onClick={() => onSelectMode('sell')}
              className="group inline-flex items-center gap-3 px-8 py-4 bg-terracotta-500 hover:bg-terracotta-600 text-white rounded-full text-lg font-bold shadow-xl hover:shadow-2xl transition-all"
            >
              <Camera className="w-5 h-5" />
              <span>Enter Artisan Studio</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </section>

      {/* ========== SECTION 2: THREE PILLARS ========== */}
      <section className="py-20 bg-cream-50">
        <div className="max-w-6xl mx-auto px-6">
          <h3 className="text-3xl md:text-4xl font-bold font-serif text-warmgray-900 text-center mb-4">
            The whole product, at a glance
          </h3>
          <p className="text-lg text-warmgray-600 text-center mb-12 max-w-2xl mx-auto">
            L.E.N.S. is built for makers — your craft, your voice, your terms.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* The Artisan */}
            <div className="rounded-2xl p-8 bg-sand-50 border-2 border-warmgray-200 shadow-sm hover:shadow-lg transition-shadow">
              <div className="w-16 h-16 rounded-xl bg-terracotta-100 border border-terracotta-200 flex items-center justify-center mb-6">
                <User className="w-8 h-8 text-terracotta-600" />
              </div>
              <h4 className="text-2xl font-bold font-serif text-warmgray-900 mb-3">The artisan</h4>
              <p className="text-warmgray-600 leading-relaxed mb-2 font-medium">human · made by you</p>
              <p className="text-warmgray-600 leading-relaxed">
                You make beautiful things with your hands. L.E.N.S. helps you show them to the world.
              </p>
            </div>

            {/* The Craft */}
            <div className="rounded-2xl p-8 bg-sand-50 border-2 border-warmgray-200 shadow-sm hover:shadow-lg transition-shadow">
              <div className="w-16 h-16 rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center mb-6">
                <Wrench className="w-8 h-8 text-amber-600" />
              </div>
              <h4 className="text-2xl font-bold font-serif text-warmgray-900 mb-3">The craft</h4>
              <p className="text-warmgray-600 leading-relaxed mb-2 font-medium">the work itself</p>
              <p className="text-warmgray-600 leading-relaxed">
                Textiles, wood, clay, metal — every craft deserves marketplace-ready product photos.
              </p>
            </div>

            {/* Local & Private */}
            <div className="rounded-2xl p-8 bg-sand-50 border-2 border-warmgray-200 shadow-sm hover:shadow-lg transition-shadow">
              <div className="w-16 h-16 rounded-xl bg-forest-100 border border-forest-200 flex items-center justify-center mb-6">
                <Smartphone className="w-8 h-8 text-forest-600" />
              </div>
              <h4 className="text-2xl font-bold font-serif text-warmgray-900 mb-3">Local & private</h4>
              <p className="text-warmgray-600 leading-relaxed mb-2 font-medium">tech · on your device</p>
              <p className="text-warmgray-600 leading-relaxed">
                Gemma 4 runs on your phone or computer. Nothing leaves your device. No cloud, no tracking.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ========== SECTION 3: HOW IT WORKS ========== */}
      <section className="py-20 bg-sand-50">
        <div className="max-w-6xl mx-auto px-6">
          <h3 className="text-3xl md:text-4xl font-bold font-serif text-warmgray-900 text-center mb-4">
            Voice-guided, in three steps
          </h3>
          <p className="text-lg text-warmgray-600 text-center mb-12 max-w-2xl mx-auto">
            Hear real-time feedback on your product photos. No reading, no guessing.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            {/* Visual mockup */}
            <div className="rounded-3xl p-12 bg-cream-100 border-2 border-warmgray-200 flex items-center justify-center">
              <div className="text-center">
                <div className="w-24 h-24 mx-auto rounded-full bg-terracotta-100 border-2 border-terracotta-200 flex items-center justify-center mb-6">
                  <AudioLines className="w-12 h-12 text-terracotta-600" />
                </div>
                <p className="text-2xl font-serif font-bold text-warmgray-900">The app, speaking</p>
                <p className="text-warmgray-600 mt-2">Real-time voice feedback</p>
              </div>
            </div>

            {/* Steps */}
            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-full bg-terracotta-500 text-white flex items-center justify-center font-bold text-lg shrink-0">
                  1
                </div>
                <div>
                  <h4 className="text-xl font-bold text-warmgray-900 mb-2">Take a photo of your product</h4>
                  <p className="text-warmgray-600 leading-relaxed">
                    Use your phone or camera. No special setup needed.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-full bg-terracotta-500 text-white flex items-center justify-center font-bold text-lg shrink-0">
                  2
                </div>
                <div>
                  <h4 className="text-xl font-bold text-warmgray-900 mb-2">Hear what's working (and what isn't)</h4>
                  <p className="text-warmgray-600 leading-relaxed">
                    Gemma 4 describes your photo aloud: lighting, framing, background, focus.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-full bg-terracotta-500 text-white flex items-center justify-center font-bold text-lg shrink-0">
                  3
                </div>
                <div>
                  <h4 className="text-xl font-bold text-warmgray-900 mb-2">Get one clear fix to make it better</h4>
                  <p className="text-warmgray-600 leading-relaxed">
                    Actionable, physical corrections: "Move the camera 6 inches left," not abstract critique.
                  </p>
                </div>
              </div>

              <button
                onClick={handleVoicePreview}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-warmgray-100 border border-warmgray-300 hover:bg-warmgray-50 text-warmgray-700 font-semibold transition-colors"
              >
                <AudioLines className="w-5 h-5 text-terracotta-500" />
                <span>Preview voice feedback</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ========== SECTION 4: THE CRAFT ========== */}
      <section className="py-20 bg-cream-50">
        <div className="max-w-6xl mx-auto px-6">
          <h3 className="text-3xl md:text-4xl font-bold font-serif text-warmgray-900 text-center mb-4">
            For every kind of maker
          </h3>
          <p className="text-lg text-warmgray-600 text-center mb-12">
            Woodwork, textiles, ceramics, metalwork — L.E.N.S. understands your craft.
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Wood */}
            <div className="group rounded-2xl overflow-hidden border-2 border-warmgray-200 bg-sand-50 hover:shadow-lg transition-shadow">
              <div className="aspect-square overflow-hidden">
                <img
                  src="/images-homepage/Carpenter Working on Wooden Frame.jpg"
                  alt=""
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <div className="p-4 text-center">
                <p className="text-lg font-bold text-warmgray-900">Wood</p>
              </div>
            </div>

            {/* Wool */}
            <div className="group rounded-2xl overflow-hidden border-2 border-warmgray-200 bg-sand-50 hover:shadow-lg transition-shadow">
              <div className="aspect-square overflow-hidden">
                <img
                  src="/demo-samples/sample-1.jpg"
                  alt=""
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <div className="p-4 text-center">
                <p className="text-lg font-bold text-warmgray-900">Wool</p>
              </div>
            </div>

            {/* Clay */}
            <div className="group rounded-2xl overflow-hidden border-2 border-warmgray-200 bg-sand-50 hover:shadow-lg transition-shadow">
              <div className="aspect-square overflow-hidden">
                <img
                  src="/images-homepage/Person Holding Clay Jar.jpg"
                  alt=""
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <div className="p-4 text-center">
                <p className="text-lg font-bold text-warmgray-900">Clay</p>
              </div>
            </div>

            {/* Weave */}
            <div className="group rounded-2xl overflow-hidden border-2 border-warmgray-200 bg-sand-50 hover:shadow-lg transition-shadow">
              <div className="aspect-square overflow-hidden">
                <img
                  src="/images-homepage/loom-weaving.jpg"
                  alt=""
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <div className="p-4 text-center">
                <p className="text-lg font-bold text-warmgray-900">Weave</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========== SECTION 5: CTA ========== */}
      <section className="py-20 bg-sand-50">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h3 className="text-3xl md:text-4xl font-bold font-serif text-warmgray-900 mb-6">
            Ready to list?
          </h3>
          <p className="text-xl text-warmgray-600 mb-10 max-w-2xl mx-auto">
            Get marketplace-ready product photos with voice-guided coaching.
          </p>

          {/* Primary CTA: Artisan Studio */}
          <button
            onClick={() => onSelectMode('sell')}
            className="group inline-flex items-center gap-3 px-10 py-5 bg-terracotta-500 hover:bg-terracotta-600 text-white rounded-full text-xl font-bold shadow-2xl hover:shadow-3xl transition-all mb-6"
          >
            <Camera className="w-6 h-6" />
            <span>Enter Artisan Studio</span>
            <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
          </button>

          {/* Trust badges */}
          <div className="flex flex-wrap items-center justify-center gap-8 mb-8">
            <div className="flex items-center gap-2 text-warmgray-600">
              <WifiOff className="w-5 h-5" />
              <span className="font-semibold">Works Offline</span>
            </div>
            <div className="flex items-center gap-2 text-warmgray-600">
              <Shield className="w-5 h-5" />
              <span className="font-semibold">100% Private</span>
            </div>
            <div className="flex items-center gap-2 text-warmgray-600">
              <Sparkles className="w-5 h-5" />
              <span className="font-semibold">Free Forever</span>
            </div>
          </div>

          {/* Secondary: Studio Mode for sighted photographers */}
          <div className="pt-8 border-t border-warmgray-200">
            <p className="text-sm text-warmgray-500 mb-4">
              <strong className="text-warmgray-700">For sighted photographers:</strong> Want detailed critique with scores and spatial analysis?
            </p>
            <button
              onClick={() => onSelectMode('studio')}
              className="inline-flex items-center gap-2 px-6 py-3 bg-sand-50 border-2 border-warmgray-300 hover:border-forest-400 text-warmgray-700 hover:text-forest-700 rounded-full font-semibold transition-colors"
            >
              <Target className="w-5 h-5" />
              <span>Visit Studio Mode</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* ========== FOOTER ========== */}
      <footer className="py-12 bg-cream-50 border-t border-warmgray-200">
        <div className="max-w-6xl mx-auto px-6 text-center space-y-4">
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
            {' '}· Digital Equity & Inclusivity Track
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
