const mongoose = require('mongoose');
const typingHistorySchema = new mongoose.Schema({
  user:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  examId:    { type: String, required: true },
  examName:  { type: String, required: true },
  language:  { type: String, default: 'english' },
  wpm:       { type: Number, required: true },
  netWpm:    { type: Number, default: 0 },
  accuracy:  { type: Number, required: true },
  errors:    { type: Number, default: 0 },
  keystrokes:{ type: Number, default: 0 },
  timeTaken: { type: Number, default: 0 },
  passed:    { type: Boolean, default: false },
  playedAt:  { type: Date, default: Date.now },
}, { timestamps: true });
module.exports = mongoose.model('TypingHistory', typingHistorySchema);
