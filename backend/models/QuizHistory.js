const mongoose = require('mongoose');

const quizHistorySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true
  },
  subject:    { type: String, required: true },
  subCategory:{ type: String, default: '' },
  state:      { type: String, default: '' },
  score:      { type: Number, required: true },
  total:      { type: Number, required: true },
  percentage: { type: Number, required: true },
  timeTaken:  { type: Number, default: 0 }, // seconds mein
  playedAt:   { type: Date, default: Date.now },
}, { timestamps: true });

// History save karte waqt user stats update karo
quizHistorySchema.post('save', async function () {
  const User = require('./User');
  await User.findByIdAndUpdate(this.user, {
    $inc: {
      totalQuizzes: 1,
      totalCorrect: this.score,
      totalWrong:   this.total - this.score
    }
  });
});

module.exports = mongoose.model('QuizHistory', quizHistorySchema);
