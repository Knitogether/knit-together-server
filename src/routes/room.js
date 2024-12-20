const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const Room = require('../../models/Room');
const Participant = require('../../models/Participant');
const bcrypt = require('bcrypt');

router.post('/create', authMiddleware, async (req, res) => {
  console.log('room/create');
  try {
    const { title, thumbnail, description, isPrivate, password, maxKnitter } = req.body;

    const hashedPassword = isPrivate
      ? await bcrypt.hash(password, 10)
      : null;

    const newRoom = new Room({
      title,
      thumbnail,
      description,
      isPrivate,
      password: hashedPassword,
      maxKnitter,
      createdBy: req.user.userId, // 인증된 사용자 ID
    });
    await newRoom.save();

    res.status(201).json({
      roomId: newRoom._id,
      message: 'Room created successfully.',
    });
  } catch (error) {
    console.error('Room create error: ' + error.message);
    res.status(400).json({ message: 'Failed to create room.' });
  }
});

router.get('/list', authMiddleware, async (req, res) => {
  console.log('room/list');
  try {
      const rooms = await Room.find({}, 'title thumbnail description isPrivate maxKnitter');
      res.status(200).json({ rooms });
  } catch (error) {
      console.error('Room list error: ' + error.message);
      res.status(400).json({ message: 'Failed to load room list' });
  }
});

router.post('/join', authMiddleware, async (req, res) => {
  console.log('room/join');
  try {
    const { userId, roomId } = req.body;
    const room = await Room.findById(roomId);
    
    // if (!room) {
    //   return res.status(404).json({ message: 'Room not found' });
    // }

    const participant = await Participant.create({
      userId,
      roomId,
      role: 'member',
    });
    await participant.save();
    
    res.status(200).json({
      message: 'Joined room successfully',
      participant,
    });
  } catch (error) {
    console.error('Room join error:' + error.message);
    res.status(500).json({ message: 'Failed to join room' });
  }
});

module.exports = router;