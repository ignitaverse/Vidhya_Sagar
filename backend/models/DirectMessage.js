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
  // FEATURE (naya): "Chat with Owner" ki messages. Inhe alag se maark
  // karte hain taaki (a) Owner Panel sirf owner-chats hi list kar sake,
  // (b) inpar general 90-din ke bajaye 2-mahine ka apna TTL lage (dekho
  // neeche `expiresAt` index) - jaisa user ne explicitly maanga tha.
  isOwnerChat: { type: Boolean, default: false, index: true },
  expiresAt:   { type: Date, default: null }, // sirf owner-chat messages par set hota hai
});

dmSchema.statics.conversationIdFor = (a, b) => {
  const [x, y] = [String(a), String(b)].sort();
  return `${x}_${y}`;
};

// Same 90-day auto-delete window already used for the group chat (ChatMessage model)
dmSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 });

// FEATURE (naya): owner-chat messages ke liye ALAG, chhota TTL (2 mahine =
// 60 din) - `expiresAt` sirf INHI messages par set hota hai (regular DMs
// mein ye field khaali/null rehta hai, isliye unpar ye index koi asar
// nahi karta). MongoDB `expireAfterSeconds: 0` ka matlab hai "document
// ko US EXACT TIME par expire karo jo `expiresAt` field mein likha hai" -
// isliye har message ka apna alag expiry ho sakta hai (createdAt+60din),
// bina general 90-din wale index se takraaye (wo bhi chalta rahega, lekin
// ye chhota TTL hamesha PEHLE fire ho jaayega).
dmSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('DirectMessage', dmSchema);
