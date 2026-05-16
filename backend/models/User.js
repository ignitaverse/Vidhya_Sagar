const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');
const userSchema = new mongoose.Schema({
  name:        { type: String, required: true, trim: true, maxlength: 50 },
  email:       { type: String, required: true, unique: true, lowercase: true, trim: true },
  password:    { type: String, required: true, minlength: 6, select: false },
  avatar:      { type: String, default: '🎓' },
  bio:         { type: String, default: '', maxlength: 120 },
  dob:         { type: String, default: '' },
  examPrep:    { type: String, default: '' },
  nameChanges: { type: Number, default: 0 },
  joinedAt:    { type: Date, default: Date.now },
  lastActive:  { type: Date, default: Date.now },
  isPublic:    { type: Boolean, default: true },
  showOnline:  { type: Boolean, default: true },
  showLastSeen:{ type: Boolean, default: true },
  isDeactivated:{ type: Boolean, default: false },
  totalQuizzes:{ type: Number, default: 0 },
  totalCorrect:{ type: Number, default: 0 },
  totalWrong:  { type: Number, default: 0 },
}, { timestamps: true });
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12); next();
});
userSchema.methods.matchPassword = async function(p) { return bcrypt.compare(p, this.password); };
module.exports = mongoose.model('User', userSchema);
