import { describe, expect, it } from 'vitest';
import { normalizeCullToPhotoAnalysisV2 } from '../../services/cullNormalize';

describe('normalizeCullToPhotoAnalysisV2', () => {
  const baseRaw = {
    scores: {
      composition: 7,
      lighting: 6,
      technique: 6,
      creativity: 6,
      subjectImpact: 7,
    },
    critique: {
      overall: 'Strong keeper with clean framing.',
      composition: 'Balanced frame.',
      lighting: 'Good light quality.',
      technique: 'Sharp focus.',
    },
  };

  it('uses pass-1 specific fallback copy, not ambiguous legacy wording', () => {
    const normalized = normalizeCullToPhotoAnalysisV2(baseRaw, undefined);
    const allText = [
      ...normalized.rationale!.observations,
      ...normalized.rationale!.reasoningSteps,
      ...normalized.rationale!.priorityFixes,
      ...normalized.strengths!,
      ...normalized.improvements!,
      ...normalized.learningPath!,
    ].join(' | ');

    expect(allText).not.toContain('Derived from cull observations');
    expect(allText).toContain('Deep Critique');
    expect(allText).toContain('Pass 1 cull');
    expect(allText).toContain('placeholder');
  });
});
