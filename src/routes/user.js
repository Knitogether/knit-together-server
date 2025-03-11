/**
 * @swagger
 * /api/user/me:
 *   get:
 *     summary: My profile
 *     tags: [User]
 *     responses:
 *       200:
 *         description: return user profile(id, email, name, image, role, level, exp)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 email:
 *                   type: string
 *                 name:
 *                   type: string
 *                 profileImage:
 *                   type: string
 *                 role:
 *                   type: string
 *                 level:
 *                   type: number
 *       401:
 *         description: Invalid credentials
 * 
 * /api/user/wip:
 *   get:
 *     summary: My work in progress
 *     tags: [User]
 *     responses:
 *       200:
 *         description: return participating room (title, thumbnail, description, isPrivate, knitters)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 userRooms:
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
 *       401:
 *         description: Invalid credentials
 * 
 * /api/user/edit:
 *   patch:
 *     summary: Edit user profile
 *     tags: [User]
 *     responses:
 *       200:
 *         description: Successfully edit profile
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       400:
 *         description: Fail to edit
 *       401:
 *         description: Invalid credentials
 */

const express = require('express');
const router = express.Router();
const User = require('../../models/User');
const Room = require('../../models/Room');
const authMiddleware = require('../middlewares/authMiddleware');
const { uploadHandler, uploadToGCS } = require('../../config/storage');
const Participant = require('../../models/Participant');

router.get('/me', authMiddleware, async (req, res) => {
  console.log('user/me');
  try {
    const userId = req.user.userId;
      
    // 3. 유저 정보 조회
    const user = await User.findById(userId); // 비밀번호 등 민감 정보 제외
    if (!user) {
      //이거 필요한가?
      return res.status(404).json({ error: 'User not found' });
    }
        
    // 4. 유저 정보 응답
    res.status(200).json({
      id: user._id,
      email: user.email,
      name: user.name,
      profileImage: user.profileImage,
      role: user.role,
      level: user.level,
      exp: user.exp,
    });
  } catch (error) {
    console.error(error.message);
    res.status(401).json({ error: 'Failed to fetch user information' });
  }
});

router.get('/wip', authMiddleware, async (req, res) => {
  console.log('user/wip');
  try {
    const userId = req.user.userId;
    const userRooms = await Room.aggregate([
      {
        $match: {
          "participants.userId": userId
        }
      },
      {
        $project: {
          _id: 0, 
          id: "$_id",  // _id를 id로 변경
          title: 1,
          thumbnail: 1,
          description: 1,
          isPrivate: 1,
          knitters: { $size: '$participants' },
        }
      }
    ]);
    res.status(200).json({ userRooms });
  } catch (error) {
    console.error('Failed to get user WIP: ' + error.message);
    res.status(400).json({ message: 'Failed to get user WIP' });
  }
});

router.patch('/edit', authMiddleware, uploadHandler.single('profileImage'), async (req, res) => {
  console.log('user/edit');
  try {
    const userId = req.user.userId;
    const { name } = req.body;

    // 사용자 조회
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // 업데이트할 필드
    const updatedFields = {};
    if (name && name !== user.name) {
      updatedFields.name = name;
    }

    // 파일 업로드 처리
    if (req.file) {
      const profileImageUrl = await uploadToGCS(req.file, 'profileImage');
      updatedFields.profileImage = profileImageUrl;
    }
    else if (req.body.profileImage === "null") {
      updatedFields.profileImage = null;
    }

    // 변경된 필드가 없으면 반환
    if (Object.keys(updatedFields).length === 0) {
      return res.status(200).json({ message: 'No changes detected', user });
    }

    // 사용자 업데이트
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updatedFields },
      { new: true }
    );

    res.status(200).json({ message: 'Profile updated successfully' });
  } catch (error) {
    console.error('profile edit error: ', error);
    res.status(400).json({ error: 'Failed to edit profile' });
  }
});

module.exports = router;