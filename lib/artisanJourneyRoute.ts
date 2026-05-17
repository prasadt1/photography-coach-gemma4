/**
 * Artisan journey entry — demo vs standard paths.
 *
 * Tap-only demo (LAN / ?record=1): welcome → TTS tap guidance → no speech recognition.
 * Standard: voice consent screen (Yes / No) then journey.
 */

function isLanHostname(hostname: string): boolean {
  return /^(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\.)/.test(hostname);
}

/** LAN HTTPS dev or ?record=1 — tap + TTS demo for video (no voice commands). */
export function shouldUseTapOnlyDemo(): boolean {
  if (typeof window === 'undefined') return false;

  const q = new URLSearchParams(window.location.search);
  if (q.get('record') === '1' || q.get('skipConsent') === '1') return true;

  if (!import.meta.env.DEV || !window.isSecureContext) return false;
  const h = window.location.hostname;
  if (!h || h === 'localhost' || h === '127.0.0.1') return false;
  return isLanHostname(h);
}
