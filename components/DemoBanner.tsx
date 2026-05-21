import React, { useState, useEffect } from 'react';
import { AlertCircle, X, ExternalLink } from 'lucide-react';
import { isJudgeDemoBuild } from '../lib/deploymentProfile';
import {
  GEMMA_4_E4B,
  GEMMA_TRADEMARK,
  OLLAMA_CLOUD,
  OLLAMA_CLOUD_MODEL_TAG,
  REPO_LOCAL_QUICKSTART_URL,
} from '../lib/branding';

/**
 * Top banner on deployed sites — copy differs for judge try-it vs artisan product deploy.
 */
export const DemoBanner: React.FC = () => {
  const [dismissed, setDismissed] = useState(false);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const hostname = window.location.hostname;
    const isLocalhost =
      hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '';
    setShow(!isLocalhost);
    if (sessionStorage.getItem('lens-demo-banner-dismissed') === 'true') {
      setDismissed(true);
    }
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem('lens-demo-banner-dismissed', 'true');
  };

  if (!show || dismissed) return null;

  if (isJudgeDemoBuild()) {
    return (
      <div
        className="bg-gradient-to-r from-[#2F4858] to-[#3d5a6e] border-b border-[#2F4858] px-4 py-3 relative"
        role="region"
        aria-label="How this demo works"
      >
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="flex items-center gap-2 text-[#ECE3D2] shrink-0">
            <AlertCircle className="w-5 h-5" aria-hidden="true" />
            <span className="font-semibold text-sm">Judge try-it demo</span>
          </div>
          <p className="text-[#ECE3D2]/95 text-sm flex-1 leading-relaxed">
            <strong className="font-semibold">Honest demo:</strong> uploads use{' '}
            <strong className="font-semibold">{OLLAMA_CLOUD}</strong>{' '}
            (<code className="bg-black/20 px-1 rounded text-xs">{OLLAMA_CLOUD_MODEL_TAG}</code>) so you can
            try the full flow without installing Ollama. The <strong className="font-semibold">real product</strong>{' '}
            runs <strong className="font-semibold">{GEMMA_4_E4B}</strong> on your device — private and
            offline-capable. Samples here are recorded E4B from a local Mac. Tap{' '}
            <strong>Enter Artisan Studio</strong>, then try a sample or upload. Prefer on-device E4B?{' '}
            <a
              href={REPO_LOCAL_QUICKSTART_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-white font-medium"
            >
              Ollama + E4B local setup
            </a>
            . {GEMMA_TRADEMARK}
          </p>
          <button
            type="button"
            onClick={handleDismiss}
            className="p-1.5 hover:bg-white/10 rounded-lg text-[#ECE3D2] shrink-0"
            aria-label="Dismiss banner"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="bg-gradient-to-r from-amber-900/90 to-orange-900/90 border-b border-amber-700/50 px-4 py-3 relative"
      role="alert"
    >
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex items-center gap-2 text-amber-200 shrink-0">
          <AlertCircle className="w-5 h-5" aria-hidden="true" />
          <span className="font-semibold text-sm">Local-first product</span>
        </div>
        <p className="text-amber-100/90 text-sm flex-1">
          The full experience runs <strong>{GEMMA_4_E4B}</strong> on your machine via{' '}
          <a
            href="https://ollama.com"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-white font-medium inline-flex items-center gap-1"
          >
            Ollama
            <ExternalLink className="w-3 h-3" aria-hidden="true" />
          </a>
          . See the{' '}
          <a
            href={REPO_LOCAL_QUICKSTART_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-white font-medium"
          >
            README quick start
          </a>
          .
        </p>
        <button
          type="button"
          onClick={handleDismiss}
          className="p-1.5 hover:bg-amber-800/50 rounded-lg text-amber-200"
          aria-label="Dismiss banner"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default DemoBanner;
