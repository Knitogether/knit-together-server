/**
 * @swagger
 * /api/room/create:
 *   post:
 *     summary: Create knitting room
 *     tags: [Room]
 *     responses:
 *       201:
 *         description: return created room id
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 roomId:
 *                   type: string
 *       400:
 *         description: Fail 
 *       401:
 *         description: Invalid credentials
 * 
 * /api/room/list:
 *   get:
 *     summary: Load knitting room list
 *     tags: [Room]
 *     responses:
 *       200:
 *         description: return room list(id, title, thumbnail, description, isPrivate, knitters)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 rooms:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                       title:
 *                         type: string
 *                       thumbnail:
 *                         type: string
 *                       description:
 *                         type: string
 *                       isPrivate:
 *                         type: boolean
 *                       knitters:
 *                         type: number
 *       400:
 *         description: Fail 
 * 
 * /api/room/join:
 *   post:
 *     summary: Join in the room
 *     tags: [Room]
 *     responses:
 *       200:
 *         description: Successfully join in the room
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       400:
 *         description: Already in room or Fail to join
 *       401:
 *         description: Invalid credentials
 */

const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const Room = require('../../models/Room');
const Participant = require('../../models/Participant');
const bcrypt = require('bcrypt');
const { uploadHandler, uploadToGCS } = require('../../config/storage');

router.post('/create', authMiddleware, uploadHandler.single('thumbnail'), async (req, res) => {
  console.log('room/create');
  try {
    console.log(req.body);
    const { title, thumbnail, description, isPrivate, password } = req.body;
    
    let isPrivateBoolean;
    if (isPrivate === "false") isPrivateBoolean = false;
    else if (isPrivate === "true") isPrivateBoolean = true;

    const hashedPassword = isPrivateBoolean
      ? await bcrypt.hash(password, 10)
      : null;

    let thumbnailUrl;
    if (req.file) thumbnailUrl = await uploadToGCS(req.file, 'thumbnail');
    else thumbnailUrl = thumbnail;

    const newRoom = await Room.create({
      title,
      thumbnail: thumbnailUrl,
      description,
      isPrivate: isPrivateBoolean,
      password: hashedPassword,
      createdBy: req.user.userId, // 인증된 사용자 ID
      participants: [
        {
          userId: req.user.userId,
          role: 'Host', // 방 생성자는 관리자
        },
      ],
    });
    //조인 함수 실행 필요? 아니면 여기다가 따로 조인 로직?
    res.status(201).json({
      roomId: newRoom._id,
      message: 'Room created successfully.',
    });
  } catch (error) {
    console.error('Room create error: ' + error.message);
    res.status(400).json({ message: 'Failed to create room.' });
  }
});

router.get('/list', async (req, res) => {
  console.log('room/list');
  try {
    const rooms = await Room.aggregate([
      {
        $project: {
          title: 1,
          thumbnail: 1,
          description: 1,
          isPrivate: 1,
          knitters: { $size: '$participants' }, // MongoDB에서 배열 길이 계산
        },
      },
    ]);
    res.status(200).json({ rooms });
  } catch (error) {
    console.error('Room list error: ' + error.message);
    res.status(400).json({ message: 'Failed to load room list' });
  }
});

router.post('/join/:roomId', authMiddleware, async (req, res) => {
  console.log('room/join');
  try {
    const userId = req.user.userId;
    const { roomId } = req.params;
    let room = await Room.findById(roomId);

    if (room.isPrivate) {
      const { password } = req.body;
      const isPasswordValid = await bcrypt.compare(password, room.password);
      if (!isPasswordValid) return res.status(403).json({ message: 'Invalid password.' });
    }

    const isAlreadyParticipant = room.participants.some(participant => participant.userId === userId);
    if (isAlreadyParticipant) {
      return res.status(400).json({ message: 'You are already in the room.' });
    }
    
    room.participants.push({
      userId,
      role: 'member',
    });
    await room.save();
    
    res.status(200).json({
      message: 'Joined room successfully',
    });
  } catch (error) {
    console.error('Room join error:' + error.message);
    res.status(400).json({ message: 'Failed to join room' });
  }
});

module.exports = router;