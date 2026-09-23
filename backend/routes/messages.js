const express = require('express');
const mongoose = require('mongoose');
const DirectMessage = require('../models/DirectMessage');
const User = require('../models/User');
const Friendship = require('../models/Friendship');
const { protect } = require('../middleware/authMiddleware');
const { requireAdminSecret } = require('../middleware/adminMiddleware');
const router = express.Router();

function publicUser(u) {
  if (!u) return null;
  return { id: u._id, username: u.username || '', name: u.name, avatar: u.avatar || '🎓', photo: u.photo || '' };
}

async function areFriends(a, b) {
  const rel = await Friendship.findOne({
    status: 'accepted',
    $or: [{ requester: a, recipient: b }, { requester: b, recipient: a }],
  }).lean();
  return !!rel;
}

/* ── LIST CONVERSATIONS (inbox) ── */
router.get('/conversations', protect, async (req, res) => {
  try {
    const me = req.user._id;

    const threads = await DirectMessage.aggregate([
      { $match: { $or: [{ sender: me }, { recipient: me }] } },
      { $sort: { createdAt: -1 } },
      { $group: { _id: '$conversationId', lastMessage: { $first: '$$ROOT' } } },
      { $sort: { 'lastMessage.createdAt': -1 } },
      { $limit: 50 },
    ]);

    const unreadAgg = await DirectMessage.aggregate([
      { $match: { recipient: me, readAt: null } },
      { $group: { _id: '$sender', count: { $sum: 1 } } },
    ]);
    const unreadBySender = new Map(unreadAgg.map(u => [String(u._id), u.count]));

    const otherIds = threads.map(t => {
      const m = t.lastMessage;
      return String(m.sender) === String(me) ? m.recipient : m.sender;
    });
    const others = await User.find({ _id: { $in: otherIds } })
      .select('name username avatar photo lastActive showOnline').lean();
    const otherById = new Map(others.map(u => [String(u._id), u]));

    const conversations = threads.map(t => {
      const m = t.lastMessage;
      const otherId = String(m.sender) === String(me) ? m.recipient : m.sender;
      const other = otherById.get(String(otherId));
      const online = other && other.showOnline !== false
        ? (Date.now() - new Date(other.lastActive || 0).getTime()) < 5 * 60 * 1000
        : false;
      return {
        userId: otherId,
        user: other ? publicUser(other) : null,
        online,
        lastMessage: m.message,
        lastMessageAt: m.createdAt,
        lastMessageMine: String(m.sender) === String(me),
        unread: unreadBySender.get(String(otherId)) || 0,
      };
    }).filter(c => c.user); // drop threads whose other user was deleted

    res.json({ success: true, conversations });
  } catch (e) { console.error(e); res.status(500).json({ success: false, message: 'Server error' }); }
});

// FEATURE (naya): Owner Panel ke liye - sabhi users jinhone owner ko
// message kiya hai, sabse recent pehle. Reply karna hai to owner apne
// normal account se hi (SocialModule.openDMThread) us user ko DM karega -
// yahan sirf "kisne message kiya" ki list chahiye.
router.get('/owner-chat-threads', requireAdminSecret, async (req, res) => {
  try {
    const ownerId = process.env.OWNER_USER_ID;
    if (!ownerId) return res.json({ success: true, threads: [] });

    const threads = await DirectMessage.aggregate([
      { $match: { isOwnerChat: true } },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: '$conversationId',
          lastMessage: { $first: '$$ROOT' },
          unread: { $sum: { $cond: [{ $and: [{ $eq: ['$recipient', new mongoose.Types.ObjectId(ownerId)] }, { $eq: ['$readAt', null] }] }, 1, 0] } },
        },
      },
      { $sort: { 'lastMessage.createdAt': -1 } },
      { $limit: 100 },
    ]);

    const otherIds = threads.map(t => {
      const m = t.lastMessage;
      return String(m.sender) === String(ownerId) ? m.recipient : m.sender;
    });
    const others = await User.find({ _id: { $in: otherIds } }).select('name username avatar').lean();
    const otherById = new Map(others.map(u => [String(u._id), u]));

    res.json({
      success: true,
      threads: threads.map(t => {
        const m = t.lastMessage;
        const otherId = String(m.sender) === String(ownerId) ? m.recipient : m.sender;
        const other = otherById.get(String(otherId));
        return {
          userId: otherId,
          user: other ? { id: other._id, name: other.name, username: other.username || '', avatar: other.avatar || '🎓' } : null,
          lastMessage: m.message,
          lastMessageAt: m.createdAt,
          lastMessageMine: String(m.sender) === String(ownerId),
          unread: t.unread,
        };
      }).filter(t => t.user),
    });
  } catch (e) { console.error(e); res.status(500).json({ success: false, message: 'Server error' }); }
});

// FEATURE (naya): "Owner se baat karo" - is user ki apni normal account
// hai (OWNER_USER_ID env var se pata chalta hai), taaki poora DM system
// bina kuch naya banaye reuse ho sake. Agar owner ne abhi tak set nahi
// kiya, to `null` - frontend "Chat with Owner" card tab tak nahi dikhaata.
//
// FIX (real bug, khud pakda gaya): ye route pehle `/:userId` ke BAAD
// likha gaya tha. Express mein `/:userId` jaisa wildcard route usse
// PEHLE aane wale kisi bhi specific route ko "shadow" kar sakta hai agar
// wo baad mein likha ho - `GET /owner-info` literally `/:userId` se hi
// match ho jaata (userId="owner-info"), jo invalid ObjectId hone ki wajah
// se 404 de deta, aur asli owner-info handler kabhi chalta hi nahi. Ab
// isse `/:userId` se PEHLE rakha gaya hai.
router.get('/owner-info', async (req, res) => {
  const ownerId = process.env.OWNER_USER_ID;
  if (!ownerId || !mongoose.Types.ObjectId.isValid(ownerId)) {
    return res.json({ success: true, configured: false });
  }
  const owner = await User.findById(ownerId).select('name username avatar photo').lean();
  if (!owner) return res.json({ success: true, configured: false });
  res.json({ success: true, configured: true, owner: publicUser(owner) });
});

/* ── THREAD WITH ONE USER ── */
router.get('/:userId', protect, async (req, res) => {
  try {
    const { userId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId))
      return res.status(404).json({ success: false, message: 'User not found' });
    const other = await User.findById(userId).select('name username avatar photo isDeactivated').lean();
    if (!other || other.isDeactivated) return res.status(404).json({ success: false, message: 'User not found' });

    const conversationId = DirectMessage.conversationIdFor(req.user._id, userId);
    const messages = await DirectMessage.find({ conversationId })
      .sort({ createdAt: 1 })
      .limit(200)
      .lean();

    // Mark incoming messages as read now that the thread has been opened
    await DirectMessage.updateMany(
      { conversationId, recipient: req.user._id, readAt: null },
      { $set: { readAt: new Date() } }
    );

    res.json({
      success: true,
      user: publicUser(other),
      messages: messages.map(m => ({
        id: m._id, sender: m.sender, recipient: m.recipient,
        message: m.message, mine: String(m.sender) === String(req.user._id),
        createdAt: m.createdAt, readAt: m.readAt,
      })),
    });
  } catch (e) { console.error(e); res.status(500).json({ success: false, message: 'Server error' }); }
});

const FREE_DAILY_MESSAGE_LIMIT = 10;
function _today() { return new Date().toISOString().slice(0, 10); }
function _currentMsgCount(user) {
  return user.messagesSentDate === _today() ? user.messagesSentToday : 0;
}

/* ── SEND MESSAGE ── */
router.post('/:userId', protect, async (req, res) => {
  try {
    const { userId } = req.params;
    const { message } = req.body;
    if (!mongoose.Types.ObjectId.isValid(userId))
      return res.status(404).json({ success: false, message: 'User not found' });
    if (String(userId) === String(req.user._id))
      return res.status(400).json({ success: false, message: 'खुद को message नहीं भेज सकते' });
    if (!message?.trim()) return res.status(400).json({ success: false, message: 'Message required' });
    if (message.length > 1000) return res.status(400).json({ success: false, message: 'Max 1000 characters' });

    const recipient = await User.findById(userId);
    if (!recipient || recipient.isDeactivated) return res.status(404).json({ success: false, message: 'User not found' });

    if (recipient.isPublic === false && !(await areFriends(req.user._id, userId))) {
      return res.status(403).json({ success: false, message: 'यह user सिर्फ friends से messages लेता है' });
    }

    const isOwnerChat = process.env.OWNER_USER_ID && String(userId) === String(process.env.OWNER_USER_ID);

    // FIX (real enforcement - naya): free users din mein sirf 10 message
    // bhej sakte hain, phir Premium chahiye - dekho typing.js ka
    // /api/typing/start-attempt jahan yahi pattern pehle bana tha. Owner
    // se baat karna is limit se EXEMPT hai - warna user Premium maangne
    // ke liye owner ko message hi nahi kar paata agar uski limit khatam
    // ho chuki ho (ulta hi loop ban jaata).
    if (!isOwnerChat && !req.user.isPremiumActive()) {
      const used = _currentMsgCount(req.user);
      if (used >= FREE_DAILY_MESSAGE_LIMIT) {
        return res.status(403).json({
          success: false, allowed: false,
          message: `Aaj ke ${FREE_DAILY_MESSAGE_LIMIT} free messages ho chuke hain. Kal phir try karein, ya Premium le lein.`,
        });
      }
      req.user.messagesSentToday = used + 1;
      req.user.messagesSentDate = _today();
      await req.user.save({ validateBeforeSave: false });
    }

    const conversationId = DirectMessage.conversationIdFor(req.user._id, userId);
    const dm = await DirectMessage.create({
      conversationId, sender: req.user._id, recipient: userId, message: message.trim(),
      isOwnerChat: !!isOwnerChat,
      expiresAt: isOwnerChat ? new Date(Date.now() + 60 * 24 * 60 * 60 * 1000) : null, // 2 mahine
    });

    res.status(201).json({
      success: true,
      message: { id: dm._id, sender: dm.sender, recipient: dm.recipient, message: dm.message, mine: true, createdAt: dm.createdAt },
    });
  } catch (e) { console.error(e); res.status(500).json({ success: false, message: 'Server error' }); }
});

module.exports = router;
