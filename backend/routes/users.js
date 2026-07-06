const express = require('express');
const mongoose = require('mongoose');
const User = require('../models/User');
const Friendship = require('../models/Friendship');
const QuizHistory = require('../models/QuizHistory');
const TypingHistory = require('../models/TypingHistory');
const { protect, optionalAuth } = require('../middleware/authMiddleware');
const router = express.Router();

const ONLINE_WINDOW_MS = 5 * 60 * 1000; // matches the "green dot" convention most chat apps use

function publicUser(u) {
  if (!u) return null;
  return { id: u._id, username: u.username || '', name: u.name, avatar: u.avatar || '🎓', photo: u.photo || '' };
}

/* Figure out where the viewer and target stand: 'self' | 'friends' | 'pending_sent' | 'pending_received' | 'none' */
async function friendStatusBetween(viewerId, targetId) {
  if (!viewerId) return 'none';
  if (String(viewerId) === String(targetId)) return 'self';
  const rel = await Friendship.findOne({
    $or: [
      { requester: viewerId, recipient: targetId },
      { requester: targetId, recipient: viewerId },
    ],
  }).lean();
  if (!rel) return 'none';
  if (rel.status === 'accepted') return 'friends';
  return String(rel.requester) === String(viewerId) ? 'pending_sent' : 'pending_received';
}

/* Shared profile-building logic used by both the id and username lookup routes */
async function buildProfileResponse(target, viewerId) {
  if (!target || target.isDeactivated) return null;

  const status = await friendStatusBetween(viewerId, target._id);
  const isSelf = status === 'self';
  const isFriend = status === 'friends';
  const viewable = isSelf || isFriend || target.isPublic !== false;

  const base = {
    id: target._id,
    username: target.username || '',
    name: target.name,
    avatar: target.avatar || '🎓',
    photo: target.photo || '',
    joinedAt: target.joinedAt,
    friendStatus: status,
    isPublic: target.isPublic !== false,
  };

  if (!viewable) {
    return { ...base, limited: true };
  }

  const online = target.showOnline === false
    ? null
    : (Date.now() - new Date(target.lastActive || 0).getTime()) < ONLINE_WINDOW_MS;
  const lastSeen = target.showLastSeen === false ? null : target.lastActive;

  const [quizCount, typingList, friendCount] = await Promise.all([
    QuizHistory.countDocuments({ user: target._id }),
    TypingHistory.find({ user: target._id }).select('accuracy').lean(),
    Friendship.countDocuments({
      status: 'accepted',
      $or: [{ requester: target._id }, { recipient: target._id }],
    }),
  ]);
  const avgAccuracy = typingList.length
    ? Math.round(typingList.reduce((s, h) => s + (h.accuracy || 0), 0) / typingList.length)
    : null;

  return {
    ...base,
    limited: false,
    bio: target.bio || '',
    examPrep: target.examPrep || '',
    online,
    lastSeen,
    stats: {
      quizzes: quizCount,
      typing: typingList.length,
      avgAccuracy,
      friends: friendCount,
    },
  };
}

/* ══════════════════════════════════════
   STATIC ROUTES FIRST — must come before the /:id catch-all below,
   otherwise e.g. GET /me/friend-requests would be read as id="me"
══════════════════════════════════════ */

router.get('/me/friend-requests', protect, async (req, res) => {
  try {
    const requests = await Friendship.find({ recipient: req.user._id, status: 'pending' })
      .populate('requester', 'name username avatar photo')
      .sort({ createdAt: -1 })
      .lean();
    res.json({
      success: true,
      requests: requests.map(r => ({ friendshipId: r._id, from: publicUser(r.requester), createdAt: r.createdAt })),
    });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.get('/by-username/:username', optionalAuth, async (req, res) => {
  try {
    const target = await User.findOne({ username: req.params.username.toLowerCase().trim() });
    if (!target) return res.status(404).json({ success: false, message: 'User not found' });
    const profile = await buildProfileResponse(target, req.user?._id);
    if (!profile) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, user: profile });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

/* ══════════════════════════════════════
   PROFILE BY ID
══════════════════════════════════════ */

router.get('/:id', optionalAuth, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id))
      return res.status(404).json({ success: false, message: 'User not found' });
    const target = await User.findById(req.params.id);
    if (!target) return res.status(404).json({ success: false, message: 'User not found' });
    const profile = await buildProfileResponse(target, req.user?._id);
    if (!profile) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, user: profile });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.get('/:id/friends', optionalAuth, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id))
      return res.status(404).json({ success: false, message: 'User not found' });
    const target = await User.findById(req.params.id);
    if (!target) return res.status(404).json({ success: false, message: 'User not found' });

    const status = await friendStatusBetween(req.user?._id, target._id);
    const viewable = status === 'self' || status === 'friends' || target.isPublic !== false;
    if (!viewable) return res.json({ success: true, friends: [], limited: true });

    const rels = await Friendship.find({
      status: 'accepted',
      $or: [{ requester: target._id }, { recipient: target._id }],
    })
      .populate('requester', 'name username avatar photo')
      .populate('recipient', 'name username avatar photo')
      .sort({ respondedAt: -1 })
      .limit(60)
      .lean();

    const friends = rels.map(r => {
      const other = String(r.requester._id) === String(target._id) ? r.recipient : r.requester;
      return publicUser(other);
    });

    res.json({ success: true, friends });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

/* ══════════════════════════════════════
   FRIEND ACTIONS
══════════════════════════════════════ */

router.post('/:id/friend-request', protect, async (req, res) => {
  try {
    const targetId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(targetId))
      return res.status(404).json({ success: false, message: 'User not found' });
    if (String(targetId) === String(req.user._id))
      return res.status(400).json({ success: false, message: 'खुद को friend request नहीं भेज सकते' });

    const target = await User.findById(targetId);
    if (!target || target.isDeactivated) return res.status(404).json({ success: false, message: 'User not found' });

    const existing = await Friendship.findOne({
      $or: [
        { requester: req.user._id, recipient: targetId },
        { requester: targetId, recipient: req.user._id },
      ],
    });

    if (existing) {
      if (existing.status === 'accepted')
        return res.status(400).json({ success: false, message: 'पहले से friends हैं' });
      // They already sent us a request — accept it instead of creating a duplicate
      if (String(existing.requester) === String(targetId)) {
        existing.status = 'accepted';
        existing.respondedAt = new Date();
        await existing.save();
        return res.json({ success: true, status: 'friends', message: 'अब आप friends हैं! 🎉' });
      }
      return res.json({ success: true, status: 'pending_sent', message: 'Request पहले से भेजी जा चुकी है' });
    }

    await Friendship.create({ requester: req.user._id, recipient: targetId, status: 'pending' });
    res.status(201).json({ success: true, status: 'pending_sent', message: 'Friend request भेजी गई ✅' });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/:id/friend-accept', protect, async (req, res) => {
  try {
    const rel = await Friendship.findOne({ requester: req.params.id, recipient: req.user._id, status: 'pending' });
    if (!rel) return res.status(404).json({ success: false, message: 'Request नहीं मिली' });
    rel.status = 'accepted';
    rel.respondedAt = new Date();
    await rel.save();
    res.json({ success: true, status: 'friends', message: 'Friend request accept हुई 🎉' });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/:id/friend-decline', protect, async (req, res) => {
  try {
    await Friendship.deleteOne({ requester: req.params.id, recipient: req.user._id, status: 'pending' });
    res.json({ success: true, status: 'none' });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.delete('/:id/friend', protect, async (req, res) => {
  try {
    await Friendship.deleteOne({
      status: 'accepted',
      $or: [
        { requester: req.user._id, recipient: req.params.id },
        { requester: req.params.id, recipient: req.user._id },
      ],
    });
    res.json({ success: true, status: 'none' });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

module.exports = router;
