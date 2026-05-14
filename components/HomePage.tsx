/**
 * HomePage.tsx — L.E.N.S. Landing Page
 *
 * Studio sage palette, local-first framing, accessibility-first.
 */

import React, { useState, useEffect } from 'react';
import {
  AudioLines, Camera, WifiOff,
  ArrowRight, Sparkles, Shield, Loader2, Heart,
  User, Wrench, Smartphone, Target, Plus,
} from 'lucide-react';
import { OperationalMode } from '../types.v2';
import { speak } from '../services/voiceCoach';

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

  useEffect(() => {
    const timer = setTimeout(() => {
      setConnectionState('ready');
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  const handleVoicePreview = () => {
    speak('Voice coaching activated. I will describe what I see in your photos and guide you to better shots.');
  };

  return (
    <div className="min-h-[100dvh] bg-[#ECE3D2]">
      {/* Compact header bar */}
      <header className="border-b border-[#D8CDB8] bg-[#ECE3D2]/95 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg overflow-hidden shadow-sm ring-1 ring-[#D8CDB8] bg-[#F4ECDC]">
              <svg viewBox="0 0 100 100" className="w-full h-full text-[#2F4858] p-1.5" role="img" aria-label="L.E.N.S.">
                <circle cx="50" cy="50" r="38" fill="none" stroke="currentColor" strokeWidth="6"/>
                <g stroke="currentColor" strokeWidth="6" strokeLinecap="round">
                  <line x1="75" y1="50" x2="85" y2="50"/>
                  <line x1="63" y1="72" x2="68" y2="80"/>
                  <line x1="37" y1="72" x2="32" y2="80"/>
                  <line x1="25" y1="50" x2="15" y2="50"/>
                  <line x1="37" y1="28" x2="32" y2="20"/>
                  <line x1="63" y1="28" x2="68" y2="20"/>
                </g>
                <polygon points="72,50 61,69 39,69 28,50 39,31 61,31" fill="currentColor" opacity="0.5"/>
              </svg>
            </div>
            <div>
              <h1 className="text-base font-bold font-serif text-[#241F18]">L.E.N.S.</h1>
              <p className="text-[9px] text-[#C06B45] font-semibold tracking-wider uppercase">
                Local Edge Native Studio
              </p>
            </div>
          </div>

          {onVoiceToggle && (
            <button
              onClick={onVoiceToggle}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                voiceEnabled
                  ? 'bg-[#C06B45] border-[#C06B45] text-white hover:bg-[#A6552F]'
                  : 'bg-[#F4ECDC] border-[#D8CDB8] text-[#241F18] hover:border-[#2F4858]'
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
        {/* ========== HERO ========== */}
        <section className="py-8 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <div>
            {/* Badge - keep existing */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#C06B45] text-white text-sm font-bold uppercase tracking-wide mb-4 shadow-lg">
              <Heart className="w-4 h-4" />
              For blind & low-vision artisans
            </div>

            <h2 className="text-3xl md:text-4xl font-bold font-serif text-[#241F18] leading-tight mb-3">
              Photograph your craft,<br />
              <span className="text-[#2F4858]">on your own terms</span>
            </h2>

            <p className="text-base text-[#241F18] leading-relaxed mb-4">
              Voice-guided coaching for blind and low-vision artisans. Hear what's working in your photo, what isn't, and exactly how to fix it — no sighted help needed, nothing leaves your device.
            </p>

            {/* Product truth badge - replace cloud-ready */}
            <div className="mb-4">
              {connectionState === 'connecting' ? (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#F4ECDC] border border-[#D8CDB8] text-[#6B6358] text-xs">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>Detecting...</span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#A9B8BE] border border-[#2F4858] text-[#241F18] text-xs font-semibold">
                  <Shield className="w-3 h-3" />
                  <span>Runs on your device · Private · Works offline</span>
                </div>
              )}
            </div>

            <button
              onClick={() => onSelectMode('sell')}
              className="group inline-flex items-center gap-2 px-6 py-3 bg-[#C06B45] hover:bg-[#A6552F] text-white rounded-full text-base font-bold shadow-lg transition-colors"
            >
              <Camera className="w-4 h-4" />
              <span>Enter Artisan Studio</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          {/* Hero image */}
          <div className="rounded-2xl overflow-hidden shadow-xl border-2 border-[#D8CDB8]">
            <img
              src="/images-homepage/Wood.jpg"
              alt="Artisan hands at work"
              className="w-full h-64 md:h-80 object-cover"
            />
          </div>
        </section>

        {/* ========== THREE PILLARS ========== */}
        <section className="py-8 border-t border-[#D8CDB8]">
          <h3 className="text-2xl font-bold font-serif text-[#241F18] text-center mb-2">
            The whole product
          </h3>
          <p className="text-sm text-[#6B6358] text-center mb-6">
            Built for makers — your craft, your voice, your terms.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-lg p-5 bg-[#F4ECDC] border border-[#D8CDB8]">
              <div className="w-10 h-10 rounded-lg bg-[#A9B8BE] flex items-center justify-center mb-3">
                <User className="w-5 h-5 text-[#2F4858]" />
              </div>
              <h4 className="text-lg font-bold font-serif text-[#241F18] mb-1">The artisan</h4>
              <p className="text-xs text-[#6B6358] mb-1 font-medium">human · made by you</p>
              <p className="text-sm text-[#241F18]">You make beautiful things. L.E.N.S. helps you show them.</p>
            </div>

            <div className="rounded-lg p-5 bg-[#F4ECDC] border border-[#D8CDB8]">
              <div className="w-10 h-10 rounded-lg bg-[#A9B8BE] flex items-center justify-center mb-3">
                <Wrench className="w-5 h-5 text-[#2F4858]" />
              </div>
              <h4 className="text-lg font-bold font-serif text-[#241F18] mb-1">The craft</h4>
              <p className="text-xs text-[#6B6358] mb-1 font-medium">the work itself</p>
              <p className="text-sm text-[#241F18]">Wood, textiles, clay, metal — marketplace-ready photos.</p>
            </div>

            <div className="rounded-lg p-5 bg-[#F4ECDC] border border-[#D8CDB8]">
              <div className="w-10 h-10 rounded-lg bg-[#A9B8BE] flex items-center justify-center mb-3">
                <Smartphone className="w-5 h-5 text-[#2F4858]" />
              </div>
              <h4 className="text-lg font-bold font-serif text-[#241F18] mb-1">Local & private</h4>
              <p className="text-xs text-[#6B6358] mb-1 font-medium">tech · on your device</p>
              <p className="text-sm text-[#241F18]">On your device. Nothing leaves. No tracking.</p>
            </div>
          </div>
        </section>

        {/* ========== HOW IT WORKS ========== */}
        <section className="py-8 border-t border-[#D8CDB8]">
          <h3 className="text-2xl font-bold font-serif text-[#241F18] text-center mb-2">
            Voice-guided in 3 steps
          </h3>
          <p className="text-sm text-[#6B6358] text-center mb-6">
            Real-time feedback. No reading, no guessing.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            <div className="rounded-xl p-8 bg-[#F4ECDC] border border-[#D8CDB8] text-center">
              <div className="w-16 h-16 mx-auto rounded-full bg-[#A9B8BE] flex items-center justify-center mb-3">
                <AudioLines className="w-8 h-8 text-[#2F4858]" />
              </div>
              <p className="text-lg font-serif font-bold text-[#241F18]">The app, speaking</p>
              <p className="text-xs text-[#6B6358] mt-1">Real-time voice feedback</p>
            </div>

            <div className="space-y-3">
              <div className="flex gap-3 items-start">
                <div className="w-7 h-7 rounded-full bg-[#C06B45] text-white flex items-center justify-center font-bold text-sm shrink-0">1</div>
                <div>
                  <h4 className="text-sm font-bold text-[#241F18] mb-0.5">Take a photo</h4>
                  <p className="text-xs text-[#6B6358]">Use your phone. No special setup.</p>
                </div>
              </div>

              <div className="flex gap-3 items-start">
                <div className="w-7 h-7 rounded-full bg-[#C06B45] text-white flex items-center justify-center font-bold text-sm shrink-0">2</div>
                <div>
                  <h4 className="text-sm font-bold text-[#241F18] mb-0.5">Hear what's working</h4>
                  <p className="text-xs text-[#6B6358]">Lighting, framing, focus described aloud.</p>
                </div>
              </div>

              <div className="flex gap-3 items-start">
                <div className="w-7 h-7 rounded-full bg-[#C06B45] text-white flex items-center justify-center font-bold text-sm shrink-0">3</div>
                <div>
                  <h4 className="text-sm font-bold text-[#241F18] mb-0.5">Get one clear fix</h4>
                  <p className="text-xs text-[#6B6358]">"Move camera 6 inches left" — not abstract.</p>
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
          <p className="text-sm text-[#6B6358] text-center mb-6">
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
                  <Plus className="w-5 h-5 text-[#6B6358] group-hover:text-[#2F4858]" />
                </div>
                <p className="text-sm font-bold text-[#241F18] group-hover:text-[#2F4858]">More...</p>
              </div>
              <div className="p-2 text-center">
                <p className="text-xs text-[#6B6358]">All crafts</p>
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
            <div className="flex items-center gap-1 text-[#6B6358]">
              <WifiOff className="w-3.5 h-3.5" />
              <span className="font-semibold">Offline</span>
            </div>
            <div className="flex items-center gap-1 text-[#6B6358]">
              <Shield className="w-3.5 h-3.5" />
              <span className="font-semibold">Private</span>
            </div>
            <div className="flex items-center gap-1 text-[#6B6358]">
              <Sparkles className="w-3.5 h-3.5" />
              <span className="font-semibold">Free</span>
            </div>
          </div>

          <div className="pt-5 border-t border-[#D8CDB8] max-w-md mx-auto">
            <p className="text-xs text-[#6B6358] mb-2">
              <strong className="text-[#241F18]">For sighted photographers:</strong> Detailed critique?
            </p>
            <button
              onClick={() => onSelectMode('studio')}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#F4ECDC] border border-[#D8CDB8] hover:border-[#2F4858] text-[#241F18] hover:text-[#2F4858] rounded-full text-xs font-semibold transition-colors"
            >
              <Target className="w-3.5 h-3.5" />
              <span>Visit Studio Mode</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </section>
      </div>

      {/* Footer */}
      <footer className="py-6 bg-[#F4ECDC] border-t border-[#D8CDB8] mt-8">
        <div className="max-w-7xl mx-auto px-6 text-center space-y-4">
          <p className="text-[14px] text-[#241F18] leading-relaxed">
            Built for the{' '}
            <a
              href="https://www.kaggle.com/competitions/gemma-4-good-hackathon"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#C06B45] hover:text-[#A6552F] underline font-bold"
            >
              Gemma 4 Good Hackathon
            </a>
            {' '}· Digital Equity & Inclusivity Track
          </p>

          {/* Powered by - with logo treatment */}
          <div className="flex flex-wrap items-center justify-center gap-6 text-[14px] text-[#241F18]">
            <div className="flex items-center gap-2">
              <span className="font-medium">Powered by</span>
              <a
                href="https://ai.google.dev/gemma"
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold text-[#C06B45] hover:text-[#A6552F] underline inline-flex items-center gap-1"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                </svg>
                Gemma 4
              </a>
              <span className="text-[#6B6358]">via</span>
              <a
                href="https://ollama.com"
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold text-[#C06B45] hover:text-[#A6552F] underline inline-flex items-center gap-1"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <circle cx="12" cy="12" r="10"/>
                  <circle cx="12" cy="12" r="4" fill="#ECE3D2"/>
                </svg>
                Ollama
              </a>
            </div>
            <span className="text-[#6B6358]">·</span>
            <div className="flex items-center gap-2">
              <span className="font-medium">Voice via</span>
              <span className="font-semibold text-[#241F18]">Web Speech API</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
