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
  totalQuizzes:u.totalQuizzes, totalCorrect:u.totalCorrect, totalWrong:u.totalWrong
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
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
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
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});

// ME
router.get('/me', protect, async (req,res) => {
  try { res.json({ success:true, user:userObj(req.user) }); }
  catch(e) { res.status(500).json({ success:false, message:e.message }); }
});

// CHECK USERNAME AVAILABILITY
router.get('/check-username', async (req, res) => {
  try {
    const u = (req.query.u || '').toLowerCase().trim();
    if (!/^[a-z0-9_]{3,30}$/.test(u))
      return res.json({ success:true, available:false, message:'3-30 chars, letters/numbers/underscore only' });
    const exists = await User.findOne({ username: u }).select('_id').lean();
    res.json({ success:true, available: !exists });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
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
    if (avatar)                 user.avatar    = avatar;
    await user.save();
    res.json({ success:true, user:userObj(user) });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
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
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
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
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});

// DEACTIVATE
router.put('/deactivate', protect, async (req,res) => {
  try {
    req.user.isDeactivated = true;
    await req.user.save({ validateBeforeSave:false });
    res.json({ success:true, message:'Account deactivated' });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
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
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});

module.exports = router;
