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

// ─── CONFIRMED TABLE NAMES ───
// Schema: question TEXT, options TEXT (JSON), answer INTEGER, category TEXT
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

// ─── MONGODB CONNECTION ───
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB Connected!'))
  .catch(err => console.error('❌ MongoDB Error:', err.message));

const PORT = process.env.PORT || 5000;

// ─── MIDDLEWARE ───
// server.js mein is line ko dhundo aur replace karo:
app.use(cors({ 
  origin: ['https://ignitaverse.github.io', 'http://localhost:5500'], 
  credentials: true 
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── ROUTES ───
app.use('/api/auth',    authRoutes);
app.use('/api/history', historyRoutes);

// ════════════════════════════════════════════════════
// QUIZ DATA ROUTE
// GET /api/quiz-data/:subject
//
// Table schema (confirmed):
//   question  TEXT   — question text
//   options   TEXT   — JSON string e.g. ["A","B","C","D"]
//   answer    INTEGER — correct option index (0-based)
//   category  TEXT   — subcategory name (e.g. "Algebra", "Grammar")
// ════════════════════════════════════════════════════
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

    // Saari rows ek saath fetch karo
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

    // Category ke hisaab se group karo
    const categories = {};

    for (const row of result.rows) {
      // Category key — agar null/empty ho to subject naam use karo
      const catKey = (row.category && String(row.category).trim())
        ? String(row.category).trim()
        : subject;

      if (!categories[catKey]) categories[catKey] = [];

      // Options: TEXT mein JSON string save hai — parse karein
      let opts = [];
      try {
        opts = JSON.parse(row.options);
      } catch {
        // Fallback: comma-separated string
        opts = String(row.options).split(',').map(s => s.trim());
      }

      categories[catKey].push({
        q:    row.question,
        opts: opts,
        ans:  Number(row.answer), // 0-based index
      });
    }

    // States ke liye frontend expects: { states: { "UP": [...], "MP": [...] } }
    if (subject === 'states') {
      return res.json({ states: categories });
    }

    // Baaki subjects ke liye: { categories: { "Algebra": [...], ... } }
    res.json({ categories });

  } catch (err) {
    console.error(`[quiz-data/${req.params.subject}] Error:`, err.message);
    res.status(500).json({
      success: false,
      message: 'Database Error: ' + err.message
    });
  }
});

// ─── DEBUG ROUTE (production mein bhi safe hai — sirf read) ───
// https://your-api.onrender.com/api/debug/computer
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

// ─── HEALTH CHECK ───
app.get('/', (req, res) => {
  res.json({
    status:  '✅ Running',
    mongodb: mongoose.connection.readyState === 1 ? '✅ Connected' : '❌ Disconnected',
    tip:     'Debug: /api/debug/computer',
  });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: 'Server error!' });
});

app.listen(PORT, () => console.log(`🚀 Vidyasagar server on port ${PORT}`));
