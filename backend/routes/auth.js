const express = require('express');
const jwt     = require('jsonwebtoken');
const User    = require('../models/User');
const { protect } = require('../middleware/authMiddleware');
const router  = express.Router();

const genToken = id => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
const userObj  = u => ({
  id:u._id, name:u.name, username:u.username||'', email:u.email, avatar:u.avatar||'🎓', photo:u.photo||'',
  bio:u.bio||'', dob:u.dob||'', examPrep:u.examPrep||'',
  nameChanges:u.nameChanges||0, usernameChanges:u.usernameChanges||0, joinedAt:u.joinedAt, lastActive:u.lastActive,
  isPublic:u.isPublic!==false, showOnline:u.showOnline!==false, showLastSeen:u.showLastSeen!==false,
  totalQuizzes:u.totalQuizzes, totalCorrect:u.totalCorrect, totalWrong:u.totalWrong,
  // FEATURE (naya): profile ke naam ke bagal diamond badge ke liye -
  // exact premiumUntil date yahan (apni hi profile) dikhana theek hai,
  // dekho users.js ka buildProfileResponse() jahan DOOSRE users ke liye
  // sirf boolean bheja jaata hai (apni expiry date kisi aur ko dikhne ki
  // zaroorat nahi).
  isPremium: u.isPremiumActive ? u.isPremiumActive() : false,
  premiumUntil: u.premiumUntil || null,
});

// SIGNUP
router.post('/signup', async (req,res) => {
  try {
    const { name,email,password } = req.body;
    if (!name||!email||!password) return res.status(400).json({ success:false, message:'All fields required' });
    if (await User.findOne({email})) return res.status(400).json({ success:false, message:'Email already registered' });
    const username = await User.generateUniqueUsername(name);
    const user = await User.create({ name,email,password,username });
    res.status(201).json({ success:true, token:genToken(user._id), user:userObj(user) });
  } catch (e) { console.error(e); res.status(500).json({ success: false, message: 'Server error' }); }
});

// LOGIN
router.post('/login', async (req,res) => {
  try {
    const { email,password } = req.body;
    if (!email||!password) return res.status(400).json({ success:false, message:'Email and password required' });
    const user = await User.findOne({email}).select('+password');
    if (!user || !(await user.matchPassword(password)))
      return res.status(401).json({ success:false, message:'Invalid credentials' });
    user.lastActive = new Date();
    await user.save({ validateBeforeSave:false });
    res.json({ success:true, token:genToken(user._id), user:userObj(user) });
  } catch (e) { console.error(e); res.status(500).json({ success: false, message: 'Server error' }); }
});

// ME
router.get('/me', protect, async (req,res) => {
  try { res.json({ success:true, user:userObj(req.user) }); }
  catch (e) { console.error(e); res.status(500).json({ success: false, message: 'Server error' }); }
});

// CHECK USERNAME AVAILABILITY
router.get('/check-username', async (req, res) => {
  try {
    const u = (req.query.u || '').toLowerCase().trim();
    if (!/^[a-z0-9_]{3,30}$/.test(u))
      return res.json({ success:true, available:false, message:'3-30 chars, letters/numbers/underscore only' });
    const exists = await User.findOne({ username: u }).select('_id').lean();
    res.json({ success:true, available: !exists });
  } catch (e) { console.error(e); res.status(500).json({ success: false, message: 'Server error' }); }
});

// UPDATE PROFILE
router.put('/profile', protect, async (req,res) => {
  try {
    const { name,dob,examPrep,bio,avatar,username,photo } = req.body;
    const user = req.user;
    if (name && name.trim() && name.trim() !== user.name) {
      if ((user.nameChanges||0) >= 2)
        return res.status(400).json({ success:false, message:'Name can only be changed 2 times' });
      user.name = name.trim();
      user.nameChanges = (user.nameChanges||0) + 1;
    }
    if (username !== undefined) {
      const u = username.toLowerCase().trim();
      if (u && u !== user.username) {
        if (!/^[a-z0-9_]{3,30}$/.test(u))
          return res.status(400).json({ success:false, message:'Username: 3-30 chars, letters/numbers/underscore only' });
        if ((user.usernameChanges||0) >= 2)
          return res.status(400).json({ success:false, message:'Username can only be changed 2 times' });
        const taken = await User.findOne({ username: u, _id: { $ne: user._id } });
        if (taken) return res.status(400).json({ success:false, message:'यह username पहले से लिया गया है' });
        user.username = u;
        user.usernameChanges = (user.usernameChanges||0) + 1;
      }
    }
    if (photo !== undefined) {
      // Client resizes/compresses before sending, but guard against anything oversized reaching the DB
      if (photo && photo.length > 1_500_000)
        return res.status(400).json({ success:false, message:'Photo too large — please use a smaller image' });
      if (photo && !/^data:image\/(png|jpeg|jpg|webp);base64,/.test(photo))
        return res.status(400).json({ success:false, message:'Invalid image format' });
      user.photo = photo;
    }
    if (dob      !== undefined) user.dob      = dob;
    if (examPrep !== undefined) user.examPrep  = examPrep;
    if (bio      !== undefined) user.bio       = bio;
// FIX (real bug - stored XSS): is route par 'avatar' ki koi validation
// nahi thi (`if (avatar) user.avatar = avatar;`) - frontend UI sirf ek
// FIXED emoji list (dekho profile.js ki AVATARS array) dikhata hai, lekin
// koi bhi seedha /api/auth/profile ko call karke (browser DevTools, curl,
// Postman - login token kaafi hai) avatar ko KUCH BHI string bana sakta
// tha, jaise `<img src=x onerror=...>`. Ye value phir kai jagah OTHER
// users ke browsers mein raw HTML ki tarah render hoti thi - friend
// tiles, friend-request list, game leaderboard, online-game opponent
// history (dekho docs/js/profile.js, games.js, app.js) - matlab EK baar
// apna avatar "poison" karke, jo bhi is user ko friend-list/leaderboard
// mein dekhta, uske browser mein arbitrary JS chal jaata (stored XSS,
// bina us victim ko is user ki profile khud kholne ki bhi zaroorat).
// Ab sirf wahi emoji allowed hain jo frontend picker mein hain - koi
// match na kare to chup-chaap purana avatar hi rehta hai (invalid value
// silently ignore, jaisa neeche `if (avatar)` ka intent hi tha).
const ALLOWED_AVATARS = ['🎓','🦁','🐯','🦅','🔥','⚡','🌟','💡','🚀','🏆','💎','🎯','🛡️','🌙','🎪'];
if (avatar && ALLOWED_AVATARS.includes(avatar)) user.avatar = avatar;
    await user.save();
    res.json({ success:true, user:userObj(user) });
  } catch (e) { console.error(e); res.status(500).json({ success: false, message: 'Server error' }); }
});

// CHANGE PASSWORD
router.put('/password', protect, async (req,res) => {
  try {
    const { currentPassword,newPassword } = req.body;
    if (!currentPassword||!newPassword) return res.status(400).json({ success:false, message:'Both passwords required' });
    if (newPassword.length < 6) return res.status(400).json({ success:false, message:'Min 6 characters' });
    const user = await User.findById(req.user._id).select('+password');
    if (!(await user.matchPassword(currentPassword)))
      return res.status(400).json({ success:false, message:'Current password is wrong' });
    user.password = newPassword;
    await user.save();
    res.json({ success:true, message:'Password changed!' });
  } catch (e) { console.error(e); res.status(500).json({ success: false, message: 'Server error' }); }
});

// UPDATE PRIVACY SETTINGS
router.put('/privacy', protect, async (req,res) => {
  try {
    const { isPublic, showOnline, showLastSeen } = req.body;
    const user = req.user;
    if (isPublic      !== undefined) user.isPublic      = isPublic;
    if (showOnline    !== undefined) user.showOnline    = showOnline;
    if (showLastSeen  !== undefined) user.showLastSeen  = showLastSeen;
    await user.save();
    res.json({ success:true, message:'Privacy updated' });
  } catch (e) { console.error(e); res.status(500).json({ success: false, message: 'Server error' }); }
});

// DEACTIVATE
router.put('/deactivate', protect, async (req,res) => {
  try {
    req.user.isDeactivated = true;
    await req.user.save({ validateBeforeSave:false });
    res.json({ success:true, message:'Account deactivated' });
  } catch (e) { console.error(e); res.status(500).json({ success: false, message: 'Server error' }); }
});

// DELETE ACCOUNT
router.delete('/account', protect, async (req,res) => {
  try {
    const uid = req.user._id;
    const [QH, TH, CM, FB, User2] = [
      require('../models/QuizHistory'), require('../models/TypingHistory'),
      require('../models/ChatMessage'), require('../models/Feedback'), User
    ];
    await Promise.all([
      QH.deleteMany({user:uid}), TH.deleteMany({user:uid}),
      CM.deleteMany({user:uid}), FB.deleteMany({userId:uid}),
      User2.findByIdAndDelete(uid)
    ]);
    res.json({ success:true, message:'Account deleted' });
  } catch (e) { console.error(e); res.status(500).json({ success: false, message: 'Server error' }); }
});

module.exports = router;
