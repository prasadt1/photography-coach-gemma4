/**
 * Header.tsx — Common header for all L.E.N.S. pages
 *
 * Consistent branding and navigation across HomePage, SellMode, and Studio Mode.
 */

import React from 'react';
import { ChevronLeft, Volume2, VolumeX, Sparkles } from 'lucide-react';
import { type InferenceSource, getInferenceSourceLabel } from '../config';
import { GEMMA_4_E4B } from '../lib/branding';

export type { InferenceSource };

interface HeaderProps {
  showBack?: boolean;
  onBack?: () => void;
  backLabel?: string;
  voiceEnabled?: boolean;
  onVoiceToggle?: () => void;
  inferenceSource?: InferenceSource;
  showInferenceStatus?: boolean;
}

const Header: React.FC<HeaderProps> = ({
  showBack = false,
  onBack,
  backLabel = 'Back',
  voiceEnabled = false,
  onVoiceToggle,
  inferenceSource = 'demo',
  showInferenceStatus = false,
}) => {
  return (
    <header className="border-b border-[#D8CDB8] bg-[#ECE3D2]/95 backdrop-blur sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
        {/* Left side: Logo + Text + Back button */}
        <div className="flex items-center gap-4">
          {/* L.E.N.S. Logo */}
          <div className="w-14 h-14 rounded-xl overflow-hidden shadow-lg ring-2 ring-[#2F4858]/20 bg-[#1a1a1a]">
            <img
              src="/lens-logo-new.png"
              alt="L.E.N.S. - Hand holding camera aperture with yarn thread and voice waves"
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <h1 className="text-xl font-bold font-serif text-[#241F18]">L.E.N.S.</h1>
            <p className="text-xs text-[#C06B45] font-bold tracking-wider uppercase">
              Local Edge Native Studio
            </p>
            <p className="text-[10px] text-[#524A3D] font-medium mt-0.5">
              {GEMMA_4_E4B} · via Ollama
            </p>
          </div>

          {/* Back button if needed */}
          {showBack && onBack && (
            <button
              onClick={onBack}
              className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#F4ECDC] border-2 border-[#D8CDB8] text-[#241F18] hover:border-[#C06B45] hover:text-[#C06B45] focus:outline-none focus:ring-2 focus:ring-[#C06B45] ml-2"
              aria-label={backLabel}
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="text-sm font-semibold">{backLabel}</span>
            </button>
          )}
        </div>

        {/* Right side: Voice Toggle + Status Badge */}
        <div className="flex items-center gap-3">
          {/* Voice Toggle */}
          {onVoiceToggle && (
            <button
              onClick={onVoiceToggle}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold border-2 ${
                voiceEnabled
                  ? 'bg-[#C06B45] border-[#C06B45] text-white shadow-lg'
                  : 'bg-[#F4ECDC] border-[#D8CDB8] text-[#524A3D] hover:border-[#C06B45] hover:text-[#C06B45]'
              }`}
              aria-pressed={voiceEnabled}
              aria-label={voiceEnabled ? 'Voice feedback enabled' : 'Enable voice feedback'}
            >
              {voiceEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
              <span className="hidden sm:inline">{voiceEnabled ? 'Voice ON' : 'Voice'}</span>
            </button>
          )}

          {/* Inference Status Badge */}
          {showInferenceStatus && (
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full border-2 ${
                inferenceSource === 'local'
                  ? 'bg-[#A9B8BE] border-[#2F4858] text-[#241F18]'
                  : 'bg-[#F4ECDC] border-[#D8CDB8] text-[#524A3D]'
              }`}
            >
              {inferenceSource === 'local' ? (
                <div className="w-2 h-2 rounded-full bg-[#2F4858] animate-pulse" />
              ) : (
                <Sparkles className="w-3.5 h-3.5" />
              )}
              <span className="text-xs font-semibold">{getInferenceSourceLabel(inferenceSource)}</span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
