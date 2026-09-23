const express       = require('express');
const TypingHistory = require('../models/TypingHistory');
const TypingExam    = require('../models/TypingExam');
const TypingPassage = require('../models/TypingPassage');
const { protect }   = require('../middleware/authMiddleware');
const { requireAdminSecret } = require('../middleware/adminMiddleware');
const router        = express.Router();

const FREE_DAILY_TYPING_LIMIT = 5;
function _today() { return new Date().toISOString().slice(0, 10); }

// Har request par user ka counter "aaj" ke hisaab se sahi kar deta hai -
// agar `typingAttemptsDate` aaj se match nahi karti (naya din), to count
// 0 se shuru. Ek hi jagah se yeh logic aata hai (status check aur
// start-attempt dono isi ko use karte hain), taaki dono kabhi out-of-sync
// na ho.
function _currentDailyCount(user) {
  return user.typingAttemptsDate === _today() ? user.typingAttemptsToday : 0;
}

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

// ══════════════════════════════════════════
// OWNER: exam/paragraph add karna (naya) — is se pehle content add karne
// ka EK-matra tareeka backend/seedTypingContent.js chalana tha (server
// shell access chahiye, non-technical owner ke liye "aasan" bilkul nahi
// tha). Ab Owner Panel (frontend) se seedha yahan POST hota hai.
// ══════════════════════════════════════════

// Naya exam banana
router.post('/exams', requireAdminSecret, async (req, res) => {
  try {
    const { examId, name, category, minWpm, minAcc, timeMins, languages, emoji, color } = req.body;
    if (!examId || !name) return res.status(400).json({ success: false, message: 'examId aur name required hain' });
    const exam = await TypingExam.create({
      examId: String(examId).trim().toLowerCase().replace(/\s+/g, '-'),
      name: String(name).trim(),
      category: category || 'central',
      minWpm: minWpm || 30, minAcc: minAcc || 90, timeMins: timeMins || 10,
      languages: Array.isArray(languages) && languages.length ? languages : ['english'],
      emoji: emoji || '⌨️', color: color || '#3b82f6',
    });
    res.status(201).json({ success: true, exam });
  } catch (e) {
    if (e.code === 11000) return res.status(409).json({ success: false, message: 'Ye examId pehle se maujood hai' });
    console.error(e); res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Ek ya ek se zyaada paragraph EK SAATH add karna ("bina jyada mehnat ke")
// - owner ek hi textarea mein saare paragraphs paste kar sakta hai, khaali
// line(s) se alag karke; har hisse se ek passage ban jaata hai.
router.post('/passages', requireAdminSecret, async (req, res) => {
  try {
    const { examId, language, difficulty, bulkText, title } = req.body;
    if (!examId) return res.status(400).json({ success: false, message: 'examId required hai' });
    if (!bulkText || !bulkText.trim()) return res.status(400).json({ success: false, message: 'Paragraph text khaali hai' });

    // Do ya zyaada khaali lines = agla paragraph. Sirf EK khaali line ko
    // ek hi paragraph ke andar ka natural break maana jaata hai, isliye
    // "\n\n+" se split (single newline se nahi) - lambe paragraphs ke
    // beech mein galti se break nahi hoga.
    const chunks = bulkText.split(/\n{2,}/).map(t => t.trim()).filter(Boolean);
    if (!chunks.length) return res.status(400).json({ success: false, message: 'Koi valid paragraph nahi mila' });

    const docs = await TypingPassage.insertMany(chunks.map((text, i) => ({
      examId: String(examId).trim().toLowerCase(),
      title: chunks.length > 1 ? `${title || 'Passage'} ${i + 1}` : (title || 'Passage'),
      text,
      language: language || 'english',
      difficulty: difficulty || 'normal',
      wordCount: text.trim().split(/\s+/).length,
    })));
    res.status(201).json({ success: true, count: docs.length, passages: docs });
  } catch (e) { console.error(e); res.status(500).json({ success: false, message: 'Server error' }); }
});

// Owner: kisi passage ko hata dena (galti se add ho gaya ho to)
router.delete('/passages/:id', requireAdminSecret, async (req, res) => {
  try {
    await TypingPassage.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (e) { console.error(e); res.status(500).json({ success: false, message: 'Server error' }); }
});

// ══════════════════════════════════════════
// DAILY FREE-LIMIT (5/din) — dekho docs/js/typing.js requestStart() aur
// User.js ka typingAttemptsToday/typingAttemptsDate.
// ══════════════════════════════════════════

// User apna status dekhe: aaj kitni baar type kiya, limit kya hai.
router.get('/daily-status', protect, async (req, res) => {
  const used = _currentDailyCount(req.user);
  res.json({
    success: true,
    used,
    limit: FREE_DAILY_TYPING_LIMIT,
    isPremium: req.user.isPremiumActive(),
    remaining: req.user.isPremiumActive() ? null : Math.max(0, FREE_DAILY_TYPING_LIMIT - used),
  });
});

// FIX (real enforcement): sirf frontend par count karke rok dena kaafi
// nahi - koi bhi DevTools khol ke seedha _initTest() call kar sakta tha,
// counter ko bina chhuye. Isliye passage shuru hone se PEHLE yeh endpoint
// call hota hai (dekho typing.js requestStart) - agar limit poori ho
// chuki hai aur premium nahi hai, to 403 ke saath mana kar deta hai, aur
// tabhi counter badhta hai jab request genuinely allow ho.
router.post('/start-attempt', protect, async (req, res) => {
  try {
    const user = req.user;
    if (user.isPremiumActive()) {
      return res.json({ success: true, allowed: true, isPremium: true });
    }
    const today = _today();
    const used = _currentDailyCount(user);
    if (used >= FREE_DAILY_TYPING_LIMIT) {
      return res.status(403).json({
        success: false, allowed: false,
        message: `Aaj ke ${FREE_DAILY_TYPING_LIMIT} free attempts ho chuke hain. Kal phir try karein, ya Premium le lein.`,
        used, limit: FREE_DAILY_TYPING_LIMIT,
      });
    }
    user.typingAttemptsToday = used + 1;
    user.typingAttemptsDate = today;
    await user.save({ validateBeforeSave: false });
    res.json({ success: true, allowed: true, used: used + 1, limit: FREE_DAILY_TYPING_LIMIT });
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
