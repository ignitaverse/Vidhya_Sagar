const express = require('express');
const jwt     = require('jsonwebtoken');
const User    = require('../models/User');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });

// Helper: build user response object
function userObj(u) {
  return {
    id: u._id, name: u.name, email: u.email,
    avatar: u.avatar || '🎓',
    joinedAt: u.joinedAt,
    nameChanges: u.nameChanges || 0,
    dob: u.dob || '', examPrep: u.examPrep || '',
    totalQuizzes: u.totalQuizzes, totalCorrect: u.totalCorrect, totalWrong: u.totalWrong
  };
}

// ─── SIGNUP ───
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
      success: true, message: 'Account बन गया!',
      token: generateToken(user._id), user: userObj(user)
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── LOGIN ───
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ success: false, message: 'ईमेल और पासवर्ड दर्ज करें' });

    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.matchPassword(password)))
      return res.status(401).json({ success: false, message: 'ईमेल या पासवर्ड गलत है' });

    // Update last active
    user.lastActive = new Date();
    await user.save({ validateBeforeSave: false });

    res.json({
      success: true, message: 'लॉगिन सफल!',
      token: generateToken(user._id), user: userObj(user)
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── GET PROFILE ───
router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    user.lastActive = new Date();
    await user.save({ validateBeforeSave: false });
    res.json({ success: true, user: userObj(user) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── UPDATE PROFILE (name max 2x, dob, examPrep, avatar) ───
router.put('/profile', protect, async (req, res) => {
  try {
    const { name, dob, examPrep, avatar } = req.body;
    const user = await User.findById(req.user._id);

    if (name && name.trim() && name.trim() !== user.name) {
      if ((user.nameChanges || 0) >= 2)
        return res.status(400).json({ success: false, message: 'नाम केवल 2 बार बदला जा सकता है' });
      user.name = name.trim();
      user.nameChanges = (user.nameChanges || 0) + 1;
    }
    if (dob      !== undefined) user.dob      = dob;
    if (examPrep !== undefined) user.examPrep  = examPrep;
    if (avatar)                 user.avatar    = avatar;

    await user.save();
    res.json({ success: true, message: 'Profile update हो गई!', user: userObj(user) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── CHANGE PASSWORD ───
router.put('/password', protect, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword)
      return res.status(400).json({ success: false, message: 'दोनों passwords दर्ज करें' });
    if (newPassword.length < 6)
      return res.status(400).json({ success: false, message: 'नया password कम से कम 6 characters का हो' });

    const user = await User.findById(req.user._id).select('+password');
    if (!(await user.matchPassword(currentPassword)))
      return res.status(400).json({ success: false, message: 'पुराना password गलत है' });

    user.password = newPassword;
    await user.save();
    res.json({ success: true, message: '✅ Password बदल गया!' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── DELETE ACCOUNT ───
router.delete('/account', protect, async (req, res) => {
  try {
    const userId = req.user._id;
    const QuizHistory = require('../models/QuizHistory');
    const ChatMessage = require('../models/ChatMessage');
    const Feedback    = require('../models/Feedback');

    await Promise.all([
      QuizHistory.deleteMany({ user: userId }),
      ChatMessage.deleteMany({ user: userId }),
      Feedback.deleteMany({ userId: userId }),
      User.findByIdAndDelete(userId)
    ]);

    res.json({ success: true, message: 'Account और सारा data delete हो गया' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
