/**
 * Artisan journey entry — skip voice-consent for LAN demo / video recording.
 *
 * - `?skipConsent=1` or `?record=1` — always skip (any host)
 * - DEV + HTTPS + LAN IP — auto-skip (phone filming on same Wi‑Fi)
 */

function isLanHostname(hostname: string): boolean {
  return /^(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\.)/.test(hostname);
}

export function shouldSkipArtisanVoiceConsent(): boolean {
  if (typeof window === 'undefined') return false;

  const q = new URLSearchParams(window.location.search);
  if (q.get('skipConsent') === '1' || q.get('record') === '1') return true;

  if (!import.meta.env.DEV || !window.isSecureContext) return false;
  const h = window.location.hostname;
  if (!h || h === 'localhost' || h === '127.0.0.1') return false;
  return isLanHostname(h);
}
