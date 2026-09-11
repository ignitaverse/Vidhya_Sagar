/* FEATURE (naya): Typing exams ka DOOSRA (MongoDB-backed) source - Supabase
   ke fallback ke roop mein. Shape Supabase ke `exams` table jaisa hi rakha
   hai (examId/name/category/minWpm/minAcc/timeMins/languages/emoji/color)
   taaki frontend mein dono se aaya data ek jaisa dikhe. */
const mongoose = require('mongoose');

const typingExamSchema = new mongoose.Schema({
  examId:    { type: String, required: true, unique: true, trim: true }, // 'ssc-cgl' jaisa slug
  name:      { type: String, required: true },
  category:  { type: String, default: 'central' },
  minWpm:    { type: Number, default: 30 },
  minAcc:    { type: Number, default: 90 },
  timeMins:  { type: Number, default: 10 },
  languages: { type: [String], default: ['english'] },
  emoji:     { type: String, default: '⌨️' },
  color:     { type: String, default: '#3b82f6' },
}, { timestamps: true });

module.exports = mongoose.model('TypingExam', typingExamSchema);
