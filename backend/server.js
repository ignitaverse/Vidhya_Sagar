require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const { createClient } = require('@libsql/client'); // PostgreSQL ki jagah Turso client
const cors = require('cors');

const authRoutes    = require('./routes/auth');
const historyRoutes = require('./routes/history');

const app = express();

// ─── TURSO DATABASE CONNECTION ───
// Render par TURSO_DATABASE_URL aur TURSO_AUTH_TOKEN set karna na bhulein
const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
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

// ─── TURSO QUIZ DATA ROUTE ───
app.get('/api/quiz-data/:subject', async (req, res) => {
  try {
    const { subject } = req.params;
    
    // Turso se data fetch karna
    // Hum 'options' ko string se JSON mein convert karenge taaki frontend ko array mile
    const result = await client.execute({
      sql: "SELECT question as q, options as opts, answer as ans FROM computer_quiz WHERE category = ?",
      args: [subject]
    });

    if (result.rows.length > 0) {
      // Data format ko purane format (computer.json) jaisa banana
      const formattedQuestions = result.rows.map(row => ({
        q: row.q,
        opts: JSON.parse(row.opts), // String array ko wapas real array banana
        ans: row.ans
      }));

      // Frontend categories expect karta hai
      res.json({ 
        categories: { 
          [subject]: formattedQuestions 
        } 
      });
    } else {
      res.status(404).json({ success: false, message: 'Is category ka data nahi mila' });
    }
  } catch (err) {
    console.error("Turso Error:", err);
    res.status(500).json({ success: false, message: 'Database Error' });
  }
});

app.get('/', (req, res) => {
  res.json({ message: '📚 विद्यासागर API चालू है (Turso Connected)!', status: 'OK' });
});

// ─── ERROR HANDLER ───
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: 'Server mein kuch galti hai!' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
