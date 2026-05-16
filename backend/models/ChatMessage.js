const mongoose = require('mongoose');
const chatSchema = new mongoose.Schema({
  user:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  userName:   { type: String, required: true },
  userAvatar: { type: String, default: '🎓' },
  message:    { type: String, required: true, maxlength: 500, trim: true },
  createdAt:  { type: Date, default: Date.now },
});
chatSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 }); // 90 days
module.exports = mongoose.model('ChatMessage', chatSchema);
