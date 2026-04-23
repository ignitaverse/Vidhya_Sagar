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
  states:   'states_quiz',
};

// ========== MIDDLEWARE ==========
app.use(cors({ 
  origin: ['https://ignitaverse.github.io', 'http://localhost:5500', 'https://vidhya-sagar.onrender.com'], 
  credentials: true 
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ========== FRONTEND-FACING ENDPOINTS (without /api prefix) ==========
// GET /quiz/:subject?category=...
app.get('/quiz/:subject', async (req, res) => {
  try {
    const { subject } = req.params;
    const { category } = req.query;
    const table = TABLE_MAP[subject];
    if (!table) {
      return res.status(400).json({ success: false, message: 'Invalid subject' });
    }
    let query = `SELECT question, options, answer FROM "${table}"`;
    const args = [];
    if (category && category !== 'all') {
      query += ` WHERE category = ?`;
      args.push(category);
    }
    query += ` ORDER BY RANDOM() LIMIT 10`;
    const result = await turso.execute({ sql: query, args });
    const questions = result.rows.map(row => ({
      q: row.question,
      opts: typeof row.options === 'string' ? JSON.parse(row.options) : row.options,
      ans: Number(row.answer)
    }));
    res.json({ success: true, data: questions });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /quiz/:subject/categories
app.get('/quiz/:subject/categories', async (req, res) => {
  try {
    const { subject } = req.params;
    const table = TABLE_MAP[subject];
    if (!table) {
      return res.status(400).json({ success: false, message: 'Invalid subject' });
    }
    const result = await turso.execute({
      sql: `SELECT DISTINCT category FROM "${table}" WHERE category IS NOT NULL AND category != '' ORDER BY category`
    });
    const categories = result.rows.map(row => row.category);
    res.json({ success: true, categories });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /quiz/states?state=...
app.get('/quiz/states', async (req, res) => {
  try {
    const { state } = req.query;
    if (!state) {
      return res.status(400).json({ success: false, message: 'State query param required' });
    }
    const table = 'states_quiz';
    const result = await turso.execute({
      sql: `SELECT question, options, answer FROM "${table}" WHERE category = ? ORDER BY RANDOM() LIMIT 10`,
      args: [state]
    });
    const questions = result.rows.map(row => ({
      q: row.question,
      opts: typeof row.options === 'string' ? JSON.parse(row.options) : row.options,
      ans: Number(row.answer)
    }));
    res.json({ success: true, data: questions });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ========== ORIGINAL /api/quiz ENDPOINT (keep as is) ==========
app.get('/api/quiz/:subject', async (req, res) => {
  try {
    const { subject } = req.params;
    const { category } = req.query; 
    const table = TABLE_MAP[subject];
    if (!table) {
      return res.status(400).json({ success: false, message: 'Invalid subject selected' });
    }
    let query = `SELECT * FROM "${table}"`;
    let args = [];
    if (category && category !== 'all') {
      query += ` WHERE category = ?`;
      args.push(category);
    }
    query += ` ORDER BY RANDOM() LIMIT 10`;
    const result = await turso.execute({ sql: query, args });
    const questions = result.rows.map(row => ({
      question: row.question,
      options: typeof row.options === 'string' ? JSON.parse(row.options) : row.options,
      answer: row.answer,
      category: row.category
    }));
    res.json({ success: true, data: questions });
  } catch (error) {
    console.error('Quiz Fetch Error:', error);
    res.status(500).json({ success: false, message: 'Questions लोड करने में समस्या' });
  }
});

// ========== ORIGINAL QUIZ-DATA ROUTE (full categories) ==========
app.get('/api/quiz-data/:subject', async (req, res) => {
  try {
    const { subject } = req.params;
    const table = TABLE_MAP[subject];
    if (!table) {
      return res.status(400).json({
        success: false,
        message: `Subject '${subject}' nahi mila. Valid subjects: ${Object.keys(TABLE_MAP).join(', ')}`
      });
    }
    const result = await turso.execute({
      sql:  `SELECT question, options, answer, category FROM "${table}"`,
      args: []
    });
    if (!result.rows.length) {
      return res.status(404).json({
        success: false,
        message: `Table '${table}' mein koi data nahi hai.`
      });
    }
    const categories = {};
    for (const row of result.rows) {
      const catKey = (row.category && String(row.category).trim()) ? String(row.category).trim() : subject;
      if (!categories[catKey]) categories[catKey] = [];
      let opts = [];
      try {
        opts = JSON.parse(row.options);
      } catch {
        opts = String(row.options).split(',').map(s => s.trim());
      }
      categories[catKey].push({
        q:    row.question,
        opts: opts,
        ans:  Number(row.answer),
      });
    }
    if (subject === 'states') {
      return res.json({ states: categories });
    }
    res.json({ categories });
  } catch (err) {
    console.error(`[quiz-data/${req.params.subject}] Error:`, err.message);
    res.status(500).json({ success: false, message: 'Database Error: ' + err.message });
  }
});

// ========== ORIGINAL DEBUG ROUTES ==========
app.get('/api/debug/:subject', async (req, res) => {
  try {
    const { subject } = req.params;
    const table = TABLE_MAP[subject] || subject;
    const cnt     = await turso.execute({ sql: `SELECT COUNT(*) AS total FROM "${table}"`, args: [] });
    const cats    = await turso.execute({ sql: `SELECT DISTINCT category FROM "${table}" ORDER BY category`, args: [] });
    const sample  = await turso.execute({ sql: `SELECT * FROM "${table}" LIMIT 2`, args: [] });
    res.json({
      table,
      totalRows:   cnt.rows[0]?.total ?? cnt.rows[0]?.[0],
      categories:  cats.rows.map(r => r.category || r[0]),
      sampleRows:  sample.rows,
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

// ========== MONGO DB CONNECTION ==========
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB Connected!'))
  .catch(err => console.error('❌ MongoDB Error:', err.message));

// ========== AUTH & HISTORY ROUTES ==========
app.use('/api/auth', authRoutes);
app.use('/api/history', historyRoutes);

// ========== HEALTH CHECK ==========
app.get('/', (req, res) => {
  res.json({
    status:  '✅ Running',
    mongodb: mongoose.connection.readyState === 1 ? '✅ Connected' : '❌ Disconnected',
    tip:     'Debug: /api/debug/computer',
  });
});

// ========== 404 & ERROR HANDLERS ==========
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: 'Server error!' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Vidyasagar server on port ${PORT}`));
