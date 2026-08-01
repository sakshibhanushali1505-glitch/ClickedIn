const SESSION_KEY = 'clickedin_session_id';

export function getSessionId() {
  if (typeof window === 'undefined') return '';
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = `ci_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

export async function trackActivity(event, opts = {}) {
  if (typeof window === 'undefined') return;
  const body = {
    event,
    path: opts.path ?? window.location.pathname + window.location.search,
    label: opts.label,
    metadata: opts.metadata || {},
    sessionId: getSessionId(),
    userId: opts.userId || null,
    userName: opts.userName || null,
  };

  try {
    const bodyStr = JSON.stringify(body);
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function' && !opts.userId) {
      const blob = new Blob([bodyStr], { type: 'application/json' });
      navigator.sendBeacon('/api/track', blob);
      return;
    }
    void fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: bodyStr,
      keepalive: true,
    });
  } catch {
    /* non-blocking */
  }
}
