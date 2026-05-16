const mongoose = require('mongoose');
const notifSchema = new mongoose.Schema({
  title:     { type: String, required: true, maxlength: 120 },
  body:      { type: String, required: true, maxlength: 600 },
  type:      { type: String, default: 'announcement' },
  pinned:    { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
}, { timestamps: true });
module.exports = mongoose.model('Notification', notifSchema);
