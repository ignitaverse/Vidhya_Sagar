const jwt  = require('jsonwebtoken');
const User = require('../models/User');
const protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization?.startsWith('Bearer'))
    token = req.headers.authorization.split(' ')[1];
  if (!token) return res.status(401).json({ success:false, message:'Login जरूरी है' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id);
    if (!req.user) return res.status(401).json({ success:false, message:'User not found' });
    req.user.lastActive = new Date();
    // Backfill for accounts created before usernames existed
    if (!req.user.username) req.user.username = await User.generateUniqueUsername(req.user.name);
    await req.user.save({ validateBeforeSave: false });
    next();
  } catch(err) {
    return res.status(401).json({ success:false, message:'Token expired' });
  }
};
/* Like `protect`, but never rejects the request. If a valid token is present,
   req.user is populated; otherwise req.user stays null and the route decides
   what a logged-out visitor is allowed to see. Used for public-ish profile views. */
const optionalAuth = async (req, res, next) => {
  req.user = null;
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return next();
  try {
    const decoded = jwt.verify(header.split(' ')[1], process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id);
  } catch (err) {
    // Invalid/expired token — treat as a guest rather than failing the request
    req.user = null;
  }
  next();
};

module.exports = { protect, optionalAuth };
