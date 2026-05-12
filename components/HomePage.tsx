/**
 * HomePage.tsx — Professional SaaS landing page
 *
 * Design principles:
 * - Each mode card has distinct color theme with gradient background
 * - Visual imagery representing each feature
 * - Professional product page quality
 * - L.E.N.S. branding prominent
 */

import React, { useState, useEffect } from 'react';
import {
  Aperture, Compass, Gem, AudioLines,
  Flame, Zap, Camera, Lock, WifiOff, BadgeCheck,
  ArrowRight, Sparkles, Shield, Info,
  Target, Volume2, VolumeX, Loader2, Tag,
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
    speak('Voice coaching activated. Welcome to Local Edge Native Studio.');
  };

  return (
    <div className="min-h-screen bg-[#0f0f13] text-white">
      {/* Background gradient */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-[150px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-violet-500/5 rounded-full blur-[150px]" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 py-8 md:py-12">
        {/* Header with Logo */}
        <header className="flex items-center justify-between mb-12">
          <div className="flex items-center gap-3">
            <div className="relative w-12 h-12 rounded-xl overflow-hidden shadow-lg shadow-brand-500/20">
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
            {/* Voice Toggle */}
            {onVoiceToggle && (
              <button
                onClick={onVoiceToggle}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold transition-all border ${
                  voiceEnabled
                    ? 'bg-purple-600/20 border-purple-500/50 text-purple-300 shadow-lg shadow-purple-500/20'
                    : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600'
                }`}
                title={voiceEnabled ? 'Voice feedback ON - Click to disable' : 'Enable voice feedback for accessibility'}
              >
                {voiceEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                <span>{voiceEnabled ? 'Voice ON' : 'Voice'}</span>
              </button>
            )}

            {/* Stats */}
            <div className="hidden md:flex items-center gap-6">
              <div className="flex items-center gap-2 text-sm">
                <Flame className={`w-4 h-4 ${stats.streak > 0 ? 'text-orange-400' : 'text-slate-600'}`} />
                <span className={stats.streak > 0 ? 'text-orange-400 font-semibold' : 'text-slate-500'}>
                  {stats.streak} day streak
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Zap className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-400 font-semibold">{stats.xp} XP</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Camera className="w-4 h-4 text-slate-400" />
                <span className="text-slate-400">{stats.photosAnalyzed} photos</span>
              </div>
            </div>
          </div>
        </header>

        {/* Hero */}
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold mb-4 leading-tight">
            Master Photography with
            <span className="bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 bg-clip-text text-transparent"> AI Coaching</span>
          </h2>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto mb-6">
            Get instant, actionable feedback on your photos. Runs 100% locally — your images never leave your device.
          </p>

          {/* Status Badge with connection animation */}
          {connectionState === 'connecting' ? (
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-800/60 border border-slate-600 text-slate-300 text-sm animate-pulse">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Connecting to local Gemma 4...</span>
            </div>
          ) : ollamaReady === false ? (
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 text-sm transition-all duration-500">
              <WifiOff className="w-4 h-4" />
              <span>Start Ollama to begin</span>
            </div>
          ) : ollamaReady === true ? (
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border-2 border-emerald-500/50 text-emerald-400 text-sm transition-all duration-500 shadow-lg shadow-emerald-500/10">
              <BadgeCheck className="w-4 h-4" />
              <span>Local Engine Active</span>
            </div>
          ) : null}
        </div>

        {/* Feature Cards - 2x2 Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-12">

          {/* Studio Card - Emerald/Teal */}
          <button
            onClick={() => onSelectMode('studio')}
            className="group relative overflow-hidden rounded-2xl p-6 text-left transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-emerald-500/10"
            style={{
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(20, 184, 166, 0.08) 50%, rgba(15, 15, 19, 0.95) 100%)',
              border: '1px solid rgba(16, 185, 129, 0.2)',
            }}
          >
            {/* Background watermark - large faded aperture icon */}
            <div className="absolute -bottom-8 -right-8 w-48 h-48 opacity-[0.05] pointer-events-none">
              <Aperture className="w-full h-full text-emerald-400" strokeWidth={0.8} />
            </div>

            <div className="relative">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/30">
                  <Aperture className="w-6 h-6 text-emerald-400" />
                </div>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Core Feature
                </span>
              </div>

              <h3 className="text-2xl font-bold text-white mb-2">Studio</h3>
              <p className="text-emerald-200/80 mb-4 text-sm leading-relaxed">
                Complete photo analysis with composition scores, lighting evaluation, and technique breakdown. Get a detailed critique like a professional mentor.
              </p>

              <div className="flex items-center gap-2 text-emerald-400 font-medium text-sm group-hover:gap-3 transition-all">
                <span>Start analyzing</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          </button>

          {/* Quest Card - Violet/Purple */}
          <button
            onClick={() => onSelectMode('quest')}
            className="group relative overflow-hidden rounded-2xl p-6 text-left transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-violet-500/10"
            style={{
              background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(168, 85, 247, 0.08) 50%, rgba(15, 15, 19, 0.95) 100%)',
              border: '1px solid rgba(139, 92, 246, 0.2)',
            }}
          >
            {/* Background watermark - large faded target icon */}
            <div className="absolute -bottom-8 -right-8 w-48 h-48 opacity-[0.05] pointer-events-none">
              <Target className="w-full h-full text-violet-400" strokeWidth={0.8} />
            </div>

            <div className="relative">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 rounded-xl bg-violet-500/20 border border-violet-500/30">
                  <Compass className="w-6 h-6 text-violet-400" />
                </div>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-violet-500/20 text-violet-400 border border-violet-500/30">
                  Gamified
                </span>
              </div>

              <h3 className="text-2xl font-bold text-white mb-2">Quest</h3>
              <p className="text-violet-200/80 mb-4 text-sm leading-relaxed">
                Daily photography challenges to build your skills. Complete quests, earn XP, build streaks, and level up from beginner to master.
              </p>

              <div className="flex items-center gap-2 text-violet-400 font-medium text-sm group-hover:gap-3 transition-all">
                <span>Start today's quest</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          </button>

          {/* Artisan Card - Amber/Orange */}
          <button
            onClick={() => onSelectMode('sell')}
            className="group relative overflow-hidden rounded-2xl p-6 text-left transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-amber-500/10"
            style={{
              background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(251, 146, 60, 0.08) 50%, rgba(15, 15, 19, 0.95) 100%)',
              border: '1px solid rgba(245, 158, 11, 0.2)',
            }}
          >
            {/* Background watermark - large faded storefront tag icon */}
            <div className="absolute -bottom-8 -right-8 w-48 h-48 opacity-[0.05] pointer-events-none">
              <Tag className="w-full h-full text-amber-400" strokeWidth={0.8} />
            </div>

            <div className="relative">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 rounded-xl bg-amber-500/20 border border-amber-500/30">
                  <Gem className="w-6 h-6 text-amber-400" />
                </div>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  For Sellers
                </span>
              </div>

              <h3 className="text-2xl font-bold text-white mb-2">Artisan</h3>
              <p className="text-amber-200/80 mb-4 text-sm leading-relaxed">
                Product photo coach for Etsy, eBay, and Shopify sellers. Get marketplace-specific feedback on background, lighting, and product presentation.
              </p>

              <div className="flex items-center gap-2 text-amber-400 font-medium text-sm group-hover:gap-3 transition-all">
                <span>Optimize listings</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          </button>

        </div>

        {/* Voice Accessibility Note - Interactive with TTS preview */}
        <button
          onClick={handleVoicePreview}
          className="flex items-center justify-center gap-3 mb-8 p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 max-w-xl mx-auto w-full cursor-pointer transition-all duration-200 hover:bg-purple-500/15 hover:border-purple-500/40 hover:shadow-lg hover:shadow-purple-500/10 group"
        >
          <AudioLines className="w-5 h-5 text-purple-400 shrink-0 group-hover:scale-110 transition-transform" />
          <p className="text-sm text-purple-200/80 text-left">
            <strong className="text-purple-300">Voice feedback</strong> is available across all modes. <span className="text-purple-400/80 underline decoration-purple-500/30">Click to preview</span> or enable it from the header.
          </p>
        </button>

        {/* Trust Section */}
        <div className="flex flex-wrap items-center justify-center gap-8 py-6 border-y border-slate-800/50 mb-8">
          <div className="flex items-center gap-2 text-slate-400">
            <Lock className="w-5 h-5" />
            <span className="font-medium">100% Private</span>
          </div>
          <div className="flex items-center gap-2 text-slate-400">
            <Sparkles className="w-5 h-5" />
            <span className="font-medium">Free Forever</span>
          </div>
          <div className="flex items-center gap-2 text-slate-400">
            <WifiOff className="w-5 h-5" />
            <span className="font-medium">Works Offline</span>
          </div>
          <div className="flex items-center gap-2 text-slate-400">
            <Shield className="w-5 h-5" />
            <span className="font-medium">Unlimited Usage</span>
          </div>
        </div>

        {/* Info Note */}
        <div className="flex items-start gap-3 p-4 rounded-xl bg-slate-900/50 border border-slate-800/50 max-w-xl mx-auto mb-8">
          <Info className="w-4 h-4 text-slate-500 mt-0.5 shrink-0" />
          <p className="text-xs text-slate-500 leading-relaxed">
            Stats are stored locally on your device. Streaks track consecutive days of use. No account needed.
          </p>
        </div>

        {/* Footer */}
        <footer className="text-center">
          <p className="text-xs text-slate-600">
            Powered by Gemma 4 via Ollama · Built for the{' '}
            <a
              href="https://www.kaggle.com/competitions/gemma-4-good-hackathon"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-500 hover:text-slate-400 underline"
            >
              Gemma 4 Good Hackathon
            </a>
          </p>
        </footer>
      </div>
    </div>
  );
};

export default HomePage;
