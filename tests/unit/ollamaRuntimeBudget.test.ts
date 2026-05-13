import { describe, expect, it } from 'vitest';
import { getAnalyzePhotoBudget, getCullAttemptPlan } from '../../services/ollamaRuntimeBudget';

describe('ollamaRuntimeBudget', () => {
  it('caps pass-1 batch retries to keep runtime bounded', () => {
    const budget = getAnalyzePhotoBudget({
      deepMode: false,
      fastMode: false,
      retries: 2,
      profile: 'batch-pass1',
      defaultTimeoutMs: 120_000,
    });

    expect(budget.retries).toBe(0);
    expect(budget.timeoutMs).toBe(95_000);
  });

  it('keeps deep critique with high context and no retries', () => {
    const budget = getAnalyzePhotoBudget({
      deepMode: true,
      fastMode: false,
      retries: 2,
      profile: 'single',
      defaultTimeoutMs: 120_000,
    });

    expect(budget.retries).toBe(0);
    expect(budget.timeoutMs).toBe(240_000);
    expect(budget.numPredict).toBe(2000);
    expect(budget.numCtx).toBe(8192);
  });

  it('uses tighter cull attempts for pass-1 batch profile', () => {
    const batchPlan = getCullAttemptPlan('batch-pass1');
    const singlePlan = getCullAttemptPlan('single');

    expect(batchPlan).toHaveLength(2);
    expect(batchPlan[0].timeoutMs).toBeLessThan(singlePlan[0].timeoutMs);
    expect(batchPlan[0].numPredict).toBeLessThan(singlePlan[0].numPredict);
  });
});
