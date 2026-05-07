/**
 * AuditLogPanel — Vault Mode audit log viewer
 *
 * Displays hash-chained audit events, runs chain verification,
 * and exports the full log as JSONL.
 *
 * Sources: docs/specs/08-vault-mode-spec.md §5.3
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Shield, Download, CheckCircle, XCircle, Loader2, X, RefreshCw, Lock } from 'lucide-react';
import { exportAuditLog, verifyChain } from '../services/auditService';
import type { AuditLogEntry } from '../types.v2';

interface AuditLogPanelProps {
  onClose: () => void;
}

// ─── Event row ────────────────────────────────────────────────────────────────

const EVENT_CONFIG: Record<AuditLogEntry['event'], { label: string; color: string }> = {
  analysis_complete: { label: 'Analysis',     color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
  refusal:           { label: 'Refusal',      color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
  mode_change:       { label: 'Mode Change',  color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
  session_start:     { label: 'Session Start',color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' },
  session_end:       { label: 'Session End',  color: 'text-slate-400 bg-slate-500/10 border-slate-500/20' },
};

function truncateHash(h: string) {
  return h.length > 12 ? `${h.slice(0, 6)}…${h.slice(-6)}` : h;
}

// ─── Component ────────────────────────────────────────────────────────────────

const AuditLogPanel: React.FC<AuditLogPanelProps> = ({ onClose }) => {
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<{ valid: boolean; brokenAt?: number } | null>(null);
  const [exporting, setExporting] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load entries from IndexedDB / localStorage
  const loadEntries = useCallback(async () => {
    setLoading(true);
    try {
      const jsonl = await exportAuditLog();
      if (!jsonl.trim()) { setEntries([]); return; }
      const parsed = jsonl.trim().split('\n').map(l => JSON.parse(l) as AuditLogEntry);
      setEntries(parsed.reverse());   // Newest first
    } catch (e) {
      console.error('[AuditLogPanel] Failed to load entries:', e);
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadEntries(); }, [loadEntries]);

  const handleVerify = async () => {
    setVerifying(true);
    setVerifyResult(null);
    try {
      const result = await verifyChain();
      setVerifyResult(result);
    } catch {
      setVerifyResult({ valid: false });
    } finally {
      setVerifying(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const jsonl = await exportAuditLog();
      const blob = new Blob([jsonl], { type: 'application/x-ndjson' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `vault-audit-${Date.now()}.jsonl`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('[AuditLogPanel] Export failed:', e);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="w-full sm:max-w-2xl max-h-[90vh] bg-slate-900 border border-slate-700 rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-700 flex-shrink-0">
          <div className="p-2 bg-amber-500/20 rounded-lg">
            <Shield className="w-5 h-5 text-amber-400" />
          </div>
          <div className="flex-1">
            <h2 className="font-bold text-white">Vault Mode Audit Log</h2>
            <p className="text-xs text-slate-400">Hash-chained tamper-evident record · {entries.length} events</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action bar */}
        <div className="flex items-center gap-3 px-5 py-3 border-b border-slate-700 flex-shrink-0 bg-slate-800/40">
          <button
            onClick={handleVerify}
            disabled={verifying || entries.length === 0}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {verifying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
            Verify Chain
          </button>

          <button
            onClick={handleExport}
            disabled={exporting || entries.length === 0}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-700 text-slate-300 border border-slate-600 hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            Export JSONL
          </button>

          <button
            onClick={loadEntries}
            disabled={loading}
            className="ml-auto flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-slate-500 hover:text-slate-300 hover:bg-slate-700 disabled:opacity-40 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Verify result banner */}
        {verifyResult !== null && (
          <div className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium flex-shrink-0 ${
            verifyResult.valid
              ? 'bg-emerald-900/30 text-emerald-300 border-b border-emerald-500/20'
              : 'bg-rose-900/30 text-rose-300 border-b border-rose-500/20'
          }`}>
            {verifyResult.valid
              ? <><CheckCircle className="w-4 h-4 flex-shrink-0" /> Chain is intact — no tampering detected</>
              : <><XCircle className="w-4 h-4 flex-shrink-0" /> Chain broken at entry #{verifyResult.brokenAt} — log may have been tampered</>
            }
          </div>
        )}

        {/* Entry list */}
        <div className="flex-1 overflow-y-auto p-2">
          {loading && (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-slate-500" />
            </div>
          )}

          {!loading && entries.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-slate-500 gap-3">
              <Lock className="w-8 h-8 opacity-30" />
              <p className="text-sm">No audit entries yet.</p>
              <p className="text-xs text-center max-w-xs">
                Analyze a photo in Vault Mode to start recording tamper-evident events.
              </p>
            </div>
          )}

          {!loading && entries.length > 0 && (
            <div className="space-y-2">
              {entries.map(entry => {
                const cfg = EVENT_CONFIG[entry.event] ?? EVENT_CONFIG.mode_change;
                return (
                  <div
                    key={entry.seq}
                    className="rounded-xl border border-slate-700/60 bg-slate-800/30 p-3 space-y-2"
                  >
                    {/* Row header */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-mono text-slate-600">#{entry.seq}</span>
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${cfg.color}`}>
                        {cfg.label}
                      </span>
                      <span className="text-xs text-slate-500 ml-auto">
                        {new Date(entry.timestamp).toLocaleTimeString()}
                      </span>
                    </div>

                    {/* Hashes */}
                    <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                      <div>
                        <span className="text-slate-600 block mb-0.5">prevHash</span>
                        <span className="text-slate-400 break-all">{truncateHash(entry.prevHash)}</span>
                      </div>
                      <div>
                        <span className="text-slate-600 block mb-0.5">hash</span>
                        <span className="text-slate-300 break-all">{truncateHash(entry.hash)}</span>
                      </div>
                    </div>

                    {/* Image hash (analysis events) */}
                    {entry.imageHash && (
                      <div className="text-[10px] font-mono">
                        <span className="text-slate-600 mr-1">imgSHA256</span>
                        <span className="text-slate-400">{truncateHash(entry.imageHash)}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-700 flex-shrink-0 bg-slate-800/20">
          <p className="text-[10px] text-slate-600 text-center">
            Each entry's SHA-256 hash includes the previous entry's hash — tampering any entry breaks all subsequent entries.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuditLogPanel;
