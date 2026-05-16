import React from 'react';
import { Shield, Lock, WifiOff, ClipboardList, Download } from 'lucide-react';

interface VaultModeBannerProps {
  className?: string;
  onViewAuditLog?: () => void;
  onExportLog?: () => void;
}

const VaultModeBanner: React.FC<VaultModeBannerProps> = ({
  className = '',
  onViewAuditLog,
  onExportLog,
}) => (
  <div className={`flex items-center gap-3 px-4 py-2.5 rounded-xl bg-amber-900/20 border border-amber-500/30 ${className}`}>
    <div className="flex items-center gap-2 text-amber-400 flex-shrink-0">
      <Shield className="w-4 h-4" />
      <Lock className="w-3.5 h-3.5" />
    </div>
    <div className="flex flex-col min-w-0 flex-1">
      <span className="text-xs font-bold text-amber-300 uppercase tracking-wider">Vault Mode Active</span>
      <span className="text-[11px] text-amber-400/70 flex items-center gap-1 mt-0.5">
        <WifiOff className="w-3 h-3 flex-shrink-0" />
        All inference runs locally · No network egress
      </span>
    </div>

    {/* Action buttons */}
    <div className="flex items-center gap-2 flex-shrink-0">
      {onViewAuditLog && (
        <button
          onClick={onViewAuditLog}
          className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-300 hover:text-amber-100 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 px-2.5 py-1 rounded-lg transition-colors"
        >
          <ClipboardList className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Audit Log</span>
        </button>
      )}
      {onExportLog && (
        <button
          onClick={onExportLog}
          className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-300 hover:text-amber-100 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 px-2.5 py-1 rounded-lg transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Export</span>
        </button>
      )}
      <span className="text-[10px] font-mono bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded border border-amber-500/20">
        OFFLINE
      </span>
    </div>
  </div>
);

export default VaultModeBanner;
