
import React, { useState, useEffect, useRef } from 'react';
import { PhotoAnalysisV2, MentorMessageV2, SessionHistoryEntry, OperationalMode } from '../types.v2';
import SpatialOverlay from './SpatialOverlay';
import EvidencePanel from './EvidencePanel';
import RefusalMessage from './RefusalMessage';
import VaultModeBanner from './VaultModeBanner';
import GeminiEnhancementPanel from './GeminiEnhancementPanel';
import { mentorChat } from '../services/ollamaService';
import { exportXMPSidecar } from '../services/xmpService';
import {
  ResponsiveContainer,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Tooltip as RechartsTooltip,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import {
  Camera, Zap, Layout, Eye, Star, ChevronRight, Aperture, Clock, Gauge, Target,
  ScanEye, Loader2, Download, Info, LayoutDashboard, Map,
  MessageCircle, Send, User, Bot, Brain, ChevronDown, ChevronUp,
  MousePointerClick, Cpu, Activity, Coins, Sparkles,
} from 'lucide-react';

export type TabId = 'overview' | 'details' | 'mentor' | 'enhance' | 'stats';

// ─── Mentor chat state (v2 — no Gemini thinking field) ─────────────────────────

export interface MentorChatStateV2 {
  messages: MentorMessageV2[];
  isLoading: boolean;
  error?: string;
}

// ─── Props ─────────────────────────────────────────────────────────────────────

interface AnalysisResultsProps {
  analysis: PhotoAnalysisV2;
  imageSrc: string;
  mode: OperationalMode;
  onReset: () => void;
  sessionHistory: SessionHistoryEntry[];
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  mentorChatState: MentorChatStateV2;
  setMentorChatState: React.Dispatch<React.SetStateAction<MentorChatStateV2>>;
  onViewAuditLog?: () => void;
  onExportLog?: () => void;
}

// ─── Sub-components ────────────────────────────────────────────────────────────

const ScoreCard: React.FC<{ label: string; score: number; icon: React.ReactNode }> = ({ label, score, icon }) => {
  const getColor = (s: number) => {
    if (s >= 8) return 'text-emerald-400';
    if (s >= 5) return 'text-amber-400';
    return 'text-rose-400';
  };
  return (
    <div className="bg-slate-800/50 p-3 md:p-4 rounded-xl border border-slate-700 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-slate-700 rounded-lg text-slate-300">{icon}</div>
        <span className="font-medium text-slate-200 text-sm md:text-base">{label}</span>
      </div>
      <div className={`text-lg md:text-xl font-bold ${getColor(score)}`}>{score.toFixed(1)}/10</div>
    </div>
  );
};


// ─── Mentor Chat Widget (v2 — uses ollamaService.mentorChat) ──────────────────

interface MentorChatWidgetProps {
  analysis: PhotoAnalysisV2;
  chatState: MentorChatStateV2;
  onStateChange: React.Dispatch<React.SetStateAction<MentorChatStateV2>>;
  isVault: boolean;
}

const MentorChatWidget: React.FC<MentorChatWidgetProps> = ({ analysis, chatState, onStateChange, isVault }) => {
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const userTurns = chatState.messages.filter(m => m.role === 'user').length;
  const isLimitReached = userTurns >= 8;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatState.messages]);

  const handleSend = async () => {
    if (!input.trim() || chatState.isLoading || isLimitReached) return;

    const userMsg: MentorMessageV2 = { role: 'user', content: input, timestamp: Date.now() };
    onStateChange(prev => ({ ...prev, messages: [...prev.messages, userMsg], isLoading: true, error: undefined }));
    setInput('');

    // Build history for context window (exclude the message we just appended)
    const historyForApi = chatState.messages.map(m => ({ role: m.role, content: m.content }));

    try {
      const reply = await mentorChat(userMsg.content, analysis, historyForApi);
      const assistantMsg: MentorMessageV2 = { role: 'assistant', content: reply, timestamp: Date.now() };
      onStateChange(prev => ({ ...prev, messages: [...prev.messages, assistantMsg], isLoading: false }));
    } catch (e: any) {
      console.error('[MentorChat]', e);
      onStateChange(prev => ({ ...prev, isLoading: false, error: 'Mentor unavailable — is Ollama running?' }));
    }
  };

  return (
    <div className="mb-8 rounded-2xl bg-slate-900 border border-slate-700 shadow-xl overflow-hidden animate-fadeIn">
      {/* Header */}
      <div className="p-4 bg-slate-800 border-b border-slate-700 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-lg text-white">
            <MessageCircle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-white font-bold text-sm md:text-base">Ask Your Photography Mentor</h3>
            <p className="text-xs text-slate-400">
              {isVault ? '🔒 Vault Mode · Gemma 4 local' : 'Powered by Gemma 4 · Local inference'}
            </p>
          </div>
        </div>
        <div className="text-xs font-mono text-slate-500">{userTurns}/8 turns</div>
      </div>

      {/* Chat Area */}
      <div ref={scrollRef} className="h-[380px] overflow-y-auto p-4 space-y-5 bg-slate-900/50">
        {chatState.messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-slate-500 space-y-2">
            <Bot className="w-10 h-10 opacity-20" />
            <p className="text-sm text-center">Ask about composition, settings, lighting, or creative ideas!</p>
          </div>
        )}

        {chatState.messages.map((msg, idx) => (
          <div key={idx} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} animate-fadeIn`}>
            <div className={`flex items-start gap-3 max-w-[88%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                msg.role === 'user' ? 'bg-blue-500/20 text-blue-400' : 'bg-emerald-500/20 text-emerald-400'
              }`}>
                {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>
              <div className={`p-3 rounded-2xl text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-blue-500/20 text-blue-100 rounded-tr-none border border-blue-500/20'
                  : 'bg-emerald-500/5 text-slate-200 rounded-tl-none border border-emerald-500/10'
              }`}>
                {msg.content}
              </div>
            </div>
          </div>
        ))}

        {chatState.isLoading && (
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
            <div className="p-3 rounded-2xl rounded-tl-none bg-emerald-500/5 border border-emerald-500/10 text-sm text-slate-400 italic">
              Gemma 4 is thinking locally…
            </div>
          </div>
        )}

        {chatState.error && (
          <div className="text-center p-2 text-xs text-rose-400 bg-rose-500/10 rounded-lg mx-auto w-fit">
            {chatState.error}
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-4 bg-slate-800/50 border-t border-slate-700">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder={isLimitReached ? 'Session limit reached.' : 'Ask about composition, lighting, technique…'}
            disabled={chatState.isLoading || isLimitReached}
            className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || chatState.isLoading || isLimitReached}
            className="p-2 bg-brand-600 text-white rounded-xl hover:bg-brand-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Main component ────────────────────────────────────────────────────────────

const AnalysisResults: React.FC<AnalysisResultsProps> = ({
  analysis,
  imageSrc,
  mode,
  onReset,
  sessionHistory,
  activeTab,
  onTabChange,
  mentorChatState,
  setMentorChatState,
  onViewAuditLog,
  onExportLog,
}) => {
  const [showOverlays, setShowOverlays] = useState(true); // on by default — pins are subtle enough not to clutter
  const [isRationaleExpanded, setIsRationaleExpanded] = useState(true);
  const [activeBoxIndex, setActiveBoxIndex] = useState<number | null>(null);

  const isVault = mode === 'vault';
  const hasBoundingBoxes = (analysis.boundingBoxes?.length ?? 0) > 0;

  // Pins auto-activate when the user first hovers a card (see card onMouseEnter).
  // No auto-show on tab switch — keeps the image clean until the user engages.

  const averageScore =
    (analysis.scores.composition +
      analysis.scores.lighting +
      analysis.scores.creativity +
      analysis.scores.technique +
      analysis.scores.subjectImpact) / 5;

  let skillLevel = 'Beginner';
  let badgeClass = 'bg-rose-500/20 text-rose-400 border-rose-500/30';
  if (averageScore >= 7.5) { skillLevel = 'Advanced'; badgeClass = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'; }
  else if (averageScore >= 5.5) { skillLevel = 'Intermediate'; badgeClass = 'bg-amber-500/20 text-amber-400 border-amber-500/30'; }

  const chartData = [
    { subject: 'Composition', A: analysis.scores.composition, fullMark: 10 },
    { subject: 'Lighting',    A: analysis.scores.lighting,    fullMark: 10 },
    { subject: 'Creativity',  A: analysis.scores.creativity,  fullMark: 10 },
    { subject: 'Technique',   A: analysis.scores.technique,   fullMark: 10 },
    { subject: 'Subject',     A: analysis.scores.subjectImpact, fullMark: 10 },
  ];

  const tabs: { id: TabId; label: string; icon: typeof LayoutDashboard; studioOnly?: boolean }[] = [
    { id: 'overview', label: 'Overview',          icon: LayoutDashboard },
    { id: 'details',  label: 'Detailed Analysis', icon: ScanEye },
    { id: 'mentor',   label: 'Mentor Chat',        icon: MessageCircle },
    { id: 'enhance',  label: '✨ Enhance',          icon: Sparkles, studioOnly: true },
    { id: 'stats',    label: 'Inference Stats',    icon: Cpu },
  ];

  const visibleTabs = tabs.filter(t => !t.studioOnly || !isVault);

  // Download helper for analysis JSON
  const handleDownloadJSON = () => {
    const blob = new Blob([JSON.stringify(analysis, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gemma4-analysis-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Export XMP sidecar for Lightroom
  const handleExportXMP = () => {
    // Extract original filename from imageSrc if possible
    let filename = 'photo.jpg';
    try {
      const urlObj = new URL(imageSrc, window.location.href);
      const pathname = urlObj.pathname;
      const parts = pathname.split('/');
      const lastPart = parts[parts.length - 1];
      if (lastPart && lastPart.includes('.')) {
        filename = lastPart;
      }
    } catch {
      // Use timestamp-based filename as fallback
      filename = `photo-${Date.now()}.jpg`;
    }

    const { filename: xmpFilename, content } = exportXMPSidecar(analysis, filename);
    const blob = new Blob([content], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = xmpFilename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="w-full max-w-7xl mx-auto animate-fadeIn">

      {/* Vault Mode Banner */}
      {isVault && (
        <VaultModeBanner
          className="mb-6"
          onViewAuditLog={onViewAuditLog}
          onExportLog={onExportLog}
        />
      )}

      {/* Refusal overlay */}
      {analysis.is_refusal && (
        <RefusalMessage
          reason={analysis.refusal_reason}
          category={analysis.refusal_category}
          className="mb-6"
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

        {/* ── Left column ─────────────────────────────────────────────────────── */}
        <div className="lg:col-span-5 space-y-6">
          <div className="lg:sticky lg:top-24 space-y-6">

            {/* Image */}
            <div className="relative group rounded-2xl bg-black shadow-2xl border border-slate-700 flex justify-center items-center min-h-[250px] md:min-h-[300px]">
              <div className="relative inline-block w-auto h-auto max-w-full m-2 md:m-4">
                <img
                  src={imageSrc}
                  alt="Analyzed"
                  className="block w-auto h-auto max-w-full max-h-[50vh] md:max-h-[60vh] rounded-lg shadow-lg"
                />
                <SpatialOverlay
                  boundingBoxes={analysis.boundingBoxes || []}
                  show={showOverlays}
                  activeIndex={activeBoxIndex}
                  onHover={setActiveBoxIndex}
                />
              </div>

              {hasBoundingBoxes && (
                <div className="absolute top-3 right-3 z-50">
                  <button
                    onClick={() => setShowOverlays(s => !s)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold backdrop-blur-md border transition-all duration-200 shadow-lg hover:scale-105 ${
                      showOverlays
                        ? 'bg-brand-500 text-white border-brand-400'
                        : 'bg-slate-900/80 text-slate-300 border-slate-600'
                    }`}
                  >
                    <ScanEye className="w-3.5 h-3.5" />
                    {showOverlays ? 'Hide Pins' : 'Show Pins'}
                  </button>
                </div>
              )}
            </div>

            {/* Settings estimate */}
            <div className="grid grid-cols-4 gap-2">
              {[
                { icon: Target,   label: 'Focal',   value: analysis.settingsEstimate.focalLength },
                { icon: Aperture, label: 'Ap.',      value: analysis.settingsEstimate.aperture },
                { icon: Clock,    label: 'Shutter',  value: analysis.settingsEstimate.shutterSpeed },
                { icon: Gauge,    label: 'ISO',      value: analysis.settingsEstimate.iso },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="bg-slate-800 p-2 md:p-3 rounded-xl border border-slate-700 flex flex-col items-center text-center">
                  <Icon className="w-4 h-4 text-brand-400 mb-1" />
                  <span className="text-[9px] md:text-[10px] text-slate-400 uppercase tracking-wider">{label}</span>
                  <span className="text-xs font-semibold text-slate-200">{value}</span>
                </div>
              ))}
            </div>

            {/* Provenance chip */}
            <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono">
              <Cpu className="w-3 h-3" />
              <span>{analysis.model_id}</span>
              {analysis.quantization && <span className="text-slate-600">· {analysis.quantization}</span>}
              {isVault && <span className="ml-auto text-amber-500">vault · local only</span>}
            </div>

            <button
              onClick={onReset}
              className="w-full py-3 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl font-medium transition-colors border border-slate-600 min-h-[44px]"
            >
              Analyze Another Photo
            </button>
          </div>
        </div>

        {/* ── Right column ─────────────────────────────────────────────────────── */}
        <div className="lg:col-span-7 pb-20">

          {/* Tab nav */}
          <div className="flex p-1 bg-slate-800/50 rounded-xl border border-slate-700 mb-6 sticky top-24 z-40 backdrop-blur-md overflow-x-auto no-scrollbar">
            {visibleTabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex items-center gap-2 px-3 md:px-4 py-2.5 rounded-lg text-xs md:text-sm font-medium transition-all whitespace-nowrap flex-1 justify-center min-w-[80px] ${
                  activeTab === tab.id
                    ? 'bg-brand-600 text-white shadow-lg shadow-brand-500/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>

          <div className="space-y-6 animate-fadeIn">

            {/* ── OVERVIEW TAB ──────────────────────────────────────────────────── */}
            {activeTab === 'overview' && (
              <>
                {/* Coach verdict */}
                <div className="bg-slate-800/40 rounded-3xl p-4 md:p-8 border border-slate-700 backdrop-blur-sm">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                    <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
                      <Star className="text-brand-500 fill-brand-500 w-6 h-6" />
                      Coach's Verdict
                    </h2>
                    <div className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border ${badgeClass} self-start md:self-auto`}>
                      {skillLevel} Photographer
                    </div>
                  </div>

                  <p className="text-base md:text-lg text-slate-300 leading-relaxed italic border-l-4 border-brand-500 pl-4 mb-8">
                    "{analysis.critique.overall}"
                  </p>

                  {/* Next skills */}
                  {analysis.learningPath.length > 0 && (
                    <div className="bg-slate-900/50 rounded-xl p-5 border-l-4 border-emerald-500/50 border-y border-r border-slate-700/50">
                      <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wide mb-3 flex items-center gap-2">
                        <span className="text-lg">📈</span> Next Skills to Master
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {analysis.learningPath.map((skill, i) => (
                          <div key={i} className="flex items-center gap-2 text-sm text-slate-300 bg-slate-800/60 px-3 py-2.5 rounded-lg border border-slate-700/50">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
                            {skill}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Radar + score cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-slate-800/40 rounded-3xl p-4 md:p-6 border border-slate-700 flex items-center justify-center min-h-[250px]">
                    <div className="w-full h-[230px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart cx="50%" cy="50%" outerRadius="65%" data={chartData}>
                          <PolarGrid stroke="#475569" />
                          <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                          <PolarRadiusAxis angle={30} domain={[0, 10]} tick={false} axisLine={false} />
                          <Radar name="Score" dataKey="A" stroke="#22c55e" strokeWidth={3} fill="#22c55e" fillOpacity={0.3} />
                          <RechartsTooltip
                            contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }}
                            itemStyle={{ color: '#4ade80' }}
                          />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <ScoreCard label="Composition"   score={analysis.scores.composition}   icon={<Layout className="w-5 h-5" />} />
                    <ScoreCard label="Lighting"      score={analysis.scores.lighting}       icon={<Zap className="w-5 h-5" />} />
                    <ScoreCard label="Subject Impact" score={analysis.scores.subjectImpact} icon={<Eye className="w-5 h-5" />} />
                    <ScoreCard label="Technique"     score={analysis.scores.technique}      icon={<Camera className="w-5 h-5" />} />
                  </div>
                </div>

                {/* Strengths / improvements */}
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="bg-emerald-900/10 border border-emerald-900/50 rounded-2xl p-4 md:p-6">
                    <h3 className="text-emerald-400 font-bold mb-4 flex items-center gap-2">
                      <span className="bg-emerald-500/10 p-1 rounded">👍</span> What Works
                    </h3>
                    <ul className="space-y-3">
                      {analysis.strengths.map((s, i) => (
                        <li key={i} className="flex items-start gap-3 text-slate-300 text-sm">
                          <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />{s}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="bg-indigo-900/10 border border-indigo-900/50 rounded-2xl p-4 md:p-6">
                    <h3 className="text-indigo-400 font-bold mb-4 flex items-center gap-2">
                      <span className="bg-indigo-500/10 p-1 rounded">🚀</span> How to Improve
                    </h3>
                    <ul className="space-y-3">
                      {analysis.improvements.map((imp, i) => (
                        <li key={i} className="flex items-start gap-3 text-slate-300 text-sm">
                          <ChevronRight className="w-4 h-4 text-indigo-500 flex-shrink-0 mt-0.5" />{imp}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Evidence panel (when available) */}
                {analysis.evidence && analysis.evidence.length > 0 && (
                  <EvidencePanel evidence={analysis.evidence} />
                )}
              </>
            )}

            {/* ── DETAILED ANALYSIS TAB ────────────────────────────────────────── */}
            {activeTab === 'details' && (
              <>
                {/* Rationale / reasoning */}
                <div className="mb-8 rounded-2xl p-[1px] bg-gradient-to-r from-emerald-500 to-purple-600 shadow-xl animate-fadeIn">
                  <div className="bg-slate-950/50 rounded-2xl overflow-hidden backdrop-blur-md">
                    <button
                      onClick={() => setIsRationaleExpanded(!isRationaleExpanded)}
                      className="w-full flex items-center justify-between p-4 md:p-5 hover:bg-slate-900/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-br from-emerald-500 to-purple-600 rounded-lg text-white shadow-lg">
                          <Brain className="w-5 h-5" />
                        </div>
                        <div className="text-left">
                          <h3 className="text-white font-bold text-sm md:text-base">Gemma 4 Reasoning Process</h3>
                          <div className="flex items-center gap-2">
                            <p className="text-xs text-slate-400 font-mono mt-0.5">Local structured rationale</p>
                            <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1.5 rounded font-mono">
                              gemma-4-e4b
                            </span>
                          </div>
                        </div>
                      </div>
                      {isRationaleExpanded ? <ChevronUp className="text-slate-400" /> : <ChevronDown className="text-slate-400" />}
                    </button>

                    {isRationaleExpanded && (
                      <div className="p-5 md:p-6 border-t border-slate-800 bg-slate-950/80 font-mono text-sm space-y-6 animate-fadeIn">
                        <div>
                          <h4 className="flex items-center gap-2 text-emerald-400 font-bold mb-3 uppercase text-xs tracking-wider">
                            <Eye className="w-4 h-4" /> Key Observations
                          </h4>
                          <ul className="space-y-2 pl-2 border-l border-emerald-500/20">
                            {analysis.rationale.observations.map((obs, i) => (
                              <li key={i} className="text-slate-300 pl-4 relative before:content-['>'] before:absolute before:left-0 before:text-emerald-500/50">{obs}</li>
                            ))}
                          </ul>
                        </div>

                        <div>
                          <h4 className="flex items-center gap-2 text-purple-400 font-bold mb-3 uppercase text-xs tracking-wider">
                            <Brain className="w-4 h-4" /> Reasoning Steps
                          </h4>
                          <ol className="space-y-3">
                            {analysis.rationale.reasoningSteps.map((step, i) => (
                              <li key={i} className="flex gap-3 text-slate-300">
                                <span className="text-purple-500/70 font-bold">{i + 1}.</span>
                                <span>{step}</span>
                              </li>
                            ))}
                          </ol>
                        </div>

                        <div>
                          <h4 className="flex items-center gap-2 text-amber-400 font-bold mb-3 uppercase text-xs tracking-wider">
                            <Target className="w-4 h-4" /> Priority Fixes
                          </h4>
                          <div className="space-y-2">
                            {analysis.rationale.priorityFixes.map((fix, i) => (
                              <div key={i} className="flex items-center gap-3 p-2 rounded bg-slate-900 border border-slate-800">
                                <div className="w-4 h-4 rounded border border-amber-500/50 flex items-center justify-center">
                                  <div className="w-2 h-2 bg-amber-500 rounded-sm" />
                                </div>
                                <span className="text-slate-300">{fix}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Technical deep dive */}
                <div className="space-y-6">
                  <h3 className="text-xl font-bold text-slate-100 pb-2">Technical Deep Dive</h3>

                  {[
                    { label: 'Composition Analysis',  text: analysis.critique.composition, color: 'text-brand-400', bg: 'bg-brand-500/10', icon: <Layout className="w-5 h-5" /> },
                    { label: 'Lighting Analysis',     text: analysis.critique.lighting,    color: 'text-amber-400', bg: 'bg-amber-500/10', icon: <Zap className="w-5 h-5" /> },
                    { label: 'Technical Execution',   text: analysis.critique.technique,   color: 'text-blue-400',  bg: 'bg-blue-500/10',  icon: <Camera className="w-5 h-5" /> },
                  ].map(({ label, text, color, bg, icon }) => (
                    <div key={label} className="bg-slate-800/40 border border-slate-700 rounded-2xl p-4 md:p-6">
                      <div className={`flex items-center gap-3 font-medium mb-3 ${color}`}>
                        <div className={`p-2 rounded-lg ${bg}`}>{icon}</div>
                        <h4 className="text-lg text-white">{label}</h4>
                      </div>
                      <p className="text-slate-300 leading-relaxed text-sm md:text-base">{text}</p>
                    </div>
                  ))}

                  {/* Spatial Issues — numbered cards linked to image pins */}
                  {hasBoundingBoxes && (
                    <div className="pt-6">
                      <div className="flex items-center mb-4">
                        <h3 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                          <Map className="w-5 h-5 text-slate-400" />
                          Spatial Issues
                          <span className="text-sm font-normal text-slate-500 ml-1">
                            ({analysis.boundingBoxes!.length})
                          </span>
                        </h3>
                      </div>

                      <div className="flex items-start gap-2 text-xs text-slate-500 bg-slate-800/40 p-3 rounded-lg border border-slate-700/50 mb-4">
                        <MousePointerClick className="w-3.5 h-3.5 text-brand-400 mt-0.5 flex-shrink-0" />
                        <span>Hover a card to highlight its numbered pin on the image, or hover a pin to highlight its card.</span>
                      </div>

                      <div className="space-y-3">
                        {analysis.boundingBoxes!.map((box, i) => {
                          const isActive = activeBoxIndex === i;
                          const borderColor = box.severity === 'critical'
                            ? 'border-rose-500/40'
                            : box.severity === 'moderate'
                              ? 'border-amber-400/40'
                              : 'border-sky-400/40';
                          const activeBg = box.severity === 'critical'
                            ? 'bg-rose-500/10'
                            : box.severity === 'moderate'
                              ? 'bg-amber-400/10'
                              : 'bg-sky-400/10';
                          const pinColor = box.severity === 'critical'
                            ? 'bg-rose-500 text-white'
                            : box.severity === 'moderate'
                              ? 'bg-amber-400 text-slate-900'
                              : 'bg-sky-400 text-white';
                          const tagColor = box.severity === 'critical'
                            ? 'text-rose-400 bg-rose-500/15'
                            : box.severity === 'moderate'
                              ? 'text-amber-400 bg-amber-400/15'
                              : 'text-sky-400 bg-sky-400/15';

                          return (
                            <div
                              key={i}
                              onMouseEnter={() => setActiveBoxIndex(i)}
                              onMouseLeave={() => setActiveBoxIndex(null)}
                              className={`flex gap-3 p-3 rounded-xl border cursor-default transition-all duration-200 ${borderColor} ${
                                isActive ? activeBg : 'bg-slate-800/30 hover:bg-slate-800/60'
                              }`}
                            >
                              {/* Number badge */}
                              <div className={`w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-[11px] font-extrabold mt-0.5 ${pinColor}`}>
                                {i + 1}
                              </div>
                              {/* Content */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${tagColor}`}>
                                    {box.type}
                                  </span>
                                  <span className="text-[10px] text-slate-500 uppercase tracking-wider">{box.severity}</span>
                                </div>
                                <p className="text-sm font-medium text-slate-200 leading-snug mb-1">{box.description}</p>
                                <p className="text-xs text-slate-400 flex items-start gap-1">
                                  <span className="text-brand-400 font-bold flex-shrink-0">→</span>
                                  {box.suggestion}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* ── MENTOR CHAT TAB ───────────────────────────────────────────────── */}
            {activeTab === 'mentor' && (
              <div className="animate-fadeIn">
                <MentorChatWidget
                  analysis={analysis}
                  chatState={mentorChatState}
                  onStateChange={setMentorChatState}
                  isVault={isVault}
                />
              </div>
            )}

            {/* ── AI ENHANCEMENT TAB (Studio Mode only) ────────────────────────── */}
            {activeTab === 'enhance' && !isVault && (
              <GeminiEnhancementPanel
                analysis={analysis}
                imageSrc={imageSrc}
                imageMimeType={imageSrc.startsWith('data:image/png') ? 'image/png' : 'image/jpeg'}
              />
            )}

            {/* ── INFERENCE STATS TAB ───────────────────────────────────────────── */}
            {activeTab === 'stats' && (
              <div className="space-y-6">

                {/* Info card */}
                <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl flex items-start gap-3">
                  <Info className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="text-blue-400 font-bold text-sm">Local Inference Mode</h4>
                    <p className="text-slate-300 text-xs mt-1">
                      All inference runs on-device via Ollama. Zero cloud cost, zero egress.
                      Stats below reflect real hardware performance on your machine.
                    </p>
                  </div>
                </div>

                {/* Current analysis token stats */}
                {analysis.tokenUsage && (
                  <div className="bg-slate-900/50 rounded-2xl border border-slate-700 p-4 md:p-6">
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                      <Activity className="w-5 h-5 text-emerald-400" />
                      This Analysis
                    </h3>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { label: 'Prompt Tokens',     value: analysis.tokenUsage.promptTokens ?? '—', color: 'text-blue-400' },
                        { label: 'Completion Tokens', value: analysis.tokenUsage.completionTokens ?? '—', color: 'text-emerald-400' },
                        { label: 'Total Tokens',      value: analysis.tokenUsage.totalTokens ?? '—', color: 'text-white' },
                      ].map(({ label, value, color }) => (
                        <div key={label} className="bg-slate-800/50 rounded-xl p-3 text-center border border-slate-700">
                          <div className={`text-xl font-bold font-mono ${color}`}>{value?.toLocaleString()}</div>
                          <div className="text-[10px] text-slate-500 uppercase tracking-wider mt-1">{label}</div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 text-center text-xs text-slate-500 font-mono">
                      Cost: $0.00 (local inference · Gemma 4 Q4_K_M)
                    </div>
                  </div>
                )}

                {/* Session history chart */}
                {sessionHistory.length > 1 && (
                  <div className="bg-slate-900/50 rounded-2xl border border-slate-700 p-4 md:p-6">
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                      <Coins className="w-5 h-5 text-emerald-400" />
                      Session Token History
                    </h3>
                    <div className="h-[200px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={sessionHistory} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                          <defs>
                            <linearGradient id="tokenGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                          <XAxis dataKey="id" stroke="#94a3b8" tickFormatter={v => `#${v}`} />
                          <YAxis stroke="#94a3b8" tickFormatter={v => `${v}`} width={50} />
                          <RechartsTooltip
                            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f1f5f9' }}
                            formatter={(value) => [`${Number(value).toLocaleString()} tokens`, '']}
                            labelFormatter={v => `Analysis #${v}`}
                          />
                          <Area
                            type="monotone"
                            dataKey="totalTokens"
                            stroke="#10b981"
                            strokeWidth={2}
                            fillOpacity={1}
                            fill="url(#tokenGrad)"
                            name="Total Tokens"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {/* Export buttons */}
                <div className="flex flex-col sm:flex-row justify-center gap-3">
                  <button
                    onClick={handleExportXMP}
                    className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-brand-600 to-brand-700 hover:from-brand-700 hover:to-brand-800 text-white rounded-lg transition-all font-medium min-h-[44px] shadow-lg shadow-brand-500/20"
                  >
                    <Download className="w-4 h-4" />
                    Export XMP for Lightroom
                  </button>
                  <button
                    onClick={handleDownloadJSON}
                    className="flex items-center gap-2 px-6 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors font-medium min-h-[44px]"
                  >
                    <Download className="w-4 h-4" />
                    Export Analysis JSON
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalysisResults;
