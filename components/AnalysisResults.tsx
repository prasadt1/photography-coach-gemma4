
import React, { useState, useEffect, useRef } from 'react';
import { PhotoAnalysisV2, MentorMessageV2, SessionHistoryEntry, OperationalMode } from '../types.v2';
import SpatialOverlay from './SpatialOverlay';
import EvidencePanel from './EvidencePanel';
import RefusalMessage from './RefusalMessage';
import VaultModeBanner from './VaultModeBanner';
import GeminiEnhancementPanel from './GeminiEnhancementPanel';
import SessionPhotoStrip from './SessionPhotoStrip';
import { mentorChat } from '../services/ollamaService';
import { exportXMPSidecar } from '../services/xmpService';
import { speak, cancelSpeech, isTTSAvailable, isSTTAvailable, listen } from '../services/voiceService';
import { sanitizeExif, downloadSanitizedFile } from '../services/exifSanitizer';
import {
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import {
  Camera, Zap, Layout, Eye, Star, ChevronRight, Aperture, Clock, Gauge, Target,
  ScanEye, Loader2, Download, Info, LayoutDashboard, Map, Image as ImageIcon,
  MessageCircle, Send, User, Bot, Brain, ChevronDown, ChevronUp,
  MousePointerClick, Cpu, Activity, Coins, Sparkles, Volume2, VolumeX, Mic, MicOff, Shield,
} from 'lucide-react';

export type TabId = 'overview' | 'details' | 'mentor' | 'enhance' | 'stats';

// ─── Mentor chat state (v2 — no Gemini thinking field) ─────────────────────────

export interface MentorChatStateV2 {
  messages: MentorMessageV2[];
  isLoading: boolean;
  error?: string;
}

// ─── Accessible image description from analysis ───────────────────────────────

function buildAnalyzedImageAlt(analysis: PhotoAnalysisV2): string {
  const observation = analysis.rationale?.observations?.[0]?.trim();
  if (observation) return observation;
  const overall = analysis.critique?.overall?.split(/[.!?]/)[0]?.trim();
  if (overall) return overall;
  return 'Photograph analyzed by L.E.N.S.';
}

// ─── Props ─────────────────────────────────────────────────────────────────────

interface AnalysisResultsProps {
  analysis: PhotoAnalysisV2;
  imageSrc: string;
  imageFile?: File | null;
  mode: OperationalMode;
  onReset: () => void;
  sessionHistory: SessionHistoryEntry[];
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  mentorChatState: MentorChatStateV2;
  setMentorChatState: React.Dispatch<React.SetStateAction<MentorChatStateV2>>;
  onViewAuditLog?: () => void;
  onExportLog?: () => void;
  debugMode?: boolean;
  language?: import('../services/promptService').SupportedLanguage;
  quickGlanceMode?: boolean;
  onQuickGlanceToggle?: () => void;
  onShowShortcuts?: () => void;
  onSendToSell?: (imageBase64: string) => void;
}

// ─── Mentor Chat Widget (v2 — uses ollamaService.mentorChat) ──────────────────

// ─── Action-token parsing (function-call-style structured outputs) ────────────
// Gemma 4 emits markers like <<show_pin:2>> and <<jump_to_tab:details>> in mentor replies.
// We strip them from the visible text and render them as clickable action chips.

interface ParsedActionToken {
  type: 'show_pin' | 'jump_to_tab';
  arg: string;
}

interface ParsedReply {
  text: string;
  actions: ParsedActionToken[];
}

function parseActionTokens(raw: string): ParsedReply {
  const actions: ParsedActionToken[] = [];
  const text = raw.replace(/<<(show_pin|jump_to_tab):([^>]+)>>/g, (_match, type, arg) => {
    actions.push({ type: type as ParsedActionToken['type'], arg: arg.trim() });
    return '';
  }).replace(/\s+/g, ' ').trim();
  return { text, actions };
}

interface MentorChatWidgetProps {
  analysis: PhotoAnalysisV2;
  onShowPin?: (idx: number) => void;
  onJumpToTab?: (tab: TabId) => void;
  language?: import('../services/promptService').SupportedLanguage;
  chatState: MentorChatStateV2;
  onStateChange: React.Dispatch<React.SetStateAction<MentorChatStateV2>>;
  isVault: boolean;
}

// ─── Listen-to-critique button (TTS) ──────────────────────────────────────────

const ListenButton: React.FC<{ text: string; className?: string }> = ({ text, className = '' }) => {
  const [speaking, setSpeaking] = useState(false);

  const toggle = () => {
    if (speaking) {
      cancelSpeech();
      setSpeaking(false);
    } else {
      speak(text, {
        onStart: () => setSpeaking(true),
        onEnd: () => setSpeaking(false),
        onError: () => setSpeaking(false),
      });
    }
  };

  useEffect(() => () => { cancelSpeech(); }, []);

  return (
    <button
      onClick={toggle}
      className={`absolute top-0 right-0 p-2 rounded-lg transition-colors ${
        speaking
          ? 'bg-[#C06B45]/20 text-[#C06B45] hover:bg-[#C06B45]/30'
          : 'text-[#524A3D] hover:text-[#C06B45] hover:bg-[#F4ECDC]'
      } ${className}`}
      title={speaking ? 'Stop reading' : 'Read aloud'}
      aria-label={speaking ? 'Stop reading aloud' : 'Read aloud'}
    >
      {speaking ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
    </button>
  );
};

// ─── Voice-input mic button for mentor chat ───────────────────────────────────

const MicButton: React.FC<{
  onTranscript: (text: string) => void;
  disabled?: boolean;
}> = ({ onTranscript, disabled }) => {
  const [listening, setListening] = useState(false);
  const stopRef = useRef<(() => void) | null>(null);

  if (!isSTTAvailable()) return null;

  const toggle = () => {
    if (listening) {
      stopRef.current?.();
      setListening(false);
      return;
    }
    const stop = listen({
      onStart: () => setListening(true),
      onEnd: () => setListening(false),
      onError: () => setListening(false),
      onResult: (text, isFinal) => {
        if (isFinal) onTranscript(text);
      },
    });
    stopRef.current = stop;
  };

  useEffect(() => () => { stopRef.current?.(); }, []);

  return (
    <button
      onClick={toggle}
      disabled={disabled}
      className={`p-2 rounded-xl transition-colors ${
        listening
          ? 'bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 animate-pulse'
          : 'text-[#524A3D] hover:text-[#C06B45] hover:bg-[#F4ECDC]'
      } disabled:opacity-30 disabled:cursor-not-allowed`}
      title={listening ? 'Stop listening' : 'Voice ask'}
      aria-label={listening ? 'Stop voice input' : 'Ask using voice'}
    >
      {listening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
    </button>
  );
};

const MentorChatWidget: React.FC<MentorChatWidgetProps> = ({ analysis, chatState, onStateChange, isVault, onShowPin, onJumpToTab, language = 'en' }) => {
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
      const reply = await mentorChat(userMsg.content, analysis, historyForApi, language);
      const assistantMsg: MentorMessageV2 = { role: 'assistant', content: reply, timestamp: Date.now() };
      onStateChange(prev => ({ ...prev, messages: [...prev.messages, assistantMsg], isLoading: false }));
    } catch (e: any) {
      console.error('[MentorChat]', e);
      onStateChange(prev => ({ ...prev, isLoading: false, error: 'Mentor unavailable — is Ollama running?' }));
    }
  };

  return (
    <div className="mb-8 rounded-2xl bg-[#F4ECDC] border border-[#D8CDB8] shadow-xl overflow-hidden animate-fadeIn">
      {/* Header */}
      <div className="p-4 bg-[#ECE3D2] border-b border-[#D8CDB8] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-[#C06B45] to-[#2F4858] rounded-lg text-[#241F18]">
            <MessageCircle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-[#241F18] font-bold text-sm md:text-base">Ask Your Photography Mentor</h3>
            <p className="text-xs text-[#524A3D]">
              {isVault ? '🔒 Vault Mode · Gemma 4 E4B local' : 'Powered by Gemma 4 E4B · Local inference'}
            </p>
          </div>
        </div>
        <div className="text-xs font-mono text-[#524A3D]">{userTurns}/8 turns</div>
      </div>

      {/* Chat Area */}
      <div ref={scrollRef} className="h-[380px] overflow-y-auto p-4 space-y-5 bg-[#ECE3D2]/50">
        {chatState.messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-[#524A3D] space-y-2">
            <Bot className="w-10 h-10 opacity-20" />
            <p className="text-sm text-center">Ask about composition, settings, lighting, or creative ideas!</p>
          </div>
        )}

        {chatState.messages.map((msg, idx) => {
          const parsed = msg.role === 'assistant' ? parseActionTokens(msg.content) : { text: msg.content, actions: [] };
          return (
            <div key={idx} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} animate-fadeIn gap-1.5`}>
              <div className={`flex items-start gap-3 max-w-[88%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  msg.role === 'user' ? 'bg-[#2F4858]/20 text-[#2F4858]' : 'bg-[#C06B45]/20 text-[#C06B45]'
                }`}>
                  {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>
                <div className={`relative p-3 rounded-2xl text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-[#2F4858]/20 text-[#241F18] rounded-tr-none border border-[#2F4858]/20'
                    : 'bg-white text-[#241F18] rounded-tl-none border border-[#D8CDB8] pr-10'
                }`}>
                  {parsed.text}
                  {msg.role === 'assistant' && isTTSAvailable() && (
                    <ListenButton text={parsed.text} className="bottom-1 right-1 top-auto" />
                  )}
                </div>
              </div>
              {/* Action chips — rendered when Gemma emits action tokens */}
              {parsed.actions.length > 0 && (
                <div className="flex flex-wrap gap-2 ml-11">
                  {parsed.actions.map((action, ai) => {
                    if (action.type === 'show_pin') {
                      const pinNum = parseInt(action.arg, 10);
                      if (isNaN(pinNum) || !onShowPin) return null;
                      return (
                        <button
                          key={ai}
                          onClick={() => onShowPin(pinNum - 1)}
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-[#241F18] text-[11px] font-medium hover:bg-amber-500/20 transition-colors"
                          title={`Highlight pin ${pinNum} on the photo`}
                        >
                          📍 Show pin {pinNum}
                        </button>
                      );
                    }
                    if (action.type === 'jump_to_tab' && onJumpToTab) {
                      const tab = action.arg as TabId;
                      return (
                        <button
                          key={ai}
                          onClick={() => onJumpToTab(tab)}
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#C06B45]/10 border border-[#C06B45]/30 text-[#241F18] text-[11px] font-medium hover:bg-[#C06B45]/20 transition-colors"
                          title={`Open the ${tab} tab`}
                        >
                          → Open {tab === 'details' ? 'Detailed Analysis' : tab}
                        </button>
                      );
                    }
                    return null;
                  })}
                </div>
              )}
            </div>
          );
        })}

        {chatState.isLoading && (
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-[#C06B45]/20 text-[#C06B45] flex items-center justify-center">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
            <div className="p-3 rounded-2xl rounded-tl-none bg-white border border-[#D8CDB8] text-sm text-[#524A3D] italic">
              Gemma 4 E4B is thinking locally…
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
      <div className="p-4 bg-[#ECE3D2]/50 border-t border-[#D8CDB8]">
        {(isSTTAvailable() || isTTSAvailable()) && (
          <div className="flex items-center gap-2 mb-2 px-3 py-1.5 rounded-lg bg-emerald-500/5 border border-emerald-500/20 text-[11px] text-[#524A3D]">
            <span>🎤 🔊</span>
            <span>Voice ready — tap the mic to ask, tap the speaker on any reply to listen.</span>
          </div>
        )}
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder={isLimitReached ? 'Session limit reached.' : 'Ask about composition, lighting, technique… (or tap 🎤 to speak)'}
            disabled={chatState.isLoading || isLimitReached}
            className="flex-1 bg-white border border-[#D8CDB8] rounded-xl px-4 py-2 text-sm text-[#241F18] placeholder-[#524A3D] focus:outline-none focus:border-[#C06B45] focus:ring-1 focus:ring-[#C06B45] disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <MicButton
            disabled={chatState.isLoading || isLimitReached}
            onTranscript={(text) => setInput(prev => prev ? `${prev} ${text}` : text)}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || chatState.isLoading || isLimitReached}
            className="p-2 bg-[#C06B45] text-[#241F18] rounded-xl hover:bg-[#A6552F] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
  imageFile,
  mode,
  onReset,
  sessionHistory,
  activeTab,
  onTabChange,
  mentorChatState,
  setMentorChatState,
  onViewAuditLog,
  onExportLog,
  debugMode = false,
  language = 'en',
  quickGlanceMode = false,
  onQuickGlanceToggle,
  onShowShortcuts,
  onSendToSell,
}) => {
  const [showOverlays, setShowOverlays] = useState(true); // on by default — pins are subtle enough not to clutter
  const [isRationaleExpanded, setIsRationaleExpanded] = useState(true);
  const [activeBoxIndex, setActiveBoxIndex] = useState<number | null>(null);
  const [selectedDimension, setSelectedDimension] = useState<string | null>(null);

  // Progressive disclosure - sections expanded by default on desktop, collapsed on mobile
  const [expandedSections, setExpandedSections] = useState({
    strengths: true,
    improvements: true,
    evidence: true,
  });

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

  // Score data sorted by lowest first to highlight improvement areas
  const chartData = [
    { subject: 'Composition', A: analysis.scores.composition, fullMark: 10 },
    { subject: 'Lighting',    A: analysis.scores.lighting,    fullMark: 10 },
    { subject: 'Creativity',  A: analysis.scores.creativity,  fullMark: 10 },
    { subject: 'Technique',   A: analysis.scores.technique,   fullMark: 10 },
    { subject: 'Subject',     A: analysis.scores.subjectImpact, fullMark: 10 },
  ].sort((a, b) => a.A - b.A); // Sort by score ascending (lowest first)

  const tabs: { id: TabId; label: string; icon: typeof LayoutDashboard; studioOnly?: boolean; debugOnly?: boolean }[] = [
    { id: 'overview', label: 'Overview',     icon: LayoutDashboard },
    { id: 'details',  label: 'How to Fix',   icon: Target },           // Renamed for action-oriented UX
    { id: 'mentor',   label: 'Ask Coach',    icon: MessageCircle },    // Renamed for clarity
    { id: 'enhance',  label: '✨ Enhance',   icon: Sparkles, studioOnly: true },
    { id: 'stats',    label: 'Stats',        icon: Cpu, debugOnly: true },
  ];

  const visibleTabs = tabs.filter(t =>
    (!t.studioOnly || !isVault) && (!t.debugOnly || debugMode)
  );

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

  // EXIF sanitization — strip GPS + other sensitive metadata before sharing
  const [exifSanitizing, setExifSanitizing] = useState(false);
  const handleSanitizeExif = async () => {
    if (!imageFile) return;
    setExifSanitizing(true);
    try {
      const result = await sanitizeExif(imageFile, { stripGPS: true });
      downloadSanitizedFile(imageFile, result.blob, imageFile.name);
    } catch (e) {
      console.error('[EXIF sanitize]', e);
    } finally {
      setExifSanitizing(false);
    }
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

      {/* Multilingual hint — only when language != English */}
      {language !== 'en' && (
        <div className="mb-4 px-4 py-2.5 rounded-xl bg-[#F4ECDC] border border-[#D8CDB8] flex items-center gap-3 text-xs text-[#524A3D]">
          <span className="text-base shrink-0">🌐</span>
          <span>
            Gemma 4 E4B's critique and mentor responses below are in your selected language. The app interface labels (tab names, buttons) stay in English.
          </span>
        </div>
      )}

      {/* Deep Critique badge — when this analysis used extended chain-of-thought */}
      {analysis.wasDeepMode && (
        <div className="mb-4 px-4 py-2.5 rounded-xl bg-[#C06B45]/10 border border-[#C06B45]/30 flex items-center gap-3 text-xs text-[#241F18]">
          <span className="text-base shrink-0">🧠</span>
          <span>
            <span className="font-semibold text-[#C06B45]">Deep Critique mode used</span>
            <span className="text-[#524A3D] ml-2">— extended chain-of-thought reasoning. Expect more rationale steps, longer critique fields, and {analysis.boundingBoxes?.length || 2}+ bounding boxes covering more issue types.</span>
          </span>
        </div>
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
            <div className="relative group rounded-2xl bg-black shadow-2xl border border-[#D8CDB8] flex justify-center items-center min-h-[250px] md:min-h-[300px]">
              <div className="relative inline-block w-auto h-auto max-w-full m-2 md:m-4">
                <img
                  src={imageSrc}
                  alt={buildAnalyzedImageAlt(analysis)}
                  className="block w-auto h-auto max-w-full max-h-[50vh] md:max-h-[60vh] rounded-lg shadow-lg"
                />
                <SpatialOverlay
                  boundingBoxes={analysis.boundingBoxes || []}
                  show={showOverlays}
                  activeIndex={activeBoxIndex}
                  onHover={setActiveBoxIndex}
                  onPinClick={(idx) => {
                    onTabChange('details');
                    setActiveBoxIndex(idx);
                    // Scroll after tab paint
                    setTimeout(() => {
                      document.getElementById(`spatial-card-${idx}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }, 80);
                  }}
                />
              </div>

              {hasBoundingBoxes && (
                <div className="absolute top-3 right-3 z-50">
                  <button
                    onClick={() => setShowOverlays(s => !s)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold backdrop-blur-md border transition-all duration-200 shadow-lg hover:scale-105 ${
                      showOverlays
                        ? 'bg-[#C06B45] text-[#241F18] border-[#A6552F]'
                        : 'bg-[#241F18]/80 text-[#ECE3D2] border-[#524A3D]'
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
                <div key={label} className="bg-[#F4ECDC] p-2 md:p-3 rounded-xl border border-[#D8CDB8] flex flex-col items-center text-center">
                  <Icon className="w-4 h-4 text-[#C06B45] mb-1" />
                  <span className="text-[9px] md:text-[10px] text-[#524A3D] uppercase tracking-wider">{label}</span>
                  <span className="text-xs font-semibold text-[#241F18]">{value}</span>
                </div>
              ))}
            </div>

            {/* Provenance chip */}
            <div className="flex items-center gap-2 text-[10px] text-[#524A3D] font-mono">
              <Cpu className="w-3 h-3" />
              <span>{analysis.model_id}</span>
              {analysis.quantization && <span className="text-[#524A3D]/60">· {analysis.quantization}</span>}
              {isVault && <span className="ml-auto text-amber-500">vault · local only</span>}
            </div>
          </div>
        </div>

        {/* ── Right column ─────────────────────────────────────────────────────── */}
        <div className="lg:col-span-7 pb-20">

          {/* Tab nav + Quick/Full toggle + Keyboard shortcuts */}
          <div className="flex items-center gap-2 mb-6 sticky top-24 z-40">
            <div className="flex p-1 bg-[#F4ECDC] rounded-xl border border-[#D8CDB8] backdrop-blur-md overflow-x-auto no-scrollbar flex-1">
              {visibleTabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  className={`flex items-center gap-2 px-3 md:px-4 py-2.5 rounded-lg text-xs md:text-sm font-medium transition-all whitespace-nowrap flex-1 justify-center min-w-[80px] ${
                    activeTab === tab.id
                      ? 'bg-[#C06B45] text-[#241F18] shadow-lg shadow-[#C06B45]/20'
                      : 'text-[#524A3D] hover:text-[#241F18] hover:bg-[#ECE3D2]'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </div>
            {/* Quick/Full toggle - only show on Overview tab */}
            {onQuickGlanceToggle && activeTab === 'overview' && (
              <button
                onClick={onQuickGlanceToggle}
                className={`hidden sm:flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all border ${
                  quickGlanceMode
                    ? 'bg-amber-500/10 text-[#241F18] border-amber-500/40'
                    : 'bg-[#F4ECDC] text-[#524A3D] border-[#D8CDB8] hover:text-[#241F18]'
                }`}
                title={quickGlanceMode ? 'Show full analysis' : 'Show quick summary'}
              >
                <Zap className="w-3.5 h-3.5" />
                {quickGlanceMode ? 'Quick' : 'Full'}
              </button>
            )}
            {/* Keyboard shortcuts - subtle text only */}
            {onShowShortcuts && (
              <button
                onClick={onShowShortcuts}
                className="flex items-center gap-1 text-xs font-medium text-[#C06B45]/60 hover:text-[#C06B45] transition-colors"
                title="Keyboard shortcuts"
              >
                <span className="text-sm">?</span>
                <span className="hidden md:inline">Keys</span>
              </button>
            )}
          </div>

          <div className="space-y-6 animate-fadeIn">

            {/* ── OVERVIEW TAB ──────────────────────────────────────────────────── */}
            {activeTab === 'overview' && (
              <>
                {/* Quick Glance Mode - compact summary */}
                {quickGlanceMode ? (
                  <div className="bg-[#F4ECDC] rounded-3xl p-6 border border-[#D8CDB8] backdrop-blur-sm">
                    {/* Compact verdict */}
                    <div className="flex items-start gap-3 mb-6">
                      <Star className="text-[#C06B45] fill-[#C06B45] w-6 h-6 mt-0.5 shrink-0" />
                      <div className="flex-1">
                        <p className="text-lg font-semibold text-[#241F18] mb-2">
                          {analysis.critique.overall.split(/[.!?]/)[0]}.
                        </p>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${badgeClass}`}>
                            {skillLevel}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Compact horizontal score row */}
                    <div className="flex items-center justify-between gap-2 mb-6 p-3 bg-[#ECE3D2] rounded-xl">
                      {[
                        { label: 'Comp', score: analysis.scores.composition },
                        { label: 'Light', score: analysis.scores.lighting },
                        { label: 'Tech', score: analysis.scores.technique },
                        { label: 'Subj', score: analysis.scores.subjectImpact },
                        { label: 'Creat', score: analysis.scores.creativity },
                      ].map(item => {
                        const color = item.score >= 8 ? 'text-emerald-400' : item.score >= 5 ? 'text-amber-400' : 'text-rose-400';
                        return (
                          <div key={item.label} className="text-center flex-1">
                            <div className={`text-lg font-bold ${color}`}>{item.score.toFixed(1)}</div>
                            <div className="text-[10px] text-[#524A3D] uppercase">{item.label}</div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Top 2 improvements only */}
                    <div className="space-y-2 mb-6">
                      <h4 className="text-xs font-semibold text-[#524A3D] uppercase">Focus on</h4>
                      {analysis.improvements.slice(0, 2).map((imp, i) => (
                        <div key={i} className="flex items-start gap-2 text-sm text-[#241F18]">
                          <span className="text-[#C06B45] mt-0.5">→</span>
                          <span>{imp}</span>
                        </div>
                      ))}
                    </div>

                    {/* Show full analysis button */}
                    {onQuickGlanceToggle && (
                      <button
                        onClick={onQuickGlanceToggle}
                        className="w-full py-2.5 text-sm font-medium text-[#524A3D] hover:text-[#241F18] border border-[#D8CDB8] hover:border-[#C06B45] rounded-xl transition-colors"
                      >
                        Show full analysis →
                      </button>
                    )}
                  </div>
                ) : (
                  /* Full analysis mode */
                  <>
                    {/* Coach verdict */}
                    <div className="bg-[#F4ECDC] rounded-3xl p-4 md:p-8 border border-[#D8CDB8] backdrop-blur-sm">
                      {/* Verdict headline - first sentence as the hook */}
                      <div className="flex flex-col gap-3 mb-6">
                        <h2 className="text-xl md:text-2xl font-bold text-[#241F18] flex items-start gap-3 leading-tight">
                          <Star className="text-[#C06B45] fill-[#C06B45] w-6 h-6 mt-1 shrink-0" />
                          <span>{analysis.critique.overall.split(/[.!?]/)[0]}.</span>
                        </h2>
                        <div className="flex items-center gap-3 ml-9">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${badgeClass}`}>
                            {skillLevel}
                          </span>
                          <span className="text-xs text-[#524A3D]">{averageScore.toFixed(1)}/10 overall</span>
                          {isTTSAvailable() && (
                            <ListenButton text={analysis.critique.overall} />
                          )}
                        </div>
                      </div>

                      {/* Full critique - only if there's more than one sentence */}
                      {analysis.critique.overall.split(/[.!?]/).filter(s => s.trim()).length > 1 && (
                        <div className="relative mb-6">
                          <p className="text-sm md:text-base text-[#524A3D] leading-relaxed border-l-2 border-[#D8CDB8] pl-4 ml-9">
                            {analysis.critique.overall.split(/[.!?]/).slice(1).join('. ').trim()}
                          </p>
                        </div>
                      )}

                      {/* Next skills */}
                      {analysis.learningPath.length > 0 && (
                        <div className="bg-[#ECE3D2] rounded-xl p-5 border-l-4 border-emerald-500/50 border-y border-r border-[#D8CDB8]">
                          <h3 className="text-sm font-bold text-[#241F18] uppercase tracking-wide mb-3 flex items-center gap-2">
                            <span className="text-lg">📈</span> Next Skills to Master
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            {analysis.learningPath.map((skill, i) => (
                              <div key={i} className="flex items-center gap-2 text-sm text-[#241F18] bg-white px-3 py-2.5 rounded-lg border border-[#D8CDB8]">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
                                {skill}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                {/* Score visualization + detail panel */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Horizontal bar chart - click to view details */}
                  <div className="bg-[#F4ECDC] rounded-3xl p-4 md:p-6 border border-[#D8CDB8]">
                    <h3 className="text-sm font-semibold text-[#524A3D] uppercase tracking-wide mb-4">Score Breakdown</h3>
                    <div className="space-y-4">
                      {chartData.map((item, idx) => {
                        const isSelected = selectedDimension === item.subject;
                        const isLowest = idx === 0; // First item is lowest after sorting
                        const barColor = item.A >= 8 ? 'bg-emerald-500' : item.A >= 5 ? 'bg-amber-500' : 'bg-rose-500';
                        const textColor = item.A >= 8 ? 'text-emerald-400' : item.A >= 5 ? 'text-amber-400' : 'text-rose-400';
                        return (
                          <button
                            key={item.subject}
                            onClick={() => setSelectedDimension(item.subject)}
                            className={`w-full flex items-center gap-3 p-2 -m-2 rounded-lg transition-all cursor-pointer group ${
                              isSelected ? 'bg-[#ECE3D2]' : 'hover:bg-[#ECE3D2]/60'
                            } ${isLowest ? 'ring-1 ring-amber-500/30' : ''}`}
                            title={`Click to view ${item.subject} analysis`}
                          >
                            <div className="flex items-center gap-2 w-24">
                              <span className={`text-xs truncate ${isSelected ? 'text-[#241F18] font-semibold' : 'text-[#524A3D] group-hover:text-[#241F18]'}`}>{item.subject}</span>
                              {isLowest && (
                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 font-semibold whitespace-nowrap">
                                  Focus
                                </span>
                              )}
                            </div>
                            <div className={`flex-1 h-3 rounded-full overflow-hidden ${isSelected ? 'bg-[#D8CDB8]' : 'bg-[#D8CDB8]/50 group-hover:bg-[#D8CDB8]'}`}>
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${barColor} ${isSelected ? 'opacity-100' : 'opacity-90'}`}
                                style={{ width: `${item.A * 10}%` }}
                              />
                            </div>
                            <span className={`w-10 text-right text-sm font-bold ${textColor}`}>
                              {item.A.toFixed(1)}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Detail panel - shows selected dimension analysis */}
                  <div className="bg-[#F4ECDC] rounded-3xl p-4 md:p-6 border border-[#D8CDB8]">
                    {!selectedDimension ? (
                      <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center">
                        <MousePointerClick className="w-12 h-12 text-[#D8CDB8] mb-3" />
                        <p className="text-sm text-[#524A3D]">Click a score to view detailed analysis</p>
                      </div>
                    ) : (
                      <>
                        {/* Dimension detail content */}
                        {(() => {
                          const dimensionMap: Record<string, { label: string; critique: string; icon: React.ReactNode; color: string; bg: string; sectionId: string }> = {
                            'Composition': {
                              label: 'Composition Analysis',
                              critique: analysis.critique.composition,
                              icon: <Layout className="w-5 h-5" />,
                              color: 'text-[#C06B45]',
                              bg: 'bg-[#C06B45]/10',
                              sectionId: 'composition-section'
                            },
                            'Lighting': {
                              label: 'Lighting Analysis',
                              critique: analysis.critique.lighting,
                              icon: <Zap className="w-5 h-5" />,
                              color: 'text-amber-400',
                              bg: 'bg-amber-500/10',
                              sectionId: 'lighting-section'
                            },
                            'Technique': {
                              label: 'Technical Execution',
                              critique: analysis.critique.technique,
                              icon: <Camera className="w-5 h-5" />,
                              color: 'text-blue-400',
                              bg: 'bg-blue-500/10',
                              sectionId: 'technique-section'
                            },
                            'Subject': {
                              label: 'Subject Impact',
                              critique: `Your subject scores ${analysis.scores.subjectImpact.toFixed(1)}/10. ${analysis.scores.subjectImpact >= 7 ? 'Strong emotional connection and storytelling.' : analysis.scores.subjectImpact >= 5 ? 'Moderate impact - could be enhanced with better framing or moment selection.' : 'The subject needs more prominence or emotional resonance. Consider the story you want to tell.'}`,
                              icon: <Eye className="w-5 h-5" />,
                              color: 'text-purple-400',
                              bg: 'bg-purple-500/10',
                              sectionId: 'subject-section'
                            },
                            'Creativity': {
                              label: 'Creativity & Vision',
                              critique: `Your creative vision scores ${analysis.scores.creativity.toFixed(1)}/10. ${analysis.scores.creativity >= 7 ? 'Strong artistic perspective and originality.' : analysis.scores.creativity >= 5 ? 'Good foundation - push boundaries with more unique perspectives or processing.' : 'Explore more creative approaches - unique angles, processing styles, or conceptual elements.'}`,
                              icon: <Sparkles className="w-5 h-5" />,
                              color: 'text-pink-400',
                              bg: 'bg-pink-500/10',
                              sectionId: 'creativity-section'
                            },
                          };
                          const detail = dimensionMap[selectedDimension];
                          if (!detail) return null;

                          return (
                            <>
                              <div className={`flex items-center gap-3 font-medium mb-4 ${detail.color}`}>
                                <div className={`p-2 rounded-lg ${detail.bg}`}>{detail.icon}</div>
                                <h4 className="text-lg text-[#241F18]">{detail.label}</h4>
                              </div>
                              <p className="text-[#241F18] leading-relaxed text-sm mb-6">{detail.critique}</p>
                              <button
                                onClick={() => {
                                  onTabChange('details');
                                  // Scroll to specific section after a brief delay for tab transition
                                  setTimeout(() => {
                                    document.getElementById(detail.sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                  }, 100);
                                }}
                                className="flex items-center gap-2 px-4 py-2 bg-[#C06B45] hover:bg-[#A6552F] text-[#241F18] rounded-lg transition-colors text-sm font-medium"
                              >
                                View in How to Fix →
                              </button>
                            </>
                          );
                        })()}
                      </>
                    )}
                  </div>
                </div>

                {/* Strengths / improvements - collapsible */}
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="bg-emerald-900/10 border border-emerald-900/50 rounded-2xl overflow-hidden">
                    <button
                      onClick={() => setExpandedSections(prev => ({ ...prev, strengths: !prev.strengths }))}
                      className="w-full p-4 md:p-6 text-left flex items-center justify-between hover:bg-emerald-900/5 transition-colors"
                    >
                      <h3 className="text-emerald-400 font-bold flex items-center gap-2">
                        <span className="bg-emerald-500/10 p-1 rounded">👍</span> What Works
                      </h3>
                      {expandedSections.strengths ? (
                        <ChevronUp className="w-5 h-5 text-emerald-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-emerald-400" />
                      )}
                    </button>
                    {expandedSections.strengths && (
                      <div className="px-4 md:px-6 pb-4 md:pb-6">
                        <ul className="space-y-3">
                          {analysis.strengths.map((s, i) => (
                            <li key={i} className="flex items-start gap-3 text-[#241F18] text-sm">
                              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />{s}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  <div className="bg-[#2F4858]/10 border border-[#2F4858]/50 rounded-2xl overflow-hidden">
                    <button
                      onClick={() => setExpandedSections(prev => ({ ...prev, improvements: !prev.improvements }))}
                      className="w-full p-4 md:p-6 text-left flex items-center justify-between hover:bg-[#2F4858]/5 transition-colors"
                    >
                      <h3 className="text-[#2F4858] font-bold flex items-center gap-2">
                        <span className="bg-[#2F4858]/10 p-1 rounded">🚀</span> How to Improve
                      </h3>
                      {expandedSections.improvements ? (
                        <ChevronUp className="w-5 h-5 text-[#2F4858]" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-[#2F4858]" />
                      )}
                    </button>
                    {expandedSections.improvements && (
                      <div className="px-4 md:px-6 pb-4 md:pb-6">
                        <ul className="space-y-3">
                          {analysis.improvements.map((imp, i) => (
                            <li key={i} className="flex items-start gap-3 text-[#241F18] text-sm">
                              <ChevronRight className="w-4 h-4 text-[#C06B45] flex-shrink-0 mt-0.5" />{imp}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>

                {/* Evidence panel (when available) */}
                {analysis.evidence && analysis.evidence.length > 0 && (
                  <EvidencePanel evidence={analysis.evidence} />
                )}
                  </>
                )}
              </>
            )}

            {/* ── DETAILED ANALYSIS TAB ────────────────────────────────────────── */}
            {activeTab === 'details' && (
              <>
                {/* Rationale / reasoning */}
                <div className="mb-8 rounded-2xl p-[1px] bg-gradient-to-r from-emerald-500 to-purple-600 shadow-xl animate-fadeIn">
                  <div className="bg-[#F4ECDC] rounded-2xl overflow-hidden backdrop-blur-md">
                    <button
                      onClick={() => setIsRationaleExpanded(!isRationaleExpanded)}
                      className="w-full flex items-center justify-between p-4 md:p-5 hover:bg-[#ECE3D2] transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-br from-emerald-500 to-purple-600 rounded-lg text-[#241F18] shadow-lg">
                          <Brain className="w-5 h-5" />
                        </div>
                        <div className="text-left">
                          <h3 className="text-[#241F18] font-bold text-sm md:text-base">Gemma 4 E4B reasoning</h3>
                          <div className="flex items-center gap-2">
                            <p className="text-xs text-[#524A3D] font-mono mt-0.5">Local structured rationale</p>
                            <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1.5 rounded font-mono">
                              gemma-4-e4b
                            </span>
                          </div>
                        </div>
                      </div>
                      {isRationaleExpanded ? <ChevronUp className="text-[#524A3D]" /> : <ChevronDown className="text-[#524A3D]" />}
                    </button>

                    {isRationaleExpanded && (
                      <div className="p-5 md:p-6 border-t border-[#D8CDB8] bg-[#ECE3D2] font-mono text-sm space-y-6 animate-fadeIn">
                        <div>
                          <h4 className="flex items-center gap-2 text-emerald-400 font-bold mb-3 uppercase text-xs tracking-wider">
                            <Eye className="w-4 h-4" /> Key Observations
                          </h4>
                          <ul className="space-y-2 pl-2 border-l border-emerald-500/20">
                            {analysis.rationale.observations.map((obs, i) => (
                              <li key={i} className="text-[#241F18] pl-4 relative before:content-['>'] before:absolute before:left-0 before:text-emerald-500/50">{obs}</li>
                            ))}
                          </ul>
                        </div>

                        <div>
                          <h4 className="flex items-center gap-2 text-purple-400 font-bold mb-3 uppercase text-xs tracking-wider">
                            <Brain className="w-4 h-4" /> Reasoning Steps
                          </h4>
                          <ol className="space-y-3">
                            {analysis.rationale.reasoningSteps.map((step, i) => (
                              <li key={i} className="flex gap-3 text-[#241F18]">
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
                              <div key={i} className="flex items-center gap-3 p-2 rounded bg-white border border-[#D8CDB8]">
                                <div className="w-4 h-4 rounded border border-amber-500/50 flex items-center justify-center">
                                  <div className="w-2 h-2 bg-amber-500 rounded-sm" />
                                </div>
                                <span className="text-[#241F18]">{fix}</span>
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
                  <h3 className="text-xl font-bold text-[#241F18] pb-2">Technical Deep Dive</h3>

                  {[
                    { id: 'composition-section', label: 'Composition Analysis',  text: analysis.critique.composition, color: 'text-[#C06B45]', bg: 'bg-[#C06B45]/10', icon: <Layout className="w-5 h-5" /> },
                    { id: 'lighting-section', label: 'Lighting Analysis',     text: analysis.critique.lighting,    color: 'text-amber-400', bg: 'bg-amber-500/10', icon: <Zap className="w-5 h-5" /> },
                    { id: 'subject-section', label: 'Subject Impact',        text: `Your subject scores ${analysis.scores.subjectImpact.toFixed(1)}/10. ${analysis.scores.subjectImpact >= 7 ? 'Strong emotional connection and storytelling.' : analysis.scores.subjectImpact >= 5 ? 'Moderate impact - could be enhanced with better framing or moment selection.' : 'The subject needs more prominence or emotional resonance. Consider the story you want to tell.'} Review the improvements and strengths sections for specific guidance on enhancing your subject's impact.`, color: 'text-purple-400', bg: 'bg-purple-500/10', icon: <Eye className="w-5 h-5" /> },
                    { id: 'technique-section', label: 'Technical Execution',   text: analysis.critique.technique,   color: 'text-[#2F4858]',  bg: 'bg-[#2F4858]/10',  icon: <Camera className="w-5 h-5" /> },
                    { id: 'creativity-section', label: 'Creativity & Vision',   text: `Your creative vision scores ${analysis.scores.creativity.toFixed(1)}/10. ${analysis.scores.creativity >= 7 ? 'Strong artistic perspective and originality.' : analysis.scores.creativity >= 5 ? 'Good foundation - push boundaries with more unique perspectives or processing.' : 'Explore more creative approaches - unique angles, processing styles, or conceptual elements.'} Check the learning path section for skills to develop your creative voice.`, color: 'text-pink-400', bg: 'bg-pink-500/10', icon: <Sparkles className="w-5 h-5" /> },
                  ].map(({ id, label, text, color, bg, icon }) => (
                    <div key={label} id={id} className="bg-[#F4ECDC] border border-[#D8CDB8] rounded-2xl p-4 md:p-6 scroll-mt-24">
                      <div className={`flex items-center gap-3 font-medium mb-3 ${color}`}>
                        <div className={`p-2 rounded-lg ${bg}`}>{icon}</div>
                        <h4 className="text-lg text-[#241F18]">{label}</h4>
                      </div>
                      <p className="text-[#241F18] leading-relaxed text-sm md:text-base">{text}</p>
                    </div>
                  ))}

                  {/* Spatial Issues — numbered cards linked to image pins */}
                  {hasBoundingBoxes && (
                    <div className="pt-6">
                      <div className="flex items-center mb-4">
                        <h3 className="text-xl font-bold text-[#241F18] flex items-center gap-2">
                          <Map className="w-5 h-5 text-[#524A3D]" />
                          Spatial Issues
                          <span className="text-sm font-normal text-[#524A3D] ml-1">
                            ({analysis.boundingBoxes!.length})
                          </span>
                        </h3>
                      </div>

                      <div className="flex items-start gap-2 text-xs text-[#524A3D] bg-[#F4ECDC] p-3 rounded-lg border border-[#D8CDB8] mb-4">
                        <MousePointerClick className="w-3.5 h-3.5 text-[#C06B45] mt-0.5 flex-shrink-0" />
                        <span>Hover a card to highlight its pin on the image. Click a pin on the photo to jump to its card here.</span>
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
                            ? 'bg-rose-500 text-[#241F18]'
                            : box.severity === 'moderate'
                              ? 'bg-amber-400 text-[#241F18]'
                              : 'bg-sky-400 text-[#241F18]';
                          const tagColor = box.severity === 'critical'
                            ? 'text-rose-400 bg-rose-500/15'
                            : box.severity === 'moderate'
                              ? 'text-amber-400 bg-amber-400/15'
                              : 'text-sky-400 bg-sky-400/15';

                          return (
                            <div
                              key={i}
                              id={`spatial-card-${i}`}
                              onMouseEnter={() => setActiveBoxIndex(i)}
                              onMouseLeave={() => setActiveBoxIndex(null)}
                              className={`flex gap-3 p-3 rounded-xl border cursor-default transition-all duration-200 ${borderColor} ${
                                isActive ? `${activeBg} ring-1 ring-inset ${borderColor}` : 'bg-[#F4ECDC] hover:bg-[#ECE3D2]'
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
                                  <span className="text-[10px] text-[#524A3D] uppercase tracking-wider">{box.severity}</span>
                                </div>
                                <p className="text-sm font-medium text-[#241F18] leading-snug mb-1">{box.description}</p>
                                <p className="text-xs text-[#524A3D] flex items-start gap-1">
                                  <span className="text-[#C06B45] font-bold flex-shrink-0">→</span>
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
                  language={language}
                  onShowPin={(idx) => {
                    setActiveBoxIndex(idx);
                    document.querySelector('.lg\\:sticky')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                  onJumpToTab={(tab) => {
                    onTabChange(tab);
                  }}
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
                    <p className="text-[#241F18] text-xs mt-1">
                      All inference runs on-device via Ollama. Zero cloud cost, zero egress.
                      Stats below reflect real hardware performance on your machine.
                    </p>
                  </div>
                </div>

                {/* Current analysis token stats */}
                {analysis.tokenUsage && (
                  <div className="bg-[#ECE3D2]/50 rounded-2xl border border-[#D8CDB8] p-4 md:p-6">
                    <h3 className="text-lg font-bold text-[#241F18] mb-4 flex items-center gap-2">
                      <Activity className="w-5 h-5 text-emerald-400" />
                      This Analysis
                    </h3>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { label: 'Prompt Tokens',     value: analysis.tokenUsage.promptTokens ?? '—', color: 'text-blue-400' },
                        { label: 'Completion Tokens', value: analysis.tokenUsage.completionTokens ?? '—', color: 'text-emerald-400' },
                        { label: 'Total Tokens',      value: analysis.tokenUsage.totalTokens ?? '—', color: 'text-[#241F18]' },
                      ].map(({ label, value, color }) => (
                        <div key={label} className="bg-[#F4ECDC]/50 rounded-xl p-3 text-center border border-[#D8CDB8]">
                          <div className={`text-xl font-bold font-mono ${color}`}>{value?.toLocaleString()}</div>
                          <div className="text-[10px] text-slate-500 uppercase tracking-wider mt-1">{label}</div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 text-center text-xs text-slate-500 font-mono">
                      Cost: $0.00 (local inference · Gemma 4 E4B Q4_K_M)
                    </div>
                  </div>
                )}

                {/* Session history chart */}
                {sessionHistory.length > 1 && (
                  <div className="bg-[#ECE3D2]/50 rounded-2xl border border-[#D8CDB8] p-4 md:p-6">
                    <h3 className="text-lg font-bold text-[#241F18] mb-4 flex items-center gap-2">
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
                <div className="flex flex-col sm:flex-row flex-wrap justify-center gap-3">
                  <button
                    onClick={handleExportXMP}
                    className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-brand-600 to-brand-700 hover:from-brand-700 hover:to-brand-800 text-[#241F18] rounded-lg transition-all font-medium min-h-[44px] shadow-lg shadow-brand-500/20"
                  >
                    <Download className="w-4 h-4" />
                    Export XMP for Lightroom
                  </button>
                  <button
                    onClick={handleDownloadJSON}
                    className="flex items-center gap-2 px-6 py-2.5 bg-[#D8CDB8] hover:bg-slate-600 text-[#241F18] rounded-lg transition-colors font-medium min-h-[44px]"
                  >
                    <Download className="w-4 h-4" />
                    Export Analysis JSON
                  </button>
                  {imageFile && (imageFile.type.includes('jpeg') || imageFile.type.includes('jpg')) && (
                    <button
                      onClick={handleSanitizeExif}
                      disabled={exifSanitizing}
                      className="flex items-center gap-2 px-6 py-2.5 bg-amber-700/80 hover:bg-amber-700 text-[#241F18] rounded-lg transition-colors font-medium min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Strip GPS coordinates and other EXIF metadata before sharing — for journalists, NGO field workers, anyone protecting subjects"
                    >
                      {exifSanitizing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
                      {exifSanitizing ? 'Stripping…' : 'Download Photo (GPS Stripped)'}
                    </button>
                  )}
                </div>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* Sticky bottom action bar */}
      <div className="fixed bottom-0 left-0 right-0 z-[60] bg-[#ECE3D2]/95 backdrop-blur-md border-t border-[#D8CDB8] py-3 px-4 md:px-6 pointer-events-none">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 pointer-events-auto">
          {/* Left: Session photo strip */}
          <div className="hidden md:flex flex-1 max-w-md">
            {sessionHistory.length > 1 ? (
              <SessionPhotoStrip
                entries={sessionHistory}
                currentIndex={sessionHistory.length - 1}
                onSelect={(index) => {
                  // TODO: Support navigation between session photos
                  console.log('Navigate to photo', index);
                }}
              />
            ) : (
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <ImageIcon className="w-4 h-4" />
                <span>Session: {sessionHistory.length} photo</span>
              </div>
            )}
          </div>

          {/* Center: Main actions */}
          <div className="flex items-center gap-2 md:gap-3 flex-1 md:flex-initial justify-center">
            <button
              onClick={handleExportXMP}
              className="flex items-center gap-1.5 px-3 md:px-4 py-2 bg-[#C06B45] hover:bg-[#C06B45] text-[#241F18] rounded-lg text-xs md:text-sm font-medium transition-colors"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Export XMP</span>
            </button>
            {onSendToSell && mode === 'studio' && (
              <button
                onClick={() => onSendToSell(imageSrc)}
                className="flex items-center gap-1.5 px-3 md:px-4 py-2 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-[#241F18] rounded-lg text-xs md:text-sm font-semibold transition-all shadow-lg shadow-orange-500/20"
                title="Optimize this photo for marketplace listing"
              >
                <Sparkles className="w-4 h-4" />
                <span className="hidden sm:inline">Optimize for Marketplace</span>
                <span className="sm:hidden">Sell</span>
              </button>
            )}
            <button
              onClick={onReset}
              className="flex items-center gap-1.5 px-3 md:px-4 py-2 bg-[#D8CDB8] hover:bg-slate-600 text-[#241F18] rounded-lg text-xs md:text-sm font-medium transition-colors"
            >
              <Camera className="w-4 h-4" />
              <span className="hidden sm:inline">New Photo</span>
            </button>
          </div>

          {/* Right: Spacer for symmetry */}
          <div className="hidden md:flex flex-1 max-w-md" />
        </div>
      </div>
    </div>
  );
};

export default AnalysisResults;
