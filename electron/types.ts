/**
 * Minimal type definitions for Electron main process
 * Copied from ../types.v2.ts to avoid tsconfig.electron.json rootDir issues
 */

export interface PhotoAnalysisV2 {
  schema_version: string;
  model_id: string;
  quantization?: string;
  timestamp?: number;
  scores: {
    composition: number;
    lighting: number;
    technique: number;
    creativity: number;
    subjectImpact: number;
  };
  critique: {
    composition: string;
    lighting: string;
    technique: string;
    overall: string;
  };
  strengths: string[];
  improvements: string[];
  learningPath: string[];
  settingsEstimate: {
    focalLength: string;
    aperture: string;
    shutterSpeed: string;
    iso: string;
  };
  boundingBoxes?: Array<{
    type: string;
    severity: string;
    x: number;
    y: number;
    width: number;
    height: number;
    description: string;
    suggestion: string;
  }>;
  rationale: {
    observations: string[];
    reasoningSteps: string[];
    priorityFixes: string[];
  };
  evidence?: Array<{
    field: string;
    source: string;
    value: string;
    confidence?: number;
  }>;
  tokenUsage?: {
    totalTokens?: number;
    promptTokens?: number;
    completionTokens?: number;
    estimatedCost?: number;
  };
  is_refusal?: boolean;
  refusal_reason?: string;
  refusal_category?: string;
}

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
  lastCheckpoint: number;
  totalProcessed: number;
  totalErrors: number;
}
