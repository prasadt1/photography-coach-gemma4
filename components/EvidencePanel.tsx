import React from 'react';
import { Database, Camera, Cpu } from 'lucide-react';
import type { EvidenceItem } from '../types.v2';

interface EvidencePanelProps {
  evidence: EvidenceItem[];
  className?: string;
}

const SOURCE_CONFIG: Record<EvidenceItem['source'], { label: string; icon: React.ReactNode; color: string }> = {
  EXIF:  { label: 'EXIF Metadata',    icon: <Camera className="w-3.5 h-3.5" />, color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
  CV:    { label: 'CV Analysis',       icon: <Cpu className="w-3.5 h-3.5" />,    color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
  model: { label: 'Gemma 4 Inference', icon: <Database className="w-3.5 h-3.5" />, color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' },
};

const EvidencePanel: React.FC<EvidencePanelProps> = ({ evidence, className = '' }) => {
  if (evidence.length === 0) return null;

  return (
    <div className={`rounded-xl bg-slate-800/40 border border-slate-700 overflow-hidden ${className}`}>
      <div className="px-4 py-3 border-b border-slate-700 flex items-center gap-2">
        <Database className="w-4 h-4 text-slate-400" />
        <span className="text-sm font-semibold text-slate-200">Evidence Sources</span>
        <span className="ml-auto text-xs text-slate-500 font-mono">{evidence.length} signals</span>
      </div>

      <div className="divide-y divide-slate-700/50">
        {evidence.map((item, idx) => {
          const cfg = SOURCE_CONFIG[item.source];
          return (
            <div key={idx} className="px-4 py-3 flex items-center gap-3">
              <div className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded border flex-shrink-0 ${cfg.color}`}>
                {cfg.icon}
                {item.source}
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-xs text-slate-400">{item.field}</span>
                <span className="text-xs text-slate-200 font-mono ml-2">{item.value}</span>
              </div>
              {item.confidence !== undefined && (
                <div className="flex-shrink-0 text-[10px] font-mono text-slate-500">
                  {Math.round(item.confidence * 100)}%
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default EvidencePanel;
