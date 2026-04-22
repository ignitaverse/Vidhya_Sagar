const express = require('express');
const jwt     = require('jsonwebtoken');
const User    = require('../models/User');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// Token generate karna
const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });

// ─── SIGNUP ───
// POST /api/auth/signup
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ success: false, message: 'सभी fields भरें' });

    const exists = await User.findOne({ email });
    if (exists)
      return res.status(400).json({ success: false, message: 'यह ईमेल पहले से registered है' });

    const user = await User.create({ name, email, password });
    res.status(201).json({
      success: true,
      message: 'Account बन गया!',
      token: generateToken(user._id),
      user: { id: user._id, name: user.name, email: user.email, joinedAt: user.joinedAt }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── LOGIN ───
// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ success: false, message: 'ईमेल और पासवर्ड दर्ज करें' });

    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.matchPassword(password)))
      return res.status(401).json({ success: false, message: 'ईमेल या पासवर्ड गलत है' });

    res.json({
      success: true,
      message: 'लॉगिन सफल!',
      token: generateToken(user._id),
      user: {
        id: user._id, name: user.name, email: user.email,
        joinedAt: user.joinedAt, totalQuizzes: user.totalQuizzes,
        totalCorrect: user.totalCorrect, totalWrong: user.totalWrong
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── GET PROFILE ───
// GET /api/auth/me
router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    res.json({
      success: true,
      user: {
        id: user._id, name: user.name, email: user.email,
        joinedAt: user.joinedAt, totalQuizzes: user.totalQuizzes,
        totalCorrect: user.totalCorrect, totalWrong: user.totalWrong
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
