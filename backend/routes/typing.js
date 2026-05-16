const express       = require('express');
const TypingHistory = require('../models/TypingHistory');
const { protect }   = require('../middleware/authMiddleware');
const router        = express.Router();

// Save result
router.post('/save', protect, async (req,res) => {
  try {
    const { examId,examName,language,wpm,netWpm,accuracy,errors,keystrokes,timeTaken,passed } = req.body;
    if (!examId||wpm===undefined||accuracy===undefined) return res.status(400).json({ success:false, message:'examId, wpm, accuracy required' });
    const entry = await TypingHistory.create({ user:req.user._id,examId,examName,language,wpm,netWpm:netWpm||wpm,accuracy,errors:errors||0,keystrokes:keystrokes||0,timeTaken:timeTaken||0,passed:!!passed });
    res.status(201).json({ success:true, entry });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});

// Get history
router.get('/history', protect, async (req,res) => {
  try {
    const history = await TypingHistory.find({user:req.user._id}).sort({playedAt:-1}).limit(50);
    res.json({ success:true, count:history.length, history });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});

// Delete entry
router.delete('/:id', protect, async (req,res) => {
  try {
    const entry = await TypingHistory.findById(req.params.id);
    if (!entry) return res.status(404).json({ success:false, message:'Not found' });
    if (entry.user.toString() !== req.user._id.toString()) return res.status(403).json({ success:false, message:'Forbidden' });
    await entry.deleteOne();
    res.json({ success:true });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});

module.exports = router;
