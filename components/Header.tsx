/**
 * Header.tsx — Common header for all L.E.N.S. pages
 *
 * Consistent branding and navigation across HomePage, SellMode, and Studio Mode.
 */

import React from 'react';
import { ChevronLeft, Volume2, VolumeX, Sparkles } from 'lucide-react';
import {
  type InferenceSource,
  getInferenceSourceLabel,
  getInferenceSourceShortLabel,
} from '../config';
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
    <header className="border-b border-[#D8CDB8] bg-[#ECE3D2]/95 backdrop-blur sticky top-0 z-50 overflow-x-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 sm:py-3 space-y-2">
        <div className="flex items-center justify-between gap-2 min-w-0">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <div className="w-11 h-11 sm:w-14 sm:h-14 shrink-0 rounded-xl overflow-hidden shadow-lg ring-2 ring-[#2F4858]/20 bg-[#1a1a1a]">
              <img
                src="/lens-logo-new.png"
                alt="L.E.N.S. - Hand holding camera aperture with yarn thread and voice waves"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-bold font-serif text-[#241F18] truncate">
                L.E.N.S.
              </h1>
              <p className="hidden sm:block text-xs text-[#C06B45] font-bold tracking-wider uppercase truncate">
                Local Edge Native Studio
              </p>
              <p className="text-[10px] sm:text-[11px] text-[#524A3D] font-medium truncate">
                {GEMMA_4_E4B} · Ollama
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            {onVoiceToggle && (
              <button
                type="button"
                onClick={onVoiceToggle}
                className={`flex items-center justify-center p-2.5 sm:px-4 sm:py-2.5 rounded-full text-sm font-semibold border-2 ${
                  voiceEnabled
                    ? 'bg-[#C06B45] border-[#C06B45] text-white shadow-lg'
                    : 'bg-[#F4ECDC] border-[#D8CDB8] text-[#524A3D] hover:border-[#C06B45] hover:text-[#C06B45]'
                }`}
                aria-pressed={voiceEnabled}
                aria-label={voiceEnabled ? 'Voice feedback enabled' : 'Enable voice feedback'}
              >
                {voiceEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                <span className="hidden sm:inline ml-2">
                  {voiceEnabled ? 'Voice ON' : 'Voice'}
                </span>
              </button>
            )}

            {showInferenceStatus && (
              <div
                className={`flex items-center gap-1.5 px-2 py-1.5 sm:px-3 rounded-full border-2 max-w-[6.5rem] sm:max-w-none ${
                  inferenceSource === 'local'
                    ? 'bg-[#A9B8BE] border-[#2F4858] text-[#241F18]'
                    : 'bg-[#F4ECDC] border-[#D8CDB8] text-[#524A3D]'
                }`}
                title={getInferenceSourceLabel(inferenceSource)}
              >
                {inferenceSource === 'local' ? (
                  <div className="w-2 h-2 shrink-0 rounded-full bg-[#2F4858] animate-pulse" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5 shrink-0" />
                )}
                <span className="text-[10px] sm:text-xs font-semibold truncate sm:whitespace-normal">
                  <span className="sm:hidden">{getInferenceSourceShortLabel(inferenceSource)}</span>
                  <span className="hidden sm:inline">{getInferenceSourceLabel(inferenceSource)}</span>
                </span>
              </div>
            )}
          </div>
        </div>

        {showBack && onBack && (
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-[#F4ECDC] border-2 border-[#D8CDB8] text-[#241F18] hover:border-[#C06B45] hover:text-[#C06B45] focus:outline-none focus:ring-2 focus:ring-[#C06B45] w-fit max-w-full"
            aria-label={backLabel}
          >
            <ChevronLeft className="w-4 h-4 shrink-0" />
            <span className="text-sm font-semibold truncate">{backLabel}</span>
          </button>
        )}
      </div>
    </header>
  );
};

export default Header;
