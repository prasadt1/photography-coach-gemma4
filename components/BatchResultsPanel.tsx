import React from 'react';
import { WebBatchItem } from '../types.v2';
import { exportXMPSidecar } from '../services/xmpService';
import { Download, CheckCircle, XCircle, Loader2, FileImage, Package } from 'lucide-react';
import JSZip from 'jszip';

interface BatchResultsPanelProps {
  items: WebBatchItem[];
  onReset: () => void;
}

const BatchResultsPanel: React.FC<BatchResultsPanelProps> = ({ items, onReset }) => {
  const completedCount = items.filter(item => item.status === 'completed').length;
  const failedCount = items.filter(item => item.status === 'failed').length;
  const totalCount = items.length;

  const handleExportSingle = (item: WebBatchItem) => {
    if (!item.analysis) return;

    const { filename, content } = exportXMPSidecar(item.analysis, item.file.name);
    const blob = new Blob([content], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportAllAsZip = async () => {
    const completedItems = items.filter(item => item.status === 'completed' && item.analysis);
    if (completedItems.length === 0) return;

    const zip = new JSZip();

    for (const item of completedItems) {
      const { filename, content } = exportXMPSidecar(item.analysis!, item.file.name);
      zip.file(filename, content);
    }

    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `photography-coach-xmp-batch-${Date.now()}.zip`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="w-full max-w-6xl mx-auto z-10 relative p-4 md:p-6">
      {/* Header */}
      <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">Batch Processing Results</h2>
            <p className="text-slate-400">
              {completedCount} of {totalCount} photos analyzed successfully
              {failedCount > 0 && <span className="text-rose-400"> · {failedCount} failed</span>}
            </p>
          </div>
          <div className="flex gap-3">
            {completedCount > 0 && (
              <button
                onClick={handleExportAllAsZip}
                className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg transition-colors font-medium"
              >
                <Package className="w-4 h-4" />
                Export All XMP ({completedCount})
              </button>
            )}
            <button
              onClick={onReset}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors font-medium"
            >
              New Batch
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-brand-500 to-emerald-500 transition-all duration-500"
            style={{ width: `${(completedCount / totalCount) * 100}%` }}
          />
        </div>
      </div>

      {/* Results grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((item) => (
          <div
            key={item.id}
            className="bg-slate-800/50 rounded-xl border border-slate-700 p-4 hover:border-slate-600 transition-colors"
          >
            {/* Thumbnail */}
            <div className="relative aspect-video bg-slate-900 rounded-lg mb-3 overflow-hidden">
              {item.base64 ? (
                <img
                  src={item.base64}
                  alt={item.file.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <FileImage className="w-8 h-8 text-slate-600" />
                </div>
              )}

              {/* Status badge */}
              <div className="absolute top-2 right-2">
                {item.status === 'completed' && (
                  <div className="p-1.5 bg-emerald-500/20 backdrop-blur-sm rounded-full border border-emerald-500/50">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                  </div>
                )}
                {item.status === 'failed' && (
                  <div className="p-1.5 bg-rose-500/20 backdrop-blur-sm rounded-full border border-rose-500/50">
                    <XCircle className="w-4 h-4 text-rose-400" />
                  </div>
                )}
                {item.status === 'analyzing' && (
                  <div className="p-1.5 bg-brand-500/20 backdrop-blur-sm rounded-full border border-brand-500/50">
                    <Loader2 className="w-4 h-4 text-brand-400 animate-spin" />
                  </div>
                )}
              </div>
            </div>

            {/* File info */}
            <div className="mb-3">
              <p className="text-sm font-medium text-white truncate" title={item.file.name}>
                {item.file.name}
              </p>
              <p className="text-xs text-slate-500">
                {(item.file.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>

            {/* Scores (if completed) */}
            {item.status === 'completed' && item.analysis && (
              <div className="mb-3">
                <div className="grid grid-cols-5 gap-1 mb-2">
                  {[
                    item.analysis.scores.composition,
                    item.analysis.scores.lighting,
                    item.analysis.scores.technique,
                    item.analysis.scores.creativity,
                    item.analysis.scores.subjectImpact,
                  ].map((score, idx) => (
                    <div key={idx} className="text-center">
                      <div className="text-xs font-bold text-emerald-400">{score.toFixed(1)}</div>
                      <div className="h-1 bg-slate-900 rounded-full overflow-hidden mt-1">
                        <div
                          className="h-full bg-gradient-to-r from-brand-500 to-emerald-500"
                          style={{ width: `${score * 10}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="text-xs text-slate-400 text-center">
                  Avg: {(
                    (item.analysis.scores.composition +
                      item.analysis.scores.lighting +
                      item.analysis.scores.technique +
                      item.analysis.scores.creativity +
                      item.analysis.scores.subjectImpact) / 5
                  ).toFixed(1)}/10
                </div>
              </div>
            )}

            {/* Error message */}
            {item.status === 'failed' && (
              <div className="mb-3">
                <p className="text-xs text-rose-400">{item.error || 'Analysis failed'}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              {item.status === 'completed' && (
                <button
                  onClick={() => handleExportSingle(item)}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors text-sm font-medium"
                >
                  <Download className="w-3.5 h-3.5" />
                  Export XMP
                </button>
              )}
              {item.status === 'analyzing' && (
                <div className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-slate-900 text-slate-400 rounded-lg text-sm">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Analyzing...
                </div>
              )}
              {item.status === 'pending' && (
                <div className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-slate-900 text-slate-500 rounded-lg text-sm">
                  Pending
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BatchResultsPanel;
