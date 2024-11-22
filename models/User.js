const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  profileImage: { type: String },
  provider: { type: String, required: true }, // 'google' or 'naver'
  providerId: { type: String, required: true, unique: true }, // OAuth 제공자 ID
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);