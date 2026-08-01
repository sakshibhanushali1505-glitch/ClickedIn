require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { generatePostContent } = require('./aiService');
const axios = require('axios');
const path = require('path');
const { initScheduler, runDailyAutomation } = require('./scheduler');
const db = require('./dbService');
const auth = require('./authSession');

const app = express();
app.set('trust proxy', 1);

const isProd = process.env.NODE_ENV === 'production';
const FRONTEND_URL = isProd ? 'https://clickedin.hookstep.in' : 'http://localhost:5173';
const BACKEND_URL = isProd ? 'https://clickedin.hookstep.in' : 'http://localhost:5000';

app.use(cors({
  origin: [FRONTEND_URL, 'http://localhost:5173', 'http://localhost:5000'],
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());
app.use(auth.attachAuth);

// Per-user scheduled publishing (loads each user's LinkedIn token from Firestore)
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
  const meta = db.pickRequestMeta(req);

  // Fallback to Demo Mode if real credentials aren't provided yet
  if (!clientId || !clientSecret || clientId === 'mock_client_id') {
    const profile = { name: 'Demo User', id: `demo_${code || 'user'}` };
    const accessToken = 'mock_oauth_token_' + code;
    await auth.establishLogin(res, profile, accessToken, meta);
    db.logActivity({
      event: 'login',
      path: '/api/auth/linkedin/callback',
      label: 'Demo OAuth',
      userId: profile.id,
      userName: profile.name,
      ...meta,
    }).catch(() => {});
    return res.redirect(`${FRONTEND_URL}/?success=linkedin_connected`);
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

    const accessToken = tokenResponse.data.access_token;

    // 2. Fetch the user's basic profile from LinkedIn
    const profileResponse = await axios.get('https://api.linkedin.com/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    const profile = {
      name: profileResponse.data.name,
      id: profileResponse.data.sub,
      pictureUrl: profileResponse.data.picture
    };

    await auth.establishLogin(res, profile, accessToken, meta);
    db.logActivity({
      event: 'login',
      path: '/api/auth/linkedin/callback',
      label: 'LinkedIn OAuth',
      userId: profile.id,
      userName: profile.name,
      ...meta,
    }).catch(() => {});

    // Redirect back to dashboard with success
    res.redirect(`${FRONTEND_URL}/?success=linkedin_connected`);
  } catch (err) {
    console.error("Token exchange failed", err.response?.data || err.message);
    res.redirect(`${FRONTEND_URL}/?error=token_failed`);
  }
});

app.get('/api/auth/demo', async (req, res) => {
  const profile = {
    name: 'Sakshi Bhanushali',
    id: 'sakshi_1505',
    pictureUrl: '',
  };
  await auth.establishLogin(res, profile, 'demo_access_token', db.pickRequestMeta(req));
  res.redirect(`/?success=linkedin_connected`);
});

app.get('/api/auth/status', (req, res) => {
  if (req.auth?.userId) {
    return res.json({ connected: true, profile: req.auth.profile });
  }
  return res.json({ connected: false });
});

app.post('/api/auth/logout', async (req, res) => {
  const sid = req.cookies?.[auth.COOKIE_NAME];
  await auth.destroySession(sid);
  auth.clearSessionCookie(res);
  res.json({ success: true });
});

app.get('/api/user/settings', auth.requireAuth, async (req, res) => {
  const settings = await db.getUserSettings(req.auth.userId);
  // Never send access token to the browser
  const { accessToken, ...safe } = settings || {};
  res.json(safe);
});

app.post('/api/user/settings', auth.requireAuth, async (req, res) => {
  const settings = { ...req.body };
  delete settings.accessToken; // clients cannot overwrite LinkedIn token
  const updated = await db.saveUserSettings(req.auth.userId, settings);
  const { accessToken, ...safe } = updated || {};
  res.json(safe);
});

app.post('/api/user/automation/run', auth.requireAuth, async (req, res) => {
  try {
    const success = await runDailyAutomation(req.auth.userId);
    if (!success) {
      return res.status(500).json({ error: "Failed to run automation. The AI generation may be experiencing high demand." });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to run automation." });
  }
});

const connections = require('./connections');

app.get('/api/connections/trial', auth.requireAuth, async (req, res) => {
  const trialStatus = await connections.getTrialStatus(req.auth.userId);
  res.json(trialStatus);
});

app.post('/api/connections/trial/start', auth.requireAuth, async (req, res) => {
  const trialStatus = await connections.startTrial(req.auth.userId);
  res.json(trialStatus);
});

app.post('/api/connections/queue', auth.requireAuth, async (req, res) => {
  const trialStatus = await connections.getTrialStatus(req.auth.userId);
  
  if (!trialStatus.isActive && trialStatus.started) {
    return res.status(403).json({ error: "Premium trial has expired." });
  }

  const { targets, message } = req.body;
  const queued = await connections.queueConnections(req.auth.userId, targets, message);
  res.json({ success: true, queued: queued.length });
});

app.get('/api/connections/queue', auth.requireAuth, async (req, res) => {
  const settings = await db.getUserSettings(req.auth.userId);
  res.json(settings.connectionQueue || []);
});

app.get('/api/posts', auth.requireAuth, async (req, res) => {
  let posts = await db.getPosts();
  posts = posts.filter(p => p.userId === req.auth.userId);
  
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

app.post('/api/posts', auth.requireAuth, async (req, res) => {
  const { topic, context, size, tone, frequency } = req.body;
  const postCount = parseInt(req.body.count, 10) || 1;
  const ownerId = req.auth.userId;

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
        userId: ownerId,
        topic,
        size,
        tone,
        frequency,
        content: generatedContent,
        status: 'draft',
        scheduledTime: null
      };

      await db.savePost(newPost);
      createdPosts.push(newPost);
    }

    return res.status(201).json(createdPosts.length === 1 ? createdPosts[0] : createdPosts);
  }

  try {
    const contents = await generatePostContent(topic, context, size, tone, postCount);
    
    const baseTime = req.body.baseTime ? new Date(req.body.baseTime) : null;
    const hoursGap = parseInt(req.body.hoursGap) || 0;
    const minutesGap = parseInt(req.body.minutesGap) || 0;

    const newPosts = contents.map((content, idx) => {
      let scheduledTime = null;
      if (baseTime) {
        scheduledTime = new Date(baseTime.getTime() + (idx * ((hoursGap * 60) + minutesGap) * 60 * 1000));
      }
      return {
        id: Date.now() + idx,
        userId: ownerId,
        topic, size, tone,
        content,
        status: 'draft',
        scheduledTime
      };
    });

    await db.savePosts(newPosts);
    res.status(201).json(newPosts);
  } catch (error) {
    console.error("Gemini Error:", error);
    res.status(500).json({ error: "Gemini generation failed. Check backend console for details." });
  }
});

async function assertPostOwner(req, res, id) {
  const post = await db.getPostById(id);
  if (!post) {
    res.status(404).json({ error: 'Post not found' });
    return null;
  }
  if (post.userId && post.userId !== req.auth.userId) {
    res.status(403).json({ error: 'Forbidden' });
    return null;
  }
  return post;
}

app.put('/api/posts/:id/approve', auth.requireAuth, async (req, res) => {
  const { id } = req.params;
  if (!(await assertPostOwner(req, res, id))) return;
  const scheduledTime = req.body.scheduledTime ? new Date(req.body.scheduledTime) : new Date(Date.now() + 2 * 60 * 60 * 1000);

  const updatedPost = await db.updatePost(id, {
    status: 'approved',
    userId: req.auth.userId,
    content: req.body.content || undefined,
    scheduledTime: scheduledTime.toISOString()
  });

  if (updatedPost) {
    res.json(updatedPost);
  } else {
    res.status(404).json({ error: "Post not found" });
  }
});

app.put('/api/posts/:id/cancel', auth.requireAuth, async (req, res) => {
  const { id } = req.params;
  if (!(await assertPostOwner(req, res, id))) return;
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

app.delete('/api/posts/:id', auth.requireAuth, async (req, res) => {
  const { id } = req.params;
  if (!(await assertPostOwner(req, res, id))) return;
  await db.deletePost(id);
  res.json({ success: true });
});

// ---------- Visitor tracking + admin (VetPet-style) ----------
const ADMIN_PASSWORD = process.env.CLICKEDIN_ADMIN_PASSWORD || 'clickedin-admin-2026';

function requireAdmin(req, res, next) {
  const key = req.headers['x-admin-key'] || req.query.adminKey || '';
  if (!key || key !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

app.post('/api/track', async (req, res) => {
  try {
    const { event, path: pagePath, label, metadata, sessionId, userId, userName } = req.body || {};
    if (!event || typeof event !== 'string') {
      return res.status(400).json({ error: 'event required' });
    }
    if (!sessionId && !userId) {
      return res.status(400).json({ error: 'sessionId required for anonymous events' });
    }
    const meta = db.pickRequestMeta(req);
    const doc = await db.logActivity({
      event: String(event).slice(0, 64),
      path: String(pagePath || req.headers.referer || '/').slice(0, 500),
      label: label ? String(label).slice(0, 200) : null,
      metadata: metadata && typeof metadata === 'object' ? metadata : {},
      sessionId: sessionId ? String(sessionId).slice(0, 120) : null,
      userId: userId ? String(userId).slice(0, 200) : (req.auth?.userId || null),
      userName: userName ? String(userName).slice(0, 200) : (req.auth?.profile?.name || null),
      ...meta,
    });
    res.json({ ok: true, id: doc.id });
  } catch (err) {
    console.error('track error', err);
    res.status(500).json({ error: 'track failed' });
  }
});

app.post('/api/admin/login', (req, res) => {
  const { password } = req.body || {};
  if (password && password === ADMIN_PASSWORD) {
    return res.json({ ok: true, adminKey: ADMIN_PASSWORD });
  }
  return res.status(401).json({ error: 'Invalid password' });
});

app.get('/api/admin/access', requireAdmin, (req, res) => {
  res.json({ isAdmin: true });
});

app.get('/api/admin/dashboard', requireAdmin, async (req, res) => {
  try {
    const data = await db.getAdminDashboard();
    res.json(data);
  } catch (err) {
    console.error('admin dashboard error', err);
    res.status(500).json({ error: 'dashboard failed' });
  }
});

app.get('/api/admin/activity', requireAdmin, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 100;
    const items = await db.listActivity({ limit });
    res.json({ items });
  } catch (err) {
    console.error('admin activity error', err);
    res.status(500).json({ error: 'activity failed' });
  }
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
