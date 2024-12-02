const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const Room = require('../../models/Room');
const bcrypt = require('bcrypt');

router.post('/create', authMiddleware, async (req, res) => {

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
    console.error(error.message);
    res.status(400).json({ message: 'Failed to create room.' });
  }
});

router.get('/list', authMiddleware, async (req, res) => {
    try {
        const rooms = await Room.find({}, 'title thumbnail description isPrivate maxKnitter');
        res.status(200).json({ rooms });
    } catch (error) {
        console.error(error.message);
        res.status(400).json({ message: 'Failed to load room list' });
    }
});

module.exports = router;