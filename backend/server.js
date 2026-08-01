require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const { generatePostContent } = require('./aiService');
const axios = require('axios');
const path = require('path');
const { initScheduler, runDailyAutomation } = require('./scheduler');
const db = require('./dbService');

const app = express();
app.use(cors());
app.use(express.json());

// Removed global auth state variables to support Multi-Tenant Architecture

// Determine environment URLs
const isProd = process.env.NODE_ENV === 'production';
const APP_URL = isProd ? 'https://clickedin.hookstep.in' : 'http://localhost:5000';
const FRONTEND_URL = isProd ? APP_URL : 'http://localhost:5173';
const BACKEND_URL = APP_URL;

// Start the scheduler
initScheduler();

// LinkedIn OAuth Routes
app.get('/api/auth/linkedin', (req, res) => {
  const clientId = process.env.LINKEDIN_CLIENT_ID;

  // If no real Client ID is provided, simulate the OAuth flow locally (Demo Mode)
  if (!clientId || clientId === 'mock_client_id') {
    console.log("[Auth] Demo Mode: Bypassing real LinkedIn OAuth since no CLIENT_ID is set.");
    return res.json({ url: `${BACKEND_URL}/api/auth/linkedin/callback?code=demo_auth_code_999` });
  }

  const redirectUri = encodeURIComponent(`${BACKEND_URL}/api/auth/linkedin/callback`);
  const scope = encodeURIComponent('w_member_social profile openid');
  const state = 'random_csrf_token_123';

  const authUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}&state=${state}&scope=${scope}`;
  res.json({ url: authUrl });
});

app.get('/api/auth/linkedin/callback', async (req, res) => {
  const { code, error } = req.query;

  if (error) {
    return res.redirect(`${FRONTEND_URL}/?error=auth_failed`);
  }

  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;

  // Fallback to Demo Mode if real credentials aren't provided yet
  if (!clientId || !clientSecret || clientId === 'mock_client_id') {
    const demoProfile = { name: "Demo User", id: "urn:li:person:12345" };
    await db.saveUserSettings(demoProfile.id, { accessToken: 'mock_oauth_token_' + code, linkedInProfile: demoProfile });
    return res.redirect(`${FRONTEND_URL}/?success=linkedin_connected&userId=${demoProfile.id}`);
  }

  try {
    const redirectUri = `${BACKEND_URL}/api/auth/linkedin/callback`;

    // 1. Exchange authorization code for Access Token
    const tokenResponse = await axios.post('https://www.linkedin.com/oauth/v2/accessToken', null, {
      params: {
        grant_type: 'authorization_code',
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri
      },
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    userAccessToken = tokenResponse.data.access_token;

    // 2. Fetch the user's basic profile from LinkedIn
    const profileResponse = await axios.get('https://api.linkedin.com/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${userAccessToken}`
      }
    });

    linkedInProfile = {
      name: profileResponse.data.name,
      id: profileResponse.data.sub,
      pictureUrl: profileResponse.data.picture
    };

    // Persist to DB for Cloud environment
    await db.saveUserSettings(linkedInProfile.id, { 
      accessToken: userAccessToken, 
      linkedInProfile 
    });

    // Redirect back to dashboard with success, passing the unique user ID
    res.redirect(`${FRONTEND_URL}/?success=linkedin_connected&userId=${linkedInProfile.id}`);
  } catch (err) {
    console.error("Token exchange failed", err.response?.data || err.message);
    res.redirect(`${FRONTEND_URL}/?error=token_failed`);
  }
});

// Multi-tenant Auth Middleware
async function authMiddleware(req, res, next) {
  const userId = req.headers['x-user-id'];
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized - No user ID provided" });
  }

  const settings = await db.getUserSettings(userId);
  if (!settings || !settings.linkedInProfile) {
    return res.status(401).json({ error: "Unauthorized - Invalid user ID or session expired" });
  }

  // Attach the strictly-scoped user object to the request
  req.user = settings.linkedInProfile;
  req.accessToken = settings.accessToken;
  next();
}

app.get('/api/auth/demo', async (req, res) => {
  const demoProfile = {
    name: "Sakshi Bhanushali",
    id: "sakshi_1505",
    pictureUrl: ""
  };
  await db.saveUserSettings(demoProfile.id, { accessToken: 'demo_access_token', linkedInProfile: demoProfile });
  res.redirect(`/?success=linkedin_connected&userId=${demoProfile.id}`);
});

app.get('/api/auth/status', authMiddleware, (req, res) => {
  res.json({ connected: true, profile: req.user });
});

app.post('/api/auth/logout', (req, res) => {
  res.json({ success: true });
});

app.get('/api/user/profile', authMiddleware, async (req, res) => {
  res.json(req.user);
});

app.get('/api/user/settings', authMiddleware, async (req, res) => {
  const settings = await db.getUserSettings(req.user.id);
  
  // Catch-up mechanism: If they missed the 1:00 AM cron job (e.g. computer was asleep), generate them now!
  if (settings && settings.fullyAutomated) {
    const allPosts = await db.getPosts();
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const endOfDay = startOfDay + (24 * 60 * 60 * 1000);
    
    const hasPostsToday = allPosts.some(p => 
      p.userId === req.user.id && 
      p.topic && p.topic.startsWith("Automated") && 
      p.scheduledTime && 
      new Date(p.scheduledTime).getTime() >= startOfDay && 
      new Date(p.scheduledTime).getTime() < endOfDay
    );
    
    if (!hasPostsToday) {
      console.log(`[Catch-up] No automated posts found for today for ${req.user.id}. The 1:00 AM job was likely missed. Triggering background generation...`);
      // Run it asynchronously so we don't block the frontend load!
      runDailyAutomation(req.user.id).catch(err => console.error("Catch-up generation failed:", err));
    }
  }
  
  res.json(settings);
});

app.post('/api/user/settings', authMiddleware, async (req, res) => {
  const settings = req.body;
  const updated = await db.saveUserSettings(req.user.id, settings);
  res.json(updated);
});

app.post('/api/user/automation/run', authMiddleware, async (req, res) => {
  try {
    const success = await runDailyAutomation(req.user.id);
    if (!success) {
      return res.status(500).json({ error: "Failed to run automation. The AI generation may be experiencing high demand." });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/cron/daily', async (req, res) => {
  // This endpoint will be hit by Google Cloud Scheduler
  console.log("[Cron] Triggering daily automation for all users...");
  // Run async so it responds to Cloud Scheduler immediately
  runDailyAutomation().catch(err => console.error("Cron automation failed:", err));
  res.json({ success: true, message: "Automation triggered" });
});

const connections = require('./connections');

app.get('/api/connections/trial', authMiddleware, async (req, res) => {
  const trialStatus = await connections.getTrialStatus(req.user.id);
  res.json(trialStatus);
});

app.post('/api/connections/trial/start', authMiddleware, async (req, res) => {
  const trialStatus = await connections.startTrial(req.user.id);
  res.json(trialStatus);
});

app.post('/api/connections/queue', authMiddleware, async (req, res) => {
  const trialStatus = await connections.getTrialStatus(req.user.id);
  
  if (!trialStatus.isActive && trialStatus.started) {
    return res.status(403).json({ error: "Premium trial has expired." });
  }

  const { targets, message } = req.body;
  const queued = await connections.queueConnections(req.user.id, targets, message);
  res.json({ success: true, queued: queued.length });
});

app.get('/api/connections/queue', authMiddleware, async (req, res) => {
  const settings = await db.getUserSettings(req.user.id);
  res.json(settings.connectionQueue || []);
});

app.get('/api/posts', authMiddleware, async (req, res) => {
  let posts = await db.getPosts();
  posts = posts.filter(p => !p.userId || p.userId === req.user.id);
  
  const activePosts = [];
  for (const post of posts) {
    const isPublished = post.status === 'published' || post.status === 'posted';
    
    if (isPublished) {
      // Auto-delete published posts so they disappear from queue
      await db.deletePost(post.id);
    } else {
      activePosts.push(post);
    }
  }
  
  res.json(activePosts.sort((a, b) => b.id - a.id));
});

app.post('/api/posts', authMiddleware, async (req, res) => {
  const { topic, context, size, tone, frequency } = req.body;

  if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your_gemini_api_key_here') {
    console.log("[AI] No GEMINI_API_KEY found. Falling back to robust mock generation engine.");
    const postCount = parseInt(req.body.count) || 1;
    const createdPosts = [];

    for (let i = 0; i < postCount; i++) {
      let generatedContent = "";
      const angleSuffix = i === 1 ? " (Strategic Perspective)" : i === 2 ? " (Future & Scaling)" : "";
      
      let contextIntro = "";
      if (context && context.trim() !== '') {
        contextIntro = `Drawing from my experience (${context.slice(0, 60).trim()}...), `;
      }

      if (tone === "Professional") {
        if (size === "Short") {
          generatedContent = `${contextIntro}Just wrapped up an analysis on ${topic}${angleSuffix}. The enterprise impact is undeniable. Have you adapted your strategy yet?\n\n#${topic.replace(/\s/g, '')} #ProfessionalGrowth`;
        } else if (size === "Long") {
          generatedContent = `${contextIntro}The landscape of ${topic}${angleSuffix} is undergoing a fundamental shift, and many organizations are caught entirely off guard.\n\nOver the past quarter, we've analyzed significant developments that redefine how enterprise professionals must approach this space. Strategic alignment is no longer optional—it's an absolute imperative. Organizations that fail to aggressively adapt their operational models will find themselves at a severe and compounding competitive disadvantage.\n\nWe are observing three macro-trends driving this transformation:\n\n1. Innovation Velocity: The speed at which new methodologies are entering the market is unprecedented.\n2. Regulatory & Compliance Frameworks: Safety remains a top priority, requiring dedicated cross-functional alignment.\n3. Lowering Barriers to Entry: New competitors are leveraging turnkey solutions to bypass traditional gatekeepers.\n\nTo navigate this, leadership teams must pivot from reactive troubleshooting to proactive architectural design.\n\nWhat are your key priorities regarding ${topic} this year? Let's discuss in the comments below.\n\n#${topic.replace(/\s/g, '')} #Leadership #Strategy #Enterprise #DigitalTransformation`;
        } else {
          generatedContent = `${contextIntro}The conversation around ${topic}${angleSuffix} is evolving faster than ever before. We are witnessing a clear paradigm shift in how leading organizations approach this challenge.\n\nAdapting to these changes is critical for long-term success and market positioning. Companies that integrate ${topic} deeply into their core workflows are seeing measurable gains in operational efficiency and employee engagement across the board.\n\nHowever, implementation remains the biggest hurdle. Without top-down alignment, even the best strategies falter.\n\nHow is your team handling the transition to ${topic}? Drop your thoughts below.\n\n#${topic.replace(/\s/g, '')} #BusinessStrategy #ProfessionalDevelopment #Growth`;
        }
      } else if (tone === "Casual") {
        if (size === "Short") {
          generatedContent = `${contextIntro}Been thinking a lot about ${topic}${angleSuffix} lately! 🤔 What's everyone's take on this?\n\n#${topic.replace(/\s/g, '')}`;
        } else if (size === "Long") {
          generatedContent = `${contextIntro}Okay, we really need to talk about ${topic}${angleSuffix}. 🚀\n\nIt's crazy how fast things are moving right now. Anyone else feeling like they constantly need to catch up? I've been experimenting with a few new approaches over the last month, trying to figure out what actually works.\n\nHonestly, the biggest realization I've had is that you cannot force it. You have to lean into the learning curve and find your own rhythm.\n\nInstead of trying to boil the ocean, focus on getting 1% better every single day. The compounding effect over four weeks is genuinely mind-blowing.\n\nLet me know your favorite resources below! What's working for you? 👇\n\n#${topic.replace(/\s/g, '')} #TechCommunity #Thoughts #Growth #LearningInPublic`;
        } else {
          generatedContent = `${contextIntro}Lately, I've been diving deep into ${topic}${angleSuffix} and it is completely changing my perspective. 🤯\n\nThere's so much noise out there right now, but when you strip it all away, the core fundamentals are incredibly powerful.\n\nWould love to hear how you all are navigating ${topic}! What's the biggest lesson you've learned so far? Drop your thoughts below 👇\n\n#${topic.replace(/\s/g, '')} #Community #Growth #Mindset`;
        }
      } else {
        // Thought Leadership
        if (size === "Short") {
          generatedContent = `${contextIntro}The paradigm of ${topic}${angleSuffix} is shifting. The question isn't if you'll adapt, but when. 💡\n\n#${topic.replace(/\s/g, '')} #FutureOfWork`;
        } else if (size === "Long") {
          generatedContent = `${contextIntro}Most people completely misunderstand ${topic}${angleSuffix}.\n\nThey look at the surface-level metrics without taking the time to understand the underlying mechanics. True thought leadership in ${topic} requires a highly contrarian approach.\n\nHere is the reality check most aren't ready for:\n\n1. Ignore vanity metrics. Focus on actual value creation.\n2. Focus heavily on systemic leverage. Build systems that work for you while you sleep.\n3. Build for a 10-year horizon, not a 10-day sprint.\n\nStop playing it safe. Start actively questioning the defaults of your industry.\n\nAre you ready to build the future, or are you just renting space in it?\n\n#${topic.replace(/\s/g, '')} #Innovation #ThoughtLeadership #FutureOfWork #Strategy`;
        } else {
          generatedContent = `${contextIntro}We have reached a critical inflection point with ${topic}${angleSuffix}.\n\nWhile the majority of the market is distracted by immediate disruption, the true visionaries are looking closely at second-order effects. The legacy frameworks that got us here will not get us to where we need to go next.\n\nWho is leading this charge in your network? Tag someone below who is doing innovative work in this area.\n\n#${topic.replace(/\s/g, '')} #Leadership #Vision #Innovation`;
        }
      }

      const newPost = {
        id: Date.now() + i,
        topic,
        size,
        tone,
        frequency,
        content: generatedContent,
        status: 'draft',
        scheduledTime: null,
        userId: req.user.id
      };

      await db.savePost(newPost);
      createdPosts.push(newPost);
    }

    return res.status(201).json(createdPosts.length === 1 ? createdPosts[0] : createdPosts);
  }

  try {
    const contents = await generatePostContent(topic, context, size, tone, postCount);
    
    const baseTime = req.body.baseTime ? new Date(req.body.baseTime) : null;
    const tzOffsetMs = (req.body.timezoneOffset !== undefined && req.body.timezoneOffset !== null ? parseInt(req.body.timezoneOffset) : -330) * 60 * 1000;
    
    // Automatically distribute posts evenly within the rest of today
    let intervalMs = 0;
    if (baseTime && postCount > 1) {
      const userLocalBase = new Date(baseTime.getTime() - tzOffsetMs);
      const y = userLocalBase.getUTCFullYear();
      const m = userLocalBase.getUTCMonth();
      const d = userLocalBase.getUTCDate();
      
      const endOfDayUtc = Date.UTC(y, m, d, 23, 59, 59) + tzOffsetMs;
      
      intervalMs = Math.max(0, (endOfDayUtc - baseTime.getTime()) / (postCount - 1));
      // Max gap of 4 hours so it doesn't look weird if they generate early in the morning
      if (intervalMs > 4 * 60 * 60 * 1000) intervalMs = 4 * 60 * 60 * 1000;
    }

    const newPosts = contents.map((content, idx) => {
      let scheduledTime = null;
      if (baseTime) {
        scheduledTime = new Date(baseTime.getTime() + (idx * intervalMs));
      }
      return {
        id: Date.now() + idx,
        topic, size, tone,
        content,
        status: 'draft',
        scheduledTime,
        userId: req.user.id
      };
    });

    await db.savePosts(newPosts);
    res.status(201).json(newPosts);
  } catch (error) {
    console.error("Gemini Error:", error);
    res.status(500).json({ error: "Gemini generation failed. Check backend console for details." });
  }
});

const { publishToLinkedIn } = require('./linkedinService');

app.put('/api/posts/:id/approve', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const scheduledTime = req.body.scheduledTime ? new Date(req.body.scheduledTime) : new Date(Date.now() + 2 * 60 * 60 * 1000);

  const updatedPost = await db.updatePost(id, {
    status: 'approved',
    content: req.body.content || undefined, // keep existing if undefined
    scheduledTime: scheduledTime.toISOString() // Firestore handles ISO strings or Dates better, let's just save ISO string
  });

  if (updatedPost) {
    res.json(updatedPost);
  } else {
    res.status(404).json({ error: "Post not found" });
  }
});

app.put('/api/posts/:id/cancel', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const updatedPost = await db.updatePost(id, {
    status: 'draft',
    scheduledTime: null
  });

  if (updatedPost) {
    res.json(updatedPost);
  } else {
    res.status(404).json({ error: "Post not found" });
  }
});

app.delete('/api/posts/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  console.warn(`[WARNING] Client requested DELETION of post ${id}!`);
  await db.deletePost(id);
  res.json({ success: true });
});

// Serve frontend static files
app.use(express.static(path.join(__dirname, 'public'), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
  }
}));

app.use((req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Backend listening on port ${PORT}`));
