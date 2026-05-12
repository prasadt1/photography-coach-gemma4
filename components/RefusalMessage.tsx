import React from 'react';
import { ShieldOff, AlertTriangle } from 'lucide-react';
import type { RefusalCategory } from '../types.v2';

interface RefusalMessageProps {
  reason?: string;
  category?: RefusalCategory;
  className?: string;
}

const CATEGORY_LABELS: Record<RefusalCategory, string> = {
  medical:       'Medical Content',
  identity:      'Identity Document',
  surveillance:  'Surveillance / Identifiable Faces',
  inappropriate: 'Inappropriate Content',
  other:         'Policy Restriction',
};

const RefusalMessage: React.FC<RefusalMessageProps> = ({ reason, category, className = '' }) => {
  const categoryLabel = category ? CATEGORY_LABELS[category] : 'Policy Restriction';

  return (
    <div className={`rounded-2xl border border-rose-500/30 bg-rose-900/10 p-6 ${className}`}>
      <div className="flex items-start gap-4">
        <div className="p-2.5 bg-rose-500/20 rounded-xl flex-shrink-0">
          <ShieldOff className="w-6 h-6 text-rose-400" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="font-bold text-rose-300 text-base">Analysis Declined</h3>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/20">
              {categoryLabel}
            </span>
          </div>
          <p className="text-slate-300 text-sm leading-relaxed">
            {reason
              ? reason
              : 'Gemma 4 declined to analyze this image based on content safety guidelines.'}
          </p>
          <div className="mt-4 flex items-start gap-2 text-xs text-slate-400">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
            <span>
              This refusal was generated entirely on-device — no image data left this machine.
              Upload a different photograph to continue your session.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RefusalMessage;
