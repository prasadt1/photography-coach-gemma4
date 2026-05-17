/**
 * ComparePanel — side-by-side photo comparison (two images → Gemma picks a keeper).
 */

import React, { useState, useRef } from 'react';
import { ImagePlus, Loader2, Trophy, Scale, X, RefreshCw, Sparkles } from 'lucide-react';
import { comparePhotos, ComparisonResult } from '../services/ollamaService';

type Slot = 'A' | 'B';

interface PhotoSlot {
  base64: string;
  mimeType: string;
  filename: string;
}

interface ComparePanelProps {
  onClose?: () => void;
  onSendToSell?: (imageBase64: string) => void;
}

const ComparePanel: React.FC<ComparePanelProps> = ({ onClose, onSendToSell }) => {
  const [slotA, setSlotA] = useState<PhotoSlot | null>(null);
  const [slotB, setSlotB] = useState<PhotoSlot | null>(null);
  const [result, setResult] = useState<ComparisonResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const handleFile = (slot: Slot, file: File) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.split(',')[1];
      const photo = { base64, mimeType: file.type, filename: file.name };
      if (slot === 'A') setSlotA(photo); else setSlotB(photo);
      setResult(null);
      setError(null);
    };
    reader.readAsDataURL(file);
  };

  const handleCompare = async () => {
    if (!slotA || !slotB) return;
    setLoading(true);
    setError(null);
    setResult(null);
    abortRef.current?.abort();
    const ctl = new AbortController();
    abortRef.current = ctl;
    try {
      const res = await comparePhotos(slotA.base64, slotB.base64, ctl.signal);
      setResult(res);
    } catch (e) {
      setError((e as Error).message || 'Comparison failed');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    abortRef.current?.abort();
    setSlotA(null);
    setSlotB(null);
    setResult(null);
    setError(null);
    setLoading(false);
  };

  const renderSlot = (slot: Slot, photo: PhotoSlot | null) => {
    const isWinner = result && result.winner === slot;
    const isLoser = result && result.winner !== 'tie' && result.winner !== slot;
    return (
      <div className={`relative rounded-2xl border-2 transition-all ${
        isWinner ? 'border-emerald-500 bg-emerald-500/5 shadow-lg shadow-emerald-500/20' :
        isLoser ? 'border-slate-700 opacity-60' :
        photo ? 'border-slate-600' : 'border-dashed border-slate-700'
      } overflow-hidden`}>
        {photo ? (
          <div className="relative">
            <img src={`data:${photo.mimeType};base64,${photo.base64}`} alt={photo.filename} className="w-full h-auto max-h-[400px] object-contain bg-black" />
            {isWinner && (
              <div className="absolute top-3 left-3 flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 text-white rounded-full text-xs font-bold shadow-lg">
                <Trophy className="w-3.5 h-3.5" /> Winner
              </div>
            )}
            <div className="absolute top-3 right-3 flex items-center gap-1.5">
              <span className="px-2 py-1 bg-slate-900/90 text-slate-200 rounded text-[11px] font-mono">{slot}</span>
              {!loading && !result && (
                <button
                  type="button"
                  onClick={() => slot === 'A' ? setSlotA(null) : setSlotB(null)}
                  className="p-1.5 bg-slate-900/90 hover:bg-rose-700 text-slate-300 hover:text-white rounded transition-colors"
                  aria-label={`Remove photo ${slot}`}
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
            <div className="px-3 py-2 text-xs text-slate-400 truncate bg-slate-900/60" title={photo.filename}>{photo.filename}</div>
          </div>
        ) : (
          <label className="flex flex-col items-center justify-center min-h-[300px] cursor-pointer hover:bg-slate-800/30 transition-colors p-8 text-center">
            <ImagePlus className="w-10 h-10 text-slate-600 mb-3" />
            <p className="text-sm font-semibold text-slate-300">Photo {slot}</p>
            <p className="text-xs text-slate-500 mt-1">Click or drop an image</p>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={e => e.target.files?.[0] && handleFile(slot, e.target.files[0])}
            />
          </label>
        )}
      </div>
    );
  };

  return (
    <div className="w-full max-w-6xl mx-auto z-10 relative p-4 md:p-6">
      <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-6 mb-6 flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-violet-500/10 border border-violet-500/30 shrink-0">
            <Scale className="w-5 h-5 text-violet-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white mb-1">Compare Two Photos</h2>
            <p className="text-sm text-slate-400">Drop two near-duplicates. Gemma 4 E4B picks the keeper and tells you why.</p>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          {(slotA || slotB || result) && (
            <button
              type="button"
              onClick={handleReset}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white text-sm font-medium transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Reset
            </button>
          )}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
              aria-label="Close compare"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {renderSlot('A', slotA)}
        {renderSlot('B', slotB)}
      </div>

      <div className="flex flex-col items-center mb-6">
        <button
          type="button"
          onClick={handleCompare}
          disabled={!slotA || !slotB || loading}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-brand-600 hover:from-violet-500 hover:to-brand-500 text-white font-semibold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Gemma 4 E4B is comparing…
            </>
          ) : result ? (
            <>
              <RefreshCw className="w-4 h-4" />
              Compare again
            </>
          ) : (
            <>
              <Scale className="w-4 h-4" />
              Pick the winner
            </>
          )}
        </button>
        {!slotA || !slotB ? (
          <p className="text-xs text-slate-500 mt-3">Add a photo to both slots to enable comparison.</p>
        ) : null}
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-sm text-rose-300">
          {error}
        </div>
      )}

      {result && !loading && (
        <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-6 animate-fadeIn">
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="w-5 h-5 text-emerald-400" />
            <h3 className="text-lg font-bold text-white">
              {result.winner === 'tie' ? 'It\'s a tie' : `Winner: Photo ${result.winner}`}
            </h3>
          </div>
          <p className="text-slate-300 leading-relaxed mb-5">{result.reason}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
            <div className="p-4 rounded-xl border border-slate-700 bg-slate-900/40">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Photo A — strengths</p>
              <ul className="space-y-1.5">
                {result.strengths_a.length > 0 ? result.strengths_a.map((s, i) => (
                  <li key={i} className="text-sm text-slate-300 flex items-start gap-2">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-slate-500 shrink-0" />
                    {s}
                  </li>
                )) : <li className="text-sm text-slate-600 italic">No specific strengths noted.</li>}
              </ul>
            </div>
            <div className="p-4 rounded-xl border border-slate-700 bg-slate-900/40">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Photo B — strengths</p>
              <ul className="space-y-1.5">
                {result.strengths_b.length > 0 ? result.strengths_b.map((s, i) => (
                  <li key={i} className="text-sm text-slate-300 flex items-start gap-2">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-slate-500 shrink-0" />
                    {s}
                  </li>
                )) : <li className="text-sm text-slate-600 italic">No specific strengths noted.</li>}
              </ul>
            </div>
          </div>
          {result.recommendation && (
            <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/30">
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400 mb-1.5">Recommendation</p>
              <p className="text-sm text-slate-200 leading-relaxed">{result.recommendation}</p>
            </div>
          )}

          {/* Optimize for Marketplace button - only show when there's a winner */}
          {onSendToSell && result.winner !== 'tie' && (
            <div className="mt-6 flex justify-center">
              <button
                onClick={() => {
                  const winningPhoto = result.winner === 'A' ? slotA : slotB;
                  if (winningPhoto) {
                    onSendToSell(`data:${winningPhoto.mimeType};base64,${winningPhoto.base64}`);
                  }
                }}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50 hover:scale-105"
              >
                <Sparkles className="w-5 h-5" />
                ✨ Optimize Winner for Marketplace
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ComparePanel;
