const cron = require('node-cron');
const { publishToLinkedIn } = require('./linkedinService');
const db = require('./dbService');

function getRandomJitterMs(maxMinutes) {
  const minutes = Math.floor(Math.random() * maxMinutes);
  return minutes * 60 * 1000; 
}

function initScheduler() {
  console.log("Scheduler initialized. Checking for scheduled posts every minute...");
  
  // Check every minute if any post is due
  cron.schedule('* * * * *', async () => {
    const now = new Date();
    const posts = await db.getPosts();
    
    // Find posts that are approved, have a scheduled time in the past, and haven't been published yet
    const duePosts = posts.filter(p => {
      if (!p || p.status !== 'approved' || !p.scheduledTime) return false;
      const when = new Date(p.scheduledTime);
      return !Number.isNaN(when.getTime()) && when <= now;
    });
    
    for (const post of duePosts) {
      // Mark as 'publishing' so we don't pick it up again on the next minute tick
      await db.updatePost(post.id, { status: 'publishing' });

      const userId = post.userId;
      const user = userId ? await db.getUserSettings(userId) : null;
      const token = user?.accessToken;
      
      if (token && userId) {
        const jitterMs = getRandomJitterMs(2);
        console.log(`[Scheduler] Post ${post.id} is due for user ${userId}. Executing auto-publish.`);
        
        setTimeout(async () => {
          try {
            const success = await publishToLinkedIn(post, token, userId);
            if (success) {
              await db.updatePost(post.id, { status: 'published' });
            } else {
              await db.updatePost(post.id, { status: 'failed' });
            }
          } catch (err) {
            console.error("Auto-publish error:", err);
            await db.updatePost(post.id, { status: 'failed' });
          }
        }, jitterMs);
      } else {
        console.log(`[Notice] Scheduled post ${post.id} time elapsed. Missing per-user token. Marking as failed.`);
        await db.updatePost(post.id, { status: 'failed' });
      }
    }
  });

  cron.schedule('*/5 * * * *', async () => {
    await connections.processConnectionsQueue();
  });

  // Run the fully automated AI job every day at 1:00 AM
  cron.schedule('0 1 * * *', async () => {
    await runDailyAutomation();
  });
}

const connections = require('./connections');
const { generatePostContent } = require('./aiService');

async function runDailyAutomation(specificUserId = null) {
  console.log("[Scheduler] Running Daily Fully Automated AI Job...");
  const users = await db.getAllUsersWithSettings();
  let generatedForAnyone = false;

  for (const user of users) {
    if (specificUserId && String(user.id) !== String(specificUserId)) continue;

    const hasContext = user.context && user.context.trim() !== '';
    // Cron requires the toggle; manual "Run now" (specificUserId) only needs profile context
    const shouldRun = hasContext && (specificUserId ? true : !!user.fullyAutomated);
    if (!shouldRun) continue;

    console.log(`[Scheduler] Generating daily automated post for user ${user.id}...`);

    try {
      const postCount = user.automatedPostCount || 1;
      const startTimeStr = user.automatedStartTime || '10:00';
      const endTimeStr = user.automatedEndTime || '21:00';

      const [startHour, startMin] = startTimeStr.split(':').map(Number);
      const [endHour, endMin] = endTimeStr.split(':').map(Number);

      const now = new Date();
      let startMs = new Date(now.getFullYear(), now.getMonth(), now.getDate(), startHour, startMin || 0).getTime();
      let endMs = new Date(now.getFullYear(), now.getMonth(), now.getDate(), endHour, endMin || 0).getTime();

      // If the start time is already in the past, adjust it to start 2 minutes from now
      if (startMs < now.getTime()) {
        startMs = now.getTime() + (2 * 60 * 1000);
        if (endMs <= startMs) {
          endMs = startMs + (postCount * 30 * 60 * 1000);
        }
      }

      let intervalMs = 0;
      if (postCount > 1) {
        intervalMs = Math.max(0, (endMs - startMs) / (postCount - 1));
      }

      const contents = await generatePostContent(
        'Industry Trends & Leadership',
        user.context,
        'Medium',
        'Professional',
        postCount
      );

      if (contents && contents.length > 0) {
        for (let i = 0; i < contents.length; i++) {
          const scheduledTime = new Date(startMs + (i * intervalMs));

          const newPost = {
            id: Date.now() + i + Math.floor(Math.random() * 1000),
            userId: user.id,
            topic: 'Automated Industry Trends',
            size: 'Medium',
            tone: 'Professional',
            frequency: 'Daily',
            content: contents[i],
            status: 'approved',
            scheduledTime: scheduledTime.toISOString(),
          };

          await db.savePost(newPost);
          console.log(
            `[Scheduler] Successfully generated and scheduled daily post ${newPost.id} for user ${user.id} at ${scheduledTime}`
          );
        }
        generatedForAnyone = true;
        if (specificUserId) return true;
      }
    } catch (err) {
      console.error(`[Scheduler] Failed to generate automated post for user ${user.id}:`, err);
      if (specificUserId) return false;
    }
  }

  if (specificUserId && !generatedForAnyone) {
    console.warn(`[Scheduler] Manual automation skipped — user ${specificUserId} needs Work Experience in Profile.`);
  }
  return generatedForAnyone;
}

module.exports = { initScheduler, runDailyAutomation };
