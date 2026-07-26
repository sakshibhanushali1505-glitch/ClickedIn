const cron = require('node-cron');
const { publishToLinkedIn } = require('./linkedinService');
const db = require('./dbService');

function getRandomJitterMs(maxMinutes) {
  const minutes = Math.floor(Math.random() * maxMinutes);
  return minutes * 60 * 1000; 
}

function initScheduler(getToken, getUserId) {
  console.log("Scheduler initialized. Checking for scheduled posts every minute...");
  
  // Check every minute if any post is due
  cron.schedule('* * * * *', async () => {
    const now = new Date();
    const posts = await db.getPosts();
    
    // Find posts that are approved, have a scheduled time in the past, and haven't been published yet
    const duePosts = posts.filter(p => p.status === 'approved' && p.scheduledTime && new Date(p.scheduledTime) <= now);
    
    for (const post of duePosts) {
      // Mark as 'publishing' so we don't pick it up again on the next minute tick
      await db.updatePost(post.id, { status: 'publishing' });
      
      const jitterMs = getRandomJitterMs(15);
      console.log(`[Scheduler] Post ${post.id} is due. Applying jitter delay of ${Math.round(jitterMs/1000/60)} minutes.`);
      
      setTimeout(async () => {
        const token = getToken();
        const userId = getUserId();
        
        if (token && userId) {
          const success = await publishToLinkedIn(post, token, userId);
          if (success) {
            await db.updatePost(post.id, { status: 'published' });
          } else {
            await db.updatePost(post.id, { status: 'failed' });
          }
        } else {
          console.log(`[Notice] Attempted to publish post ${post.id}, but no active LinkedIn Token is connected.`);
          await db.updatePost(post.id, { status: 'failed' });
        }
      }, jitterMs);
    }
  });
}

module.exports = { initScheduler };
