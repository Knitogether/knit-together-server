const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
  title: { type: String, required: true }, //20자 제한
  thumbnail: { type: String, default: null },
  description: { type: String, }, //30자 제한
  isPrivate: { type: Boolean, default: false },
  password: { type: String, select: false }, // 비밀번호는 해시된 상태로 저장
//  maxKnitter: { type: Number, required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
  participants: [
    {
      userId: { type: String }, // User 참조 안 하고 그냥 스트링으로
      role: { type: String, enum: ['Host', 'Member'], default: 'Member' },
      joinedAt: { type: Date, default: Date.now },
    },
  ],
});

module.exports = mongoose.model('Room', roomSchema);