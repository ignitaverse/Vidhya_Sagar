require('dotenv').config();
const express  = require('express');
const mongoose = require('mongoose');
const jwt      = require('jsonwebtoken');
const { createClient } = require('@libsql/client');
const cors     = require('cors');

const authRoutes    = require('./routes/auth');
const historyRoutes = require('./routes/history');

const app = express();

// ─── TURSO CLIENT ───
const turso = createClient({
  url:       process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// ─── TABLE NAMES ───
const TABLE_MAP = {
  math:     'math_quiz',
  english:  'english_quiz',
  hindi:    'hindi_quiz',
  science:  'science_quiz',
  gk:       'gk_quiz',
  computer: 'computer_quiz',
  sanskrit: 'sanskrit_quiz',
  current:  'current_quiz',
};

// ========== MIDDLEWARE ==========
app.use(cors({
  origin: ['https://ignitaverse.github.io', 'http://localhost:5500', 'https://vidhya-sagar.onrender.com'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ========== AUTH HELPER (inline for feedback/chat routes) ==========
async function getAuthUser(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  try {
    const decoded = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET);
    const User = require('./models/User');
    return await User.findById(decoded.id);
  } catch { return null; }
}

// =====================================================================
// QUIZ ROUTES (states must be before :subject)
// =====================================================================
app.get('/quiz/states', async (req, res) => {
  try {
    const { state, exclude, batch } = req.query;
    if (!state) return res.status(400).json({ success: false, message: 'state query param जरूरी है' });
    const batchSize  = Math.min(parseInt(batch) || 10, 50);
    const excludeIds = exclude ? exclude.split(',').map(x => parseInt(x.trim())).filter(n => !isNaN(n)) : [];
    const args = [state];
    let whereStr = `WHERE category = ?`;
    if (excludeIds.length) {
      whereStr += ` AND rowid NOT IN (${excludeIds.map(() => '?').join(',')})`;
      excludeIds.forEach(id => args.push(id));
    }
    const totalRes  = await turso.execute({ sql: `SELECT COUNT(*) as cnt FROM "states_quiz" ${whereStr}`, args: [...args] });
    const remaining = Number(totalRes.rows[0]?.cnt ?? 0);
    if (remaining === 0) return res.json({ success: true, data: [], remaining: 0, exhausted: true });
    const result = await turso.execute({
      sql:  `SELECT rowid, question, options, answer, description FROM "states_quiz" ${whereStr} ORDER BY RANDOM() LIMIT ${batchSize}`,
      args
    });
    const questions = result.rows.map(row => ({
      id: row.rowid, q: row.question,
      opts: typeof row.options === 'string' ? JSON.parse(row.options) : row.options,
      ans: Number(row.answer), description: row.description || ''
    }));
    res.json({ success: true, data: questions, remaining: remaining - questions.length });
  } catch (err) {
    console.error('[/quiz/states]', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/quiz/states/categories', async (req, res) => {
  try {
    const result = await turso.execute({
      sql: `SELECT DISTINCT category FROM "states_quiz" WHERE category IS NOT NULL AND category != '' ORDER BY category`,
      args: []
    });
    res.json({ success: true, categories: result.rows.map(r => r.category) });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

app.get('/quiz/:subject/categories', async (req, res) => {
  try {
    const { subject } = req.params;
    const table = TABLE_MAP[subject];
    if (!table) return res.status(400).json({ success: false, message: `Invalid subject: ${subject}` });
    const result = await turso.execute({
      sql: `SELECT DISTINCT category FROM "${table}" WHERE category IS NOT NULL AND category != '' ORDER BY category`,
      args: []
    });
    res.json({ success: true, categories: result.rows.map(r => r.category) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/quiz/:subject', async (req, res) => {
  try {
    const { subject } = req.params;
    const { category, exclude, batch } = req.query;
    const table = TABLE_MAP[subject];
    if (!table) return res.status(400).json({ success: false, message: `Invalid subject: ${subject}` });
    const batchSize  = Math.min(parseInt(batch) || 10, 50);
    const excludeIds = exclude ? exclude.split(',').map(x => parseInt(x.trim())).filter(n => !isNaN(n)) : [];
    const args = [], whereClauses = [];
    if (category && category !== 'all') { whereClauses.push(`category = ?`); args.push(category); }
    if (excludeIds.length) {
      whereClauses.push(`rowid NOT IN (${excludeIds.map(() => '?').join(',')})`);
      excludeIds.forEach(id => args.push(id));
    }
    const whereStr = whereClauses.length ? ` WHERE ${whereClauses.join(' AND ')}` : '';
    const totalRes  = await turso.execute({ sql: `SELECT COUNT(*) as cnt FROM "${table}"${whereStr}`, args: [...args] });
    const remaining = Number(totalRes.rows[0]?.cnt ?? 0);
    if (remaining === 0) return res.json({ success: true, data: [], remaining: 0, exhausted: true });
    const result = await turso.execute({
      sql:  `SELECT rowid, question, options, answer, description FROM "${table}"${whereStr} ORDER BY RANDOM() LIMIT ${batchSize}`,
      args
    });
    const questions = result.rows.map(row => ({
      id: row.rowid, q: row.question,
      opts: typeof row.options === 'string' ? JSON.parse(row.options) : row.options,
      ans: Number(row.answer), description: row.description || ''
    }));
    res.json({ success: true, data: questions, remaining: remaining - questions.length });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ========== /api/quiz (compat) ==========
app.get('/api/quiz/:subject', async (req, res) => {
  try {
    const { subject } = req.params;
    const { category } = req.query;
    const table = TABLE_MAP[subject];
    if (!table) return res.status(400).json({ success: false, message: 'Invalid subject' });
    let sql = `SELECT * FROM "${table}"`;
    const args = [];
    if (category && category !== 'all') { sql += ` WHERE category = ?`; args.push(category); }
    sql += ` ORDER BY RANDOM() LIMIT 10`;
    const result = await turso.execute({ sql, args });
    const questions = result.rows.map(row => ({
      question: row.question,
      options:  typeof row.options === 'string' ? JSON.parse(row.options) : row.options,
      answer:   row.answer, category: row.category
    }));
    res.json({ success: true, data: questions });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

app.get('/api/quiz-data/:subject', async (req, res) => {
  try {
    const { subject } = req.params;
    const isStates = subject === 'states';
    const table = isStates ? 'states_quiz' : TABLE_MAP[subject];
    if (!table) return res.status(400).json({ success: false, message: `Invalid subject: ${subject}` });
    const result = await turso.execute({ sql: `SELECT question, options, answer, category FROM "${table}"`, args: [] });
    if (!result.rows.length) return res.status(404).json({ success: false, message: 'No data' });
    const categories = {};
    for (const row of result.rows) {
      const catKey = (row.category && String(row.category).trim()) ? String(row.category).trim() : subject;
      if (!categories[catKey]) categories[catKey] = [];
      let opts = [];
      try { opts = JSON.parse(row.options); } catch { opts = String(row.options).split(',').map(s => s.trim()); }
      categories[catKey].push({ q: row.question, opts, ans: Number(row.answer) });
    }
    res.json(isStates ? { states: categories } : { categories });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ========== DEBUG ==========
app.get('/api/debug/:subject', async (req, res) => {
  try {
    const { subject } = req.params;
    const table = (subject === 'states') ? 'states_quiz' : (TABLE_MAP[subject] || subject);
    const cnt    = await turso.execute({ sql: `SELECT COUNT(*) AS total FROM "${table}"`, args: [] });
    const cats   = await turso.execute({ sql: `SELECT DISTINCT category FROM "${table}" ORDER BY category`, args: [] });
    const sample = await turso.execute({ sql: `SELECT * FROM "${table}" LIMIT 2`, args: [] });
    res.json({ table, totalRows: cnt.rows[0]?.total, categories: cats.rows.map(r => r.category || r[0]), sampleRows: sample.rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});
app.get('/api/debug', async (req, res) => {
  try {
    const r = await turso.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");
    res.json({ tables: r.rows.map(row => row.name || row[0]) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ========== MONGODB ==========
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB Connected!'))
  .catch(err => console.error('❌ MongoDB Error:', err.message));

// ========== MODELS ==========
const User        = require('./models/User');
const Feedback    = require('./models/Feedback');
const ChatMessage = require('./models/ChatMessage');

// ─── Live guest tracker ───
const guestPings = new Map();

// ========== STATS ==========
app.get('/api/stats', async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const fiveMinAgo = Date.now() - 5 * 60 * 1000;
    for (const [id, ts] of guestPings) { if (ts < fiveMinAgo) guestPings.delete(id); }
    const liveGuests   = guestPings.size;
    const QuizHistory  = require('./models/QuizHistory');
    const totalQuizzes = await QuizHistory.countDocuments();
    res.json({ success: true, totalUsers, liveGuests, totalQuizzes });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

app.post('/api/stats/ping', (req, res) => {
  const { sessionId } = req.body;
  if (sessionId) guestPings.set(sessionId, Date.now());
  const fiveMinAgo = Date.now() - 5 * 60 * 1000;
  for (const [id, ts] of guestPings) { if (ts < fiveMinAgo) guestPings.delete(id); }
  res.json({ success: true, liveGuests: guestPings.size });
});

// ========== FEEDBACK ==========
// POST /api/feedback  — requires login
app.post('/api/feedback', async (req, res) => {
  try {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ success: false, message: 'Feedback देने के लिए login जरूरी है' });

    const { message, rating } = req.body;
    if (!message || message.trim().length < 3)
      return res.status(400).json({ success: false, message: 'Message बहुत छोटा है' });

    const fb = await Feedback.create({
      userId:  user._id,
      name:    user.name,
      message: message.trim(),
      rating:  Number(rating) || 5
    });
    res.status(201).json({ success: true, feedback: fb });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// GET /api/feedback
app.get('/api/feedback', async (req, res) => {
  try {
    const items = await Feedback.find().sort({ postedAt: -1 }).limit(20);
    res.json({ success: true, feedback: items });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// PUT /api/feedback/:id  — edit own feedback
app.put('/api/feedback/:id', async (req, res) => {
  try {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ success: false, message: 'Login जरूरी है' });

    const fb = await Feedback.findById(req.params.id);
    if (!fb) return res.status(404).json({ success: false, message: 'Feedback नहीं मिला' });
    if (!fb.userId || fb.userId.toString() !== user._id.toString())
      return res.status(403).json({ success: false, message: 'आप यह edit नहीं कर सकते' });

    const { message, rating } = req.body;
    if (message && message.trim().length >= 3) fb.message = message.trim();
    if (rating) fb.rating = Math.min(5, Math.max(1, Number(rating)));
    await fb.save();
    res.json({ success: true, feedback: fb });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// DELETE /api/feedback/:id  — delete own feedback
app.delete('/api/feedback/:id', async (req, res) => {
  try {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ success: false, message: 'Login जरूरी है' });

    const fb = await Feedback.findById(req.params.id);
    if (!fb) return res.status(404).json({ success: false, message: 'Feedback नहीं मिला' });
    if (!fb.userId || fb.userId.toString() !== user._id.toString())
      return res.status(403).json({ success: false, message: 'आप यह delete नहीं कर सकते' });

    await fb.deleteOne();
    res.json({ success: true, message: 'Feedback delete हो गया' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ========== CHAT ==========
// GET /api/chat  — last 50 messages (requires login)
app.get('/api/chat', async (req, res) => {
  try {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ success: false, message: 'Chat के लिए login जरूरी है' });
    const msgs = await ChatMessage.find().sort({ createdAt: -1 }).limit(50);
    res.json({ success: true, messages: msgs.reverse() });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// POST /api/chat  — send message (requires login)
app.post('/api/chat', async (req, res) => {
  try {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ success: false, message: 'Login जरूरी है' });

    const { message } = req.body;
    if (!message || message.trim().length < 1)
      return res.status(400).json({ success: false, message: 'Message खाली नहीं हो सकता' });
    if (message.trim().length > 500)
      return res.status(400).json({ success: false, message: 'Message 500 characters से बड़ा नहीं हो सकता' });

    // Update user lastActive
    user.lastActive = new Date();
    await user.save({ validateBeforeSave: false });

    const msg = await ChatMessage.create({
      user:       user._id,
      userName:   user.name,
      userAvatar: user.avatar || '🎓',
      message:    message.trim()
    });
    res.status(201).json({ success: true, message: msg });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ========== AUTH & HISTORY ROUTES ==========
app.use('/api/auth',    authRoutes);
app.use('/api/history', historyRoutes);

// ========== AUTO-DELETE INACTIVE ACCOUNTS (3+ months) ==========
async function deleteInactiveUsers() {
  try {
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const inactive = await User.find({ lastActive: { $lt: threeMonthsAgo } });
    if (!inactive.length) return;

    const QuizHistory = require('./models/QuizHistory');
    for (const u of inactive) {
      await QuizHistory.deleteMany({ user: u._id });
      await ChatMessage.deleteMany({ user: u._id });
      await Feedback.deleteMany({ userId: u._id });
      await User.findByIdAndDelete(u._id);
    }
    console.log(`[Auto-delete] Removed ${inactive.length} inactive user(s)`);
  } catch (err) {
    console.error('[Auto-delete] Error:', err.message);
  }
}

// Run once at startup (after DB connects) then every 24 hours
mongoose.connection.once('open', () => {
  deleteInactiveUsers();
  setInterval(deleteInactiveUsers, 24 * 60 * 60 * 1000);
});

// ========== HEALTH CHECK ==========
app.get('/', (req, res) => {
  res.json({
    status:  '✅ Running',
    mongodb: mongoose.connection.readyState === 1 ? '✅ Connected' : '❌ Disconnected',
    routes:  {
      quiz:      'GET /quiz/:subject?category=...',
      states:    'GET /quiz/states?state=...',
      chat:      'GET|POST /api/chat',
      feedback:  'GET|POST|PUT|DELETE /api/feedback',
      profile:   'PUT /api/auth/profile | PUT /api/auth/password | DELETE /api/auth/account',
    }
  });
});

// ========== 404 & ERROR ==========
app.use((req, res) => res.status(404).json({ success: false, message: 'Route not found' }));
app.use((err, req, res, next) => { console.error(err.stack); res.status(500).json({ success: false, message: 'Server error!' }); });

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Vidyasagar server on port ${PORT}`));
