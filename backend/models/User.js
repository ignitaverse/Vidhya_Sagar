const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String, required: [true, 'नाम जरूरी है'], trim: true, maxlength: 50
  },
  email: {
    type: String, required: [true, 'ईमेल जरूरी है'],
    unique: true, lowercase: true, trim: true,
    match: [/^\S+@\S+\.\S+$/, 'सही ईमेल दर्ज करें']
  },
  password: {
    type: String, required: [true, 'पासवर्ड जरूरी है'], minlength: 6, select: false
  },
  isGuest: { type: Boolean, default: false },
  joinedAt: { type: Date, default: Date.now },
  totalQuizzes: { type: Number, default: 0 },
  totalCorrect:  { type: Number, default: 0 },
  totalWrong:    { type: Number, default: 0 },
}, { timestamps: true });

// पासवर्ड हैश करना — save से पहले
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// पासवर्ड मिलान करना
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
