const db = require('./dbService');

// Mock connection execution
async function executeConnection(target, message, userId) {
  console.log(`[Connections API] Sending connection request to ${target} for user ${userId}...`);
  if (message) {
    console.log(`[Connections API] Included automated message: "${message}"`);
  }
  // Simulate success
  return true;
}

// Queue connections for a user
async function queueConnections(userId, targets, message) {
  // We'll store queued connections in the user settings for simplicity in this mock demo
  const settings = await db.getUserSettings(userId);
  const currentQueue = settings.connectionQueue || [];
  
  const newConnections = targets.map(t => ({
    id: Date.now() + Math.random().toString(36).substr(2, 9),
    target: t,
    message: message,
    status: 'queued',
    createdAt: new Date().toISOString()
  }));

  const updatedQueue = [...currentQueue, ...newConnections];
  await db.saveUserSettings(userId, { connectionQueue: updatedQueue });
  return newConnections;
}

// Process the queue (called via cron in a real system)
async function processConnectionsQueue() {
  console.log("[Connections API] Processing connection queues...");
  const users = await db.getAllUsersWithSettings();
  
  for (const user of users) {
    const queue = user.connectionQueue || [];
    const pending = queue.filter(c => c.status === 'queued');
    
    if (pending.length > 0) {
      // Process one per tick to respect limits
      const nextConn = pending[0];
      const success = await executeConnection(nextConn.target, nextConn.message, user.id);
      
      if (success) {
        nextConn.status = 'sent';
        nextConn.sentAt = new Date().toISOString();
        await db.saveUserSettings(user.id, { connectionQueue: queue });
      }
    }
  }
}

// Check premium trial status
async function getTrialStatus(userId) {
  const settings = await db.getUserSettings(userId);
  if (!settings.trialStartedAt) {
    return { isActive: false, daysLeft: 7, trialStartedAt: null, started: false };
  }
  
  const start = new Date(settings.trialStartedAt);
  const now = new Date();
  const diffTime = Math.abs(now - start);
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  const daysLeft = Math.max(0, 7 - diffDays);
  return {
    isActive: daysLeft > 0,
    daysLeft,
    trialStartedAt: settings.trialStartedAt,
    started: true
  };
}

async function startTrial(userId) {
  await db.saveUserSettings(userId, { trialStartedAt: new Date().toISOString() });
  return getTrialStatus(userId);
}

module.exports = {
  queueConnections,
  processConnectionsQueue,
  getTrialStatus,
  startTrial
};
