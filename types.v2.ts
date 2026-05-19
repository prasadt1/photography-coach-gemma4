/**
 * L.E.N.S. — Type Definitions
 * Schema Version: 2.0 (Gemma 4 Edition)
 * Replaces types.ts v1 for new Ollama-based pipeline.
 */

// ─── Refusal ────────────────────────────────────────────────────────────────

export type RefusalCategory =
  | 'medical'        // Medical imagery
  | 'identity'       // Identity documents
  | 'surveillance'   // Surveillance with identifiable faces
  | 'inappropriate'  // Adult / violent content
  | 'other';

// ─── Core types ─────────────────────────────────────────────────────────────

export interface BoundingBox {
  type: 'composition' | 'lighting' | 'focus' | 'exposure' | 'color';
  severity: 'critical' | 'moderate' | 'minor';
  x: number;       // 0-100 % from left
  y: number;       // 0-100 % from top
  width: number;   // 0-100 % of image width
  height: number;  // 0-100 % of image height
  description: string;
  suggestion: string;
}

export interface EvidenceItem {
  field: string;                        // e.g. "technique", "lighting"
  source: 'EXIF' | 'CV' | 'model';
  value: string;                        // e.g. "f/2.8", "12% highlight clipping"
  confidence?: number;                  // 0-1, CV-derived evidence only
}

export interface TokenUsage {
  totalTokens?: number;
  promptTokens?: number;
  completionTokens?: number;
  estimatedCost?: number;               // $0 for local inference
}

// ─── Scoring ─────────────────────────────────────────────────────────────────

export interface ScoreBreakdown {
  composition: number;    // 0-10
  lighting: number;       // 0-10
  technique: number;      // 0-10
  creativity: number;     // 0-10
  subjectImpact: number;  // 0-10
}

// ─── Critique ─────────────────────────────────────────────────────────────────

export interface CritiqueBreakdown {
  composition: string;
  lighting: string;
  technique: string;
  overall: string;
}

// ─── Rationale ─────────────────────────────────────────────────────────────────

export interface Rationale {
  observations: string[];     // 3-6 initial observations
  reasoningSteps: string[];   // 3-5 evaluation steps
  priorityFixes: string[];    // 3-5 ranked improvements
}

// ─── Camera settings estimate ─────────────────────────────────────────────────

export interface CameraSettings {
  focalLength: string;   // e.g. "85mm" | "unknown"
  aperture: string;      // e.g. "f/2.8" | "unknown"
  shutterSpeed: string;  // e.g. "1/250s" | "unknown"
  iso: string;           // e.g. "400" | "unknown"
}

// ─── Main v2 analysis result ──────────────────────────────────────────────────

export interface PhotoAnalysisV2 {
  // Provenance
  schema_version: string;         // "2.0"
  model_id: string;               // "gemma-4-e4b" | "gemma4-cloud"
  quantization?: string;          // "Q4_K_M" | "Q5_K_M" | "Q8_0"
  timestamp?: number;             // Unix ms

  // Scoring
  scores: ScoreBreakdown;

  // Critique
  critique: CritiqueBreakdown;

  // Arrays
  strengths: string[];            // 3-6 items
  improvements: string[];         // 3-6 items
  learningPath: string[];         // 3-5 items

  // Camera
  settingsEstimate: CameraSettings;

  // Spatial
  boundingBoxes?: BoundingBox[];

  // Structured reasoning
  rationale: Rationale;

  // Evidence linking (optional)
  evidence?: EvidenceItem[];

  // Token economics (optional)
  tokenUsage?: TokenUsage;

  // Refusal (explicit, unified — no more implicit all-zeros detection)
  is_refusal?: boolean;
  refusal_reason?: string;
  refusal_category?: RefusalCategory;

  // Provenance flags stamped post-validation (not from the model)
  wasDeepMode?: boolean;
  /** True when analysis used minimal cull schema (fast batch path). */
  wasCullBatch?: boolean;
  outputLanguage?: string;
}

// ─── CV data from cvService ────────────────────────────────────────────────────

export interface HistogramData {
  red: number[];    // 256 buckets
  green: number[];
  blue: number[];
  luminance: number[];
}

export interface FocusMapData {
  grid: number[][];          // 10×10 Laplacian variance grid
  sharpnessScore: number;    // 0-1
  focusRegion?: { x: number; y: number; width: number; height: number };
}

export interface ColorStats {
  dominant: string[];         // hex colors, top 5
  saturation: number;         // 0-1 average
  temperature: 'warm' | 'cool' | 'neutral';
}

export interface CVData {
  exif: Record<string, string | number | null>;
  histogram?: HistogramData;
  focusMap?: FocusMapData;
  colorStats?: ColorStats;
  highlightClipping?: number;   // 0-100 %
  shadowClipping?: number;      // 0-100 %
  faceCount?: number;
}

// ─── Operational mode ─────────────────────────────────────────────────────────

export type OperationalMode = 'studio' | 'voice' | 'quest' | 'sell' | 'vault';

// ─── App state (v2) ───────────────────────────────────────────────────────────

export interface AppStateV2 {
  mode: OperationalMode;
  image: { src: string; mimeType: string } | null;
  analysis: PhotoAnalysisV2 | null;
  cvData: CVData | null;
  isAnalyzing: boolean;
  mentorMessages: MentorMessageV2[];
  error: string | null;
}

// ─── Mentor chat ──────────────────────────────────────────────────────────────

export interface MentorMessageV2 {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

// ─── Batch processing ─────────────────────────────────────────────────────────

export type BatchJobStatus = 'pending' | 'processing' | 'done' | 'error' | 'skipped';

export interface BatchJob {
  id: string;
  filePath: string;
  fileName: string;
  status: BatchJobStatus;
  addedAt: number;
  startedAt?: number;
  completedAt?: number;
  result?: PhotoAnalysisV2;
  errorMessage?: string;
  retryCount: number;
}

export interface BatchQueueState {
  jobs: BatchJob[];
  lastCheckpoint: number;     // Unix ms
  totalProcessed: number;
  totalErrors: number;
}

// ─── Audit log (Vault Mode) ────────────────────────────────────────────────────

export interface AuditLogEntry {
  seq: number;
  timestamp: number;
  event: 'analysis_complete' | 'refusal' | 'mode_change' | 'session_start' | 'session_end';
  imageHash: string;           // SHA-256 of image bytes
  resultHash?: string;         // SHA-256 of analysis JSON
  modelId: string;
  prevHash: string;             // Hash of previous entry (chain)
  hash: string;                 // Hash of this entry
  metadata?: Record<string, unknown>;
}

// ─── Session history (economics dashboard) ────────────────────────────────────

export interface SessionHistoryEntry {
  id: number;
  timestamp: number;
  modelId: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  latencyMs: number;
  thumbnail?: string;  // base64 thumbnail (~100px)
  filename?: string;
  analysisId?: string; // for future reference
}

// ─── Web batch upload (browser File objects) ─────────────────────────────────

export interface WebBatchItem {
  id: string;
  file: File;
  base64: string;
  /** Small preview retained for restored/history cards when full image bytes are unavailable. */
  thumbnail?: string;
  mimeType: string;
  imageEl: HTMLImageElement | null;
  status: 'pending' | 'analyzing' | 'completed' | 'failed';
  analysis?: PhotoAnalysisV2;
  error?: string;
}

export interface WebBatchState {
  items: WebBatchItem[];
  currentIndex: number;
  isProcessing: boolean;
}
