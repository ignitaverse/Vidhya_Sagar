require('dotenv').config();
const express  = require('express');
const mongoose = require('mongoose');
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
// NOTE: states is handled separately — NOT in TABLE_MAP
//       to avoid the /quiz/:subject route catching it first.

// ========== MIDDLEWARE ==========
app.use(cors({
  origin: ['https://ignitaverse.github.io', 'http://localhost:5500', 'https://vidhya-sagar.onrender.com'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// =====================================================================
// ⚠️  BUG FIX: /quiz/states MUST come BEFORE /quiz/:subject
//     Otherwise Express matches subject="states" and ignores this route
// =====================================================================

// GET /quiz/states?state=<राज्य का नाम>
app.get('/quiz/states', async (req, res) => {
  try {
    const { state } = req.query;
    if (!state) {
      return res.status(400).json({ success: false, message: 'state query param जरूरी है' });
    }

    const { exclude, batch } = req.query;
    const batchSize  = Math.min(parseInt(batch) || 10, 50);
    const excludeIds = exclude
      ? exclude.split(',').map(x => parseInt(x.trim())).filter(n => !isNaN(n))
      : [];

    const args = [state];
    let whereStr = `WHERE category = ?`;
    if (excludeIds.length > 0) {
      const ph = excludeIds.map(() => '?').join(',');
      whereStr += ` AND rowid NOT IN (${ph})`;
      excludeIds.forEach(id => args.push(id));
    }

    const totalRes  = await turso.execute({ sql: `SELECT COUNT(*) as cnt FROM "states_quiz" ${whereStr}`, args: [...args] });
    const remaining = Number(totalRes.rows[0]?.cnt ?? 0);

    if (remaining === 0) {
      return res.json({ success: true, data: [], remaining: 0, exhausted: true });
    }

    const result = await turso.execute({
      sql:  `SELECT rowid, question, options, answer, description FROM "states_quiz" ${whereStr} ORDER BY RANDOM() LIMIT ${batchSize}`,
      args
    });

    const questions = result.rows.map(row => ({
      id:          row.rowid,
      q:           row.question,
      opts:        typeof row.options === 'string' ? JSON.parse(row.options) : row.options,
      ans:         Number(row.answer),
      description: row.description || ''
    }));

    res.json({ success: true, data: questions, remaining: remaining - questions.length });
  } catch (err) {
    console.error('[/quiz/states] Error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /quiz/states/categories  — distinct states in the table
app.get('/quiz/states/categories', async (req, res) => {
  try {
    const result = await turso.execute({
      sql:  `SELECT DISTINCT category FROM "states_quiz" WHERE category IS NOT NULL AND category != '' ORDER BY category`,
      args: []
    });
    res.json({ success: true, categories: result.rows.map(r => r.category) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// =====================================================================
// GET /quiz/:subject/categories   — comes BEFORE /quiz/:subject
//     (Express matches more-specific path first when defined first)
// =====================================================================
app.get('/quiz/:subject/categories', async (req, res) => {
  try {
    const { subject } = req.params;
    const table = TABLE_MAP[subject];
    if (!table) {
      return res.status(400).json({ success: false, message: `Invalid subject: ${subject}` });
    }

    const result = await turso.execute({
      sql:  `SELECT DISTINCT category FROM "${table}" WHERE category IS NOT NULL AND category != '' ORDER BY category`,
      args: []
    });

    res.json({ success: true, categories: result.rows.map(r => r.category) });
  } catch (err) {
    console.error(`[/quiz/${req.params.subject}/categories] Error:`, err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /quiz/:subject?category=X&exclude=id1,id2&batch=10
app.get('/quiz/:subject', async (req, res) => {
  try {
    const { subject }  = req.params;
    const { category, exclude, batch } = req.query;
    const table = TABLE_MAP[subject];

    if (!table) {
      return res.status(400).json({ success: false, message: `Invalid subject: ${subject}` });
    }

    const batchSize  = Math.min(parseInt(batch) || 10, 50);
    const excludeIds = exclude
      ? exclude.split(',').map(x => parseInt(x.trim())).filter(n => !isNaN(n))
      : [];

    const args = [];
    const whereClauses = [];

    if (category && category !== 'all') {
      whereClauses.push(`category = ?`);
      args.push(category);
    }
    if (excludeIds.length > 0) {
      const placeholders = excludeIds.map(() => '?').join(',');
      whereClauses.push(`rowid NOT IN (${placeholders})`);
      excludeIds.forEach(id => args.push(id));
    }

    const whereStr = whereClauses.length > 0 ? ` WHERE ${whereClauses.join(' AND ')}` : '';

    // Count remaining questions
    const totalRes  = await turso.execute({ sql: `SELECT COUNT(*) as cnt FROM "${table}"${whereStr}`, args: [...args] });
    const remaining = Number(totalRes.rows[0]?.cnt ?? 0);

    if (remaining === 0) {
      return res.json({ success: true, data: [], remaining: 0, exhausted: true });
    }

    const result = await turso.execute({
      sql:  `SELECT rowid, question, options, answer, description FROM "${table}"${whereStr} ORDER BY RANDOM() LIMIT ${batchSize}`,
      args
    });

    const questions = result.rows.map(row => ({
      id:          row.rowid,
      q:           row.question,
      opts:        typeof row.options === 'string' ? JSON.parse(row.options) : row.options,
      ans:         Number(row.answer),
      description: row.description || ''
    }));

    res.json({ success: true, data: questions, remaining: remaining - questions.length });
  } catch (err) {
    console.error(`[/quiz/${req.params.subject}] Error:`, err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ========== /api/quiz ENDPOINTS (original — kept for compatibility) ==========

app.get('/api/quiz/:subject', async (req, res) => {
  try {
    const { subject }  = req.params;
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
      answer:   row.answer,
      category: row.category
    }));
    res.json({ success: true, data: questions });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/quiz-data/:subject', async (req, res) => {
  try {
    const { subject } = req.params;
    const isStates = subject === 'states';
    const table = isStates ? 'states_quiz' : TABLE_MAP[subject];

    if (!table) {
      return res.status(400).json({ success: false, message: `Invalid subject: ${subject}` });
    }

    const result = await turso.execute({
      sql:  `SELECT question, options, answer, category FROM "${table}"`,
      args: []
    });

    if (!result.rows.length) {
      return res.status(404).json({ success: false, message: 'No data' });
    }

    const categories = {};
    for (const row of result.rows) {
      const catKey = (row.category && String(row.category).trim()) ? String(row.category).trim() : subject;
      if (!categories[catKey]) categories[catKey] = [];
      let opts = [];
      try { opts = JSON.parse(row.options); } catch { opts = String(row.options).split(',').map(s => s.trim()); }
      categories[catKey].push({ q: row.question, opts, ans: Number(row.answer) });
    }

    res.json(isStates ? { states: categories } : { categories });
  } catch (err) {
    console.error(`[/api/quiz-data/${req.params.subject}] Error:`, err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ========== DEBUG ROUTES ==========
app.get('/api/debug/:subject', async (req, res) => {
  try {
    const { subject } = req.params;
    const table = (subject === 'states') ? 'states_quiz' : (TABLE_MAP[subject] || subject);
    const cnt    = await turso.execute({ sql: `SELECT COUNT(*) AS total FROM "${table}"`, args: [] });
    const cats   = await turso.execute({ sql: `SELECT DISTINCT category FROM "${table}" ORDER BY category`, args: [] });
    const sample = await turso.execute({ sql: `SELECT * FROM "${table}" LIMIT 2`, args: [] });
    res.json({
      table,
      totalRows:  cnt.rows[0]?.total ?? cnt.rows[0]?.[0],
      categories: cats.rows.map(r => r.category || r[0]),
      sampleRows: sample.rows
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/debug', async (req, res) => {
  try {
    const r = await turso.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");
    res.json({ tables: r.rows.map(row => row.name || row[0]) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== MONGODB ==========
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB Connected!'))
  .catch(err => console.error('❌ MongoDB Error:', err.message));

// ========== MODELS ==========
const User     = require('./models/User');
const Feedback = require('./models/Feedback');

// ── Live guest tracker (in-memory, resets on restart) ──
// Each guest ping stores timestamp; we count pings in last 5 min
const guestPings = new Map(); // key = sessionId, value = timestamp

// ========== STATS ENDPOINT ==========
// GET /api/stats
app.get('/api/stats', async (req, res) => {
  try {
    const totalUsers   = await User.countDocuments();
    const fiveMinAgo   = Date.now() - 5 * 60 * 1000;
    for (const [id, ts] of guestPings) {
      if (ts < fiveMinAgo) guestPings.delete(id);
    }
    const liveGuests   = guestPings.size;
    const QuizHistory  = require('./models/QuizHistory');
    const totalQuizzes = await QuizHistory.countDocuments();
    res.json({ success: true, totalUsers, liveGuests, totalQuizzes });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/stats/ping  — guest heartbeat (every 30s from frontend)
app.post('/api/stats/ping', (req, res) => {
  const { sessionId } = req.body;
  if (sessionId) guestPings.set(sessionId, Date.now());
  // Clean old entries
  const fiveMinAgo = Date.now() - 5 * 60 * 1000;
  for (const [id, ts] of guestPings) {
    if (ts < fiveMinAgo) guestPings.delete(id);
  }
  res.json({ success: true, liveGuests: guestPings.size });
});

// ========== FEEDBACK ENDPOINTS ==========

// POST /api/feedback  — submit new feedback
app.post('/api/feedback', async (req, res) => {
  try {
    const { name, message, rating } = req.body;
    if (!message || message.trim().length < 3) {
      return res.status(400).json({ success: false, message: 'Message is too short' });
    }
    const fb = await Feedback.create({
      name:    name?.trim()  || 'Anonymous',
      message: message.trim(),
      rating:  Number(rating) || 5
    });
    res.status(201).json({ success: true, feedback: fb });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/feedback  — get latest 20 reviews
app.get('/api/feedback', async (req, res) => {
  try {
    const items = await Feedback.find()
      .sort({ postedAt: -1 })
      .limit(20);
    res.json({ success: true, feedback: items });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ========== AUTH & HISTORY ROUTES ==========
app.use('/api/auth',    authRoutes);
app.use('/api/history', historyRoutes);

// ========== HEALTH CHECK ==========
app.get('/', (req, res) => {
  res.json({
    status:  '✅ Running',
    mongodb: mongoose.connection.readyState === 1 ? '✅ Connected' : '❌ Disconnected',
    routes:  {
      quiz:        'GET /quiz/:subject?category=...',
      categories:  'GET /quiz/:subject/categories',
      states:      'GET /quiz/states?state=...',
      stats:       'GET /api/stats?sessionId=...',
      feedback:    'GET|POST /api/feedback',
    }
  });
});

// ========== 404 & ERROR HANDLERS ==========
app.use((req, res) => res.status(404).json({ success: false, message: 'Route not found' }));
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: 'Server error!' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Vidyasagar server on port ${PORT}`));
