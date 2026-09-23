const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');
const userSchema = new mongoose.Schema({
  name:        { type: String, required: true, trim: true, maxlength: 50 },
  username:    { type: String, unique: true, sparse: true, lowercase: true, trim: true, maxlength: 30 },
  email:       { type: String, required: true, unique: true, lowercase: true, trim: true },
  password:    { type: String, required: true, minlength: 6, select: false },
  avatar:      { type: String, default: '🎓' },
  photo:       { type: String, default: '' }, // base64 data URI, takes priority over emoji avatar when set
  bio:         { type: String, default: '', maxlength: 120 },
  dob:         { type: String, default: '' },
  examPrep:    { type: String, default: '' },
  nameChanges: { type: Number, default: 0 },
  usernameChanges: { type: Number, default: 0 },
  joinedAt:    { type: Date, default: Date.now },
  lastActive:  { type: Date, default: Date.now },
  isPublic:    { type: Boolean, default: true },
  showOnline:  { type: Boolean, default: true },
  showLastSeen:{ type: Boolean, default: true },
  isDeactivated:{ type: Boolean, default: false },
  totalQuizzes:{ type: Number, default: 0 },
  totalCorrect:{ type: Number, default: 0 },
  totalWrong:  { type: Number, default: 0 },
  // FEATURE (naya): premium subscription - koi alag "isPremium" boolean
  // nahi rakha (wo date se out-of-sync ho sakta tha); active hai ya nahi,
  // hamesha `premiumUntil && premiumUntil > now` se check hota hai -
  // dekho backend/middleware/premiumStatus.js. Owner iss field ko seedha
  // /api/premium/cancel se null kar sakta hai (subscription cancel).
  premiumUntil:        { type: Date, default: null },
  // FEATURE (naya): typing tab daily free-limit (5/din) ke liye counter.
  // Naya collection banane ke bajaye seedha yahan - ek chhota daily
  // counter hai, poori history nahi, isliye User document par hi theek
  // baithta hai. `typingAttemptsDate` aaj ki date (YYYY-MM-DD) se match
  // nahi karti to count 0 maana jaata hai (naya din, naya quota).
  typingAttemptsToday: { type: Number, default: 0 },
  typingAttemptsDate:  { type: String, default: '' },
  // FEATURE (naya): DM messaging daily free-limit (10/din) ke liye, isi
  // pattern mein - dekho backend/routes/messages.js.
  messagesSentToday:   { type: Number, default: 0 },
  messagesSentDate:    { type: String, default: '' },
}, { timestamps: true });
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12); next();
});
userSchema.methods.matchPassword = async function(p) { return bcrypt.compare(p, this.password); };

// FEATURE (naya): "premium hai ya nahi" hamesha isi se poochho - kahin
// bhi seedha `user.premiumUntil` compare mat karo, warna kal koi grace-
// period jaisi cheez badalni ho to har jagah dhoondhna padega.
userSchema.methods.isPremiumActive = function() {
  return !!(this.premiumUntil && this.premiumUntil.getTime() > Date.now());
};

/* Generate a unique username from a display name, e.g. "Sahvendra Singh" -> "sahvendra_singh_4821".
   Retries with a fresh random suffix on collision. Used at signup and to lazily backfill
   older accounts that were created before usernames existed. */
userSchema.statics.generateUniqueUsername = async function(name) {
  const base = String(name || 'user')
    .toLowerCase()
    .normalize('NFKD').replace(/[\u0300-\u036f]/g, '') // strip accents
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 20) || 'user';
  for (let i = 0; i < 8; i++) {
    const suffix = Math.floor(1000 + Math.random() * 9000);
    const candidate = `${base}_${suffix}`;
    const exists = await this.exists({ username: candidate });
    if (!exists) return candidate;
  }
  return `${base}_${Date.now().toString().slice(-6)}`;
};

module.exports = mongoose.model('User', userSchema);
