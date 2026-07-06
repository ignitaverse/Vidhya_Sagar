const express = require('express');
const mongoose = require('mongoose');
const DirectMessage = require('../models/DirectMessage');
const User = require('../models/User');
const Friendship = require('../models/Friendship');
const { protect } = require('../middleware/authMiddleware');
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
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
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
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

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

    const conversationId = DirectMessage.conversationIdFor(req.user._id, userId);
    const dm = await DirectMessage.create({
      conversationId, sender: req.user._id, recipient: userId, message: message.trim(),
    });

    res.status(201).json({
      success: true,
      message: { id: dm._id, sender: dm.sender, recipient: dm.recipient, message: dm.message, mine: true, createdAt: dm.createdAt },
    });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

module.exports = router;
