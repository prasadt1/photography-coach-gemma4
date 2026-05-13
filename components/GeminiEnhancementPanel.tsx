/**
 * GeminiEnhancementPanel — Studio Mode opt-in AI image enhancement.
 * Requires the user to provide their own Gemini API key.
 * Blocked in Vault Mode (enforced at the parent tab level).
 */

import React, { useState, useCallback } from 'react';
import { PhotoAnalysisV2 } from '../types.v2';
import { generateEnhancementTips, generateCorrectedImage, EnhancementTips } from '../services/geminiService';
import { Sparkles, Key, Loader2, ChevronRight, Lightbulb, Edit3, Camera, Zap, Image as ImageIcon, Download } from 'lucide-react';

interface GeminiEnhancementPanelProps {
  analysis: PhotoAnalysisV2;
  imageSrc: string;
  imageMimeType?: string;
}

const GeminiEnhancementPanel: React.FC<GeminiEnhancementPanelProps> = ({
  analysis,
  imageSrc,
  imageMimeType = 'image/jpeg',
}) => {
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tips, setTips] = useState<EnhancementTips | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(false);
  const [enhancedImage, setEnhancedImage] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);

  // Key is kept in React state only — never written to localStorage or disk
  const handleSaveKey = useCallback((val: string) => setApiKey(val), []);

  const handleGenerate = async () => {
    if (!apiKey.trim()) { setError('Please enter your Gemini API key first.'); return; }
    setLoading(true);
    setError(null);
    setTips(null);
    try {
      const result = await generateEnhancementTips(
        apiKey.trim(),
        imageSrc,
        imageMimeType,
        {
          scores: analysis.scores as unknown as Record<string, number>,
          improvements: analysis.improvements,
          overall: analysis.critique.overall,
        },
      );
      setTips(result);
    } catch (e: any) {
      const msg = e?.message ?? String(e);
      if (msg.includes('API_KEY_INVALID') || msg.includes('401') || msg.includes('403')) {
        setError('Invalid API key. Double-check your Gemini API key at aistudio.google.com.');
      } else if (msg.includes('quota') || msg.includes('429')) {
        setError('Quota exceeded on your Gemini API key. Try again later.');
      } else {
        setError(`Enhancement failed: ${msg}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateImage = async () => {
    if (!apiKey.trim()) { setImageError('Please enter your Gemini API key first.'); return; }
    setImageLoading(true);
    setImageError(null);
    setEnhancedImage(null);
    try {
      const result = await generateCorrectedImage(
        imageSrc,
        imageMimeType,
        analysis.improvements,
        apiKey.trim(),
      );
      setEnhancedImage(result);
    } catch (e: any) {
      const msg = e?.message ?? String(e);
      if (msg.includes('API_KEY_INVALID') || msg.includes('401') || msg.includes('403')) {
        setImageError('Invalid API key for image generation.');
      } else if (msg.includes('quota') || msg.includes('429')) {
        setImageError('Quota exceeded. Image generation has lower quota than text on the free tier.');
      } else if (msg.includes('not found') || msg.includes('404')) {
        setImageError('Image model unavailable on your API key. gemini-3-pro-image-preview may require paid tier access.');
      } else {
        setImageError(`Image generation failed: ${msg}`);
      }
    } finally {
      setImageLoading(false);
    }
  };

  const handleDownloadImage = () => {
    if (!enhancedImage) return;
    const href = enhancedImage.startsWith('data:')
      ? enhancedImage
      : `data:image/png;base64,${enhancedImage}`;
    const a = document.createElement('a');
    a.href = href;
    a.download = `enhanced-${Date.now()}.png`;
    a.click();
  };

  return (
    <div className="space-y-6 animate-fadeIn">

      {/* Intro card */}
      <div className="rounded-2xl bg-gradient-to-br from-purple-900/30 to-indigo-900/20 border border-purple-700/40 p-4 md:p-6">
        <div className="flex items-start gap-4">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 text-white shadow-lg flex-shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-white font-bold text-base mb-1 flex items-center gap-2">
              Gemini-Powered Enhancement Tips
              <span className="text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-full font-mono uppercase tracking-wider">
                Studio Mode · Opt-in
              </span>
            </h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Get professional post-processing recipes, reframing suggestions, and reshoot notes (Gemini 2.0 Flash) —
              and optionally generate an AI-corrected preview of your photo (Gemini 3 Pro Image). Powered by{' '}
              <strong className="text-slate-300">your own API key</strong>.
            </p>
            <p className="text-xs text-slate-500 mt-2">
              Your key is held in memory only — never saved to disk or sent anywhere. Clears on page refresh. Not available in Vault Mode.
            </p>
          </div>
        </div>
      </div>

      {/* API key input */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-4 md:p-5 space-y-3">
        <label className="flex items-center gap-2 text-sm font-semibold text-slate-300">
          <Key className="w-4 h-4 text-yellow-400" />
          Your Gemini API Key
        </label>
        <div className="flex gap-2">
          <input
            type={showKey ? 'text' : 'password'}
            value={apiKey}
            onChange={e => handleSaveKey(e.target.value)}
            placeholder="AIza…"
            className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 font-mono"
          />
          <button
            onClick={() => setShowKey(s => !s)}
            className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-400 rounded-xl text-xs transition-colors"
          >
            {showKey ? 'Hide' : 'Show'}
          </button>
        </div>
        <p className="text-xs text-slate-500">
          Free key at{' '}
          <a
            href="https://aistudio.google.com/apikey"
            target="_blank"
            rel="noopener noreferrer"
            className="text-purple-400 underline hover:text-purple-300"
          >
            aistudio.google.com
          </a>
          {' '}— generous free tier, no credit card required.
        </p>
      </div>

      {/* Generate button */}
      <button
        onClick={handleGenerate}
        disabled={loading || !apiKey.trim()}
        className="w-full py-3.5 flex items-center justify-center gap-3 rounded-2xl font-semibold text-white
          bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500
          disabled:opacity-50 disabled:cursor-not-allowed
          shadow-lg shadow-purple-500/20 hover:shadow-purple-500/30
          transition-all duration-200 min-h-[52px]"
      >
        {loading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Gemini is crafting your editing recipe…
          </>
        ) : (
          <>
            <Sparkles className="w-5 h-5" />
            Generate Enhancement Tips
          </>
        )}
      </button>

      {/* Error state */}
      {error && (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-4 text-sm text-rose-300">
          {error}
        </div>
      )}

      {/* Results */}
      {tips && (
        <div className="space-y-5 animate-fadeIn">

          {/* Quick Wins */}
          <div className="bg-emerald-900/15 border border-emerald-700/30 rounded-2xl p-4 md:p-5">
            <h4 className="flex items-center gap-2 text-emerald-400 font-bold text-sm uppercase tracking-wider mb-3">
              <Zap className="w-4 h-4" /> Quick Wins (under 2 min each)
            </h4>
            <ul className="space-y-2">
              {tips.quickWins.map((win, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-slate-300">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex-shrink-0 flex items-center justify-center text-xs font-bold">{i + 1}</span>
                  {win}
                </li>
              ))}
            </ul>
          </div>

          {/* Editing Recipe */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-4 md:p-5">
            <h4 className="flex items-center gap-2 text-purple-400 font-bold text-sm uppercase tracking-wider mb-3">
              <Edit3 className="w-4 h-4" /> Editing Recipe (Lightroom / Photoshop)
            </h4>
            <ol className="space-y-2">
              {tips.editingRecipe.map((step, i) => (
                <li key={i} className="flex gap-3 text-sm text-slate-300">
                  <span className="text-purple-500/70 font-bold flex-shrink-0">{i + 1}.</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>

          {/* Compositional Suggestions */}
          {tips.compositionalSuggestions.length > 0 && (
            <div className="bg-amber-900/10 border border-amber-700/30 rounded-2xl p-4 md:p-5">
              <h4 className="flex items-center gap-2 text-amber-400 font-bold text-sm uppercase tracking-wider mb-3">
                <Lightbulb className="w-4 h-4" /> Composition & Crop Ideas
              </h4>
              <ul className="space-y-2">
                {tips.compositionalSuggestions.map((tip, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-slate-300">
                    <ChevronRight className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Reshoot Notes */}
          {tips.idealReshootNotes && (
            <div className="bg-blue-900/10 border border-blue-700/30 rounded-2xl p-4 md:p-5">
              <h4 className="flex items-center gap-2 text-blue-400 font-bold text-sm uppercase tracking-wider mb-3">
                <Camera className="w-4 h-4" /> Next Time You Shoot This Scene
              </h4>
              <p className="text-sm text-slate-300 leading-relaxed">{tips.idealReshootNotes}</p>
            </div>
          )}

        </div>
      )}

      {/* Image generation section — separate action, separate cost warning */}
      {tips && (
        <div className="bg-slate-800/50 border border-purple-700/30 rounded-2xl p-4 md:p-5 space-y-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400 shrink-0">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h4 className="text-white font-bold text-sm mb-1">Want a generated preview of the enhanced photo?</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Gemini 3 Pro Image will generate a corrected version of your photo applying the improvements above.
                <span className="block mt-1 text-amber-400/80">
                  ⚠️ Image generation uses more quota than text and may require a paid Gemini tier.
                </span>
              </p>
            </div>
          </div>

          <button
            onClick={handleGenerateImage}
            disabled={imageLoading || !apiKey.trim()}
            className="w-full py-3 flex items-center justify-center gap-3 rounded-xl font-semibold text-white
              bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500
              disabled:opacity-50 disabled:cursor-not-allowed
              shadow-lg shadow-purple-500/20 transition-all duration-200"
          >
            {imageLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Gemini 3 Pro Image is generating… (~20-40s)
              </>
            ) : enhancedImage ? (
              <>
                <ImageIcon className="w-5 h-5" />
                Regenerate
              </>
            ) : (
              <>
                <ImageIcon className="w-5 h-5" />
                Generate enhanced image preview
              </>
            )}
          </button>

          {imageError && (
            <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-3 text-sm text-rose-300">
              {imageError}
            </div>
          )}

          {enhancedImage && (
            <div className="space-y-3 animate-fadeIn">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-slate-500 mb-1.5">Original</p>
                  <img src={imageSrc} alt="Original" className="rounded-lg border border-slate-700 w-full h-auto" />
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-purple-400 mb-1.5">Enhanced (Gemini 3 Pro)</p>
                  <img
                    src={enhancedImage.startsWith('data:') ? enhancedImage : `data:image/png;base64,${enhancedImage}`}
                    alt="Enhanced"
                    className="rounded-lg border border-purple-500/40 w-full h-auto"
                  />
                </div>
              </div>
              <button
                onClick={handleDownloadImage}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-medium transition-colors"
              >
                <Download className="w-4 h-4" />
                Download enhanced image
              </button>
              <p className="text-[11px] text-slate-500 text-center">
                AI-generated preview — for inspiration. The Editing Recipe above gets you the same look in your editor with full control.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default GeminiEnhancementPanel;
