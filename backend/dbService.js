const { Firestore } = require('@google-cloud/firestore');

let db = null;
let useFirestore = false;
let memoryPosts = []; // Fallback
let memoryUsers = {}; // Fallback for user settings

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

module.exports = { getPosts, savePost, savePosts, getPostById, updatePost, deletePost, getUserSettings, saveUserSettings, getAllUsersWithSettings };
