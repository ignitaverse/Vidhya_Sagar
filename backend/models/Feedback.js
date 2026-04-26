const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
  name:    { type: String, default: 'Anonymous', maxlength: 50, trim: true },
  message: { type: String, required: true, maxlength: 400, trim: true },
  rating:  { type: Number, default: 5, min: 1, max: 5 },
  postedAt:{ type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Feedback', feedbackSchema);
