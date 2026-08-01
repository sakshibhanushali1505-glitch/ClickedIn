const crypto = require('crypto');
const db = require('./dbService');

const COOKIE_NAME = 'clickedin_sid';
const SESSION_DAYS = 30;

function newSessionId() {
  return crypto.randomBytes(24).toString('hex');
}

function cookieOptions() {
  const isProd = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    maxAge: SESSION_DAYS * 24 * 60 * 60 * 1000,
    path: '/',
  };
}

async function createSession(userId, meta = {}) {
  const id = newSessionId();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  const session = {
    id,
    userId: String(userId),
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    ip: meta.ip || '',
    userAgent: meta.userAgent || '',
  };
  await db.saveSession(session);
  return session;
}

async function destroySession(sessionId) {
  if (!sessionId) return;
  await db.deleteSession(sessionId);
}

async function loadUserFromSession(sessionId) {
  if (!sessionId) return null;
  const session = await db.getSession(sessionId);
  if (!session) return null;
  if (session.expiresAt && new Date(session.expiresAt) < new Date()) {
    await db.deleteSession(sessionId);
    return null;
  }
  const settings = await db.getUserSettings(session.userId);
  if (!settings || !settings.accessToken) return null;
  return {
    sessionId,
    userId: session.userId,
    accessToken: settings.accessToken,
    profile: settings.linkedInProfile || { id: session.userId, name: settings.name || 'User' },
    settings,
  };
}

/** Express middleware: attach req.auth (or null). */
async function attachAuth(req, res, next) {
  try {
    const sid = req.cookies?.[COOKIE_NAME];
    req.auth = sid ? await loadUserFromSession(sid) : null;
  } catch (err) {
    console.error('attachAuth error', err);
    req.auth = null;
  }
  next();
}

function requireAuth(req, res, next) {
  if (!req.auth?.userId) {
    return res.status(401).json({ error: 'Unauthorized. Please log in with LinkedIn.' });
  }
  next();
}

function setSessionCookie(res, sessionId) {
  res.cookie(COOKIE_NAME, sessionId, cookieOptions());
}

function clearSessionCookie(res) {
  res.clearCookie(COOKIE_NAME, { path: '/' });
}

async function establishLogin(res, profile, accessToken, meta = {}) {
  await db.saveUserSettings(profile.id, {
    accessToken,
    linkedInProfile: profile,
  });
  const session = await createSession(profile.id, meta);
  setSessionCookie(res, session.id);
  return session;
}

module.exports = {
  COOKIE_NAME,
  attachAuth,
  requireAuth,
  establishLogin,
  destroySession,
  clearSessionCookie,
  setSessionCookie,
};
