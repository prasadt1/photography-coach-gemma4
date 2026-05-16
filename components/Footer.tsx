/**
 * Footer.tsx — Common footer for all L.E.N.S. pages
 *
 * Consistent branding across HomePage, SellMode, and Studio Mode.
 */

import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="py-6 bg-[#F4ECDC] border-t-2 border-[#D8CDB8] mt-8">
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
        <div className="flex flex-wrap items-center justify-center gap-6 text-[15px] text-[#241F18]">
          <div className="flex items-center gap-2">
            <span className="font-medium">Powered by</span>
            <a
              href="https://ai.google.dev/gemma"
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-[#C06B45] hover:text-[#A6552F] underline inline-flex items-center gap-1.5"
            >
              {/* Gemma sparkle/gem icon */}
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L9 9H2l6 4.5L5.5 22 12 17l6.5 5-2.5-8.5L22 9h-7L12 2z"/>
              </svg>
              Gemma 4
            </a>
            <span className="text-[#524A3D]">via</span>
            <a
              href="https://ollama.com"
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-[#C06B45] hover:text-[#A6552F] underline inline-flex items-center gap-1.5"
            >
              {/* Ollama llama face - cute style with ears, eyes, snout */}
              <svg className="w-6 h-6" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">
                {/* Left ear */}
                <path d="M30 35 C28 20, 32 8, 36 5 C40 8, 42 20, 40 35"/>
                {/* Right ear */}
                <path d="M60 35 C58 20, 62 8, 66 5 C70 8, 72 20, 70 35"/>
                {/* Head outline */}
                <path d="M25 45 C20 55, 18 70, 22 85 C26 95, 35 98, 50 98 C65 98, 74 95, 78 85 C82 70, 80 55, 75 45 C70 35, 60 30, 50 30 C40 30, 30 35, 25 45"/>
                {/* Left eye */}
                <circle cx="38" cy="55" r="4" fill="currentColor"/>
                {/* Right eye */}
                <circle cx="62" cy="55" r="4" fill="currentColor"/>
                {/* Snout oval */}
                <ellipse cx="50" cy="75" rx="12" ry="10"/>
                {/* Y-shaped nose */}
                <path d="M50 68 L50 75 M46 80 L50 75 L54 80"/>
              </svg>
              Ollama
            </a>
          </div>
          <span className="text-[#524A3D]">·</span>
          <div className="flex items-center gap-2">
            <span className="font-medium">Voice via</span>
            <span className="font-semibold text-[#241F18]">Web Speech API</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
