/**
 * Footer.tsx — Common footer for all L.E.N.S. pages
 */

import React from 'react';
import { GemmaMark, OllamaMark } from './BrandMarks';
import { GEMMA_4_E4B, GEMMA_4_E4B_DOCS_URL, GEMMA_TRADEMARK } from '../lib/branding';

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
          {' '}· Digital Equity & Inclusivity · Ollama tracks
        </p>

        <div className="flex flex-wrap items-center justify-center gap-6 text-[15px] text-[#241F18]">
          <div className="flex items-center gap-2">
            <span className="font-medium">Powered by</span>
            <a
              href={GEMMA_4_E4B_DOCS_URL}
              title="Gemma 4 model card (includes E4B variant)"
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-[#C06B45] hover:text-[#A6552F] underline inline-flex items-center gap-1.5"
            >
              <GemmaMark className="w-5 h-5" />
              {GEMMA_4_E4B}
            </a>
            <span className="text-[#524A3D]">via</span>
            <a
              href="https://ollama.com"
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-[#C06B45] hover:text-[#A6552F] underline inline-flex items-center gap-1.5"
            >
              <OllamaMark className="w-5 h-5" />
              Ollama
            </a>
          </div>
          <span className="text-[#524A3D]">·</span>
          <div className="flex items-center gap-2">
            <span className="font-medium">Voice via</span>
            <span className="font-semibold text-[#241F18]">Web Speech API</span>
          </div>
        </div>
        <p className="text-xs text-[#524A3D] max-w-2xl mx-auto">{GEMMA_TRADEMARK}</p>
      </div>
    </footer>
  );
};

export default Footer;
