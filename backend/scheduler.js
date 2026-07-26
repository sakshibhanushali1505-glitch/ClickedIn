const cron = require('node-cron');
const { publishToLinkedIn } = require('./linkedinService');

function getRandomJitterMs(maxMinutes) {
  const minutes = Math.floor(Math.random() * maxMinutes);
  return minutes * 60 * 1000; 
}

function initScheduler(postsQueue, getToken, getUserId) {
  console.log("Scheduler initialized. Checking for scheduled posts every minute...");
  
  // Check every minute if any post is due
  cron.schedule('* * * * *', () => {
    const now = new Date();
    
    // Find posts that are approved, have a scheduled time in the past, and haven't been published yet
    const duePosts = postsQueue.filter(p => p.status === 'approved' && p.scheduledTime && new Date(p.scheduledTime) <= now);
    
    duePosts.forEach(post => {
      // Mark as 'publishing' so we don't pick it up again on the next minute tick
      post.status = 'publishing';
      
      const jitterMs = getRandomJitterMs(15);
      console.log(`[Scheduler] Post ${post.id} is due. Applying jitter delay of ${Math.round(jitterMs/1000/60)} minutes.`);
      
      setTimeout(async () => {
        const token = getToken();
        const userId = getUserId();
        
        if (token && userId) {
          const success = await publishToLinkedIn(post, token, userId);
          if (success) {
            post.status = 'published';
          } else {
            post.status = 'failed';
          }
        } else {
          console.log(`[Notice] Attempted to publish post ${post.id}, but no active LinkedIn Token is connected.`);
          post.status = 'failed';
        }
      }, jitterMs);
    });
  });
}

module.exports = { initScheduler };
