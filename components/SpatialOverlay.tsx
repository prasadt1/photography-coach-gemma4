/**
 * SpatialOverlay — numbered pin + box-outline spatial critique overlay.
 *
 * Design:
 *  - Each flaw is shown as a small numbered circle (pin) at the centre of its bounding box.
 *  - When hovered (or activeIndex matches), the full box outline glows into view.
 *  - Supports bidirectional hover: pin ↔ issue card in the parent.
 */

import React, { useState } from 'react';
import { BoundingBox } from '../types.v2';

interface SpatialOverlayProps {
  boundingBoxes: BoundingBox[];
  show: boolean;
  activeIndex: number | null;
  onHover: (idx: number | null) => void;
  onPinClick?: (idx: number) => void;
}

const SEVERITY_STYLES = {
  critical: {
    border: 'border-rose-500',
    bg: 'bg-rose-500/10',
    pin: 'bg-rose-500 text-white ring-rose-400',
    glow: 'shadow-[0_0_20px_rgba(244,63,94,0.5)]',
  },
  moderate: {
    border: 'border-amber-400',
    bg: 'bg-amber-400/10',
    pin: 'bg-amber-400 text-slate-900 ring-amber-300',
    glow: 'shadow-[0_0_20px_rgba(251,191,36,0.5)]',
  },
  minor: {
    border: 'border-sky-400',
    bg: 'bg-sky-400/10',
    pin: 'bg-sky-400 text-white ring-sky-300',
    glow: 'shadow-[0_0_20px_rgba(56,189,248,0.5)]',
  },
};

interface BoxPinProps {
  box: BoundingBox;
  index: number;
  isActive: boolean;
  onEnter: () => void;
  onLeave: () => void;
  onClick: () => void;
}

const SEVERITY_LABEL: Record<string, string> = {
  critical: 'Critical',
  moderate: 'Moderate',
  minor: 'Minor',
};

const BoxPin: React.FC<BoxPinProps> = ({ box, index, isActive, onEnter, onLeave, onClick }) => {
  const [localHover, setLocalHover] = useState(false);
  const active = isActive || localHover;
  const s = SEVERITY_STYLES[box.severity as keyof typeof SEVERITY_STYLES] ?? SEVERITY_STYLES.minor;

  // Pin sits at the centre of the bounding box
  const pinCx = box.x + box.width / 2;
  const pinCy = box.y + box.height / 2;

  // Tooltip positioning: avoid clipping at image edges
  const tooltipLeft = pinCx > 60;   // flip to left side when pin is in right half
  const tooltipAbove = pinCy > 55;  // flip upward when pin is in bottom half

  return (
    <>
      {/* Box outline — only visible when active */}
      <div
        className={`absolute border-2 rounded-sm pointer-events-none transition-all duration-300 ${s.border} ${s.bg} ${
          active ? `opacity-100 ${s.glow}` : 'opacity-0'
        }`}
        style={{
          left: `${box.x}%`,
          top: `${box.y}%`,
          width: `${box.width}%`,
          height: `${box.height}%`,
          zIndex: active ? 20 : 5,
        }}
      />

      {/* Numbered pin at the box centre */}
      <div
        className="absolute -translate-x-1/2 -translate-y-1/2"
        style={{ left: `${pinCx}%`, top: `${pinCy}%`, zIndex: active ? 40 : 15 }}
        onMouseEnter={() => { setLocalHover(true); onEnter(); }}
        onMouseLeave={() => { setLocalHover(false); onLeave(); }}
      >
        <button
          onClick={onClick}
          className={`flex items-center justify-center
            w-7 h-7 rounded-full text-[11px] font-extrabold select-none
            ring-2 transition-all duration-200 cursor-pointer shadow-lg
            ${s.pin}
            ${active ? 'scale-125 ring-opacity-100' : 'scale-100 ring-opacity-60'}
          `}
          aria-label={`Issue ${index + 1}: ${box.description} — click to see details`}
        >
          {index + 1}
        </button>

        {/* Tooltip — visible on hover */}
        {active && (
          <div
            className={`absolute z-50 w-56 rounded-xl bg-slate-900/95 border border-slate-700 shadow-2xl backdrop-blur-md p-3
              ${tooltipLeft ? 'right-full mr-2' : 'left-full ml-2'}
              ${tooltipAbove ? 'bottom-0' : 'top-0'}
            `}
            onMouseEnter={onEnter}
            onMouseLeave={onLeave}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-slate-800">
              <span className={`text-[10px] font-bold uppercase tracking-wider ${
                box.severity === 'critical' ? 'text-rose-400' :
                box.severity === 'moderate' ? 'text-amber-400' : 'text-sky-400'
              }`}>
                {SEVERITY_LABEL[box.severity] ?? box.severity} · {box.type}
              </span>
              <span className="text-[10px] font-bold text-slate-600 bg-slate-800 rounded px-1">#{index + 1}</span>
            </div>
            {/* Description */}
            <p className="text-xs font-medium text-slate-200 leading-relaxed mb-2">{box.description}</p>
            {/* Suggestion */}
            <div className="flex items-start gap-1.5 bg-slate-800/60 rounded-lg p-2 mb-3">
              <span className="text-brand-400 font-bold text-xs flex-shrink-0">→</span>
              <p className="text-[11px] text-brand-200 leading-snug">{box.suggestion}</p>
            </div>
            {/* Action button */}
            <button
              onClick={onClick}
              className="w-full py-1.5 text-[11px] font-semibold text-brand-400 hover:text-white bg-brand-500/10 hover:bg-brand-500/20 border border-brand-500/30 rounded-lg transition-colors"
            >
              View in Details →
            </button>
          </div>
        )}
      </div>
    </>
  );
};

const SpatialOverlay: React.FC<SpatialOverlayProps> = ({
  boundingBoxes,
  show,
  activeIndex,
  onHover,
  onPinClick,
}) => {
  if (!show || !boundingBoxes || boundingBoxes.length === 0) return null;

  return (
    <>
      {boundingBoxes.map((box, i) => (
        <BoxPin
          key={i}
          box={box}
          index={i}
          isActive={activeIndex === i}
          onEnter={() => onHover(i)}
          onLeave={() => onHover(null)}
          onClick={() => onPinClick?.(i)}
        />
      ))}
    </>
  );
};

export default SpatialOverlay;
