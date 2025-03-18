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
 * /api/room/verify/:roomId:
 *   post:
 *     summary: Join in the private room(verify password)
 *     tags: [Room]
 *     responses:
 *       200:
 *         description: Password verified.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       400:
 *         description: Already in room or Invalid password
 *       401:
 *         description: Invalid credentials
 * 
 * /api/room/leave/:roomId:
 *   patch:
 *     summary: Leave room completely(delete from wip)
 *     tags: [Room]
 *     responses:
 *       200:
 *         description: Left the room.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       204:
 *         description: Delete the room as last host left.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       400:
 *         description: Fail to leave??no user??no room??
 *       401:
 *         description: Invalid credentials
 */

const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const Room = require('../../models/Room');
const bcrypt = require('bcrypt');
const { uploadHandler, uploadToGCS } = require('../../config/storage');
const { redis } = require('../websocket/websocket');
const { default: mongoose } = require('mongoose');

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
      createdBy: req.user.userId,
      participants: [{
        userId: req.user.userId,
        role: 'Host',
      }],
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

router.get('/list', async (req, res) => {
  console.log('room/list');
  try {
    const rooms = await Room.find();
    const roomInfo = await Promise.all(
      rooms.map(async (room) => {
        return {
          id: room._id.toString(),
          title: room.title,
          thumbnail: room.thumbnail,
          description: room.description,
          isPrivate: room.isPrivate,
          knitters: await redis.llen(`room:${room._id.toString()}`), // 현재 소켓 연결 수
        };
      })
    );
    res.status(200).json({ roomInfo });

  } catch (error) {
    console.error('Room list error: ' + error.message);
    res.status(400).json({ message: 'Failed to load room list' });
  }
});

router.post('/verify/:roomId', authMiddleware, async (req, res) => {
  console.log('room/verify');
  try {
    const userId = req.user.userId;
    const { roomId } = req.params;
    let room = await Room.findById(roomId);

    if (room.isPrivate) {
      const { password } = req.body;
      const isPasswordValid = bcrypt.compare(password, room.password);
      if (!isPasswordValid) return res.status(400).json({ message: 'Invalid password.' });
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
      message: 'Password Verified.',
    });
  } catch (error) {
    console.error('Room join error: ' + error.message);
    res.status(400).json({ message: 'Failed to join room' });
  }
});

router.patch('/leave/:roomId', authMiddleware, async (req, res) => {
  console.log('room/leave');
  try {
    const userId = req.user.userId;
    const { roomId } = req.params;
    const room = await Room.findById(roomId);
    if (!room)
      throw new Error("방이 없습니다람쥐");

    const leaver = room.participants.find((p) => p.userId === userId)
    if (!leaver)
      throw new Error("참여 중이지 않은 방입니다.");

    await Room.updateOne(
      { _id: roomId },
      { $pull: { participants: { userId: userId } } }
    );
    let newHostRoom;
    
    //나가는 사람이 방장일 경우
    if (leaver.role === 'Host') {
      //마지막 1명일 때
      if (room.participants.length === 0) {
        await Room.deleteOne({ _id: roomId });
        return res.status(204).json({ message: "Room deleted as last host left" });
      }

      newHostRoom = await Room.aggregate([
        { $match: { _id: new mongoose.Types.ObjectId(roomId) } },
        { $unwind: "$participants" },
        { $match: { "participants.userId": { $ne: userId } } },
        { $sort: { "participants.joinedAt": 1 } },
        { $limit: 1 }
      ]);
      console.log("new host:", newHostRoom);

      await Room.updateOne(
        { _id: roomId, "participants.userId": newHostRoom[0].participants.userId },
          { $set: { "participants.$.role": "Host" } }
      );
    }

    res.status(200).json({ message: 'Left the room.'});

  } catch (error) {
    console.error('Leave room error: ' + error.message);
    res.status(400).json({ message: 'Failed to leave room' });
  }
});

module.exports = router;