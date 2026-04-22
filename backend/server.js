require('dotenv').config();
const express   = require('express');
const mongoose  = require('mongoose');
const { createClient } = require('@libsql/client');
const cors      = require('cors');

const authRoutes    = require('./routes/auth');
const historyRoutes = require('./routes/history');

const app = express();

// ─── TURSO CLIENT ───
const turso = createClient({
  url:       process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// ─── SUBJECT → TABLE MAP ───
// Turso mein har subject ka ek alag table hai
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
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── ROUTES ───
app.use('/api/auth',    authRoutes);
app.use('/api/history', historyRoutes);

// ─── TURSO QUIZ DATA ROUTE ───
// GET /api/quiz-data/:subject
app.get('/api/quiz-data/:subject', async (req, res) => {
  try {
    const { subject } = req.params;
    const tableName = TABLE_MAP[subject];

    if (!tableName) {
      return res.status(400).json({ success: false, message: `Unknown subject: ${subject}` });
    }

    // Turso se saare questions fetch karo
    // 'category' column se sub-categories group ki jaayengi
        // Turso se saare questions fetch karo
    const result = await turso.execute({
      sql: `SELECT question, options, answer, category FROM \`${tableName}\``,
      args: []
    });

    if (!result.rows.length) {
      return res.status(404).json({ success: false, message: 'Is subject ka data nahi mila' });
    }

    const categories = {};
    for (const row of result.rows) {
      // Schema ke naye names use karein
      const catKey = row.category || subject;
      if (!categories[catKey]) categories[catKey] = [];
      
      categories[catKey].push({
        q:    row.question,
        // Options agar string mein hain to parse karein, warna direct use karein
        opts: typeof row.options === 'string' ? JSON.parse(row.options) : row.options,
        ans:  row.answer,
      });
    }

    // States subject ke liye alag format
    if (subject === 'states') {
      return res.json({ states: categories });
    }

    res.json({ categories });

  } catch (err) {
    console.error('Turso Error:', err);
    res.status(500).json({ success: false, message: 'Database Error: ' + err.message });
  }
});

// ─── HEALTH CHECK ───
app.get('/', (req, res) => {
  res.json({ message: '📚 विद्यासागर API चालू है!', status: 'OK', db: mongoose.connection.readyState === 1 ? 'MongoDB Connected' : 'MongoDB Disconnected' });
});

// ─── GLOBAL ERROR HANDLER ───
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: 'Server mein kuch galti hai!' });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
