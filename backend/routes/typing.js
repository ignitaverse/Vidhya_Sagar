const express       = require('express');
const TypingHistory = require('../models/TypingHistory');
const TypingExam    = require('../models/TypingExam');
const TypingPassage = require('../models/TypingPassage');
const { protect }   = require('../middleware/authMiddleware');
const router        = express.Router();

// FEATURE (naya): Exam list - Supabase ke fallback ke roop mein (dekho
// docs/js/typing.js -> _fetchExamsWithFallback). Login zaroori nahi -
// Supabase ka anon-key read bhi public hi hota hai, isliye yahan bhi
// public rakha (protect middleware nahi).
router.get('/exams', async (req, res) => {
  try {
    const exams = await TypingExam.find().sort({ name: 1 });
    res.json({ success: true, exams });
  } catch (e) { console.error(e); res.status(500).json({ success: false, message: 'Server error' }); }
});

// Ek exam ke saare passages
router.get('/passages/:examId', async (req, res) => {
  try {
    const passages = await TypingPassage.find({ examId: req.params.examId }).sort({ createdAt: 1 });
    res.json({ success: true, passages });
  } catch (e) { console.error(e); res.status(500).json({ success: false, message: 'Server error' }); }
});

// Save result
router.post('/save', protect, async (req,res) => {
  try {
    const { examId,examName,language,wpm,netWpm,accuracy,errors,keystrokes,timeTaken,passed } = req.body;
    if (!examId||wpm===undefined||accuracy===undefined) return res.status(400).json({ success:false, message:'examId, wpm, accuracy required' });
    const entry = await TypingHistory.create({ user:req.user._id,examId,examName,language,wpm,netWpm:netWpm||wpm,accuracy,errors:errors||0,keystrokes:keystrokes||0,timeTaken:timeTaken||0,passed:!!passed });
    res.status(201).json({ success:true, entry });
  } catch (e) { console.error(e); res.status(500).json({ success: false, message: 'Server error' }); }
});

// Get history
router.get('/history', protect, async (req,res) => {
  try {
    const history = await TypingHistory.find({user:req.user._id}).sort({playedAt:-1}).limit(50);
    res.json({ success:true, count:history.length, history });
  } catch (e) { console.error(e); res.status(500).json({ success: false, message: 'Server error' }); }
});

// Delete entry
router.delete('/:id', protect, async (req,res) => {
  try {
    const entry = await TypingHistory.findById(req.params.id);
    if (!entry) return res.status(404).json({ success:false, message:'Not found' });
    if (entry.user.toString() !== req.user._id.toString()) return res.status(403).json({ success:false, message:'Forbidden' });
    await entry.deleteOne();
    res.json({ success:true });
  } catch (e) { console.error(e); res.status(500).json({ success: false, message: 'Server error' }); }
});

module.exports = router;
