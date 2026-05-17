/**
 * HomePage.tsx — L.E.N.S. Landing Page
 *
 * Studio sage palette, local-first framing, accessibility-first.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  AudioLines, Camera, WifiOff,
  ArrowRight, Sparkles, Shield, Loader2, Heart,
  User, Wrench, Smartphone, Target, Plus, HelpCircle,
} from 'lucide-react';
import { getHomeHeroBadgeText } from '../config';
import { showStudioModeEntry } from '../lib/launchRoute';
import { isJudgeDemoBuild } from '../lib/deploymentProfile';
import {
  GEMMA_4_E4B,
  GEMMA_4_E4B_DOCS_URL,
  OLLAMA_CLOUD,
  OLLAMA_MODEL_TAG,
  OLLAMA_CLOUD_MODEL_TAG,
  getJudgeHomeWelcomeScript,
} from '../lib/branding';
import { OperationalMode } from '../types.v2';
import { speak, stopSpeaking, clearPausedSpeech } from '../services/voiceCoach';
import { detectInferenceSource, type InferenceSource } from '../services/analysisOrchestrator';
import Header from './Header';
import Footer from './Footer';

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
  const [inferenceSource, setInferenceSource] = useState<InferenceSource>('demo');
  const judgeWelcomeSpoken = useRef(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setConnectionState('ready');
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    detectInferenceSource().then((source) => {
      setInferenceSource(source);
    });
  }, []);

  const playJudgeWelcome = useCallback(() => {
    stopSpeaking();
    clearPausedSpeech();
    judgeWelcomeSpoken.current = true;
    speak(getJudgeHomeWelcomeScript());
  }, []);

  // Judge demo: welcome once per home visit. Auto after delay; first tap unlocks if browser blocks autoplay.
  useEffect(() => {
    if (!isJudgeDemoBuild() || !voiceEnabled) return;

    let cancelled = false;

    const runWelcome = () => {
      if (cancelled || judgeWelcomeSpoken.current) return;
      playJudgeWelcome();
    };

    const timer = window.setTimeout(runWelcome, 1500);

    const onFirstGesture = () => {
      if (!judgeWelcomeSpoken.current && voiceEnabled) {
        window.clearTimeout(timer);
        runWelcome();
      }
    };

    window.addEventListener('pointerdown', onFirstGesture, { once: true, capture: true });

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      window.removeEventListener('pointerdown', onFirstGesture, { capture: true });
    };
  }, [voiceEnabled, playJudgeWelcome]);

  const handleVoicePreview = () => {
    speak('Voice coaching activated. I will describe what I see in your photos and guide you to better shots.');
  };

  return (
    <div className="min-h-[100dvh] bg-[#ECE3D2]">
      <Header
        voiceEnabled={voiceEnabled}
        onVoiceToggle={onVoiceToggle}
      />

      <main id="main-content" className="max-w-7xl mx-auto px-6">
        {/* ========== HERO ========== */}
        <section className="py-8 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <div>
            {/* Badge - accessibility-first */}
            <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#C06B45] text-white text-base font-bold uppercase tracking-wide mb-4 shadow-lg">
              <Heart className="w-5 h-5" />
              For low-vision and blind artisans
            </div>

            <h2 className="text-3xl md:text-4xl font-bold font-serif text-[#241F18] leading-tight mb-3">
              Photograph your craft,<br />
              <span className="text-[#2F4858]">on your own terms</span>
            </h2>

            <p className="text-base text-[#241F18] leading-relaxed mb-4">
              Voice-guided coaching for blind and low-vision artisans. Hear what's working in your photo, what isn't, and exactly how to fix it — no sighted help needed.
            </p>

            {/* Product truth badge */}
            <div className="mb-5">
              {connectionState === 'connecting' ? (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#F4ECDC] border border-[#D8CDB8] text-[#524A3D] text-xs">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Checking {GEMMA_4_E4B}…</span>
                </div>
                            ) : (
                <div
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold ${
                    inferenceSource === 'local'
                      ? 'bg-[#2F4858] border border-[#2F4858] text-white'
                      : inferenceSource === 'cloud'
                        ? 'bg-[#A9B8BE] border border-[#2F4858] text-[#241F18]'
                        : 'bg-[#F4ECDC] border border-[#D8CDB8] text-[#524A3D]'
                  }`}
                >
                  {inferenceSource === 'local' ? (
                    <Shield className="w-4 h-4" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                  <span>{getHomeHeroBadgeText(inferenceSource)}</span>
                </div>
              )}
            </div>

            {isJudgeDemoBuild() && (
              <div className="mb-4 space-y-3 max-w-xl">
                <p
                  className="text-sm text-[#2F4858] bg-[#F4ECDC] border border-[#D8CDB8] rounded-xl px-4 py-3 leading-relaxed"
                  aria-live="polite"
                >
                  <strong>Judge try-it:</strong> tap <strong>Enter Artisan Studio</strong> below. Samples =
                  recorded <strong>{GEMMA_4_E4B}</strong> (local Mac, {OLLAMA_MODEL_TAG}); upload = live{' '}
                  <strong>{OLLAMA_CLOUD}</strong> (<code className="text-xs">{OLLAMA_CLOUD_MODEL_TAG}</code>).
                  Optional: full voice-guided journey inside.{' '}
                  <a
                    href={GEMMA_4_E4B_DOCS_URL}
                    className="underline font-semibold"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Gemma 4 model card
                  </a>
                  {' '}·{' '}
                  <a
                    href="https://github.com/prasadt1/photography-coach-gemma4#-quick-start"
                    className="underline font-semibold"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    local quick start
                  </a>
                </p>
                <button
                  type="button"
                  onClick={playJudgeWelcome}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#2F4858] hover:bg-[#1D3444] text-white text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#C06B45]"
                  aria-label="Hear spoken guide to this judge demo"
                >
                  <HelpCircle className="w-4 h-4" aria-hidden />
                  Hear demo guide
                </button>
              </div>
            )}

            <button
              onClick={() => onSelectMode('sell')}
              className="group inline-flex items-center gap-3 px-8 py-4 bg-[#C06B45] hover:bg-[#A6552F] text-white rounded-full text-lg font-bold shadow-xl transition-colors"
            >
              <Camera className="w-4 h-4" />
              <span>Enter Artisan Studio</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          {/* Hero image - artisan using phone on tripod with voice coaching UI */}
          <div className="rounded-2xl overflow-hidden shadow-xl border-2 border-[#D8CDB8]">
            <img
              src="/images-homepage/hero-artisan-coaching.png"
              alt="Artisan photographing woven textile with smartphone on tripod, voice coaching overlay showing feedback"
              className="w-full h-auto object-cover"
            />
          </div>
        </section>

        {/* ========== THREE PILLARS ========== */}
        <section className="py-8 border-t border-[#D8CDB8]">
          <h3 className="text-2xl font-bold font-serif text-[#241F18] text-center mb-2">
            The whole product
          </h3>
          <p className="text-sm text-[#524A3D] text-center mb-6">
            Built for makers — your craft, your voice, your terms.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="rounded-xl p-6 bg-[#F4ECDC] border-2 border-[#D8CDB8] shadow-md hover:shadow-lg transition-shadow">
              <div className="w-14 h-14 rounded-xl bg-[#C06B45] flex items-center justify-center mb-4 shadow-sm">
                <User className="w-7 h-7 text-white" />
              </div>
              <h4 className="text-xl font-bold font-serif text-[#241F18] mb-2">The artisan</h4>
              <p className="text-sm text-[#2F4858] mb-2 font-semibold uppercase tracking-wide">Human · Made by you</p>
              <p className="text-base text-[#241F18]">You make beautiful things. L.E.N.S. helps you show them.</p>
            </div>

            <div className="rounded-xl p-6 bg-[#F4ECDC] border-2 border-[#D8CDB8] shadow-md hover:shadow-lg transition-shadow">
              <div className="w-14 h-14 rounded-xl bg-[#C06B45] flex items-center justify-center mb-4 shadow-sm">
                <Wrench className="w-7 h-7 text-white" />
              </div>
              <h4 className="text-xl font-bold font-serif text-[#241F18] mb-2">The craft</h4>
              <p className="text-sm text-[#2F4858] mb-2 font-semibold uppercase tracking-wide">The work itself</p>
              <p className="text-base text-[#241F18]">Wood, textiles, clay, metal — marketplace-ready photos.</p>
            </div>

            <div className="rounded-xl p-6 bg-[#F4ECDC] border-2 border-[#D8CDB8] shadow-md hover:shadow-lg transition-shadow">
              <div className="w-14 h-14 rounded-xl bg-[#C06B45] flex items-center justify-center mb-4 shadow-sm">
                <Smartphone className="w-7 h-7 text-white" />
              </div>
              <h4 className="text-xl font-bold font-serif text-[#241F18] mb-2">Local & private</h4>
              <p className="text-sm text-[#2F4858] mb-2 font-semibold uppercase tracking-wide">Tech · On your device</p>
              <p className="text-base text-[#241F18]">On your device. Nothing leaves. No tracking.</p>
            </div>
          </div>
        </section>

        {/* ========== HOW IT WORKS ========== */}
        <section className="py-8 border-t border-[#D8CDB8]">
          <h3 className="text-2xl font-bold font-serif text-[#241F18] text-center mb-2">
            Voice-guided in 3 steps
          </h3>
          <p className="text-sm text-[#524A3D] text-center mb-6">
            Real-time feedback. No reading, no guessing.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            <div className="rounded-xl p-8 bg-[#F4ECDC] border border-[#D8CDB8] text-center">
              <div className="w-16 h-16 mx-auto rounded-full bg-[#A9B8BE] flex items-center justify-center mb-3">
                <AudioLines className="w-8 h-8 text-[#2F4858]" />
              </div>
              <p className="text-lg font-serif font-bold text-[#241F18]">The app, speaking</p>
              <p className="text-xs text-[#524A3D] mt-1">Real-time voice feedback</p>
            </div>

            <div className="space-y-3">
              <div className="flex gap-3 items-start">
                <div className="w-7 h-7 rounded-full bg-[#C06B45] text-white flex items-center justify-center font-bold text-sm shrink-0">1</div>
                <div>
                  <h4 className="text-sm font-bold text-[#241F18] mb-0.5">Take a photo</h4>
                  <p className="text-xs text-[#524A3D]">Use your phone. No special setup.</p>
                </div>
              </div>

              <div className="flex gap-3 items-start">
                <div className="w-7 h-7 rounded-full bg-[#C06B45] text-white flex items-center justify-center font-bold text-sm shrink-0">2</div>
                <div>
                  <h4 className="text-sm font-bold text-[#241F18] mb-0.5">Hear what's working</h4>
                  <p className="text-xs text-[#524A3D]">Lighting, framing, focus described aloud.</p>
                </div>
              </div>

              <div className="flex gap-3 items-start">
                <div className="w-7 h-7 rounded-full bg-[#C06B45] text-white flex items-center justify-center font-bold text-sm shrink-0">3</div>
                <div>
                  <h4 className="text-sm font-bold text-[#241F18] mb-0.5">Get one clear fix</h4>
                  <p className="text-xs text-[#524A3D]">"Move camera 6 inches left" — not abstract.</p>
                </div>
              </div>

              <button
                onClick={handleVoicePreview}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#F4ECDC] hover:bg-[#A9B8BE] border border-[#D8CDB8] text-[#241F18] text-xs font-semibold transition-colors"
              >
                <AudioLines className="w-3.5 h-3.5 text-[#2F4858]" />
                <span>Preview voice</span>
              </button>
            </div>
          </div>
        </section>

        {/* ========== THE CRAFT ========== */}
        <section className="py-8 border-t border-[#D8CDB8]">
          <h3 className="text-2xl font-bold font-serif text-[#241F18] text-center mb-2">
            For every maker
          </h3>
          <p className="text-sm text-[#524A3D] text-center mb-6">
            Wood, textiles, ceramics, metalwork — L.E.N.S. understands your craft.
          </p>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="group rounded-lg overflow-hidden border border-[#D8CDB8] bg-[#F4ECDC] hover:shadow-md transition-shadow">
              <div className="aspect-square overflow-hidden">
                <img
                  src="/images-homepage/Wood-work.jpg"
                  alt="Woodwork"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
              </div>
              <div className="p-2 text-center">
                <p className="text-sm font-bold text-[#241F18]">Wood</p>
              </div>
            </div>

            <div className="group rounded-lg overflow-hidden border border-[#D8CDB8] bg-[#F4ECDC] hover:shadow-md transition-shadow">
              <div className="aspect-square overflow-hidden">
                <img
                  src="/images-homepage/Wool.jpg"
                  alt="Textiles"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
              </div>
              <div className="p-2 text-center">
                <p className="text-sm font-bold text-[#241F18]">Wool</p>
              </div>
            </div>

            <div className="group rounded-lg overflow-hidden border border-[#D8CDB8] bg-[#F4ECDC] hover:shadow-md transition-shadow">
              <div className="aspect-square overflow-hidden">
                <img
                  src="/images-homepage/Clay.jpg"
                  alt="Pottery"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
              </div>
              <div className="p-2 text-center">
                <p className="text-sm font-bold text-[#241F18]">Clay</p>
              </div>
            </div>

            <div className="group rounded-lg overflow-hidden border border-[#D8CDB8] bg-[#F4ECDC] hover:shadow-md transition-shadow">
              <div className="aspect-square overflow-hidden">
                <img
                  src="/images-homepage/Weave.jpg"
                  alt="Weaving"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
              </div>
              <div className="p-2 text-center">
                <p className="text-sm font-bold text-[#241F18]">Weave</p>
              </div>
            </div>

            <div className="group rounded-lg border-2 border-dashed border-[#D8CDB8] bg-[#F4ECDC] hover:border-[#2F4858] hover:bg-[#A9B8BE] transition-all">
              <div className="aspect-square flex flex-col items-center justify-center p-3">
                <div className="w-10 h-10 rounded-full bg-[#ECE3D2] border border-[#D8CDB8] flex items-center justify-center mb-2 group-hover:bg-[#A9B8BE] group-hover:border-[#2F4858]">
                  <Plus className="w-5 h-5 text-[#524A3D] group-hover:text-[#2F4858]" />
                </div>
                <p className="text-sm font-bold text-[#241F18] group-hover:text-[#2F4858]">More...</p>
              </div>
              <div className="p-2 text-center">
                <p className="text-xs text-[#524A3D]">All crafts</p>
              </div>
            </div>
          </div>
        </section>

        {/* ========== CTA ========== */}
        <section className="py-8 border-t border-[#D8CDB8] text-center">
          <h3 className="text-2xl font-bold font-serif text-[#241F18] mb-2">Ready to list?</h3>
          <p className="text-base text-[#241F18] mb-5">
            Get marketplace-ready photos with voice-guided coaching.
          </p>

          <button
            onClick={() => onSelectMode('sell')}
            className="group inline-flex items-center gap-2 px-7 py-3 bg-[#C06B45] hover:bg-[#A6552F] text-white rounded-full text-base font-bold shadow-xl transition-colors mb-4"
          >
            <Camera className="w-4 h-4" />
            <span>Enter Artisan Studio</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>

          <div className="flex flex-wrap items-center justify-center gap-5 mb-5 text-xs">
            <div className="flex items-center gap-1 text-[#524A3D]">
              <WifiOff className="w-3.5 h-3.5" />
              <span className="font-semibold">Offline</span>
            </div>
            <div className="flex items-center gap-1 text-[#524A3D]">
              <Shield className="w-3.5 h-3.5" />
              <span className="font-semibold">Private</span>
            </div>
            <div className="flex items-center gap-1 text-[#524A3D]">
              <Sparkles className="w-3.5 h-3.5" />
              <span className="font-semibold">Free</span>
            </div>
          </div>

          {showStudioModeEntry() && (
            <div className="pt-6 border-t-2 border-[#D8CDB8] max-w-lg mx-auto">
              <p className="text-base text-[#241F18] mb-3 font-medium">
                <strong className="text-[#2F4858]">For sighted photographers:</strong> Want detailed visual critique?
              </p>
              <button
                onClick={() => onSelectMode('studio')}
                className="group inline-flex items-center gap-2 px-5 py-2.5 bg-[#2F4858] hover:bg-[#1D3444] text-white rounded-full text-sm font-bold shadow-md transition-colors"
              >
                <Target className="w-4 h-4" />
                <span>Visit Studio Mode</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default HomePage;
