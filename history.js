const express     = require('express');
const QuizHistory = require('../models/QuizHistory');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// ─── SAVE QUIZ RESULT ───
// POST /api/history/save
router.post('/save', protect, async (req, res) => {
  try {
    const { subject, subCategory, state, score, total, timeTaken } = req.body;
    if (score === undefined || !total)
      return res.status(400).json({ success: false, message: 'Score और total जरूरी हैं' });

    const percentage = Math.round((score / total) * 100);
    const entry = await QuizHistory.create({
      user: req.user._id, subject, subCategory, state,
      score, total, percentage, timeTaken
    });

    res.status(201).json({ success: true, message: 'Result save हो गया!', entry });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── GET USER HISTORY ───
// GET /api/history
router.get('/', protect, async (req, res) => {
  try {
    const history = await QuizHistory.find({ user: req.user._id })
      .sort({ playedAt: -1 })
      .limit(50);

    res.json({ success: true, count: history.length, history });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── DELETE ONE ENTRY ───
// DELETE /api/history/:id
router.delete('/:id', protect, async (req, res) => {
  try {
    const entry = await QuizHistory.findById(req.params.id);
    if (!entry)
      return res.status(404).json({ success: false, message: 'Entry नहीं मिली' });
    if (entry.user.toString() !== req.user._id.toString())
      return res.status(403).json({ success: false, message: 'आप इसे delete नहीं कर सकते' });

    await entry.deleteOne();
    res.json({ success: true, message: 'Entry delete हो गई' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
