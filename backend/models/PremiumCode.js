/* FEATURE (naya): Owner jo subscription-code generate karta hai, uska
   record. Har user ke liye alag code - ek baar redeem hone ke baad wahi
   code dobara kaam nahi karta (`redeemedBy` set ho jaata hai). Code khud
   bhi expire ho sakta hai agar `redeemBy` deadline tak istemal hi nahi
   hua (purana bhoola hua code kabhi bhi activate na ho jaaye). */
const mongoose = require('mongoose');

const premiumCodeSchema = new mongoose.Schema({
  code:         { type: String, required: true, unique: true, uppercase: true, trim: true },
  durationDays: { type: Number, required: true }, // redeem hote hi premiumUntil = now + durationDays
  redeemBy:     { type: Date, required: true },   // is tarikh tak redeem na ho to code hi expire
  redeemedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  redeemedAt:   { type: Date, default: null },
  note:         { type: String, default: '' },    // owner ka apna reminder, jaise "Rahul - UPI 200rs"
}, { timestamps: true });

module.exports = mongoose.model('PremiumCode', premiumCodeSchema);
