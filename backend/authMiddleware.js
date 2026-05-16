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
    await req.user.save({ validateBeforeSave: false });
    next();
  } catch(err) {
    return res.status(401).json({ success:false, message:'Token expired' });
  }
};
module.exports = { protect };
