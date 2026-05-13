export type RuntimeProfile = 'single' | 'batch-pass1';

export interface AnalyzePhotoBudgetInput {
  deepMode: boolean;
  fastMode: boolean;
  retries: number;
  profile: RuntimeProfile;
  defaultTimeoutMs: number;
}

export interface AnalyzePhotoBudget {
  timeoutMs: number;
  retries: number;
  numPredict?: number;
  numCtx?: number;
}

export interface CullAttempt {
  numPredict: number;
  timeoutMs: number;
}

/**
 * Keep pass-1 batch runtime bounded so retries do not spiral.
 */
export function getAnalyzePhotoBudget({
  deepMode,
  fastMode,
  retries,
  profile,
  defaultTimeoutMs,
}: AnalyzePhotoBudgetInput): AnalyzePhotoBudget {
  if (deepMode) {
    return {
      timeoutMs: 240_000,
      retries: 0,
      numPredict: 2000,
      numCtx: 8192,
    };
  }

  if (profile === 'batch-pass1') {
    return {
      timeoutMs: fastMode ? 85_000 : 95_000,
      retries: 0,
      numPredict: fastMode ? 850 : undefined,
      numCtx: fastMode ? 4096 : undefined,
    };
  }

  if (fastMode) {
    return {
      timeoutMs: 110_000,
      retries: Math.min(1, retries),
      numPredict: 900,
      numCtx: 4096,
    };
  }

  return {
    timeoutMs: defaultTimeoutMs,
    retries,
  };
}

export function getCullAttemptPlan(profile: RuntimeProfile): CullAttempt[] {
  if (profile === 'batch-pass1') {
    return [
      { numPredict: 560, timeoutMs: 60_000 },
      { numPredict: 760, timeoutMs: 75_000 },
    ];
  }

  return [
    { numPredict: 720, timeoutMs: 95_000 },
    { numPredict: 960, timeoutMs: 95_000 },
  ];
}
