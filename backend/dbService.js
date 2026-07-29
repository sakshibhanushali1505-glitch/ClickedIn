const { Firestore } = require('@google-cloud/firestore');

let db = null;
let useFirestore = false;
let memoryPosts = []; // Fallback
let memoryUsers = {}; // Fallback for user settings

const isProduction = process.env.NODE_ENV === 'production';
const hasCredentials = !!process.env.GOOGLE_APPLICATION_CREDENTIALS;

if (isProduction || hasCredentials) {
  try {
    db = new Firestore({ projectId: 'jr-consulting-co' });
    useFirestore = true;
    console.log("Firestore initialized successfully.");
  } catch (err) {
    console.warn("Could not initialize Firestore, falling back to in-memory storage.", err);
  }
} else {
  console.log("Running locally without Google credentials. Falling back to in-memory storage.");
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
