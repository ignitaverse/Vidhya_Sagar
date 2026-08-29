const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const router = express.Router();

const WATCH_API_BASE = process.env.WATCH_API_BASE || 'https://clevra-bot.onrender.com';
const WATCH_API_KEY  = process.env.WATCH_API_KEY || '';

// Pehli baar (anonymous) watch frontend seedha clevra_bot ke /api/web-watch
// ko call karta hai - iski zaroorat sirf DOOSRI baar se hai, jab login
// zaroori ho jaata hai (dekho docs/js/player.js). `protect` confirm karta
// hai ki user genuinely logged in hai (JWT verify), phir hum
// server-to-server clevra_bot ko batate hain "isi member ke liye cooldown
// check karo" - shared WATCH_API_KEY ke saath, taaki koi seedha browser se
// member_id spoof karke cooldown bypass na kar sake (browser ye key kabhi
// nahi dekhta).
router.post('/watch', protect, async (req, res) => {
  try {
    const { title } = req.body;
    if (!title) return res.status(400).json({ success: false, message: 'title zaroori hai' });
    if (!WATCH_API_KEY) {
      return res.status(500).json({ success: false, message: 'Watch API configure nahi hai (WATCH_API_KEY missing)' });
    }

    const upstream = await fetch(`${WATCH_API_BASE}/api/web-watch-member`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Api-Key': WATCH_API_KEY },
      body: JSON.stringify({ title, member_id: req.user._id.toString() }),
    });
    const data = await upstream.json();
    res.status(upstream.status).json(data);
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

module.exports = router;
