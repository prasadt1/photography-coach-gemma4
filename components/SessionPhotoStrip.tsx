import React from 'react';
import { SessionHistoryEntry } from '../types.v2';
import { Image as ImageIcon } from 'lucide-react';

interface SessionPhotoStripProps {
  entries: SessionHistoryEntry[];
  currentIndex: number;
  onSelect: (index: number) => void;
}

const SessionPhotoStrip: React.FC<SessionPhotoStripProps> = ({ entries, currentIndex, onSelect }) => {
  if (entries.length <= 1) return null;

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-slate-800/60 rounded-xl border border-slate-700 backdrop-blur-md">
      <span className="text-xs text-slate-500 shrink-0 hidden sm:inline">Session</span>
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
        {entries.map((entry, i) => (
          <button
            key={entry.id}
            onClick={() => onSelect(i)}
            className={`w-10 h-10 rounded-lg overflow-hidden border-2 transition-all shrink-0 ${
              i === currentIndex
                ? 'border-brand-500 ring-2 ring-brand-500/30 scale-110'
                : 'border-slate-700 hover:border-slate-500 opacity-70 hover:opacity-100'
            }`}
            title={entry.filename || `Photo ${i + 1}`}
          >
            {entry.thumbnail ? (
              <img src={entry.thumbnail} className="w-full h-full object-cover" alt={entry.filename} />
            ) : (
              <div className="w-full h-full bg-slate-700 flex items-center justify-center">
                <ImageIcon className="w-4 h-4 text-slate-500" />
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

export default SessionPhotoStrip;
