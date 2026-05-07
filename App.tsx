
import React, { useState, useEffect, useCallback } from 'react';
import { Camera, Cpu, Target, Coins, ArrowRight, Github, MonitorPlay, Shield, Activity, Layers } from 'lucide-react';
import ModeSelector from './components/ModeSelector';
import PhotoUploader from './components/PhotoUploader';
import AnalysisResults, { TabId, MentorChatStateV2 } from './components/AnalysisResults';
import AuditLogPanel from './components/AuditLogPanel';
import BatchResultsPanel from './components/BatchResultsPanel';
import { PresentationSlides } from './components/PresentationSlides';
import { runAnalysisPipeline, checkOllamaHealth, warmUpModel, AnalysisProgress } from './services/analysisOrchestrator';
import { setOperationalMode, exportAuditLog } from './services/auditService';
import { AppState } from './types';
import { PhotoAnalysisV2, OperationalMode, SessionHistoryEntry, WebBatchItem } from './types.v2';

// Floating badge component showing session token count
const SessionSavingsBadge: React.FC<{
  sessionHistory: SessionHistoryEntry[];
  onClick: () => void;
}> = ({ sessionHistory, onClick }) => {
  if (sessionHistory.length === 0) return null;

  const totalTokens = sessionHistory.reduce((acc, curr) => acc + curr.totalTokens, 0);

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-2 md:px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 transition-all cursor-pointer group relative"
      title="Click to view inference stats"
    >
      <Coins className="w-4 h-4" />
      <span className="text-xs font-bold tracking-wide font-mono">
        <span className="hidden md:inline">Session: </span>
        {totalTokens.toLocaleString()} tokens
      </span>
      {sessionHistory.length === 1 && (
        <div className="absolute top-full right-0 mt-3 w-40 md:w-48 p-2 md:p-3 bg-slate-800 border border-slate-700 rounded-lg shadow-xl text-[10px] md:text-xs text-slate-300 text-center animate-fadeIn z-50">
          <div className="absolute -top-1 right-4 md:right-8 w-2 h-2 bg-slate-800 border-l border-t border-slate-700 rotate-45" />
          100% local · $0.00 cost
        </div>
      )}
    </button>
  );
};

function App() {
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<PhotoAnalysisV2 | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showSlides, setShowSlides] = useState(false);
  const [initialSlide, setInitialSlide] = useState(1);

  // v2: operational mode + live analysis progress
  const [mode, setMode] = useState<OperationalMode>('studio');
  const [analysisProgress, setAnalysisProgress] = useState<AnalysisProgress | null>(null);
  const [ollamaReady, setOllamaReady] = useState<boolean | null>(null); // null = checking

  // Lifted state for results tab to allow external control from header
  const [activeResultTab, setActiveResultTab] = useState<TabId>('overview');

  // Session History State (v2 — token counts only, $0 local inference)
  const [sessionHistory, setSessionHistory] = useState<SessionHistoryEntry[]>([]);

  // Lifted Mentor Chat State (v2 — no Gemini thinking field)
  const [mentorChatState, setMentorChatState] = useState<MentorChatStateV2>({ messages: [], isLoading: false });

  // Vault Mode: audit log panel visibility
  const [showAuditLog, setShowAuditLog] = useState(false);

  // Batch processing state
  const [batchMode, setBatchMode] = useState(false);
  const [batchItems, setBatchItems] = useState<WebBatchItem[]>([]);
  const [batchProcessing, setBatchProcessing] = useState(false);

  // Warm up Ollama on mount — eliminates ~40s cold-start penalty (Spike 1 finding).
  // checkOllamaHealth confirms the daemon is running, then warmUpModel fires a
  // minimal 1-token inference to preload the 9.6 GB model weights into RAM.
  useEffect(() => {
    checkOllamaHealth().then(({ running, modelAvailable }) => {
      setOllamaReady(running && modelAvailable);
      if (running && modelAvailable) {
        warmUpModel(); // fire-and-forget; loads model weights so first real analysis is fast
      }
    });
  }, []);

  // Sync mode into auditService egress guard
  const handleModeChange = useCallback((newMode: OperationalMode) => {
    setMode(newMode);
    setOperationalMode(newMode);
  }, []);

  const handleImageSelected = async (
    base64: string,
    mimeType: string,
    file?: File,
    imageEl?: HTMLImageElement,
  ) => {
    setCurrentImage(base64);
    setAppState(AppState.ANALYZING);
    setError(null);
    setAnalysisProgress(null);
    setActiveResultTab('overview');
    setMentorChatState({ messages: [], isLoading: false });

    try {
      const v2Result = await runAnalysisPipeline(
        base64,
        mimeType,
        imageEl,
        file,
        (progress) => setAnalysisProgress(progress),
      );

      setAnalysis(v2Result);

      // Session history (token counts only — $0 for local inference)
      if (v2Result.tokenUsage?.totalTokens) {
        setSessionHistory(prev => [
          ...prev,
          {
            id: prev.length + 1,
            timestamp: Date.now(),
            modelId: v2Result.model_id,
            promptTokens: v2Result.tokenUsage!.promptTokens ?? 0,
            completionTokens: v2Result.tokenUsage!.completionTokens ?? 0,
            totalTokens: v2Result.tokenUsage!.totalTokens!,
            latencyMs: 0,   // TODO: wire latency from analysisOrchestrator
          } satisfies SessionHistoryEntry,
        ]);
      }

      setAppState(AppState.RESULTS);
    } catch (err: any) {
      console.error('[App] Analysis failed:', err);
      const msg = (err.message || err.toString()).toLowerCase();
      if (msg.includes('ollama') || msg.includes('model not found') || msg.includes('econnrefused')) {
        setError('OLLAMA_ERROR');
      } else {
        setError('Failed to analyze image. ' + (err.message || ''));
      }
      setAppState(AppState.ERROR);
    } finally {
      setAnalysisProgress(null);
    }
  };

  const handleSampleClick = async (url: string) => {
    setAppState(AppState.ANALYZING);
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        handleImageSelected(base64, blob.type);
      };
      reader.readAsDataURL(blob);
    } catch (e) {
      console.error(e);
      setError("Failed to load sample image.");
      setAppState(AppState.IDLE);
    }
  };

  const handleReset = () => {
    setAppState(AppState.IDLE);
    setCurrentImage(null);
    setAnalysis(null);
    setError(null);
    setMentorChatState({ messages: [], isLoading: false });
    setBatchMode(false);
    setBatchItems([]);
    setBatchProcessing(false);
  };

  // Batch processing handlers
  const handleBatchSelected = useCallback(async (files: File[]) => {
    // Limit to 50 photos
    const limitedFiles = files.slice(0, 50);

    // Pre-process all files: read as base64 and create HTMLImageElement
    const itemsPromises = limitedFiles.map(async (file, index) => {
      return new Promise<WebBatchItem>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = reader.result as string;
          const img = new Image();
          img.onload = () => {
            resolve({
              id: `${Date.now()}-${index}`,
              file,
              base64,
              mimeType: file.type,
              imageEl: img,
              status: 'pending',
            });
          };
          img.onerror = () => {
            resolve({
              id: `${Date.now()}-${index}`,
              file,
              base64,
              mimeType: file.type,
              imageEl: null,
              status: 'pending',
            });
          };
          img.src = base64;
        };
        reader.readAsDataURL(file);
      });
    });

    const items = await Promise.all(itemsPromises);
    setBatchItems(items);
    setBatchProcessing(true);
    setAppState(AppState.ANALYZING);

    // Process sequentially
    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      // Mark as analyzing
      setBatchItems(prev => prev.map(it =>
        it.id === item.id ? { ...it, status: 'analyzing' as const } : it
      ));

      try {
        const v2Result = await runAnalysisPipeline(
          item.base64,
          item.mimeType,
          item.imageEl || undefined,
          item.file,
          (progress) => setAnalysisProgress(progress),
        );

        // Mark as completed with analysis
        setBatchItems(prev => prev.map(it =>
          it.id === item.id ? { ...it, status: 'completed' as const, analysis: v2Result } : it
        ));

        // Update session history
        if (v2Result.tokenUsage?.totalTokens) {
          setSessionHistory(prev => [
            ...prev,
            {
              id: prev.length + 1,
              timestamp: Date.now(),
              modelId: v2Result.model_id,
              promptTokens: v2Result.tokenUsage!.promptTokens ?? 0,
              completionTokens: v2Result.tokenUsage!.completionTokens ?? 0,
              totalTokens: v2Result.tokenUsage!.totalTokens!,
              latencyMs: 0,
            } satisfies SessionHistoryEntry,
          ]);
        }
      } catch (err: any) {
        console.error(`[Batch] Failed to analyze ${item.file.name}:`, err);
        setBatchItems(prev => prev.map(it =>
          it.id === item.id ? { ...it, status: 'failed' as const, error: err.message || 'Analysis failed' } : it
        ));
      }
    }

    setBatchProcessing(false);
    setAnalysisProgress(null);
    setAppState(AppState.RESULTS);
  }, []);

  const handleBatchReset = useCallback(() => {
    setBatchItems([]);
    setBatchProcessing(false);
    setBatchMode(false);
    setAppState(AppState.IDLE);
  }, []);

  const handleExportAuditLog = async () => {
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
      console.error('[App] Audit log export failed:', e);
    }
  };
  
  // Handler to start presentation from beginning
  const startPresentation = () => {
    setInitialSlide(1);
    setShowSlides(true);
  };

  if (showSlides) {
    return <PresentationSlides onExit={() => setShowSlides(false)} initialSlide={initialSlide} />;
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 font-sans selection:bg-brand-500/30">
      
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-xl sticky top-0 z-50 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 h-16 md:h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer group" onClick={handleReset}>
            <div className="bg-gradient-to-br from-brand-400 to-brand-600 p-2 md:p-2.5 rounded-xl shadow-lg shadow-brand-500/20 group-hover:shadow-brand-500/40 transition-shadow duration-300">
              <Camera className="w-6 h-6 md:w-7 md:h-7 text-white" />
            </div>
            <div className="flex flex-col justify-center">
              <div className="flex items-center gap-3">
                <span className="text-xl md:text-2xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-slate-300 tracking-tight">
                  Photography Coach
                </span>
                <div className="hidden sm:flex items-center gap-1.5 bg-gradient-to-r from-brand-500 to-emerald-500 px-3 py-1 rounded-full shadow-lg shadow-brand-500/20 border border-white/10">
                  <Cpu className="w-3 h-3 text-white" />
                  <span className="text-[11px] font-bold text-white tracking-wide uppercase">Gemma 4 · Local</span>
                </div>
                {/* Ollama status dot */}
                <div className={`hidden sm:flex items-center gap-1 text-xs font-medium ${ollamaReady === null ? 'text-slate-500' : ollamaReady ? 'text-emerald-400' : 'text-amber-400'}`}>
                  <Activity className="w-3 h-3" />
                  <span>{ollamaReady === null ? 'checking…' : ollamaReady ? 'Ollama ready' : 'Ollama offline'}</span>
                </div>
              </div>
              <span className="text-[11px] md:text-xs text-brand-400 font-semibold tracking-wide hidden sm:block uppercase opacity-90">
                {mode === 'vault' ? '🔒 Vault Mode · Network Isolated' : 'Studio Mode · Gemma 4 E4B · Offline AI'}
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-4 relative">
             {/* Economics Badge */}
             <SessionSavingsBadge
               sessionHistory={sessionHistory}
               onClick={() => {
                 if (appState === AppState.RESULTS) {
                   setActiveResultTab('stats');
                   window.scrollTo({ top: 0, behavior: 'smooth' });
                 }
               }}
             />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6 md:py-12">
        
        {appState === AppState.IDLE && (
          <div className="flex flex-col items-center justify-center min-h-[70vh] space-y-8 md:space-y-12 animate-fadeIn pb-20">
            
            {/* Hero Section */}
            <div className="text-center space-y-6 md:space-y-8 max-w-4xl mx-auto relative">
              {/* Background Glows */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] md:w-[500px] md:h-[500px] bg-brand-500/10 rounded-full blur-[100px] pointer-events-none"></div>
              
              <h1 className="text-3xl md:text-5xl lg:text-7xl font-extrabold text-white tracking-tight leading-tight relative z-10 drop-shadow-sm px-4">
                Professional Photography <br />
                Coaching, <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-emerald-400">Reimagined.</span>
              </h1>
              <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
                Powered by <span className="font-semibold text-slate-300">Gemma 4 E4B</span> running 100% locally — no API keys, no data leaves your machine.
              </p>

              {/* Feature Badges */}
              <div className="flex flex-wrap justify-center gap-3 md:gap-4 relative z-10 px-4">
                <div className="flex items-center gap-2 px-4 py-2 md:px-6 md:py-3 rounded-full bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50 shadow-xl backdrop-blur-md group hover:border-brand-500/30 transition-colors">
                  <Cpu className="w-4 h-4 md:w-5 md:h-5 text-brand-400 group-hover:scale-110 transition-transform" />
                  <span className="text-xs md:text-sm font-semibold text-slate-200">100% Local AI</span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 md:px-6 md:py-3 rounded-full bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50 shadow-xl backdrop-blur-md group hover:border-brand-500/30 transition-colors">
                  <Shield className="w-4 h-4 md:w-5 md:h-5 text-amber-400 group-hover:scale-110 transition-transform" />
                  <span className="text-xs md:text-sm font-semibold text-slate-200">Vault Mode</span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 md:px-6 md:py-3 rounded-full bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50 shadow-xl backdrop-blur-md group hover:border-brand-500/30 transition-colors">
                  <Target className="w-4 h-4 md:w-5 md:h-5 text-rose-400 group-hover:scale-110 transition-transform" />
                  <span className="text-xs md:text-sm font-semibold text-slate-200">Spatial Critique</span>
                </div>
              </div>
            </div>
            
            {/* Mode selector */}
            <ModeSelector mode={mode} onChange={handleModeChange} />

            {/* Batch mode toggle */}
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => setBatchMode(false)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  !batchMode
                    ? 'bg-brand-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
              >
                Single Photo
              </button>
              <button
                onClick={() => setBatchMode(true)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                  batchMode
                    ? 'bg-brand-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
              >
                <Layers className="w-4 h-4" />
                Batch Mode
              </button>
            </div>

            {/* Uploader */}
            <PhotoUploader
              onImageSelected={handleImageSelected}
              onBatchSelected={handleBatchSelected}
              isAnalyzing={false}
              batchMode={batchMode}
            />

            {/* Sample Photos Section */}
            <div className="w-full max-w-4xl pt-8">
              <div className="flex items-center gap-4 mb-6">
                <div className="h-px bg-slate-800 flex-grow"></div>
                <span className="text-sm font-semibold text-slate-500 uppercase tracking-widest">Or try a sample photo</span>
                <div className="h-px bg-slate-800 flex-grow"></div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <button 
                  onClick={() => handleSampleClick('https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=800&q=80')}
                  className="group relative h-40 md:h-48 rounded-2xl overflow-hidden border border-slate-700 shadow-lg hover:shadow-brand-500/20 transition-all duration-300 hover:scale-[1.02]"
                >
                  <img src="https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=800&q=80" alt="Landscape" className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/20 to-transparent opacity-80 group-hover:opacity-60 transition-opacity"></div>
                  <div className="absolute bottom-4 left-4 text-left">
                    <span className="text-xs font-bold text-brand-400 uppercase tracking-wider mb-1 block">Landscape</span>
                    <h4 className="font-bold text-white flex items-center gap-2">
                      Misty Valley <ArrowRight className="w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                    </h4>
                  </div>
                </button>

                <button 
                  onClick={() => handleSampleClick('https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&q=80')}
                  className="group relative h-40 md:h-48 rounded-2xl overflow-hidden border border-slate-700 shadow-lg hover:shadow-brand-500/20 transition-all duration-300 hover:scale-[1.02]"
                >
                  <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&q=80" alt="Portrait" className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                   <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/20 to-transparent opacity-80 group-hover:opacity-60 transition-opacity"></div>
                  <div className="absolute bottom-4 left-4 text-left">
                    <span className="text-xs font-bold text-purple-400 uppercase tracking-wider mb-1 block">Portrait</span>
                     <h4 className="font-bold text-white flex items-center gap-2">
                      Urban Light <ArrowRight className="w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                    </h4>
                  </div>
                </button>

                 <button 
                  onClick={() => handleSampleClick('https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=800&q=80')}
                  className="group relative h-40 md:h-48 rounded-2xl overflow-hidden border border-slate-700 shadow-lg hover:shadow-brand-500/20 transition-all duration-300 hover:scale-[1.02]"
                >
                  <img src="https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=800&q=80" alt="City" className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                   <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/20 to-transparent opacity-80 group-hover:opacity-60 transition-opacity"></div>
                  <div className="absolute bottom-4 left-4 text-left">
                    <span className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-1 block">Urban</span>
                     <h4 className="font-bold text-white flex items-center gap-2">
                      Night City <ArrowRight className="w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                    </h4>
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}

        {appState === AppState.ANALYZING && batchProcessing && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-8">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-white mb-4">Processing Batch</h2>
              <p className="text-slate-400 mb-8">
                {batchItems.filter(it => it.status === 'completed').length} of {batchItems.length} photos analyzed
              </p>
              <div className="w-full max-w-md mx-auto h-2 bg-slate-900 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-brand-500 to-emerald-500 transition-all duration-500"
                  style={{ width: `${(batchItems.filter(it => it.status === 'completed').length / batchItems.length) * 100}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {appState === AppState.ANALYZING && !batchProcessing && (
           <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-8 animate-pulse">
              <div className="w-full max-w-2xl mx-auto">
                 <PhotoUploader
                   onImageSelected={() => {}}
                   isAnalyzing={true}
                   analysisProgress={analysisProgress ?? undefined}
                 />
              </div>
           </div>
        )}

        {appState === AppState.RESULTS && batchItems.length > 0 && (
          <BatchResultsPanel
            items={batchItems}
            onReset={handleBatchReset}
          />
        )}

        {appState === AppState.RESULTS && batchItems.length === 0 && analysis && currentImage && (
          <AnalysisResults
            analysis={analysis}
            imageSrc={currentImage}
            mode={mode}
            onReset={handleReset}
            sessionHistory={sessionHistory}
            activeTab={activeResultTab}
            onTabChange={setActiveResultTab}
            mentorChatState={mentorChatState}
            setMentorChatState={setMentorChatState}
            onViewAuditLog={mode === 'vault' ? () => setShowAuditLog(true) : undefined}
            onExportLog={mode === 'vault' ? handleExportAuditLog : undefined}
          />
        )}

        {appState === AppState.ERROR && (
          <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-6">
            <div className="bg-slate-800/50 border border-slate-700 p-8 rounded-2xl text-center max-w-md shadow-2xl backdrop-blur-sm">
              {error === 'OLLAMA_ERROR' ? (
                <>
                  <div className="w-16 h-16 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Cpu className="w-8 h-8 text-amber-500" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">Ollama Not Running</h3>
                  <p className="text-slate-400 mb-4 text-sm leading-relaxed">
                    Gemma 4 runs locally via Ollama. Make sure Ollama is running and the model is pulled.
                  </p>
                  <div className="bg-slate-900/80 rounded-lg p-3 text-left font-mono text-xs text-emerald-400 mb-6 space-y-1">
                    <div>$ ollama serve</div>
                    <div>$ ollama pull gemma4:latest</div>
                  </div>
                  <button onClick={handleReset} className="px-8 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors font-medium">
                    Try Again
                  </button>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 bg-rose-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Target className="w-8 h-8 text-rose-500" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">Analysis Failed</h3>
                  <p className="text-slate-400 mb-6 text-sm">{error}</p>
                  <button onClick={handleReset} className="px-8 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors font-medium">
                    Try Again
                  </button>
                </>
              )}
            </div>
          </div>
        )}

      </main>

      {/* Vault Mode audit log panel (modal) */}
      {showAuditLog && <AuditLogPanel onClose={() => setShowAuditLog(false)} />}

      <footer className="border-t border-slate-800 mt-12 py-8 flex flex-col items-center gap-4 text-slate-600 text-sm">
        <p>&copy; {new Date().getFullYear()} Photography Coach v2. Powered by Gemma 4 E4B · Runs 100% locally via Ollama.</p>
        <div className="flex gap-4">
          <a 
            href="https://github.com/prasadt1/photography-coach-ai-gemini3" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-2 hover:text-slate-400 transition-colors"
          >
            <Github className="w-4 h-4" />
            <span>View Source on GitHub</span>
          </a>
          <button 
            onClick={startPresentation}
            className="flex items-center gap-2 hover:text-emerald-400 transition-colors"
          >
            <MonitorPlay className="w-4 h-4" />
            <span>Presentation Mode</span>
          </button>
        </div>
      </footer>
    </div>
  );
}

export default App;
