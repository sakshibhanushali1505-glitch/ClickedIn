const fs = require('fs');
const path = require('path');
const { Firestore } = require('@google-cloud/firestore');

async function migrate() {
  console.log("Starting DB Migration...");
  const localDbPath = path.join(__dirname, 'local_db.json');
  if (!fs.existsSync(localDbPath)) {
    console.log("No local_db.json found. Exiting.");
    return;
  }

  const data = JSON.parse(fs.readFileSync(localDbPath, 'utf8'));
  const posts = data.memoryPosts || [];
  const users = data.memoryUsers || {};

  console.log(`Found ${posts.length} posts and ${Object.keys(users).length} users.`);

  try {
    const db = new Firestore({ projectId: 'clickedin-7yqtch' });
    
    // Migrate Posts
    for (const post of posts) {
      await db.collection('posts').doc(post.id.toString()).set(post);
      console.log(`Migrated post ${post.id}`);
    }

    // Migrate Users
    for (const [userId, settings] of Object.entries(users)) {
      await db.collection('users').doc(userId.toString()).set(settings, { merge: true });
      console.log(`Migrated user ${userId}`);
    }

    console.log("Migration complete!");
  } catch (err) {
    console.error("Migration failed:", err);
  }
}

migrate();
