import React, { useState } from 'react';
import { FolderOpen, Play, Pause, Download, CheckCircle, XCircle, Loader2, FileText } from 'lucide-react';
import { runAnalysisPipeline } from '../services/analysisOrchestrator';
import { BatchJob } from '../types.v2';

interface DesktopBatchPanelProps {
  onClose: () => void;
}

type BatchState = 'idle' | 'processing' | 'paused' | 'completed';

const DesktopBatchPanel: React.FC<DesktopBatchPanelProps> = ({ onClose }) => {
  const [state, setState] = useState<BatchState>('idle');
  const [batchDir, setBatchDir] = useState<string>('');
  const [folderPath, setFolderPath] = useState<string>('');
  const [jobs, setJobs] = useState<BatchJob[]>([]);
  const [currentJobIndex, setCurrentJobIndex] = useState<number>(0);
  const [isPaused, setIsPaused] = useState(false);

  const isElectron = typeof window !== 'undefined' && window.electronAPI?.isElectron;

  // Select folder
  const handleSelectFolder = async () => {
    if (!window.electronAPI) return;

    const result = await window.electronAPI.selectBatchFolder();
    if (result.success && result.folderPath && result.photoPaths) {
      setFolderPath(result.folderPath);
      setBatchDir(result.folderPath); // Use folder as batch dir

      // Initialize queue
      const initResult = await window.electronAPI.batchInitQueue({
        batchDir: result.folderPath,
        photoPaths: result.photoPaths,
      });

      if (initResult.success) {
        // Load unprocessed jobs
        await loadJobs(result.folderPath);
      }
    }
  };

  // Load jobs from queue
  const loadJobs = async (dir: string) => {
    if (!window.electronAPI) return;

    const result = await window.electronAPI.batchGetUnprocessed(dir);
    if (result.success && result.jobs) {
      setJobs(result.jobs);
    }
  };

  // Start processing
  const handleStartProcessing = async () => {
    if (!window.electronAPI || jobs.length === 0) return;

    setState('processing');
    setIsPaused(false);

    // Process jobs sequentially
    for (let i = currentJobIndex; i < jobs.length; i++) {
      if (isPaused) break;

      const job = jobs[i];
      setCurrentJobIndex(i);

      try {
        // Read file as base64
        const fileResult = await window.electronAPI.readFileAsBase64(job.filePath);
        if (!fileResult.success || !fileResult.base64) {
          throw new Error('Failed to read file');
        }

        // Run analysis
        const startTime = Date.now();
        const analysis = await runAnalysisPipeline(
          fileResult.base64,
          fileResult.mimeType || 'image/jpeg',
          undefined, // imageEl not needed for desktop
          undefined, // file object not needed
          undefined  // progress callback
        );
        const latencyMs = Date.now() - startTime;

        // Record completion
        await window.electronAPI.batchRecordComplete({
          batchDir,
          jobId: job.id,
          result: analysis,
          latencyMs,
        });

        // Update local job state
        setJobs((prev) =>
          prev.map((j) => (j.id === job.id ? { ...j, status: 'done', result: analysis } : j))
        );
      } catch (err: any) {
        // Record error
        await window.electronAPI.batchRecordError({
          batchDir,
          jobId: job.id,
          error: err.message || 'Analysis failed',
        });

        setJobs((prev) =>
          prev.map((j) => (j.id === job.id ? { ...j, status: 'error', errorMessage: err.message } : j))
        );
      }
    }

    setState('completed');
  };

  // Pause processing
  const handlePause = () => {
    setIsPaused(true);
    setState('paused');
  };

  // Resume processing
  const handleResume = () => {
    setIsPaused(false);
    handleStartProcessing();
  };

  // Export XMP
  const handleExportXMP = async () => {
    if (!window.electronAPI) return;

    const result = await window.electronAPI.selectBatchOutputDir();
    if (result.success && result.outputDir) {
      const exportResult = await window.electronAPI.batchExportXMP({
        batchDir,
        outputDir: result.outputDir,
      });

      if (exportResult.success) {
        alert(`Exported ${exportResult.count} XMP files to ${result.outputDir}`);
      }
    }
  };

  const completedCount = jobs.filter((j) => j.status === 'done').length;
  const failedCount = jobs.filter((j) => j.status === 'error').length;
  const totalCount = jobs.length;
  const progressPct = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  if (!isElectron) {
    return (
      <div className="flex items-center justify-center min-h-screen p-8">
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 text-center max-w-md">
          <h2 className="text-2xl font-bold text-white mb-4">Desktop Only</h2>
          <p className="text-slate-400">
            Desktop batch processing requires the Electron app. Use web batch mode instead.
          </p>
          <button
            onClick={onClose}
            className="mt-6 px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-6 mb-6">
        <h1 className="text-3xl font-bold text-white mb-2">Desktop Batch Processing</h1>
        <p className="text-slate-400">
          Process hundreds of photos with checkpoint/resume. Crash-safe, persistent queue.
        </p>
      </div>

      {/* Folder selection */}
      {state === 'idle' && totalCount === 0 && (
        <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-8 text-center">
          <FolderOpen className="w-16 h-16 text-brand-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Select Folder with Photos</h2>
          <p className="text-slate-400 mb-6">
            Choose a folder containing JPG, PNG, or RAW files. A batch queue will be created.
          </p>
          <button
            onClick={handleSelectFolder}
            className="px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-medium transition-colors"
          >
            Browse Folders
          </button>
        </div>
      )}

      {/* Queue loaded */}
      {totalCount > 0 && (
        <>
          {/* Stats */}
          <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-white">Batch Queue</h2>
                <p className="text-sm text-slate-400">
                  {folderPath || batchDir}
                </p>
              </div>
              <div className="flex gap-3">
                {state === 'idle' && (
                  <button
                    onClick={handleStartProcessing}
                    className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-medium transition-colors"
                  >
                    <Play className="w-4 h-4" />
                    Start Processing
                  </button>
                )}
                {state === 'processing' && (
                  <button
                    onClick={handlePause}
                    className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium transition-colors"
                  >
                    <Pause className="w-4 h-4" />
                    Pause
                  </button>
                )}
                {state === 'paused' && (
                  <button
                    onClick={handleResume}
                    className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-medium transition-colors"
                  >
                    <Play className="w-4 h-4" />
                    Resume
                  </button>
                )}
                {(state === 'completed' || completedCount > 0) && (
                  <button
                    onClick={handleExportXMP}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Export XMP ({completedCount})
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                >
                  Close
                </button>
              </div>
            </div>

            {/* Progress */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">
                  {completedCount} of {totalCount} completed
                  {failedCount > 0 && <span className="text-rose-400 ml-2">· {failedCount} failed</span>}
                </span>
                <span className="text-slate-400">{progressPct.toFixed(0)}%</span>
              </div>
              <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-brand-500 to-emerald-500 transition-all duration-500"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          </div>

          {/* Job list */}
          <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-6">
            <h3 className="text-lg font-bold text-white mb-4">Jobs ({totalCount})</h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {jobs.map((job, idx) => (
                <div
                  key={job.id}
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    idx === currentJobIndex && state === 'processing'
                      ? 'bg-brand-500/10 border border-brand-500/30'
                      : 'bg-slate-900/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {job.status === 'done' && <CheckCircle className="w-5 h-5 text-emerald-400" />}
                    {job.status === 'error' && <XCircle className="w-5 h-5 text-rose-400" />}
                    {job.status === 'processing' && <Loader2 className="w-5 h-5 text-brand-400 animate-spin" />}
                    {job.status === 'pending' && <FileText className="w-5 h-5 text-slate-500" />}
                    <div>
                      <p className="text-sm font-medium text-white">{job.fileName}</p>
                      {job.errorMessage && <p className="text-xs text-rose-400">{job.errorMessage}</p>}
                    </div>
                  </div>
                  <span className="text-xs text-slate-500">{job.status}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default DesktopBatchPanel;
