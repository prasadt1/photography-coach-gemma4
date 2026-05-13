import React from 'react';
import { X, Keyboard } from 'lucide-react';

interface KeyboardShortcutsOverlayProps {
  onClose: () => void;
}

const shortcuts = [
  { key: '1', description: 'Go to Overview tab' },
  { key: '2', description: 'Go to How to Fix tab' },
  { key: '3', description: 'Go to Ask Coach tab' },
  { key: '4', description: 'Go to Enhance tab' },
  { key: 'Space', description: 'Analyze new photo' },
  { key: 'Q', description: 'Toggle Quick/Full view' },
  { key: '?', description: 'Show this help' },
  { key: 'Esc', description: 'Close overlay / Go home' },
];

const KeyboardShortcutsOverlay: React.FC<KeyboardShortcutsOverlayProps> = ({ onClose }) => {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="bg-slate-800 border border-slate-700 rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand-500/20 rounded-lg">
              <Keyboard className="w-5 h-5 text-brand-400" />
            </div>
            <h2 className="text-lg font-bold text-white">Keyboard Shortcuts</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Shortcuts list */}
        <div className="space-y-3">
          {shortcuts.map((shortcut) => (
            <div key={shortcut.key} className="flex items-center justify-between">
              <span className="text-slate-300 text-sm">{shortcut.description}</span>
              <kbd className="px-2.5 py-1 bg-slate-900 border border-slate-600 rounded-lg text-xs font-mono text-slate-200 min-w-[2.5rem] text-center">
                {shortcut.key}
              </kbd>
            </div>
          ))}
        </div>

        {/* Footer hint */}
        <div className="mt-6 pt-4 border-t border-slate-700 text-center">
          <p className="text-xs text-slate-500">
            Press <kbd className="px-1.5 py-0.5 bg-slate-900 rounded text-slate-400 font-mono">?</kbd> anytime to show this
          </p>
        </div>
      </div>
    </div>
  );
};

export default KeyboardShortcutsOverlay;
