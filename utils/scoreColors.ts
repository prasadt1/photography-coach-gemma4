/**
 * Utility for consistent score-based color coding across the app.
 * - 8+ = Emerald (strong)
 * - 5-7.9 = Amber (moderate)
 * - <5 = Rose (needs work)
 */

export interface ScoreColors {
  text: string;
  bg: string;
  border: string;
  bar: string;
}

export function getScoreColors(score: number): ScoreColors {
  if (score >= 8) {
    return {
      text: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/30',
      bar: 'bg-emerald-500',
    };
  }
  if (score >= 5) {
    return {
      text: 'text-amber-400',
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/30',
      bar: 'bg-amber-500',
    };
  }
  return {
    text: 'text-rose-400',
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/30',
    bar: 'bg-rose-500',
  };
}

export function getScoreTextColor(score: number): string {
  return getScoreColors(score).text;
}

export function getScoreBarColor(score: number): string {
  return getScoreColors(score).bar;
}
