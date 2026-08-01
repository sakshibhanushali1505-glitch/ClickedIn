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

async function getPosts() {
  if (!useFirestore) return memoryPosts;
  try {
    const snapshot = await db.collection('posts').get();
    return snapshot.docs.map(doc => doc.data());
  } catch (err) {
    console.error("Firestore get error:", err);
    return memoryPosts; // Fallback on fail
  }
}

async function savePost(post) {
  if (useFirestore) {
    try {
      await db.collection('posts').doc(post.id.toString()).set(post);
    } catch (err) {
      console.error("Firestore save error:", err);
    }
  } else {
    const idx = memoryPosts.findIndex(p => p.id === post.id);
    if (idx >= 0) memoryPosts[idx] = post;
    else memoryPosts.push(post);
    saveLocalDb();
  }
}

async function savePosts(posts) {
  for (const post of posts) {
    await savePost(post);
  }
}

async function getPostById(id) {
  if (!useFirestore) return memoryPosts.find(p => p.id == id);
  try {
    const doc = await db.collection('posts').doc(id.toString()).get();
    return doc.exists ? doc.data() : null;
  } catch (err) {
    return memoryPosts.find(p => p.id == id);
  }
}

async function updatePost(id, updates) {
  const post = await getPostById(id);
  if (!post) return null;
  const updatedPost = { ...post, ...updates };
  await savePost(updatedPost);
  return updatedPost;
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
  if (useFirestore) {
    try {
      await db.collection('users').doc(userId.toString()).set(settings, { merge: true });
    } catch (err) {
      console.error("Firestore save user error:", err);
    }
  }
  memoryUsers[userId] = { ...memoryUsers[userId], ...settings };
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
  if (useFirestore) {
    try {
      await db.collection('sessions').doc(session.id).set(session);
      return session;
    } catch (err) {
      console.error('Firestore save session error:', err);
    }
  }
  memorySessions[session.id] = session;
  return session;
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
