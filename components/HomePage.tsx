/**
 * HomePage.tsx — L.E.N.S. Landing Page (v2)
 *
 * Redesigned for Gemma 4 Good Hackathon submission:
 * - Hero: Artisan Studio (voice-guided, accessibility-led)
 * - Secondary: General photo critique for sighted photographers
 * - Quest Mode: REMOVED from product
 * - Vault Mode: Absorbed (local-only is inherent property)
 */

import React, { useState, useEffect } from 'react';
import {
  Gem, AudioLines, Camera, WifiOff, BadgeCheck,
  ArrowRight, Sparkles, Shield, Info,
  Volume2, VolumeX, Loader2, Aperture, Eye,
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

const HomePage: React.FC<HomePageProps> = ({ onSelectMode, ollamaReady, stats, voiceEnabled = false, onVoiceToggle }) => {
  // Connection state animation - show "connecting" for 1.5s then show actual status
  const [connectionState, setConnectionState] = useState<'connecting' | 'ready'>('connecting');

  useEffect(() => {
    const timer = setTimeout(() => {
      setConnectionState('ready');
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  // Interactive voice preview handler
  const handleVoicePreview = () => {
    speak('Voice coaching activated. I will describe what I see in your photos and guide you to better shots.');
  };

  return (
    <div className="min-h-screen bg-[#0f0f13] text-white">
      {/* Background gradient */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-amber-500/5 rounded-full blur-[150px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-purple-500/5 rounded-full blur-[150px]" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-4 py-8 md:py-12">
        {/* Header with Logo */}
        <header className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-3">
            <div className="relative w-12 h-12 rounded-xl overflow-hidden shadow-lg shadow-amber-500/20">
              <img src="/lens-logo.png" alt="L.E.N.S." className="w-full h-full object-cover" />
            </div>
            <div className="flex flex-col justify-center gap-0.5">
              <h1 className="text-2xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-slate-300 tracking-[0.2em] leading-tight">
                L.E.N.S.
              </h1>
              <p className="text-[10px] text-slate-500 font-medium tracking-wider uppercase -mt-0.5">Local Edge Native Studio</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Voice Toggle - Prominent for accessibility */}
            {onVoiceToggle && (
              <button
                onClick={onVoiceToggle}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all border ${
                  voiceEnabled
                    ? 'bg-purple-600/30 border-purple-500/60 text-purple-200 shadow-lg shadow-purple-500/25'
                    : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600'
                }`}
                aria-pressed={voiceEnabled}
                aria-label={voiceEnabled ? 'Voice feedback enabled. Click to disable.' : 'Enable voice feedback for accessibility'}
              >
                {voiceEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                <span>{voiceEnabled ? 'Voice ON' : 'Voice'}</span>
              </button>
            )}

            {/* Photos analyzed stat */}
            <div className="hidden md:flex items-center gap-2 text-sm text-slate-400">
              <Camera className="w-4 h-4" />
              <span>{stats.photosAnalyzed} photo{stats.photosAnalyzed !== 1 ? 's' : ''} analyzed</span>
            </div>
          </div>
        </header>

        {/* Hero Section - Accessibility-led messaging */}
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-5 leading-tight">
            Helping artisans get the
            <span className="bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500 bg-clip-text text-transparent"> price their work deserves</span>
          </h2>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto mb-6 leading-relaxed">
            L.E.N.S. helps blind and low-vision artisans capture marketplace-quality photos of their handmade work — fully on-device, no internet, no subscription.
          </p>

          {/* Status Badge with connection animation */}
          {connectionState === 'connecting' ? (
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-800/60 border border-slate-600 text-slate-300 text-sm animate-pulse">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Connecting to Gemma 4 E4B via Ollama...</span>
            </div>
          ) : ollamaReady === false ? (
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 text-sm transition-all duration-500">
              <WifiOff className="w-4 h-4" />
              <span>Start Ollama to begin</span>
            </div>
          ) : ollamaReady === true ? (
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border-2 border-emerald-500/50 text-emerald-400 text-sm transition-all duration-500 shadow-lg shadow-emerald-500/10">
              <BadgeCheck className="w-4 h-4" />
              <span>Gemma 4 E4B Ready · 100% Local</span>
            </div>
          ) : null}
        </div>

        {/* HERO CARD: Artisan Studio */}
        <button
          onClick={() => onSelectMode('sell')}
          className="group relative w-full overflow-hidden rounded-2xl p-8 text-left transition-all duration-300 hover:scale-[1.01] hover:shadow-2xl hover:shadow-amber-500/15 mb-6"
          style={{
            background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.20) 0%, rgba(251, 146, 60, 0.10) 50%, rgba(15, 15, 19, 0.98) 100%)',
            border: '2px solid rgba(245, 158, 11, 0.35)',
          }}
          aria-label="Enter Artisan Studio - Voice-guided product photography for marketplace listings"
        >
          {/* Background watermark */}
          <div className="absolute -bottom-12 -right-12 w-64 h-64 opacity-[0.04] pointer-events-none">
            <Gem className="w-full h-full text-amber-400" strokeWidth={0.6} />
          </div>

          <div className="relative">
            <div className="flex items-center gap-3 mb-5">
              <div className="p-3 rounded-xl bg-amber-500/25 border border-amber-500/40">
                <Gem className="w-7 h-7 text-amber-400" />
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  Voice-Guided
                </span>
                <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-500/20 text-purple-400 border border-purple-500/30">
                  Accessibility-First
                </span>
              </div>
            </div>

            <h3 className="text-3xl font-bold text-white mb-3">Artisan Studio</h3>
            <p className="text-amber-200/80 mb-5 text-base leading-relaxed max-w-2xl">
              For blind and low-vision artisans. Hear what's working in your product photos, what isn't, and exactly how to fix it — so your handmade goods earn the price they deserve.
            </p>

            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-6 text-sm text-amber-100/70">
              <li className="flex items-center gap-2">
                <AudioLines className="w-4 h-4 text-amber-400" />
                Descriptive voice feedback
              </li>
              <li className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-amber-400" />
                Spatial framing guidance
              </li>
              <li className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                Alt-text generation
              </li>
              <li className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-amber-400" />
                Color accuracy confirmation
              </li>
            </ul>

            <div className="flex items-center gap-2 text-amber-400 font-semibold text-base group-hover:gap-3 transition-all">
              <span>Enter Artisan Studio</span>
              <ArrowRight className="w-5 h-5" />
            </div>
          </div>
        </button>

        {/* Secondary Link: General Photo Critique */}
        <div className="text-center mb-10">
          <button
            onClick={() => onSelectMode('studio')}
            className="inline-flex items-center gap-2 text-slate-400 hover:text-emerald-400 text-sm font-medium transition-colors group"
            aria-label="Try general photo critique for sighted photographers"
          >
            <Aperture className="w-4 h-4" />
            <span>Sighted photographer? Try general photo critique</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        {/* Voice Accessibility Note - Interactive with TTS preview */}
        <button
          onClick={handleVoicePreview}
          className="flex items-center justify-center gap-3 mb-8 p-4 rounded-xl bg-purple-500/10 border border-purple-500/25 max-w-xl mx-auto w-full cursor-pointer transition-all duration-200 hover:bg-purple-500/15 hover:border-purple-500/40 hover:shadow-lg hover:shadow-purple-500/10 group"
          aria-label="Click to hear a voice preview"
        >
          <AudioLines className="w-5 h-5 text-purple-400 shrink-0 group-hover:scale-110 transition-transform" />
          <p className="text-sm text-purple-200/80 text-left">
            <strong className="text-purple-300">Voice-first experience:</strong> I describe what I see, then guide you to better shots. <span className="text-purple-400/80 underline decoration-purple-500/30">Click to preview.</span>
          </p>
        </button>

        {/* Trust Section */}
        <div className="flex flex-wrap items-center justify-center gap-6 py-6 border-y border-slate-800/50 mb-8">
          <div className="flex items-center gap-2 text-slate-400">
            <WifiOff className="w-5 h-5" />
            <span className="font-medium">Works Offline</span>
          </div>
          <div className="flex items-center gap-2 text-slate-400">
            <Shield className="w-5 h-5" />
            <span className="font-medium">100% Private</span>
          </div>
          <div className="flex items-center gap-2 text-slate-400">
            <Sparkles className="w-5 h-5" />
            <span className="font-medium">Free Forever</span>
          </div>
          <div className="flex items-center gap-2 text-amber-500">
            <Gem className="w-5 h-5" />
            <span className="font-semibold">Powered by Gemma 4 E4B via Ollama</span>
          </div>
        </div>

        {/* Info Note */}
        <div className="flex items-start gap-3 p-4 rounded-xl bg-slate-900/50 border border-slate-800/50 max-w-xl mx-auto mb-8">
          <Info className="w-4 h-4 text-slate-500 mt-0.5 shrink-0" />
          <p className="text-xs text-slate-500 leading-relaxed">
            No account needed. No data leaves your device. Photos are analyzed locally using Gemma 4 E4B.
          </p>
        </div>

        {/* Footer */}
        <footer className="text-center space-y-2">
          <p className="text-xs text-slate-600">
            Built for the{' '}
            <a
              href="https://www.kaggle.com/competitions/gemma-4-good-hackathon"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-500 hover:text-slate-400 underline"
            >
              Gemma 4 Good Hackathon
            </a>
            {' '}· Digital Equity & Inclusivity Track
          </p>
          <p className="text-[10px] text-slate-700">
            Gemma 4 E4B via Ollama · Schema-enforced JSON · Voice via Web Speech API
          </p>
        </footer>
      </div>
    </div>
  );
};

export default HomePage;
