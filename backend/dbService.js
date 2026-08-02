const { Firestore } = require('@google-cloud/firestore');

let db = null;
let useFirestore = false;
let memoryPosts = []; // Fallback
let memoryUsers = {}; // Fallback for user settings
let memoryActivity = []; // Fallback visitor / activity events
let memorySessions = {}; // Fallback auth sessions { [id]: session }

const isProduction = process.env.NODE_ENV === 'production';
const hasCredentials = !!process.env.GOOGLE_APPLICATION_CREDENTIALS;

const fs = require('fs');
const path = require('path');
const localDbPath = path.join(__dirname, 'local_db.json');

function loadLocalDb() {
  if (fs.existsSync(localDbPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(localDbPath, 'utf8'));
      memoryPosts = data.memoryPosts || [];
      memoryUsers = data.memoryUsers || {};
    } catch (e) {
      console.warn("Failed to load local DB, starting fresh.");
    }
  }
}

function saveLocalDb() {
  fs.writeFileSync(localDbPath, JSON.stringify({ memoryPosts, memoryUsers }, null, 2), 'utf8');
}

if (isProduction || hasCredentials) {
  try {
    db = new Firestore({ projectId: 'jr-consulting-co' });
    db.settings({ ignoreUndefinedProperties: true });
    useFirestore = true;
    console.log("Firestore initialized successfully.");
    
    // Auto-migration on startup
    setTimeout(async () => {
      try {
        const testDocs = await db.collection('users').limit(1).get();
        if (testDocs.empty && fs.existsSync(localDbPath)) {
          console.log("[Auto-Migrate] Firestore is empty. Migrating from local_db.json...");
          const data = JSON.parse(fs.readFileSync(localDbPath, 'utf8'));
          
          if (data.memoryPosts) {
            for (const p of data.memoryPosts) {
              await db.collection('posts').doc(p.id.toString()).set(p);
            }
          }
          if (data.memoryUsers) {
            for (const [uid, settings] of Object.entries(data.memoryUsers)) {
              await db.collection('users').doc(uid.toString()).set(settings, { merge: true });
            }
          }
          console.log("[Auto-Migrate] Migration complete!");
        }
      } catch (err) {
        console.error("Auto-migration failed:", err);
      }
    }, 2000);
    
  } catch (err) {
    console.warn("Could not initialize Firestore, falling back to local file storage.", err);
    loadLocalDb();
  }
} else {
  console.log("Running locally without Google credentials. Falling back to local file storage.");
  loadLocalDb();
}

/** Drop undefined fields so Firestore writes never fail. */
function sanitizeForFirestore(value) {
  if (Array.isArray(value)) {
    return value.map(sanitizeForFirestore);
  }
  if (value && typeof value === 'object') {
    // Keep Date as ISO below via toIsoDate; plain objects recurse
    if (value instanceof Date) return value;
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      if (v === undefined) continue;
      out[k] = sanitizeForFirestore(v);
    }
    return out;
  }
  return value;
}

/** Convert Date / Firestore Timestamp / {_seconds} into ISO string (or null). */
function toIsoDate(value) {
  if (value == null || value === '') return null;
  if (typeof value === 'string') {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString();
  }
  if (typeof value.toDate === 'function') {
    try {
      return value.toDate().toISOString();
    } catch {
      return null;
    }
  }
  if (typeof value === 'object' && (value._seconds != null || value.seconds != null)) {
    const seconds = value._seconds ?? value.seconds;
    const nanos = value._nanoseconds ?? value.nanoseconds ?? 0;
    return new Date(seconds * 1000 + Math.floor(nanos / 1e6)).toISOString();
  }
  if (typeof value === 'number') {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }
  return null;
}

/** Normalize a post document for API / scheduler use. */
function normalizePost(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const post = { ...raw };
  if (post.scheduledTime !== undefined) {
    post.scheduledTime = toIsoDate(post.scheduledTime);
  }
  if (post.id != null) post.id = Number(post.id) || post.id;
  return post;
}

async function getPosts() {
  if (!useFirestore) return memoryPosts.map(normalizePost).filter(Boolean);
  try {
    const snapshot = await db.collection('posts').get();
    return snapshot.docs.map(doc => normalizePost(doc.data())).filter(Boolean);
  } catch (err) {
    console.error("Firestore get error:", err);
    return memoryPosts.map(normalizePost).filter(Boolean);
  }
}

async function savePost(post) {
  const clean = sanitizeForFirestore({
    ...post,
    scheduledTime: post.scheduledTime == null ? null : toIsoDate(post.scheduledTime),
  });
  if (useFirestore) {
    try {
      await db.collection('posts').doc(String(clean.id)).set(clean);
    } catch (err) {
      console.error("Firestore save error:", err);
      throw err;
    }
  } else {
    const idx = memoryPosts.findIndex(p => p.id == clean.id);
    if (idx >= 0) memoryPosts[idx] = clean;
    else memoryPosts.push(clean);
    saveLocalDb();
  }
  return clean;
}

async function savePosts(posts) {
  for (const post of posts) {
    await savePost(post);
  }
}

async function getPostById(id) {
  if (!useFirestore) {
    const found = memoryPosts.find(p => p.id == id);
    return found ? normalizePost(found) : null;
  }
  try {
    const doc = await db.collection('posts').doc(String(id)).get();
    return doc.exists ? normalizePost(doc.data()) : null;
  } catch (err) {
    const found = memoryPosts.find(p => p.id == id);
    return found ? normalizePost(found) : null;
  }
}

async function updatePost(id, updates) {
  const post = await getPostById(id);
  if (!post) return null;
  const patch = {};
  for (const [k, v] of Object.entries(updates || {})) {
    if (v !== undefined) patch[k] = v;
  }
  const merged = { ...post, ...patch };
  if (Object.prototype.hasOwnProperty.call(patch, 'scheduledTime')) {
    merged.scheduledTime = patch.scheduledTime == null ? null : toIsoDate(patch.scheduledTime);
  }
  return savePost(merged);
}

async function deletePost(id) {
  if (useFirestore) {
    try {
      await db.collection('posts').doc(id.toString()).delete();
    } catch (err) {
      console.error("Firestore delete error:", err);
    }
  }
  memoryPosts = memoryPosts.filter(p => p.id != id);
  if (!useFirestore) saveLocalDb();
  return true;
}

async function getUserSettings(userId) {
  if (!useFirestore) return memoryUsers[userId] || {};
  try {
    const doc = await db.collection('users').doc(userId.toString()).get();
    return doc.exists ? doc.data() : {};
  } catch (err) {
    console.error("Firestore get user error:", err);
    return memoryUsers[userId] || {};
  }
}

async function saveUserSettings(userId, settings) {
  const clean = sanitizeForFirestore(settings || {});
  if (useFirestore) {
    try {
      await db.collection('users').doc(userId.toString()).set(clean, { merge: true });
    } catch (err) {
      console.error("Firestore save user error:", err);
      throw err;
    }
  }
  memoryUsers[userId] = { ...memoryUsers[userId], ...clean };
  if (!useFirestore) saveLocalDb();
  return memoryUsers[userId];
}

async function getAllUsersWithSettings() {
  if (!useFirestore) return Object.entries(memoryUsers).map(([id, data]) => ({ id, ...data }));
  try {
    const snapshot = await db.collection('users').get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (err) {
    console.error("Firestore get users error:", err);
    return Object.entries(memoryUsers).map(([id, data]) => ({ id, ...data }));
  }
}

function pickRequestMeta(req) {
  const xf = req.headers['x-forwarded-for'];
  const ip = (typeof xf === 'string' ? xf.split(',')[0].trim() : '') ||
    req.headers['x-real-ip'] ||
    req.socket?.remoteAddress ||
    '';
  return {
    ip: String(ip),
    userAgent: String(req.headers['user-agent'] || ''),
  };
}

async function logActivity(event) {
  const doc = {
    id: event.id || `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    event: event.event || 'page_view',
    path: event.path || '/',
    label: event.label || null,
    metadata: event.metadata || {},
    sessionId: event.sessionId || null,
    userId: event.userId || null,
    userName: event.userName || null,
    ip: event.ip || '',
    userAgent: event.userAgent || '',
    createdAt: event.createdAt || new Date().toISOString(),
  };

  if (useFirestore) {
    try {
      await db.collection('activity_events').doc(doc.id).set(doc);
    } catch (err) {
      console.error('Firestore activity write error:', err);
      memoryActivity.unshift(doc);
      if (memoryActivity.length > 5000) memoryActivity.length = 5000;
    }
  } else {
    memoryActivity.unshift(doc);
    if (memoryActivity.length > 5000) memoryActivity.length = 5000;
  }
  return doc;
}

async function listActivity({ limit = 100, sinceIso = null } = {}) {
  const lim = Math.min(Math.max(Number(limit) || 100, 1), 500);
  if (useFirestore) {
    try {
      let q = db.collection('activity_events').orderBy('createdAt', 'desc').limit(lim);
      if (sinceIso) {
        q = db.collection('activity_events')
          .where('createdAt', '>=', sinceIso)
          .orderBy('createdAt', 'desc')
          .limit(lim);
      }
      const snapshot = await q.get();
      return snapshot.docs.map((d) => d.data());
    } catch (err) {
      console.error('Firestore activity list error:', err);
    }
  }
  let rows = [...memoryActivity];
  if (sinceIso) rows = rows.filter((r) => r.createdAt >= sinceIso);
  return rows.slice(0, lim);
}

async function getAdminDashboard() {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  let recent = [];
  let last24h = [];

  if (useFirestore) {
    try {
      const recentSnap = await db.collection('activity_events')
        .orderBy('createdAt', 'desc')
        .limit(40)
        .get();
      recent = recentSnap.docs.map((d) => d.data());

      const daySnap = await db.collection('activity_events')
        .where('createdAt', '>=', since)
        .orderBy('createdAt', 'desc')
        .limit(2000)
        .get();
      last24h = daySnap.docs.map((d) => d.data());
    } catch (err) {
      console.error('Firestore admin dashboard error:', err);
      recent = memoryActivity.slice(0, 40);
      last24h = memoryActivity.filter((r) => r.createdAt >= since);
    }
  } else {
    recent = memoryActivity.slice(0, 40);
    last24h = memoryActivity.filter((r) => r.createdAt >= since);
  }

  const uniqueSessions = new Set(last24h.map((e) => e.sessionId).filter(Boolean));
  const pageViewsLast24h = last24h.filter((e) => e.event === 'page_view').length;
  const loginsLast24h = last24h.filter((e) => e.event === 'login').length;
  const users = await getAllUsersWithSettings();

  // Top paths last 24h
  const pathCounts = {};
  for (const e of last24h.filter((x) => x.event === 'page_view')) {
    const p = e.path || '/';
    pathCounts[p] = (pathCounts[p] || 0) + 1;
  }
  const topPaths = Object.entries(pathCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([path, count]) => ({ path, count }));

  return {
    stats: {
      uniqueVisitorsLast24h: uniqueSessions.size,
      pageViewsLast24h,
      activityLast24h: last24h.length,
      loginsLast24h,
      registeredUsers: users.length,
      topPaths,
    },
    recentActivity: recent,
    users: users.map((u) => ({
      id: u.id,
      name: u.linkedInProfile?.name || u.name || null,
      pictureUrl: u.linkedInProfile?.pictureUrl || null,
      fullyAutomated: !!u.fullyAutomated,
      hasToken: !!u.accessToken,
    })),
  };
}

async function saveSession(session) {
  const clean = sanitizeForFirestore(session || {});
  if (useFirestore) {
    try {
      await db.collection('sessions').doc(clean.id).set(clean);
      return clean;
    } catch (err) {
      console.error('Firestore save session error:', err);
      throw err;
    }
  }
  memorySessions[clean.id] = clean;
  return clean;
}

async function getSession(sessionId) {
  if (!sessionId) return null;
  if (useFirestore) {
    try {
      const doc = await db.collection('sessions').doc(String(sessionId)).get();
      return doc.exists ? doc.data() : null;
    } catch (err) {
      console.error('Firestore get session error:', err);
    }
  }
  return memorySessions[sessionId] || null;
}

async function deleteSession(sessionId) {
  if (!sessionId) return;
  if (useFirestore) {
    try {
      await db.collection('sessions').doc(String(sessionId)).delete();
    } catch (err) {
      console.error('Firestore delete session error:', err);
    }
  }
  delete memorySessions[sessionId];
}

module.exports = {
  getPosts,
  savePost,
  savePosts,
  getPostById,
  updatePost,
  deletePost,
  getUserSettings,
  saveUserSettings,
  getAllUsersWithSettings,
  pickRequestMeta,
  logActivity,
  listActivity,
  getAdminDashboard,
  saveSession,
  getSession,
  deleteSession,
};
