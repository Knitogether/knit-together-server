const mongoose = require('mongoose');

const ParticipantSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room' },
    role: { type: String, enum: ['Host', 'Member'], default: 'Member' },
    joinedAt: { type: Date, default: Date.now },
  });

  module.exports = mongoose.model('Participant', ParticipantSchema);