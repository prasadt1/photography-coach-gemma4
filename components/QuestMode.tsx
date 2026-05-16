/**
 * QuestMode.tsx — Daily photography challenges with PASS/FAIL
 *
 * Gamified learning: each day presents a new challenge.
 * AI judges whether the photo meets the criteria.
 * Encourages deliberate practice of specific skills.
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Camera, ChevronRight, ChevronLeft, Trophy, Target, Lightbulb,
  RotateCcw, Loader2, CheckCircle2, XCircle, Sparkles, Lock,
  Grid3X3, Route, Sunrise, FlipHorizontal2, Square, Maximize2, Heart,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { QUEST_CHALLENGES } from '../services/promptService';

// Icon mapping for each challenge type
const CHALLENGE_ICONS: Record<string, React.ReactNode> = {
  'rule-of-thirds': <Grid3X3 className="w-4 h-4" />,
  'leading-lines': <Route className="w-4 h-4" />,
  'golden-hour': <Sunrise className="w-4 h-4" />,
  'symmetry': <FlipHorizontal2 className="w-4 h-4" />,
  'negative-space': <Square className="w-4 h-4" />,
  'framing': <Maximize2 className="w-4 h-4" />,
  'emotion': <Heart className="w-4 h-4" />,
};
import { analyzeForQuestMode } from '../services/analysisOrchestrator';
import { parseQuestResponse, speak } from '../services/voiceCoach';

interface QuestModeProps {
  onBack: () => void;
  ollamaReady: boolean | null;
  voiceEnabled?: boolean;
}

// Get today's challenge based on day of year (rotates through challenges)
function getTodaysChallengeIndex(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  const dayOfYear = Math.floor(diff / oneDay);
  return dayOfYear % QUEST_CHALLENGES.length;
}

interface QuestResult {
  verdict: 'PASS' | 'FAIL' | null;
  reasoning: string;
  tip: string;
  imageBase64: string;
}

const QuestMode: React.FC<QuestModeProps> = ({ onBack, ollamaReady, voiceEnabled = false }) => {
  const [challengeIndex, setChallengeIndex] = useState(getTodaysChallengeIndex);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<QuestResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [streak, setStreak] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const challenge = QUEST_CHALLENGES[challengeIndex];

  // Load streak from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('quest-streak');
    if (saved) {
      const { count, lastDate } = JSON.parse(saved);
      const today = new Date().toDateString();
      // Reset streak if more than 1 day has passed
      if (lastDate === today || lastDate === new Date(Date.now() - 86400000).toDateString()) {
        setStreak(count);
      }
    }
  }, []);

  const handleCapture = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setIsAnalyzing(true);
    setResult(null);

    try {
      // Convert to base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      // Run analysis with quest prompt
      const response = await analyzeForQuestMode(base64, file.type, challenge);
      const parsed = parseQuestResponse(response);

      setResult({
        verdict: parsed.verdict,
        reasoning: parsed.reasoning,
        tip: parsed.tip,
        imageBase64: base64,
      });

      // Update streak on PASS and celebrate!
      if (parsed.verdict === 'PASS') {
        const today = new Date().toDateString();
        const newStreak = streak + 1;
        setStreak(newStreak);
        localStorage.setItem('quest-streak', JSON.stringify({ count: newStreak, lastDate: today }));

        // 🎉 Confetti celebration!
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#10b981', '#34d399', '#6ee7b7', '#fbbf24', '#f59e0b'],
        });

        // Second burst for extra celebration
        setTimeout(() => {
          confetti({
            particleCount: 50,
            angle: 60,
            spread: 55,
            origin: { x: 0 },
            colors: ['#10b981', '#34d399', '#6ee7b7'],
          });
          confetti({
            particleCount: 50,
            angle: 120,
            spread: 55,
            origin: { x: 1 },
            colors: ['#10b981', '#34d399', '#6ee7b7'],
          });
        }, 250);
      }

      // Voice feedback if enabled
      if (voiceEnabled && parsed.verdict) {
        const message = parsed.verdict === 'PASS'
          ? `Congratulations! You passed the ${challenge.name} challenge! ${parsed.tip || ''}`
          : `Not quite. ${parsed.reasoning || ''} ${parsed.tip ? `Tip: ${parsed.tip}` : ''}`;
        speak(message);
      }
    } catch (err: any) {
      console.error('[QuestMode] Analysis failed:', err);
      const errorMsg = err.message?.includes('ollama') || err.message?.includes('ECONNREFUSED')
        ? 'Ollama is not running. Please start Ollama and try again.'
        : 'Failed to judge photo. Please try again.';
      setError(errorMsg);
    } finally {
      setIsAnalyzing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [challenge, streak, voiceEnabled]);

  const handleNextChallenge = () => {
    setChallengeIndex((prev) => (prev + 1) % QUEST_CHALLENGES.length);
    setResult(null);
    setError(null);
  };

  const handlePrevChallenge = () => {
    setChallengeIndex((prev) => (prev - 1 + QUEST_CHALLENGES.length) % QUEST_CHALLENGES.length);
    setResult(null);
    setError(null);
  };

  const handleRetry = () => {
    setResult(null);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-emerald-950/30 text-slate-200 p-4 md:p-8">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
        aria-label="Take or select a photo"
      />

      {/* Header */}
      <header className="flex items-center justify-between mb-6 max-w-4xl mx-auto">
        <button
          onClick={onBack}
          className="px-4 py-2 rounded-xl text-sm font-semibold bg-slate-800 hover:bg-slate-700 transition-all"
          aria-label="Go back to mode selection"
        >
          ← Back
        </button>

        {/* Streak Badge */}
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/30">
          <Trophy className="w-5 h-5 text-amber-400" />
          <span className="text-sm font-bold text-amber-300">{streak} day streak</span>
        </div>
      </header>

      <div className="max-w-4xl mx-auto" role="region" aria-label="Quest challenges">
        {/* Challenge Card */}
        <div className="relative bg-slate-800/60 backdrop-blur-sm rounded-3xl border border-slate-700/50 p-6 md:p-8 mb-6 overflow-hidden">
          {/* Background decoration */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Challenge navigation with segmented progress bar */}
          <div className="flex items-center justify-between mb-4 relative z-10">
            <button
              onClick={handlePrevChallenge}
              className="p-2 rounded-lg bg-slate-700/50 hover:bg-slate-700 transition-colors"
              aria-label="Previous challenge"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <div className="flex flex-col items-center gap-2">
              <span className="text-xs text-emerald-400 font-semibold uppercase tracking-wider">
                Challenge {challengeIndex + 1} of {QUEST_CHALLENGES.length}
              </span>
              {/* Segmented progress bar */}
              <div className="flex items-center gap-1">
                {QUEST_CHALLENGES.map((_, i) => (
                  <div
                    key={i}
                    className={`h-2 w-6 rounded-full transition-all duration-300 ${
                      i < challengeIndex
                        ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50'
                        : i === challengeIndex
                        ? 'bg-emerald-400 ring-2 ring-emerald-400/30 ring-offset-1 ring-offset-slate-800'
                        : 'bg-slate-700 border border-slate-600'
                    }`}
                    title={QUEST_CHALLENGES[i].name}
                  />
                ))}
              </div>
            </div>

            <button
              onClick={handleNextChallenge}
              className="p-2 rounded-lg bg-slate-700/50 hover:bg-slate-700 transition-colors"
              aria-label="Next challenge"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Challenge details */}
          <div className="text-center relative z-10">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 mb-4">
              <Target className="w-8 h-8 text-emerald-400" />
            </div>

            <h1 className="text-2xl md:text-3xl font-bold text-white mb-3">
              {challenge.name}
            </h1>

            <p className="text-slate-300 text-lg mb-4 max-w-xl mx-auto">
              {challenge.criteria}
            </p>

            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-700/50 text-sm text-slate-400">
              <Lightbulb className="w-4 h-4 text-amber-400" />
              <span>Hint: {challenge.hint}</span>
            </div>
          </div>
        </div>

        {/* Status / Result Area */}
        {ollamaReady === false && (
          <div className="bg-red-900/30 border border-red-500/30 rounded-2xl p-6 text-center mb-6">
            <p className="text-red-300">Ollama is offline. Start Ollama to use Quest Mode.</p>
          </div>
        )}

        {error && (
          <div className="bg-red-900/30 border border-red-500/30 rounded-2xl p-6 text-center mb-6">
            <p className="text-red-300">{error}</p>
            <button
              onClick={handleRetry}
              className="mt-4 px-6 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm font-semibold transition-colors"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Result display */}
        {result && (
          <div className={`rounded-3xl border-2 p-6 md:p-8 mb-6 ${
            result.verdict === 'PASS'
              ? 'bg-emerald-900/20 border-emerald-500/50'
              : 'bg-rose-900/20 border-rose-500/50'
          }`}>
            <div className="flex flex-col md:flex-row gap-6">
              {/* Photo thumbnail */}
              <div className="w-full md:w-48 h-48 rounded-2xl overflow-hidden border border-slate-700 shrink-0">
                <img
                  src={result.imageBase64}
                  alt="Submitted photo"
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Verdict and feedback */}
              <div className="flex-1">
                {/* Verdict badge */}
                <div className={`inline-flex items-center gap-3 px-6 py-3 rounded-2xl mb-4 ${
                  result.verdict === 'PASS'
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : 'bg-rose-500/20 text-rose-300'
                }`}>
                  {result.verdict === 'PASS' ? (
                    <CheckCircle2 className="w-8 h-8" />
                  ) : (
                    <XCircle className="w-8 h-8" />
                  )}
                  <span className="text-2xl font-bold">{result.verdict || 'UNCLEAR'}</span>
                </div>

                {/* Reasoning */}
                {result.reasoning && (
                  <div className="mb-4">
                    <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">
                      Reasoning
                    </h3>
                    <p className="text-slate-200">{result.reasoning}</p>
                  </div>
                )}

                {/* Tip */}
                {result.tip && (
                  <div className="flex items-start gap-3 p-4 rounded-xl bg-slate-800/50 border border-slate-700">
                    <Sparkles className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <h3 className="text-sm font-semibold text-amber-300 mb-1">Pro Tip</h3>
                      <p className="text-slate-300 text-sm">{result.tip}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-4 mt-6 pt-6 border-t border-slate-700/50">
              <button
                onClick={handleRetry}
                className="flex items-center gap-2 px-6 py-3 bg-slate-700 hover:bg-slate-600 rounded-xl text-sm font-semibold transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                Try Again
              </button>
              <button
                onClick={handleNextChallenge}
                className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-sm font-semibold transition-colors"
              >
                Next Challenge
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Upload area (show when no result) */}
        {!result && !isAnalyzing && (
          <button
            onClick={handleCapture}
            disabled={ollamaReady === false}
            className={`w-full h-64 md:h-80 rounded-3xl border-2 border-dashed transition-all duration-300
              flex flex-col items-center justify-center gap-4 group
              ${ollamaReady === false
                ? 'opacity-40 cursor-not-allowed border-slate-700 bg-slate-900/50'
                : 'border-slate-600 hover:border-emerald-500/50 bg-slate-800/30 hover:bg-slate-800/50'
              }`}
          >
            <div className={`w-20 h-20 rounded-2xl border flex items-center justify-center transition-transform relative
              ${ollamaReady === false
                ? 'bg-slate-800/50 border-slate-700'
                : 'bg-emerald-500/20 border-emerald-500/30 group-hover:scale-110'
              }`}>
              <Camera className={`w-10 h-10 ${ollamaReady === false ? 'text-slate-600' : 'text-emerald-400'}`} />
              {/* Padlock overlay when offline */}
              {ollamaReady === false && (
                <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center">
                  <Lock className="w-3 h-3 text-red-400" />
                </div>
              )}
            </div>
            <div className="text-center">
              {ollamaReady === false ? (
                <>
                  <p className="text-xl font-bold text-slate-500 mb-1">Offline Mode</p>
                  <p className="text-slate-600">Start Ollama to unlock challenges</p>
                </>
              ) : (
                <>
                  <p className="text-xl font-bold text-white mb-1">Take the Challenge</p>
                  <p className="text-slate-400">Upload a photo that meets the criteria</p>
                </>
              )}
            </div>
          </button>
        )}

        {/* Analyzing state */}
        {isAnalyzing && (
          <div className="w-full h-64 md:h-80 rounded-3xl border-2 border-emerald-500/30
            bg-slate-800/50 flex flex-col items-center justify-center gap-4">
            <Loader2 className="w-12 h-12 text-emerald-400 animate-spin" />
            <div className="text-center">
              <p className="text-xl font-bold text-white mb-1">Judging Your Photo...</p>
              <p className="text-slate-400">Gemma 4 is evaluating against the criteria</p>
            </div>
          </div>
        )}

        {/* Challenge list preview */}
        <div className="mt-8">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">
            All Challenges
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {QUEST_CHALLENGES.map((c, i) => {
              const isToday = i === getTodaysChallengeIndex();
              const isActive = i === challengeIndex;
              return (
                <button
                  key={c.id}
                  onClick={() => {
                    setChallengeIndex(i);
                    setResult(null);
                    setError(null);
                  }}
                  className={`p-4 rounded-xl text-left transition-all ${
                    isActive
                      ? 'bg-emerald-600/20 border-2 border-emerald-500/50'
                      : 'bg-slate-800/50 border border-slate-700 hover:border-slate-600'
                  } ${isToday && !isActive ? 'shadow-[0_0_15px_-3px_rgba(16,185,129,0.4)] animate-pulse-subtle' : ''}`}
                  style={isToday && !isActive ? {
                    animation: 'pulse-glow 2s ease-in-out infinite',
                  } : undefined}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {/* Challenge icon */}
                    <span className={`${isActive ? 'text-emerald-400' : 'text-slate-500'}`}>
                      {CHALLENGE_ICONS[c.id] || <Target className="w-4 h-4" />}
                    </span>
                    <span className={`text-sm font-semibold ${
                      isActive ? 'text-emerald-300' : 'text-slate-300'
                    }`}>
                      {c.name}
                    </span>
                  </div>
                  {isToday && (
                    <span className="inline-flex items-center gap-1 text-[10px] text-amber-400 font-semibold mt-1 px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                      <Sparkles className="w-2.5 h-2.5" />
                      TODAY
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Pulse animation keyframes */}
        <style>{`
          @keyframes pulse-glow {
            0%, 100% {
              box-shadow: 0 0 15px -3px rgba(16, 185, 129, 0.3);
            }
            50% {
              box-shadow: 0 0 25px -3px rgba(16, 185, 129, 0.5);
            }
          }
        `}</style>
      </div>

      {/* Footer */}
      <footer className="text-center mt-12 text-sm text-slate-600 max-w-4xl mx-auto">
        <p>Complete daily challenges to build your photography skills. All judging happens locally.</p>
      </footer>
    </div>
  );
};

export default QuestMode;
