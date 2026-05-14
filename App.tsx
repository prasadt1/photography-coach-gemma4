
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Cpu, Target, Coins, Github, Shield,
  Image as ImageIcon, Zap, Scale, Volume2, VolumeX,
  ImagePlus, ArrowRight, X,
} from 'lucide-react';
import HomePage from './components/HomePage';
import DemoBanner from './components/DemoBanner';
import ModeSelector from './components/ModeSelector';
import PhotoUploader from './components/PhotoUploader';
import ComparePanel from './components/ComparePanel';
import SellMode from './components/SellMode';
import AnalysisResults, { TabId, MentorChatStateV2 } from './components/AnalysisResults';
import AuditLogPanel from './components/AuditLogPanel';
import KeyboardShortcutsOverlay from './components/KeyboardShortcutsOverlay';
import { PresentationSlides } from './components/PresentationSlides';
import {
  runAnalysisPipeline,
  checkOllamaHealth,
  warmUpModel,
  AnalysisProgress,
  AnalysisTier,
} from './services/analysisOrchestrator';
import { SupportedLanguage, LANGUAGE_LABELS } from './services/promptService';
import { setOperationalMode, exportAuditLog } from './services/auditService';
import { speak } from './services/voiceCoach';
import { AppState } from './types';
import { PhotoAnalysisV2, OperationalMode, SessionHistoryEntry } from './types.v2';

const GITHUB_REPO = 'https://github.com/prasadt1/photography-coach-gemma4';

const isElectron =
  typeof window !== 'undefined' && Boolean((window as unknown as { electronAPI?: { isElectron?: boolean } }).electronAPI?.isElectron);

// Floating badge — session token count
const SessionSavingsBadge: React.FC<{
  sessionHistory: SessionHistoryEntry[];
  onClick: () => void;
}> = ({ sessionHistory, onClick }) => {
  if (sessionHistory.length === 0) return null;
  const totalTokens = sessionHistory.reduce((acc, curr) => acc + curr.totalTokens, 0);
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-2 px-2 md:px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 transition-all cursor-pointer group relative"
      title="Click to view inference stats"
    >
      <Coins className="w-4 h-4" />
      <span className="text-xs font-bold tracking-wide font-mono">
        <span className="hidden md:inline">Session: </span>
        {sessionHistory.length} photo{sessionHistory.length === 1 ? '' : 's'} · {totalTokens.toLocaleString()} tokens
      </span>
    </button>
  );
};

type UploadTab = 'single' | 'compare';

function App() {
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [uploadTab, setUploadTab] = useState<UploadTab>('single');
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [analysis, setAnalysis] = useState<PhotoAnalysisV2 | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showSlides, setShowSlides] = useState(false);

  const [mode, setMode] = useState<OperationalMode>('studio');
  const [showHome, setShowHome] = useState(true); // Start on HomePage
  const [analysisProgress, setAnalysisProgress] = useState<AnalysisProgress | null>(null);
  const [ollamaReady, setOllamaReady] = useState<boolean | null>(null);

  const [activeResultTab, setActiveResultTab] = useState<TabId>('overview');
  const [sessionHistory, setSessionHistory] = useState<SessionHistoryEntry[]>([]);
  const [mentorChatState, setMentorChatState] = useState<MentorChatStateV2>({ messages: [], isLoading: false });
  const [showAuditLog, setShowAuditLog] = useState(false);

  const [tier] = useState<AnalysisTier>('tier1-ollama');
  const [language, setLanguage] = useState<SupportedLanguage>('en');
  const [deepMode, setDeepMode] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [quickGlanceMode, setQuickGlanceMode] = useState(false);

  // Global voice toggle for accessibility across all modes
  // Default ON for new users (accessibility-first), respects saved preference for returning users
  const [voiceEnabled, setVoiceEnabled] = useState(() => {
    const saved = localStorage.getItem('lens-voice-enabled');
    // If no saved preference, default to ON (accessibility-first)
    if (saved === null) return true;
    return saved === 'true';
  });

  // Image to pass from Studio to Sell mode ("Optimize for Marketplace" flow)
  const [pendingSellImage, setPendingSellImage] = useState<string | null>(null);

  // Sample preview state for seamless sample selection
  const [samplePreview, setSamplePreview] = useState<{ url: string; label: string; category: string } | null>(null);

  // Compare mode dual-column state
  const [compareSlotA, setCompareSlotA] = useState<string | null>(null);
  const [compareSlotB, setCompareSlotB] = useState<string | null>(null);

  // Gamification stats (persisted to localStorage)
  const [userStats, setUserStats] = useState(() => {
    const saved = localStorage.getItem('lens-user-stats');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return { streak: 0, xp: 0, photosAnalyzed: 0, lastActiveDate: null };
      }
    }
    return { streak: 0, xp: 0, photosAnalyzed: 0, lastActiveDate: null };
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    checkOllamaHealth().then(({ running, modelAvailable }) => {
      setOllamaReady(running && modelAvailable);
      if (running && modelAvailable) {
        warmUpModel();
      }
    });
  }, []);

  // Persist stats to localStorage
  useEffect(() => {
    localStorage.setItem('lens-user-stats', JSON.stringify(userStats));
  }, [userStats]);

  // Persist voice toggle
  useEffect(() => {
    localStorage.setItem('lens-voice-enabled', String(voiceEnabled));
  }, [voiceEnabled]);

  // Handler to send image from Studio to Sell mode ("Optimize for Marketplace")
  const handleSendToSell = useCallback((imageBase64: string) => {
    setPendingSellImage(imageBase64);
    setMode('sell');
    setShowHome(false);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore when typing in inputs
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      // Ignore when modal is open
      if (showShortcuts) {
        if (e.key === 'Escape') setShowShortcuts(false);
        return;
      }

      switch (e.key) {
        case '1':
        case '2':
        case '3':
        case '4':
          if (appState === AppState.RESULTS) {
            const tabs: TabId[] = ['overview', 'details', 'mentor', 'enhance'];
            setActiveResultTab(tabs[parseInt(e.key) - 1]);
          }
          break;
        case ' ':
          if (appState === AppState.RESULTS) {
            e.preventDefault();
            handleReset();
          }
          break;
        case 'q':
        case 'Q':
          if (appState === AppState.RESULTS) {
            setQuickGlanceMode(prev => !prev);
          }
          break;
        case '?':
          setShowShortcuts(true);
          break;
        case 'Escape':
          if (appState === AppState.RESULTS) {
            handleGoHome();
          }
          break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [appState, showShortcuts]);

  // Award XP when analysis completes and update streak
  const awardXP = useCallback((amount: number) => {
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();

    setUserStats((prev: typeof userStats) => {
      const isNewDay = prev.lastActiveDate !== today;
      const wasYesterday = prev.lastActiveDate === yesterday;

      let newStreak: number;
      if (!isNewDay) {
        // Same day - keep current streak (at least 1 if they've analyzed anything)
        newStreak = Math.max(1, prev.streak);
      } else if (wasYesterday) {
        // Consecutive day - increment streak
        newStreak = prev.streak + 1;
      } else {
        // First time or gap in days - start at 1
        newStreak = 1;
      }

      console.log('[Stats] XP awarded:', amount, 'Streak:', newStreak, 'Photos:', prev.photosAnalyzed + 1);

      return {
        ...prev,
        xp: prev.xp + amount,
        photosAnalyzed: prev.photosAnalyzed + 1,
        streak: newStreak,
        lastActiveDate: today,
      };
    });
  }, []);

  const handleModeChange = useCallback((newMode: OperationalMode) => {
    setMode(newMode);
    setOperationalMode(newMode);
    setShowHome(false); // Leave home page when mode is selected
  }, []);

  const handleGoHome = useCallback(() => {
    setShowHome(true);
    setAppState(AppState.IDLE);
    setCurrentImage(null);
    setCurrentFile(null);
    setAnalysis(null);
    setError(null);
  }, []);

  const handleReset = () => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setAppState(AppState.IDLE);
    setUploadTab('single');
    setCurrentImage(null);
    setCurrentFile(null);
    setAnalysis(null);
    setError(null);
    setMentorChatState({ messages: [], isLoading: false });
    setAnalysisProgress(null);
    setSamplePreview(null);
    setCompareSlotA(null);
    setCompareSlotB(null);
  };

  const handleImageSelected = async (
    base64: string,
    mimeType: string,
    file?: File,
    imageEl?: HTMLImageElement,
  ) => {
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setUploadTab('single');
    setCurrentImage(base64);
    setCurrentFile(file ?? null);
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
        controller.signal,
        tier,
        language,
        deepMode,
        false,
        false,
        false,
      );

      setAnalysis(v2Result);

      if (v2Result.tokenUsage?.totalTokens) {
        const thumbAsync = async () => {
          try {
            const img = new Image();
            await new Promise<void>((resolve, reject) => {
              img.onload = () => resolve();
              img.onerror = () => reject();
              img.src = base64.startsWith('data:') ? base64 : `data:${mimeType};base64,${base64}`;
            });
            const canvas = document.createElement('canvas');
            const max = 100;
            const scale = Math.min(max / img.width, max / img.height, 1);
            canvas.width = Math.round(img.width * scale);
            canvas.height = Math.round(img.height * scale);
            canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
            return canvas.toDataURL('image/jpeg', 0.7);
          } catch {
            return undefined;
          }
        };
        const thumbnail = await thumbAsync();
        setSessionHistory((prev) => [
          ...prev,
          {
            id: prev.length + 1,
            timestamp: Date.now(),
            modelId: v2Result.model_id,
            promptTokens: v2Result.tokenUsage!.promptTokens ?? 0,
            completionTokens: v2Result.tokenUsage!.completionTokens ?? 0,
            totalTokens: v2Result.tokenUsage!.totalTokens!,
            latencyMs: 0,
            thumbnail,
            filename: file?.name || 'photo.jpg',
          } satisfies SessionHistoryEntry,
        ]);
      }

      // Award XP for completing analysis
      awardXP(deepMode ? 50 : 25);

      // Voice feedback if enabled (Studio Mode)
      if (voiceEnabled && v2Result.scores && v2Result.critique) {
        const avgScore = (
          v2Result.scores.composition +
          v2Result.scores.lighting +
          v2Result.scores.technique +
          v2Result.scores.subjectImpact
        ) / 4;
        const scoreText = avgScore.toFixed(1);
        const verdictFirst = v2Result.critique.overall?.split('.')[0] || 'Analysis complete';
        speak(`Overall score: ${scoreText} out of 10. ${verdictFirst}.`);
      }

      setAppState(AppState.RESULTS);
    } catch (err: unknown) {
      if ((err as Error)?.name === 'AbortError') {
        handleReset();
        return;
      }
      console.error('[App] Analysis failed:', err);
      const msg = ((err as Error).message || String(err)).toLowerCase();
      if (msg.includes('ollama') || msg.includes('model not found') || msg.includes('econnrefused')) {
        setError('OLLAMA_ERROR');
      } else {
        setError('Failed to analyze image. ' + ((err as Error).message || ''));
      }
      setAppState(AppState.ERROR);
    } finally {
      abortControllerRef.current = null;
      setAnalysisProgress(null);
    }
  };

  // Set sample preview (don't analyze yet)
  const handleSampleSelect = (url: string, label: string, category: string) => {
    setSamplePreview({ url, label, category });
  };

  // Clear sample preview
  const handleClearSamplePreview = () => {
    setSamplePreview(null);
  };

  // Analyze the selected sample
  const handleAnalyzeSample = async () => {
    if (!samplePreview) return;
    setAppState(AppState.ANALYZING);
    try {
      const response = await fetch(samplePreview.url);
      const blob = await response.blob();
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setSamplePreview(null);
        handleImageSelected(base64, blob.type);
      };
      reader.readAsDataURL(blob);
    } catch (e) {
      console.error(e);
      setError('Failed to load sample image.');
      setAppState(AppState.IDLE);
    }
  };


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

  if (showSlides) {
    return <PresentationSlides onExit={() => setShowSlides(false)} initialSlide={1} />;
  }

  // Show HomePage when in home state
  if (showHome) {
    return (
      <HomePage
        onSelectMode={handleModeChange}
        ollamaReady={ollamaReady}
        stats={{
          streak: userStats.streak,
          xp: userStats.xp,
          photosAnalyzed: userStats.photosAnalyzed,
        }}
        voiceEnabled={voiceEnabled}
        onVoiceToggle={() => setVoiceEnabled(!voiceEnabled)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 font-sans selection:bg-brand-500/30 relative overflow-x-hidden">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-[420px] h-[420px] bg-brand-500/6 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[380px] h-[380px] bg-violet-500/6 rounded-full blur-[100px]" />
      </div>

      {/* Demo banner for deployed environments - explains Ollama requirement to judges */}
      <DemoBanner />

      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-xl sticky top-0 z-50 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 h-16 md:h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer group" onClick={handleGoHome}>
            <div className="relative w-10 h-10 md:w-12 md:h-12 rounded-xl overflow-hidden shadow-lg shadow-brand-500/20 group-hover:shadow-brand-500/40 transition-shadow duration-300">
              <img src="/lens-logo.png" alt="L.E.N.S." className="w-full h-full object-cover" />
            </div>
            <div className="flex flex-col justify-center gap-0.5">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex flex-col" title="Local Edge Native Studio">
                  <span className="text-xl md:text-2xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-slate-300 tracking-[0.2em] leading-tight">
                    L.E.N.S.
                  </span>
                  <span className="text-[9px] md:text-[10px] text-slate-500 font-medium tracking-wider uppercase -mt-0.5">
                    Local Edge Native Studio
                  </span>
                </div>
                <div className={`hidden sm:flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-semibold transition-colors ${
                  ollamaReady === false
                    ? 'border-red-500/40 bg-red-500/10 text-red-400'
                    : mode === 'vault'
                      ? 'border-amber-500/40 bg-amber-500/10 text-amber-300'
                      : 'border-slate-600 bg-slate-800/60 text-slate-300'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                    ollamaReady === null ? 'bg-slate-400' :
                    ollamaReady ? (mode === 'vault' ? 'bg-amber-400' : 'bg-emerald-400') :
                    'bg-red-400 animate-pulse'
                  }`} />
                  <span>
                    {ollamaReady === false ? 'AI offline — start Ollama' :
                     mode === 'vault' ? '🔒 Vault · Client-safe · Audit trail' :
                     'Local · Private'}
                  </span>
                </div>
              </div>
              <span className="text-[11px] md:text-xs text-slate-400 font-semibold tracking-wide border-l-2 border-brand-500/50 pl-2">
                AI Photography Coach
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Global Voice Toggle - Accessibility */}
            <button
              type="button"
              onClick={() => setVoiceEnabled(!voiceEnabled)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                voiceEnabled
                  ? 'bg-purple-600/20 border-purple-500/50 text-purple-300'
                  : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-slate-200'
              }`}
              title={voiceEnabled ? 'Voice feedback ON - Click to disable' : 'Enable voice feedback for accessibility'}
            >
              {voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              <span className="hidden md:inline">{voiceEnabled ? 'Voice ON' : 'Voice'}</span>
            </button>

            {/* Mode selector - Studio + Artisan (+ Vault on desktop) */}
            <div className="hidden sm:flex items-center rounded-lg border border-slate-700 overflow-hidden text-xs font-semibold">
              <button
                type="button"
                onClick={() => handleModeChange('studio')}
                className={`flex items-center gap-1.5 px-3 py-1.5 transition-colors ${mode === 'studio' ? 'bg-brand-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-slate-300'}`}
                title="Full photo critique with scores and suggestions"
              >
                <Zap className="w-3 h-3" /> Studio
              </button>
              <button
                type="button"
                onClick={() => handleModeChange('sell')}
                className={`flex items-center gap-1.5 px-3 py-1.5 transition-colors ${mode === 'sell' ? 'bg-amber-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-slate-300'}`}
                title="Voice-guided product photography for artisans"
              >
                💎 Artisan
              </button>
              {isElectron && (
                <button
                  type="button"
                  onClick={() => handleModeChange('vault')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 transition-colors ${mode === 'vault' ? 'bg-amber-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-slate-300'}`}
                  title="Client-safe mode with audit trail (desktop only)"
                >
                  <Shield className="w-3 h-3" /> Vault
                </button>
              )}
            </div>
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

      {/* Artisan Studio — Voice-guided product photo coaching */}
      {mode === 'sell' && (
        <SellMode
          onBack={handleGoHome}
          ollamaReady={ollamaReady}
          voiceEnabled={voiceEnabled}
          preloadedImage={pendingSellImage}
          onImageProcessed={() => setPendingSellImage(null)}
        />
      )}

      {/* Studio/Vault Mode — standard photo analysis flow */}
      {(mode === 'studio' || mode === 'vault') && (
      <main className="max-w-7xl mx-auto px-4 py-6 md:py-12 relative z-10">
        {appState === AppState.IDLE && (
          <div className="flex flex-col items-center animate-fadeIn pt-4 pb-16">
            <div className="w-full max-w-4xl flex flex-col items-center gap-6 mb-8">
              <div className="flex flex-wrap items-center justify-center gap-2 p-1.5 rounded-full bg-slate-800/80 border border-slate-700/80">
                <button
                  type="button"
                  onClick={() => setUploadTab('single')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                    uploadTab === 'single'
                      ? 'bg-brand-600 text-white shadow-lg shadow-brand-900/50'
                      : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                  }`}
                >
                  <ImageIcon className="w-4 h-4" />
                  Single Photo
                </button>
                <button
                  type="button"
                  onClick={() => setUploadTab('compare')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                    uploadTab === 'compare'
                      ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/50'
                      : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                  }`}
                >
                  <Scale className="w-4 h-4" />
                  Compare
                </button>
              </div>

              {uploadTab === 'single' && (
                <div className="flex items-center justify-center gap-3 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setDeepMode(!deepMode)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                      deepMode
                        ? 'bg-brand-600/20 border-brand-500/50 text-brand-300'
                        : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span>🧠</span>
                    Deep Critique
                    {deepMode && <span className="w-1.5 h-1.5 rounded-full bg-brand-400" />}
                  </button>
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/60 border border-slate-700 text-xs">
                    <span>🌐</span>
                    <select
                      value={language}
                      onChange={(e) => setLanguage(e.target.value as SupportedLanguage)}
                      className="bg-transparent text-slate-300 text-xs font-medium focus:outline-none cursor-pointer"
                      aria-label="AI response language"
                    >
                      {(Object.entries(LANGUAGE_LABELS) as [SupportedLanguage, string][]).map(([code, label]) => (
                        <option key={code} value={code} className="bg-slate-900">{label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>

            {uploadTab === 'single' && (
              <>
                <ModeSelector mode={mode} onChange={handleModeChange} />

                {/* Dropzone with sample preview */}
                {samplePreview ? (
                  <div className="w-full max-w-4xl mx-auto">
                    <div className="relative rounded-[2rem] border-2 border-brand-500/50 bg-slate-800/50 p-6 shadow-2xl shadow-brand-500/10">
                      {/* Preview image */}
                      <div className="relative w-full h-64 md:h-80 rounded-2xl overflow-hidden mb-4">
                        <img
                          src={samplePreview.url}
                          alt={samplePreview.label}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent" />
                        <div className="absolute bottom-4 left-4">
                          <span className="text-xs font-bold text-brand-400 uppercase tracking-wider">{samplePreview.category}</span>
                          <p className="text-lg font-bold text-white">{samplePreview.label}</p>
                        </div>
                        {/* Clear button */}
                        <button
                          type="button"
                          onClick={handleClearSamplePreview}
                          className="absolute top-3 right-3 p-2 bg-slate-900/80 hover:bg-red-600 rounded-full text-slate-300 hover:text-white transition-colors"
                          title="Remove selection"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      {/* Action button */}
                      <button
                        type="button"
                        onClick={handleAnalyzeSample}
                        className="w-full flex items-center justify-center gap-3 px-8 py-4 bg-gradient-to-r from-brand-600 to-emerald-600 hover:from-brand-500 hover:to-emerald-500 text-white rounded-xl text-lg font-bold transition-all shadow-lg shadow-brand-500/30 hover:shadow-brand-500/50 hover:scale-[1.02]"
                      >
                        <Zap className="w-5 h-5" />
                        Start Analysis
                        <ArrowRight className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <PhotoUploader onImageSelected={handleImageSelected} isAnalyzing={false} />
                )}

                <div className="w-full max-w-4xl mt-10">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="h-px bg-gradient-to-r from-transparent via-slate-700 to-transparent flex-grow" />
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest whitespace-nowrap">Or try a sample</span>
                    <div className="h-px bg-gradient-to-r from-transparent via-slate-700 to-transparent flex-grow" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <button
                      type="button"
                      onClick={() => handleSampleSelect('https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=800&q=80', 'Misty Valley', 'Landscape')}
                      className={`group relative h-32 md:h-40 rounded-2xl overflow-hidden border shadow-xl transition-all duration-300 hover:scale-[1.02] ${
                        samplePreview?.label === 'Misty Valley'
                          ? 'border-brand-500 ring-2 ring-brand-500/30'
                          : 'border-slate-700/50 hover:border-brand-500/50'
                      }`}
                    >
                      <img src="https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=800&q=80" alt="" className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/20 to-transparent" />
                      <div className="absolute bottom-3 left-3 text-left">
                        <span className="text-[10px] font-bold text-brand-400 uppercase tracking-wider block">Landscape</span>
                        <span className="text-sm font-semibold text-white">Misty Valley</span>
                      </div>
                      {samplePreview?.label === 'Misty Valley' && (
                        <div className="absolute top-2 right-2 w-6 h-6 bg-brand-500 rounded-full flex items-center justify-center">
                          <span className="text-white text-xs">✓</span>
                        </div>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSampleSelect('https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&q=80', 'Urban Light', 'Portrait')}
                      className={`group relative h-32 md:h-40 rounded-2xl overflow-hidden border shadow-xl transition-all duration-300 hover:scale-[1.02] ${
                        samplePreview?.label === 'Urban Light'
                          ? 'border-purple-500 ring-2 ring-purple-500/30'
                          : 'border-slate-700/50 hover:border-purple-500/50'
                      }`}
                    >
                      <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&q=80" alt="" className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/20 to-transparent" />
                      <div className="absolute bottom-3 left-3 text-left">
                        <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider block">Portrait</span>
                        <span className="text-sm font-semibold text-white">Urban Light</span>
                      </div>
                      {samplePreview?.label === 'Urban Light' && (
                        <div className="absolute top-2 right-2 w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center">
                          <span className="text-white text-xs">✓</span>
                        </div>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSampleSelect('https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=800&q=80', 'Night City', 'Urban')}
                      className={`group relative h-32 md:h-40 rounded-2xl overflow-hidden border shadow-xl transition-all duration-300 hover:scale-[1.02] ${
                        samplePreview?.label === 'Night City'
                          ? 'border-blue-500 ring-2 ring-blue-500/30'
                          : 'border-slate-700/50 hover:border-blue-500/50'
                      }`}
                    >
                      <img src="https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=800&q=80" alt="" className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/20 to-transparent" />
                      <div className="absolute bottom-3 left-3 text-left">
                        <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider block">Urban</span>
                        <span className="text-sm font-semibold text-white">Night City</span>
                      </div>
                      {samplePreview?.label === 'Night City' && (
                        <div className="absolute top-2 right-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                          <span className="text-white text-xs">✓</span>
                        </div>
                      )}
                    </button>
                  </div>
                </div>
              </>
            )}

            {uploadTab === 'compare' && (
              <div className="w-full max-w-5xl mx-auto">
                {/* Header */}
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold text-white mb-2">Compare Two Photos</h2>
                  <p className="text-sm text-slate-400">Upload two photos to compare. Gemma 4 will pick the winner.</p>
                </div>

                {/* 50/50 Split Layout */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  {/* Photo A */}
                  <div className={`relative rounded-2xl border-2 border-dashed transition-all min-h-[280px] ${
                    compareSlotA
                      ? 'border-brand-500/50 bg-slate-800/50'
                      : 'border-slate-700/50 bg-slate-800/30 hover:border-brand-500/30 hover:bg-slate-800/40'
                  }`}>
                    {compareSlotA ? (
                      <div className="relative w-full h-full min-h-[280px]">
                        <img src={compareSlotA} alt="Photo A" className="w-full h-full object-cover rounded-xl" />
                        <div className="absolute top-3 left-3 px-3 py-1.5 bg-brand-600 text-white rounded-full text-xs font-bold">
                          Photo A
                        </div>
                        <button
                          type="button"
                          onClick={() => setCompareSlotA(null)}
                          className="absolute top-3 right-3 p-2 bg-slate-900/80 hover:bg-red-600 rounded-full text-slate-300 hover:text-white transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center h-full min-h-[280px] cursor-pointer p-6">
                        <div className="w-16 h-16 rounded-2xl bg-brand-500/10 border border-brand-500/30 flex items-center justify-center mb-4">
                          <ImagePlus className="w-8 h-8 text-brand-400" />
                        </div>
                        <span className="text-lg font-bold text-white mb-1">Photo A</span>
                        <span className="text-sm text-slate-400">Click or drop image</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onload = () => setCompareSlotA(reader.result as string);
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </label>
                    )}
                  </div>

                  {/* Photo B */}
                  <div className={`relative rounded-2xl border-2 border-dashed transition-all min-h-[280px] ${
                    compareSlotB
                      ? 'border-emerald-500/50 bg-slate-800/50'
                      : 'border-slate-700/50 bg-slate-800/30 hover:border-emerald-500/30 hover:bg-slate-800/40'
                  }`}>
                    {compareSlotB ? (
                      <div className="relative w-full h-full min-h-[280px]">
                        <img src={compareSlotB} alt="Photo B" className="w-full h-full object-cover rounded-xl" />
                        <div className="absolute top-3 left-3 px-3 py-1.5 bg-emerald-600 text-white rounded-full text-xs font-bold">
                          Photo B
                        </div>
                        <button
                          type="button"
                          onClick={() => setCompareSlotB(null)}
                          className="absolute top-3 right-3 p-2 bg-slate-900/80 hover:bg-red-600 rounded-full text-slate-300 hover:text-white transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center h-full min-h-[280px] cursor-pointer p-6">
                        <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mb-4">
                          <ImagePlus className="w-8 h-8 text-emerald-400" />
                        </div>
                        <span className="text-lg font-bold text-white mb-1">Photo B</span>
                        <span className="text-sm text-slate-400">Click or drop image</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onload = () => setCompareSlotB(reader.result as string);
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </label>
                    )}
                  </div>
                </div>

                {/* VS Divider - shown between cards on mobile */}
                <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-slate-800 border border-slate-700 items-center justify-center z-10">
                  <span className="text-slate-400 font-bold">VS</span>
                </div>

                {/* Compare Button or ComparePanel */}
                {compareSlotA && compareSlotB ? (
                  <ComparePanel
                    onSendToSell={handleSendToSell}
                    onClose={() => {
                      setCompareSlotA(null);
                      setCompareSlotB(null);
                    }}
                  />
                ) : (
                  <div className="text-center py-6">
                    <p className="text-slate-500 text-sm">
                      {!compareSlotA && !compareSlotB
                        ? 'Upload two photos to compare them'
                        : compareSlotA
                        ? 'Now upload Photo B to compare'
                        : 'Now upload Photo A to compare'}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {appState === AppState.ANALYZING && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-8">
            <div className="w-full max-w-2xl mx-auto">
              <PhotoUploader
                onImageSelected={() => {}}
                isAnalyzing
                analysisProgress={analysisProgress ?? undefined}
              />
            </div>
          </div>
        )}

        {appState === AppState.RESULTS && analysis && currentImage && (
          <AnalysisResults
            analysis={analysis}
            imageSrc={currentImage}
            imageFile={currentFile}
            mode={mode}
            onReset={handleReset}
            sessionHistory={sessionHistory}
            activeTab={activeResultTab}
            onTabChange={setActiveResultTab}
            mentorChatState={mentorChatState}
            setMentorChatState={setMentorChatState}
            language={language}
            onViewAuditLog={mode === 'vault' ? () => setShowAuditLog(true) : undefined}
            onExportLog={mode === 'vault' ? handleExportAuditLog : undefined}
            quickGlanceMode={quickGlanceMode}
            onQuickGlanceToggle={() => setQuickGlanceMode(prev => !prev)}
            onShowShortcuts={() => setShowShortcuts(true)}
            onSendToSell={handleSendToSell}
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
                    Gemma 4 runs locally via Ollama. Start Ollama and pull the model.
                  </p>
                  <div className="bg-slate-900/80 rounded-lg p-3 text-left font-mono text-xs text-emerald-400 mb-6 space-y-1">
                    <div>$ ollama serve</div>
                    <div>$ ollama pull gemma4:latest</div>
                  </div>
                  <button type="button" onClick={handleReset} className="px-8 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors font-medium">
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
                  <button type="button" onClick={handleReset} className="px-8 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors font-medium">
                    Try Again
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </main>
      )}

      {showAuditLog && <AuditLogPanel onClose={() => setShowAuditLog(false)} />}
      {showShortcuts && <KeyboardShortcutsOverlay onClose={() => setShowShortcuts(false)} />}

      <footer className="border-t border-slate-800 mt-12 py-8 pb-24 flex flex-col items-center gap-4 text-slate-600 text-sm relative z-10">
        <p>&copy; {new Date().getFullYear()} LENS. Local AI · Zero cloud · Zero cost.</p>
        <p className="text-xs text-slate-700 text-center max-w-xl">
          Powered by{' '}
          <a href="https://ai.google.dev/gemma" target="_blank" rel="noopener noreferrer" className="underline hover:text-slate-500">Gemma 4</a>
          {' '}·{' '}
          <a href="https://ollama.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-slate-500">Ollama</a>
          {' '}· Built for the{' '}
          <a href="https://www.kaggle.com/competitions/gemma-4-good-hackathon" target="_blank" rel="noopener noreferrer" className="underline hover:text-slate-500">Gemma 4 Good hackathon</a>
        </p>
        <div className="flex flex-wrap gap-4 justify-center">
          <a href={GITHUB_REPO} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-slate-400 transition-colors">
            <Github className="w-4 h-4" />
            <span>View Source on GitHub</span>
          </a>
        </div>
      </footer>
    </div>
  );
}

export default App;
