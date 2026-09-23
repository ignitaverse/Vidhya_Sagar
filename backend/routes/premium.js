const express           = require('express');
const crypto            = require('crypto');
const User               = require('../models/User');
const PremiumCode        = require('../models/PremiumCode');
const { protect }        = require('../middleware/authMiddleware');
const { requireAdminSecret } = require('../middleware/adminMiddleware');
const router = express.Router();

/* 2 groups of 4 uppercase alphanumerics ("VS-XXXX-XXXX") - easy to read
   aloud / copy-paste over a chat, and collision odds are negligible even
   after thousands of codes (33^8 possibilities). Confusable characters
   (0/O, 1/I) dropped so a code typed by hand doesn't fail for a reason
   the user can't see. */
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function _generateCode() {
  let out = 'VS';
  for (let group = 0; group < 2; group++) {
    out += '-';
    for (let i = 0; i < 4; i++) out += CODE_ALPHABET[crypto.randomInt(CODE_ALPHABET.length)];
  }
  return out;
}

// ── User: apna premium status dekhna (kab tak active hai) ──
router.get('/status', protect, async (req, res) => {
  const user = req.user;
  res.json({
    success: true,
    isPremium: user.isPremiumActive(),
    premiumUntil: user.premiumUntil,
  });
});

// ── User: code redeem karna ──
// FIX (race-condition-safe): do requests EK saath EK hi code redeem
// karne ki koshish karein (double-submit, ya do tabs), to sirf EK hi
// safal ho - findOneAndUpdate ka `redeemedBy: null` condition atomic hai,
// isliye "ek code = ek hi baar" guarantee database-level par hai, sirf
// app-logic ke bharose nahi.
router.post('/redeem', protect, async (req, res) => {
  try {
    const raw = String(req.body.code || '').trim().toUpperCase();
    if (!raw) return res.status(400).json({ success: false, message: 'Code required' });

    const codeDoc = await PremiumCode.findOneAndUpdate(
      { code: raw, redeemedBy: null, redeemBy: { $gte: new Date() } },
      { redeemedBy: req.user._id, redeemedAt: new Date() },
      { new: true }
    );
    if (!codeDoc) {
      // Alag reason se alag, thoda useful message (galat code vs. expire
      // ho chuka vs. pehle se istemal ho chuka) - lekin data-leak se bachne
      // ke liye teeno ek jaisa generic message hi dete hain user ko.
      return res.status(400).json({ success: false, message: 'Ye code valid nahi hai ya pehle istemal ho chuka hai' });
    }

    const user = req.user;
    // Agar pehle se premium chal raha hai, to naya duration UPAR se jud
    // jaata hai (extend), khatam nahi hota - taaki jaldi renew karne wale
    // ko koi din na khona pade.
    const base = user.isPremiumActive() ? user.premiumUntil.getTime() : Date.now();
    user.premiumUntil = new Date(base + codeDoc.durationDays * 24 * 60 * 60 * 1000);
    await user.save({ validateBeforeSave: false });

    res.json({ success: true, premiumUntil: user.premiumUntil, durationDays: codeDoc.durationDays });
  } catch (e) { console.error(e); res.status(500).json({ success: false, message: 'Server error' }); }
});

// ── Owner: naya code generate karna ──
router.post('/generate', requireAdminSecret, async (req, res) => {
  try {
    const durationDays = Number(req.body.durationDays);
    const redeemWithinDays = Number(req.body.redeemWithinDays) || 30; // code khud kitne din valid rahega redeem hone ke liye
    if (!durationDays || durationDays <= 0) {
      return res.status(400).json({ success: false, message: 'durationDays required (subscription kitne din ki)' });
    }
    let code, attempts = 0;
    do {
      code = _generateCode();
      attempts++;
    } while (attempts < 5 && await PremiumCode.exists({ code }));

    const doc = await PremiumCode.create({
      code,
      durationDays,
      redeemBy: new Date(Date.now() + redeemWithinDays * 24 * 60 * 60 * 1000),
      note: String(req.body.note || '').slice(0, 200),
    });
    res.status(201).json({ success: true, code: doc });
  } catch (e) { console.error(e); res.status(500).json({ success: false, message: 'Server error' }); }
});

// ── Owner: sabhi codes ki list (kaunse redeem hue, kisne, kab) ──
router.get('/list', requireAdminSecret, async (req, res) => {
  try {
    const codes = await PremiumCode.find().sort({ createdAt: -1 }).limit(200)
      .populate('redeemedBy', 'name username email');
    res.json({ success: true, codes });
  } catch (e) { console.error(e); res.status(500).json({ success: false, message: 'Server error' }); }
});

// ── Owner: kisi user ka active subscription turant cancel karna ──
router.post('/cancel', requireAdminSecret, async (req, res) => {
  try {
    const identifier = String(req.body.user || '').trim();
    if (!identifier) return res.status(400).json({ success: false, message: 'user (email/username) required' });
    const user = await User.findOne({ $or: [{ email: identifier.toLowerCase() }, { username: identifier.toLowerCase() }] });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    user.premiumUntil = null;
    await user.save({ validateBeforeSave: false });
    res.json({ success: true, message: `${user.name} ka subscription cancel kar diya gaya` });
  } catch (e) { console.error(e); res.status(500).json({ success: false, message: 'Server error' }); }
});

module.exports = router;
