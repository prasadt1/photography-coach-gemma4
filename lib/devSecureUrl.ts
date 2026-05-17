/** Session flag: open live camera once after HTTP → HTTPS upgrade on LAN dev. */
export const OPEN_CAMERA_AFTER_HTTPS_KEY = 'lens-open-camera-after-https';

/**
 * On phone/LAN dev over HTTP, Safari blocks getUserMedia. Same host over HTTPS fixes it.
 * Returns null when already secure or no upgrade applies.
 */
export function getHttpsUpgradeUrl(): string | null {
  if (typeof window === 'undefined' || window.isSecureContext) return null;
  const { hostname, port, pathname, search, hash } = window.location;
  if (!hostname || hostname === 'localhost' || hostname === '127.0.0.1') {
    return null;
  }
  const p = port || '3000';
  return `https://${hostname}:${p}${pathname}${search}${hash}`;
}

export function redirectToHttpsForCamera(): boolean {
  const url = getHttpsUpgradeUrl();
  if (!url) return false;
  try {
    sessionStorage.setItem(OPEN_CAMERA_AFTER_HTTPS_KEY, '1');
  } catch {
    /* private mode */
  }
  window.location.assign(url);
  return true;
}

export function consumeOpenCameraAfterHttps(): boolean {
  try {
    if (sessionStorage.getItem(OPEN_CAMERA_AFTER_HTTPS_KEY) !== '1') return false;
    sessionStorage.removeItem(OPEN_CAMERA_AFTER_HTTPS_KEY);
    return true;
  } catch {
    return false;
  }
}
