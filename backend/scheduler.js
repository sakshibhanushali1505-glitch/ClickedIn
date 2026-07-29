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
      
      const token = getToken();
      const userId = getUserId();
      
      if (token && userId) {
        const jitterMs = getRandomJitterMs(2);
        console.log(`[Scheduler] Post ${post.id} is due. Executing auto-publish.`);
        
        setTimeout(async () => {
          try {
            await publishToLinkedIn(post, token, userId);
          } catch (err) {
            console.error("Auto-publish error:", err);
          }
          // Delete posted post so it disappears completely
          await db.deletePost(post.id);
        }, jitterMs);
      } else {
        console.log(`[Notice] Scheduled post ${post.id} time elapsed. Auto-clearing from queue.`);
        await db.deletePost(post.id);
      }
    }
  });
}

module.exports = { initScheduler };
