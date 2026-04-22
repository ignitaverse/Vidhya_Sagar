require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const { Pool } = require('pg');
const cors = require('cors');

const authRoutes    = require('./routes/auth');
const historyRoutes = require('./routes/history');

const app  = express();
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});
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

app.get('/api/quiz-data/:subject', async (req, res) => {
  try {
    const { subject } = req.params;
    const result = await pool.query(
      'SELECT data FROM quiz_content WHERE subject_key = $1',
      [subject]
    );

    if (result.rows.length > 0) {
      res.json(result.rows[0].data);
    } else {
      res.status(404).json({ success: false, message: 'Data nahi mila' });
    }
  } catch (err) {
    console.error(err.stack);
    res.status(500).json({ success: false, message: 'Database Error' });
  }
});

app.get('/', (req, res) => {
  res.json({ message: '📚 विद्यासागर API चालू है!', status: 'OK' });
});

// ─── ERROR HANDLER ───
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: 'Server Error' });
});

// ─── MONGODB CONNECTION ───
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('✅ MongoDB से जुड़ गए!');
    app.listen(PORT, () => console.log(`🚀 Server चल रहा है: http://localhost:${PORT}`));
  })
  .catch(err => {
    console.error('❌ MongoDB Error:', err.message);
    process.exit(1);
  });
