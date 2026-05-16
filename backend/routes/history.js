const express     = require('express');
const QuizHistory = require('../models/QuizHistory');
const { protect } = require('../middleware/authMiddleware');
const router      = express.Router();

router.post('/save', protect, async (req,res) => {
  try {
    const { subject,subCategory,state,score,total,timeTaken } = req.body;
    if (score===undefined||!total) return res.status(400).json({ success:false, message:'score and total required' });
    const percentage = Math.round((score/total)*100);
    const entry = await QuizHistory.create({ user:req.user._id,subject,subCategory,state,score,total,percentage,timeTaken });
    res.status(201).json({ success:true, entry });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});

router.get('/', protect, async (req,res) => {
  try {
    const history = await QuizHistory.find({user:req.user._id}).sort({playedAt:-1}).limit(50);
    res.json({ success:true, count:history.length, history });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});

router.delete('/:id', protect, async (req,res) => {
  try {
    const entry = await QuizHistory.findById(req.params.id);
    if (!entry) return res.status(404).json({ success:false, message:'Not found' });
    if (entry.user.toString() !== req.user._id.toString())
      return res.status(403).json({ success:false, message:'Forbidden' });
    await entry.deleteOne();
    res.json({ success:true });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});

module.exports = router;
