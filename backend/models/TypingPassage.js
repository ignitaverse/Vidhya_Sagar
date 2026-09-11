/* FEATURE (naya): Typing passages ka DOOSRA (MongoDB-backed) source -
   Supabase ke fallback ke roop mein. Shape Supabase ke `passages` table
   jaisa hi rakha hai. */
const mongoose = require('mongoose');

const typingPassageSchema = new mongoose.Schema({
  examId:     { type: String, required: true, index: true }, // TypingExam.examId se match karta hai
  title:      { type: String, default: 'Passage' },
  text:       { type: String, required: true },
  language:   { type: String, default: 'english' },
  wordCount:  { type: Number },
  difficulty: { type: String, default: 'normal' }, // easy | normal | hard
}, { timestamps: true });

module.exports = mongoose.model('TypingPassage', typingPassageSchema);
