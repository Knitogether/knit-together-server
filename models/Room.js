const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
  title: { type: String, required: true },
  thumbnail: { type: String, default: null },
  description: { type: String, },
  isPrivate: { type: Boolean, default: false },
  password: { type: String, select: false }, // 비밀번호는 해시된 상태로 저장
  maxKnitter: { type: Number, required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Room', roomSchema);