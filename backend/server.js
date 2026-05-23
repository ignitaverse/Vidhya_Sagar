require('dotenv').config();
const express   = require('express');
const mongoose  = require('mongoose');
const jwt       = require('jsonwebtoken');
const cors      = require('cors');
const Anthropic = require('@anthropic-ai/sdk');
const { createClient } = require('@libsql/client');

const app = express();

// ─── TURSO (Quiz DB) ───
const turso = createClient({
  url:       process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});
const TABLE_MAP = {
  math:'math_quiz', english:'english_quiz', hindi:'hindi_quiz',
  science:'science_quiz', gk:'gk_quiz', computer:'computer_quiz',
  sanskrit:'sanskrit_quiz', current:'current_quiz',
};

// ─── ANTHROPIC (AI Chat) ───
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ─── MIDDLEWARE ───
app.use(cors({
  origin: [
    'https://ignitaverse.github.io',
    'http://localhost:5500',
    'http://127.0.0.1:5500',
    'https://vidhya-sagar.onrender.com',
    /\.github\.io$/,
  ],
  credentials: true
}));
app.use(express.json({ limit: '2mb' }));

// ─── RATE LIMITING (simple in-memory) ───
const rateLimitMap = new Map();
function rateLimit(req, res, next, { max = 20, windowMs = 60000 } = {}) {
  const key = req.ip + req.path;
  const now = Date.now();
  const entry = rateLimitMap.get(key) || { count: 0, reset: now + windowMs };
  if (now > entry.reset) { entry.count = 0; entry.reset = now + windowMs; }
  entry.count++;
  rateLimitMap.set(key, entry);
  if (entry.count > max) return res.status(429).json({ success: false, message: 'Too many requests. Please wait.' });
  next();
}

// ─── AUTH HELPER ───
async function getAuthUser(req) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return null;
  try {
    const decoded = jwt.verify(header.split(' ')[1], process.env.JWT_SECRET);
    const User = require('./models/User');
    return await User.findById(decoded.id);
  } catch { return null; }
}

// ══════════════════════════════════════════
// QUIZ ROUTES (Turso)
// ══════════════════════════════════════════
app.get('/quiz/states', async (req, res) => {
  try {
    const { state, exclude, batch } = req.query;
    if (!state) return res.status(400).json({ success: false, message: 'state required' });
    const batchSize  = Math.min(parseInt(batch) || 10, 50);
    const excludeIds = exclude ? exclude.split(',').map(x => parseInt(x.trim())).filter(n => !isNaN(n)) : [];
    const args = [state]; let w = `WHERE category = ?`;
    if (excludeIds.length) {
      w += ` AND rowid NOT IN (${excludeIds.map(() => '?').join(',')})`;
      excludeIds.forEach(id => args.push(id));
    }
    const total = Number((await turso.execute({
      sql: `SELECT COUNT(*) as cnt FROM "states_quiz" ${w}`, args: [...args]
    })).rows[0]?.cnt ?? 0);
    if (!total) return res.json({ success: true, data: [], remaining: 0, exhausted: true });
    const result = await turso.execute({
      sql: `SELECT rowid,question,options,answer,description FROM "states_quiz" ${w} ORDER BY RANDOM() LIMIT ${batchSize}`,
      args
    });
    const questions = result.rows.map(r => ({
      id: r.rowid, q: r.question,
      opts: typeof r.options === 'string' ? JSON.parse(r.options) : r.options,
      ans: Number(r.answer), description: r.description || ''
    }));
    res.json({ success: true, data: questions, remaining: total - questions.length });
  } catch(e) { res.status(500).json({ success: false, message: e.message }); }
});

app.get('/quiz/states/categories', async (req, res) => {
  try {
    const r = await turso.execute({
      sql: `SELECT DISTINCT category FROM "states_quiz" WHERE category IS NOT NULL AND category!='' ORDER BY category`,
      args: []
    });
    res.json({ success: true, categories: r.rows.map(x => x.category) });
  } catch(e) { res.status(500).json({ success: false, message: e.message }); }
});

app.get('/quiz/:subject/categories', async (req, res) => {
  try {
    const table = TABLE_MAP[req.params.subject];
    if (!table) return res.status(400).json({ success: false, message: 'Invalid subject' });
    const r = await turso.execute({
      sql: `SELECT DISTINCT category FROM "${table}" WHERE category IS NOT NULL AND category!='' ORDER BY category`,
      args: []
    });
    res.json({ success: true, categories: r.rows.map(x => x.category) });
  } catch(e) { res.status(500).json({ success: false, message: e.message }); }
});

app.get('/quiz/:subject', async (req, res) => {
  try {
    const { subject } = req.params;
    const { category, exclude, batch } = req.query;
    const table = TABLE_MAP[subject];
    if (!table) return res.status(400).json({ success: false, message: 'Invalid subject' });
    const batchSize  = Math.min(parseInt(batch) || 10, 50);
    const excludeIds = exclude ? exclude.split(',').map(x => parseInt(x.trim())).filter(n => !isNaN(n)) : [];
    const args = [], where = [];
    if (category && category !== 'all') { where.push(`category = ?`); args.push(category); }
    if (excludeIds.length) {
      where.push(`rowid NOT IN (${excludeIds.map(() => '?').join(',')})`);
      excludeIds.forEach(id => args.push(id));
    }
    const w = where.length ? ` WHERE ${where.join(' AND ')}` : '';
    const total = Number((await turso.execute({
      sql: `SELECT COUNT(*) as cnt FROM "${table}"${w}`, args: [...args]
    })).rows[0]?.cnt ?? 0);
    if (!total) return res.json({ success: true, data: [], remaining: 0, exhausted: true });
    const result = await turso.execute({
      sql: `SELECT rowid,question,options,answer,description FROM "${table}"${w} ORDER BY RANDOM() LIMIT ${batchSize}`,
      args
    });
    const questions = result.rows.map(r => ({
      id: r.rowid, q: r.question,
      opts: typeof r.options === 'string' ? JSON.parse(r.options) : r.options,
      ans: Number(r.answer), description: r.description || ''
    }));
    res.json({ success: true, data: questions, remaining: total - questions.length });
  } catch(e) { res.status(500).json({ success: false, message: e.message }); }
});

// ══════════════════════════════════════════
// USER SEARCH (Public)
// ══════════════════════════════════════════
app.get('/api/users/search', async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    if (!q || q.length < 2) return res.json({ success: true, users: [] });
    if (q.length > 50) return res.status(400).json({ success: false, message: 'Query too long' });
    const User = require('./models/User');
    const users = await User.find({
      name: { $regex: q, $options: 'i' },
      isPublic: true,
      isDeactivated: false
    })
    .select('name avatar bio examPrep joinedAt')
    .limit(10)
    .lean();
    res.json({
      success: true,
      users: users.map(u => ({
        id: u._id,
        name: u.name,
        avatar: u.avatar || '🎓',
        bio: u.bio || '',
        examPrep: u.examPrep || '',
        joinedAt: u.joinedAt,
      }))
    });
  } catch(e) { res.status(500).json({ success: false, message: e.message }); }
});

// ══════════════════════════════════════════
// STATS
// ══════════════════════════════════════════
const guestPings = new Map();
app.get('/api/stats', async (req, res) => {
  try {
    const User = require('./models/User');
    const QH   = require('./models/QuizHistory');
    const fiveAgo = Date.now() - 5 * 60 * 1000;
    for (const [id, ts] of guestPings) { if (ts < fiveAgo) guestPings.delete(id); }
    const [totalUsers, totalQuizzes] = await Promise.all([
      User.countDocuments({ isDeactivated: false }),
      QH.countDocuments()
    ]);
    res.json({ success: true, totalUsers, liveGuests: guestPings.size, totalQuizzes });
  } catch(e) { res.status(500).json({ success: false, message: e.message }); }
});

app.post('/api/stats/ping', (req, res) => {
  const { sessionId } = req.body;
  if (sessionId) guestPings.set(sessionId, Date.now());
  const fiveAgo = Date.now() - 5 * 60 * 1000;
  for (const [id, ts] of guestPings) { if (ts < fiveAgo) guestPings.delete(id); }
  res.json({ success: true, liveGuests: guestPings.size });
});

// ══════════════════════════════════════════
// AI CHAT (with conversation history support)
// ══════════════════════════════════════════
const aiConversations = new Map(); // sessionId → messages[]
const AI_MAX_HISTORY = 12; // keep last 12 messages

app.post('/api/ai/chat', async (req, res) => {
  try {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ success: false, message: 'Login required' });
    const { message, sessionId } = req.body;
    if (!message?.trim()) return res.status(400).json({ success: false, message: 'Message required' });
    if (message.length > 800) return res.status(400).json({ success: false, message: 'Message too long (max 800 chars)' });

    // Rate limit AI chat
    const uid = String(user._id);
    const rlKey = `ai_${uid}`;
    const rl = rateLimitMap.get(rlKey) || { count: 0, reset: Date.now() + 60000 };
    if (Date.now() > rl.reset) { rl.count = 0; rl.reset = Date.now() + 60000; }
    rl.count++;
    rateLimitMap.set(rlKey, rl);
    if (rl.count > 15) return res.status(429).json({ success: false, message: 'Too many AI requests. Please wait a minute.' });

    // Build conversation history
    const sid = sessionId || uid;
    const history = aiConversations.get(sid) || [];
    history.push({ role: 'user', content: message.trim() });

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 600,
      system: `You are VidyaSagar AI Study Buddy — a friendly and helpful assistant for Indian Government Exam students.
Answer in Hinglish (natural mix of Hindi and English). Keep answers concise, practical, and encouraging.
Focus on: GK, Maths, Reasoning, English, Hindi, Computer, Current Affairs, Typing practice, and exam strategies.
Use simple language. Add emojis occasionally for friendliness. The student's name is ${user.name}.`,
      messages: history.slice(-AI_MAX_HISTORY),
    });

    const reply = response.content[0]?.text || 'Sorry, could not generate response.';
    history.push({ role: 'assistant', content: reply });

    // Keep only last N messages to prevent memory leak
    if (history.length > AI_MAX_HISTORY + 2) history.splice(0, 2);
    aiConversations.set(sid, history);

    // Auto-clean old sessions (keep max 1000)
    if (aiConversations.size > 1000) {
      const firstKey = aiConversations.keys().next().value;
      aiConversations.delete(firstKey);
    }

    res.json({ success: true, reply });
  } catch(e) { res.status(500).json({ success: false, message: e.message }); }
});

// ══════════════════════════════════════════
// GROUP CHAT (MongoDB fallback)
// ══════════════════════════════════════════
app.get('/api/chat', async (req, res) => {
  try {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ success: false, message: 'Login required' });
    const ChatMessage = require('./models/ChatMessage');
    const msgs = await ChatMessage.find().sort({ createdAt: -1 }).limit(60);
    res.json({ success: true, messages: msgs.reverse() });
  } catch(e) { res.status(500).json({ success: false, message: e.message }); }
});

app.post('/api/chat', async (req, res) => {
  try {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ success: false, message: 'Login required' });
    const { message } = req.body;
    if (!message?.trim()) return res.status(400).json({ success: false, message: 'Message required' });
    if (message.length > 500) return res.status(400).json({ success: false, message: 'Max 500 chars' });
    const ChatMessage = require('./models/ChatMessage');
    const msg = await ChatMessage.create({
      user: user._id, userName: user.name, userAvatar: user.avatar || '🎓',
      message: message.trim()
    });
    res.status(201).json({ success: true, message: msg });
  } catch(e) { res.status(500).json({ success: false, message: e.message }); }
});

// ══════════════════════════════════════════
// NOTIFICATIONS
// ══════════════════════════════════════════
app.get('/api/notifications', async (req, res) => {
  try {
    const Notif = require('./models/Notification');
    const items = await Notif.find().sort({ pinned: -1, createdAt: -1 }).limit(20);
    res.json({ success: true, notifications: items });
  } catch(e) { res.status(500).json({ success: false, message: e.message }); }
});

app.put('/api/notifications/read', async (req, res) => {
  res.json({ success: true }); // tracked in client localStorage
});

// Admin: create notification
app.post('/api/notifications', async (req, res) => {
  try {
    const secret = req.headers['x-admin-secret'];
    if (secret !== process.env.ADMIN_SECRET)
      return res.status(403).json({ success: false, message: 'Forbidden' });
    const { title, body, type, pinned } = req.body;
    if (!title || !body) return res.status(400).json({ success: false, message: 'title and body required' });
    const Notif = require('./models/Notification');
    const n = await Notif.create({ title, body, type: type || 'announcement', pinned: !!pinned });
    res.status(201).json({ success: true, notification: n });
  } catch(e) { res.status(500).json({ success: false, message: e.message }); }
});

// Admin: delete notification
app.delete('/api/notifications/:id', async (req, res) => {
  try {
    const secret = req.headers['x-admin-secret'];
    if (secret !== process.env.ADMIN_SECRET)
      return res.status(403).json({ success: false, message: 'Forbidden' });
    const Notif = require('./models/Notification');
    await Notif.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch(e) { res.status(500).json({ success: false, message: e.message }); }
});

// ══════════════════════════════════════════
// FEEDBACK
// ══════════════════════════════════════════
app.get('/api/feedback', async (req, res) => {
  try {
    const FB = require('./models/Feedback');
    res.json({ success: true, feedback: await FB.find().sort({ postedAt: -1 }).limit(20) });
  } catch(e) { res.status(500).json({ success: false, message: e.message }); }
});

app.post('/api/feedback', async (req, res) => {
  try {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ success: false, message: 'Login required' });
    const { message, rating } = req.body;
    if (!message?.trim() || message.length < 3) return res.status(400).json({ success: false, message: 'Message too short' });
    if (message.length > 400) return res.status(400).json({ success: false, message: 'Message too long' });
    const FB = require('./models/Feedback');
    const fb = await FB.create({ userId: user._id, name: user.name, message: message.trim(), rating: Number(rating) || 5 });
    res.status(201).json({ success: true, feedback: fb });
  } catch(e) { res.status(500).json({ success: false, message: e.message }); }
});

app.delete('/api/feedback/:id', async (req, res) => {
  try {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ success: false, message: 'Login required' });
    const FB = require('./models/Feedback');
    const fb = await FB.findById(req.params.id);
    if (!fb) return res.status(404).json({ success: false, message: 'Not found' });
    if (fb.userId?.toString() !== user._id.toString()) return res.status(403).json({ success: false, message: 'Forbidden' });
    await fb.deleteOne();
    res.json({ success: true });
  } catch(e) { res.status(500).json({ success: false, message: e.message }); }
});

// ══════════════════════════════════════════
// AUTH + HISTORY + TYPING ROUTES
// ══════════════════════════════════════════
app.use('/api/auth',    require('./routes/auth'));
app.use('/api/history', require('./routes/history'));
app.use('/api/typing',  require('./routes/typing'));

// ══════════════════════════════════════════
// MONGODB
// ══════════════════════════════════════════
mongoose.connect(process.env.MONGODB_URI, {
  serverSelectionTimeoutMS: 10000,
  socketTimeoutMS: 45000,
})
.then(() => {
  console.log('✅ MongoDB connected');

  // Auto-delete inactive users (10 days — matches client-side auto-logout)
  async function cleanInactiveUsers() {
    try {
      const User = require('./models/User');
      const QH   = require('./models/QuizHistory');
      const TH   = require('./models/TypingHistory');
      const CM   = require('./models/ChatMessage');
      const FB   = require('./models/Feedback');
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 10); // 10 days
      const inactive = await User.find({ lastActive: { $lt: cutoff } });
      for (const u of inactive) {
        await Promise.all([
          QH.deleteMany({ user: u._id }),
          TH.deleteMany({ user: u._id }),
          CM.deleteMany({ user: u._id }),
          FB.deleteMany({ userId: u._id }),
          User.findByIdAndDelete(u._id)
        ]);
      }
      if (inactive.length) console.log(`[AutoClean] Removed ${inactive.length} inactive users (10+ days)`);
    } catch(e) { console.error('[AutoClean]', e.message); }
  }

  cleanInactiveUsers();
  setInterval(cleanInactiveUsers, 24 * 60 * 60 * 1000); // daily
})
.catch(e => console.error('❌ MongoDB error:', e.message));

// ══════════════════════════════════════════
// HEALTH + 404
// ══════════════════════════════════════════
app.get('/', (req, res) => res.json({
  status: '✅ VidyaSagar v4',
  mongodb: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
  routes: {
    quiz: '/quiz/:subject', states: '/quiz/states',
    userSearch: '/api/users/search?q=name',
    ai: '/api/ai/chat', chat: '/api/chat',
    notif: '/api/notifications', auth: '/api/auth',
    history: '/api/history', typing: '/api/typing'
  }
}));

app.use((req, res) => res.status(404).json({ success: false, message: 'Not found' }));
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ success: false, message: 'Server error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 VidyaSagar v4 on port ${PORT}`));
