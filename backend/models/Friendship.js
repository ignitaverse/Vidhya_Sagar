const mongoose = require('mongoose');

/* One document per friend relationship.
   status: 'pending'  -> requester sent a request, recipient hasn't responded
           'accepted' -> both sides are friends
   A user can see incoming requests by querying { recipient: me, status:'pending' }
   and their friend list by querying { $or:[{requester:me},{recipient:me}], status:'accepted' }. */
const friendshipSchema = new mongoose.Schema({
  requester: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status:    { type: String, enum: ['pending', 'accepted'], default: 'pending' },
  respondedAt: { type: Date, default: null },
}, { timestamps: true });

// A pair of users should only ever have one relationship document between them
friendshipSchema.index({ requester: 1, recipient: 1 }, { unique: true });

module.exports = mongoose.model('Friendship', friendshipSchema);
