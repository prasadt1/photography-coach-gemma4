/**
 * ModeSelector — Studio vs Vault Mode picker
 * Shown on the idle screen before photo upload.
 * Sources: docs/specs/01-product-spec.md, docs/specs/08-vault-mode-spec.md
 */

import React from 'react';
import { Zap, Shield, Check } from 'lucide-react';
import { OperationalMode } from '../types.v2';

interface ModeSelectorProps {
  mode: OperationalMode;
  onChange: (mode: OperationalMode) => void;
}

const STUDIO_FEATURES = [
  'Gemma 4 E4B local inference',
  'Batch photo processing',
  'Optional Gemini image gen (your API key)',
  'Fast Studio throughput',
];

const VAULT_FEATURES = [
  'Network-isolated — zero cloud calls',
  'Hash-chained audit log',
  'Exportable tamper-evident report',
  'NDA-safe confidential workflows',
];

const ModeSelector: React.FC<ModeSelectorProps> = ({ mode, onChange }) => {
  return (
    <div className="w-full max-w-2xl mx-auto">
      <p className="text-center text-xs font-semibold text-slate-500 uppercase tracking-widest mb-4">
        Choose your workflow
      </p>
      <div className="grid grid-cols-2 gap-4">
        {/* Studio Mode */}
        <button
          onClick={() => onChange('studio')}
          className={`relative flex flex-col gap-3 p-5 rounded-2xl border-2 text-left transition-all duration-200 ${
            mode === 'studio'
              ? 'border-brand-500 bg-brand-500/10 shadow-lg shadow-brand-500/10'
              : 'border-slate-700/50 bg-slate-800/30 hover:border-slate-600'
          }`}
        >
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-lg ${mode === 'studio' ? 'bg-brand-500/20 text-brand-400' : 'bg-slate-700/50 text-slate-400'}`}>
              <Zap className="w-4 h-4" />
            </div>
            <span className="font-bold text-white text-sm">Studio Mode</span>
            {mode === 'studio' && (
              <span className="ml-auto text-xs font-semibold text-brand-400 bg-brand-500/10 px-2 py-0.5 rounded-full">Active</span>
            )}
          </div>
          <ul className="space-y-1.5">
            {STUDIO_FEATURES.map(f => (
              <li key={f} className="flex items-start gap-2 text-xs text-slate-400">
                <Check className="w-3 h-3 text-emerald-500 mt-0.5 shrink-0" />
                {f}
              </li>
            ))}
          </ul>
        </button>

        {/* Vault Mode */}
        <button
          onClick={() => onChange('vault')}
          className={`relative flex flex-col gap-3 p-5 rounded-2xl border-2 text-left transition-all duration-200 ${
            mode === 'vault'
              ? 'border-amber-500 bg-amber-500/10 shadow-lg shadow-amber-500/10'
              : 'border-slate-700/50 bg-slate-800/30 hover:border-slate-600'
          }`}
        >
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-lg ${mode === 'vault' ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-700/50 text-slate-400'}`}>
              <Shield className="w-4 h-4" />
            </div>
            <span className="font-bold text-white text-sm">Vault Mode</span>
            {mode === 'vault' && (
              <span className="ml-auto text-xs font-semibold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">🔒 Active</span>
            )}
          </div>
          <ul className="space-y-1.5">
            {VAULT_FEATURES.map(f => (
              <li key={f} className="flex items-start gap-2 text-xs text-slate-400">
                <Check className="w-3 h-3 text-amber-500 mt-0.5 shrink-0" />
                {f}
              </li>
            ))}
          </ul>
          {mode === 'vault' && (
            <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          )}
        </button>
      </div>
    </div>
  );
};

export default ModeSelector;
