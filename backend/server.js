require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const axios = require('axios');
const path = require('path');
const { initScheduler } = require('./scheduler');
const db = require('./dbService');

const app = express();
app.use(cors());
app.use(express.json());

// Auth state (still in-memory for MVP, can be moved to Firestore later)
let userAccessToken = null;
let linkedInProfile = null;

// Start the scheduler
initScheduler(() => userAccessToken, () => linkedInProfile?.id);

// LinkedIn OAuth Routes
app.get('/api/auth/linkedin', (req, res) => {
  const clientId = process.env.LINKEDIN_CLIENT_ID;
  
  // If no real Client ID is provided, simulate the OAuth flow locally (Demo Mode)
  if (!clientId || clientId === 'mock_client_id') {
    console.log("[Auth] Demo Mode: Bypassing real LinkedIn OAuth since no CLIENT_ID is set.");
    return res.json({ url: 'https://clickedin.hookstep.in/api/auth/linkedin/callback?code=demo_auth_code_999' });
  }

  const redirectUri = encodeURIComponent('https://clickedin.hookstep.in/api/auth/linkedin/callback');
  const scope = encodeURIComponent('w_member_social profile openid');
  const state = 'random_csrf_token_123';
  
  const authUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}&state=${state}&scope=${scope}`;
  res.json({ url: authUrl });
});

app.get('/api/auth/linkedin/callback', async (req, res) => {
  const { code, error } = req.query;
  
  if (error) {
    return res.redirect('https://clickedin.hookstep.in/?error=auth_failed');
  }

  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;

  // Fallback to Demo Mode if real credentials aren't provided yet
  if (!clientId || !clientSecret || clientId === 'mock_client_id') {
    userAccessToken = 'mock_oauth_token_' + code;
    linkedInProfile = { name: "Demo User", id: "urn:li:person:12345" };
    return res.redirect('https://clickedin.hookstep.in/?success=linkedin_connected');
  }

  try {
    const redirectUri = 'https://clickedin.hookstep.in/api/auth/linkedin/callback';
    
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
    
    // Redirect back to dashboard with success
    res.redirect('https://clickedin.hookstep.in/?success=linkedin_connected');
  } catch (err) {
    console.error("Token exchange failed", err.response?.data || err.message);
    res.redirect('https://clickedin.hookstep.in/?error=token_failed');
  }
});

app.get('/api/auth/status', (req, res) => {
  if (userAccessToken) {
    res.json({ connected: true, profile: linkedInProfile });
  } else {
    res.json({ connected: false });
  }
});

app.post('/api/auth/logout', (req, res) => {
  userAccessToken = null;
  linkedInProfile = null;
  res.json({ success: true });
});

app.get('/api/posts', async (req, res) => {
  const posts = await db.getPosts();
  // Sort posts by ID descending (newest first)
  res.json(posts.sort((a, b) => b.id - a.id));
});

app.post('/api/posts', async (req, res) => {
  const { topic, context, size, tone, frequency } = req.body;
  
  if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your_gemini_api_key_here') {
    console.log("[AI] No GEMINI_API_KEY found. Falling back to robust mock generation engine.");
    let generatedContent = "";
    
    if (tone === "Professional") {
      if (size === "Short") {
        generatedContent = `Just wrapped up an analysis on ${topic}. The enterprise impact is undeniable. Have you adapted your strategy yet?\n\n#${topic.replace(/\s/g, '')} #ProfessionalGrowth`;
      } else if (size === "Long") {
        generatedContent = `The landscape of ${topic} is undergoing a fundamental shift, and many organizations are caught entirely off guard.\n\nOver the past quarter, we've analyzed significant developments that redefine how enterprise professionals must approach this space. Strategic alignment is no longer optional—it's an absolute imperative. Organizations that fail to aggressively adapt their operational models to ${topic} will find themselves at a severe and compounding competitive disadvantage.\n\nWe are observing three macro-trends driving this transformation:\n\n1. Innovation Velocity: The speed at which new methodologies are entering the market is unprecedented. Legacy systems cannot keep up without modular overhauls.\n2. Regulatory & Compliance Frameworks: Safety remains a top priority, but navigating the new compliance architectures requires dedicated cross-functional alignment.\n3. Lowering Barriers to Entry: New competitors are leveraging turnkey solutions to bypass traditional gatekeepers.\n\nTo navigate this, leadership teams must pivot from reactive troubleshooting to proactive architectural design. This means investing in continuous learning protocols and re-evaluating core KPIs.\n\nIf your organization is still treating ${topic} as a secondary initiative, you are already falling behind. The time to allocate dedicated resources and establish clear, measurable objectives is right now.\n\nWhat are your key priorities regarding ${topic} this year? How are you measuring success? Let's discuss in the comments below.\n\n#${topic.replace(/\s/g, '')} #Leadership #Strategy #Enterprise #DigitalTransformation #Innovation`;
      } else {
        generatedContent = `The conversation around ${topic} is evolving faster than ever before. We are witnessing a clear paradigm shift in how leading organizations approach this challenge on a daily basis.\n\nIt's clear that adapting to these changes is no longer just an option, but critical for long-term success and market positioning. Companies that integrate ${topic} deeply into their core workflows are seeing measurable gains in operational efficiency and employee engagement across the board.\n\nHowever, implementation remains the biggest hurdle. Without top-down alignment, even the best strategies falter. It requires a concerted effort to upskill teams and redefine traditional metrics of success.\n\nHow is your team handling the transition to ${topic}? Are you seeing similar benefits, or facing unexpected roadblocks?\n\n#${topic.replace(/\s/g, '')} #BusinessStrategy #ProfessionalDevelopment #Growth`;
      }
    } else if (tone === "Casual") {
      if (size === "Short") {
        generatedContent = `Been thinking a lot about ${topic} lately! 🤔 What's everyone's take on this?\n\n#${topic.replace(/\s/g, '')}`;
      } else if (size === "Long") {
        generatedContent = `Okay, we really need to talk about ${topic}. 🚀\n\nIt's crazy how fast things are moving right now. Anyone else feeling like they constantly need to catch up? I've been experimenting with a few new approaches over the last month, trying to figure out what actually works and what's just absolute noise.\n\nHonestly, the biggest realization I've had is that you cannot force it. You have to lean into the chaos, embrace the learning curve, and find your own unique rhythm. Early on, I was trying to copy what all the "gurus" were doing, but it just led to burnout.\n\nSo, I changed my approach. I started focusing on small, daily micro-habits related to ${topic}. Instead of trying to boil the ocean, I just focused on getting 1% better every single day. The compounding effect over just four weeks has been genuinely mind-blowing.\n\nIf you're feeling overwhelmed by it all, take a step back. Remember why you started exploring this in the first place. Reconnect with that initial curiosity.\n\nI'm putting together a little behind-the-scenes guide on my exact process and the mistakes I made so you don't have to. \n\nLet me know your favorite resources below! What's working for you? 👇\n\n#${topic.replace(/\s/g, '')} #TechCommunity #Thoughts #Growth #LearningInPublic`;
      } else {
        generatedContent = `Lately, I've been diving deep into ${topic} and it is completely changing my perspective. 🤯\n\nThere's so much noise out there right now, but when you strip it all away, the core fundamentals are incredibly powerful. I'm starting to rethink how I structure my entire week around this concept.\n\nIt hasn't been entirely easy, though. There have been a lot of late nights and moments of frustration trying to wrap my head around the best practices. But the breakthrough moments make it completely worth it.\n\nWould love to hear how you all are navigating ${topic}! What's the biggest lesson you've learned so far? Drop your thoughts below 👇\n\n#${topic.replace(/\s/g, '')} #Community #Growth #Mindset`;
      }
    } else {
      // Thought Leadership
      if (size === "Short") {
        generatedContent = `The paradigm of ${topic} is shifting. The question isn't if you'll adapt, but when. 💡\n\n#${topic.replace(/\s/g, '')} #FutureOfWork`;
      } else if (size === "Long") {
        generatedContent = `Most people completely misunderstand ${topic}.\n\nThey look at the surface-level metrics without taking the time to understand the underlying mechanics. True thought leadership in ${topic} requires a highly contrarian approach. If you're simply following the crowd and reading the same blogs as everyone else, you're already two steps behind.\n\nHere is the reality check most aren't ready for:\n\n1. Ignore vanity metrics. They are designed to make you feel good, not to drive actual business value.\n2. Focus heavily on systemic leverage. Build systems that work for you while you sleep.\n3. Build for a 10-year horizon, not a 10-day sprint. Stop chasing short-term dopamine hits.\n\nWhen you shift your perspective from immediate gratification to long-term compounding, the decisions you make around ${topic} change drastically. You stop worrying about algorithms and start focusing on architecture.\n\nStop playing it safe. Start actively questioning the defaults of your industry. The next wave of industry leaders won't be made by conforming to the current standards—they will be made by rewriting the rules entirely.\n\nAre you ready to build the future, or are you just renting space in it?\n\n#${topic.replace(/\s/g, '')} #Innovation #ThoughtLeadership #FutureOfWork #Strategy`;
      } else {
        generatedContent = `We have reached a critical inflection point with ${topic}.\n\nWhile the majority of the market is distracted by the immediate disruption, the true visionaries are looking closely at the second-order effects. The legacy frameworks that got us here will absolutely not get us to where we need to go next.\n\nIt's time to fundamentally rebuild our mental models around ${topic}. We need to discard outdated assumptions and embrace a radically transparent approach to problem-solving in this space.\n\nWho is leading this charge in your network? Tag someone below who is doing innovative work in this area.\n\n#${topic.replace(/\s/g, '')} #Leadership #Vision #Innovation`;
      }
    }

    const newPost = {
      id: Date.now(),
      topic,
      size,
      tone,
      frequency,
      content: generatedContent,
      status: 'draft',
      scheduledTime: null
    };

    await db.savePost(newPost);
    return res.status(201).json(newPost);
  }

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

    const postCount = parseInt(req.body.count) || 1;
    let prompt = `Write ${postCount} highly engaging, distinct LinkedIn post(s) about "${topic}".\n`;
    
    if (context && context.trim() !== '') {
      prompt += `\nThe author's professional context/background is: "${context}". Please weave this personal perspective and industry experience into the post organically. You may mention the author's professional title or role, but DO NOT repeatedly name-drop the author's company name. Mention the company name at most once, or preferably speak from the perspective of an insider without explicitly stating the company name at all.\n`;
    }

    prompt += `
Focus specifically on the current, ongoing market situation and recent trends regarding this topic. The content MUST feel fresh, highly relevant to today's industry climate, and offer unique insights rather than generic advice.

Tone Requirements: ${tone} (If Professional, be authoritative. If Casual, use emojis and conversational language. If Thought Leadership, be contrarian and visionary).
Length Requirements: ${size} (If Short, strictly 1-2 brief paragraphs. If Medium, strictly 3-4 paragraphs. If Long, strictly 5-7 paragraphs with deep insights and structural formatting like lists).

CRITICAL RULE: DO NOT use the long em-dash character (—) or en-dash (–) anywhere in your response under any circumstances. If you need to separate clauses or break a sentence, use commas, periods, or a standard short hyphen (-).

Include 2-3 relevant hashtags at the bottom of each post. Do not wrap the response in quotes or include any preamble.`;

    if (postCount > 1) {
      prompt += `\nCRITICAL: You are writing MULTIPLE posts. You MUST separate each distinct post exactly with this string on its own line: ---POST_SEPARATOR---. Make sure each post tackles a slightly different angle or perspective of the topic so they are distinct.`;
    }

    const result = await model.generateContent(prompt);
    const generatedContent = result.response.text().trim();
    
    let contents = [generatedContent];
    if (postCount > 1) {
      contents = generatedContent.split('---POST_SEPARATOR---').map(c => c.trim()).filter(c => c);
    }
    
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

const { publishToLinkedIn } = require('./linkedinService');

app.put('/api/posts/:id/approve', async (req, res) => {
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

app.put('/api/posts/:id/cancel', async (req, res) => {
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

// Serve frontend static files
app.use(express.static(path.join(__dirname, 'public')));
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Backend listening on port ${PORT}`));
