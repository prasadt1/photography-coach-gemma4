import React from 'react';

/** Official-style Ollama mark (Simple Icons, bundled under public/). */
export const OllamaMark: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <img
    src="/ollama-logo.svg"
    alt=""
    className={`${className} object-contain`}
    width={20}
    height={20}
    aria-hidden
  />
);

/** Gemma sparkle used beside “Powered by” links. */
export const GemmaMark: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M12 2 9 9H2l6 4.5L5.5 22 12 17l6.5 5-2.5-8.5L22 9h-7L12 2z" />
  </svg>
);
