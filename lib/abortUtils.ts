/** Safari < 17.4 lacks AbortSignal.any — needed for Ollama fetch timeouts on iPhone. */
export function combineAbortSignals(signals: AbortSignal[]): AbortSignal {
  const list = signals.filter(Boolean);
  if (list.length === 0) {
    return new AbortController().signal;
  }
  if (list.length === 1) {
    return list[0];
  }
  if (typeof AbortSignal.any === 'function') {
    return AbortSignal.any(list);
  }
  const controller = new AbortController();
  for (const s of list) {
    if (s.aborted) {
      controller.abort(s.reason);
      return controller.signal;
    }
    s.addEventListener('abort', () => controller.abort(s.reason), { once: true });
  }
  return controller.signal;
}

export function timeoutAbortSignal(ms: number): AbortSignal {
  if (typeof AbortSignal.timeout === 'function') {
    return AbortSignal.timeout(ms);
  }
  const controller = new AbortController();
  setTimeout(() => controller.abort(new DOMException('Timeout', 'TimeoutError')), ms);
  return controller.signal;
}
