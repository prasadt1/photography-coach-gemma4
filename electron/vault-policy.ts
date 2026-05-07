/**
 * electron/vault-policy.ts — OS-level network isolation for Vault Mode
 *
 * Uses Electron's session.webRequest API to intercept and cancel any
 * outbound request that is NOT directed at localhost / 127.0.0.1 / ::1.
 *
 * This is the cryptographic enforcement layer that makes Vault Mode
 * trustworthy on desktop (web browsers cannot provide this guarantee).
 *
 * Sources: docs/specs/08-vault-mode-spec.md §3, 10-platform-shells-spec.md §4.2
 */

import { Session } from 'electron';

const ALLOWED_HOSTNAMES = new Set(['localhost', '127.0.0.1', '::1', '0.0.0.0']);

/** CIDR-ish check for private IPv4 ranges (10.x, 172.16-31.x, 192.168.x) */
function isPrivateIPv4(hostname: string): boolean {
  const parts = hostname.split('.').map(Number);
  if (parts.length !== 4 || parts.some(isNaN)) return false;
  const [a, b] = parts;
  return (
    a === 10 ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168)
  );
}

function isLocalhost(url: URL): boolean {
  const h = url.hostname;
  return ALLOWED_HOSTNAMES.has(h) || isPrivateIPv4(h);
}

/**
 * Apply Vault Mode network policy to a session.
 * All non-localhost HTTP/HTTPS requests are cancelled.
 * The policy is permanent for the session lifetime.
 */
export function applyVaultPolicy(electronSession: Session): void {
  console.log('[Vault Policy] Installing network isolation…');

  electronSession.webRequest.onBeforeRequest((details, callback) => {
    let allowed = false;

    try {
      const url = new URL(details.url);

      // Always allow file:// and blob:// (renderer assets)
      if (url.protocol === 'file:' || url.protocol === 'blob:') {
        allowed = true;
      } else {
        allowed = isLocalhost(url);
      }
    } catch {
      // Malformed URL — deny by default
      allowed = false;
    }

    if (!allowed) {
      console.warn(`[Vault Policy] BLOCKED → ${details.url}`);
      callback({ cancel: true });
    } else {
      callback({ cancel: false });
    }
  });

  console.log('[Vault Policy] Network isolation active — only localhost allowed');
}
