const mongoose = require('mongoose');

/* conversationId is the two user ids sorted and joined, e.g. "<idA>_<idB>" with idA < idB.
   This makes it trivial to fetch a whole thread with one query and avoids storing the
   pair in two different orders. */
const dmSchema = new mongoose.Schema({
  conversationId: { type: String, required: true, index: true },
  sender:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  message:   { type: String, required: true, maxlength: 1000, trim: true },
  readAt:    { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
});

dmSchema.statics.conversationIdFor = (a, b) => {
  const [x, y] = [String(a), String(b)].sort();
  return `${x}_${y}`;
};

// Same 90-day auto-delete window already used for the group chat (ChatMessage model)
dmSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 });

module.exports = mongoose.model('DirectMessage', dmSchema);
