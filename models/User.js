const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  profileImage: { type: String, default: null },
  role: { type: String, default: 'Guest' },
  level: { type: Number, default: 0 },
  exp: { type: Number , default: 0 },
  provider: { type: String, required: true }, // 'google' or 'naver'
  providerId: { type: String, required: true, unique: true }, // OAuth 제공자 ID
  accessToken: { type: String }, // 액세스 토큰
  refreshToken: { type: String }, // 리프레시 토큰
  tokenExpiresAt: { type: Date }, // 액세스 토큰 만료 시간
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('User', userSchema);