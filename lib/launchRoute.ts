import type { OperationalMode } from '../types.v2';
import { isJudgeDemoBuild } from './deploymentProfile';

/** Judge demo: home first. Artisan product: guided journey first. Override with ?mode=home | ?mode=studio */
export function getInitialAppRoute(): { mode: OperationalMode; showHome: boolean } {
  if (typeof window === 'undefined') {
    return isJudgeDemoBuild()
      ? { mode: 'studio', showHome: true }
      : { mode: 'sell', showHome: false };
  }
  const modeParam = new URLSearchParams(window.location.search).get('mode');
  if (modeParam === 'studio') {
    return { mode: 'studio', showHome: false };
  }
  if (modeParam === 'home') {
    return { mode: 'studio', showHome: true };
  }
  if (isJudgeDemoBuild()) {
    return { mode: 'studio', showHome: true };
  }
  return { mode: 'sell', showHome: false };
}

/** Photo Studio entry — dev builds or explicit ?mode=studio only */
export function showStudioModeEntry(): boolean {
  if (import.meta.env.DEV) return true;
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).get('mode') === 'studio';
}
