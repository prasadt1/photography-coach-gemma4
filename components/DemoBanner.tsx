import React, { useState, useEffect } from 'react';
import { AlertCircle, X, ExternalLink } from 'lucide-react';

/**
 * DemoBanner - Shows on deployed (non-localhost) environments
 * Explains to hackathon judges that Ollama must be running locally
 */
export const DemoBanner: React.FC = () => {
  const [dismissed, setDismissed] = useState(false);
  const [isDemo, setIsDemo] = useState(false);

  useEffect(() => {
    // Show banner on non-localhost origins (deployed environments)
    const hostname = window.location.hostname;
    const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
    setIsDemo(!isLocalhost);

    // Check if previously dismissed in this session
    const wasDismissed = sessionStorage.getItem('lens-demo-banner-dismissed');
    if (wasDismissed === 'true') {
      setDismissed(true);
    }
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem('lens-demo-banner-dismissed', 'true');
  };

  if (!isDemo || dismissed) return null;

  return (
    <div
      className="bg-gradient-to-r from-amber-900/90 to-orange-900/90 border-b border-amber-700/50 px-4 py-3 relative"
      role="alert"
      aria-live="polite"
    >
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex items-center gap-2 text-amber-200">
          <AlertCircle className="w-5 h-5 shrink-0" aria-hidden="true" />
          <span className="font-semibold text-sm">Hackathon Demo</span>
        </div>

        <p className="text-amber-100/90 text-sm flex-1">
          This app requires{' '}
          <a
            href="https://ollama.com"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-white font-medium inline-flex items-center gap-1"
          >
            Ollama
            <ExternalLink className="w-3 h-3" aria-hidden="true" />
          </a>
          {' '}running locally with{' '}
          <code className="bg-amber-950/50 px-1.5 py-0.5 rounded text-xs font-mono">
            gemma4:latest
          </code>
          {' '}to function. See README for setup instructions.
        </p>

        <div className="flex items-center gap-3">
          <a
            href="https://github.com/prasadt1/photography-coach-gemma4#quick-start"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-semibold bg-amber-700/50 hover:bg-amber-700 px-3 py-1.5 rounded-lg text-amber-100 transition-colors whitespace-nowrap"
          >
            Setup Guide
          </a>

          <button
            type="button"
            onClick={handleDismiss}
            className="p-1.5 hover:bg-amber-800/50 rounded-lg text-amber-200 hover:text-white transition-colors"
            aria-label="Dismiss banner"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default DemoBanner;
