/**
 * @swagger
 * /api/user/me:
 *   get:
 *     summary: My profile
 *     tags: [User]
 *     responses:
 *       200:
 *         description: return user profile(id, email, name, image, role, level)
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
 */

const express = require('express');
const router = express.Router();
const jwtService = require('../services/jwtService'); // JWT 관련 함수들 (verifyToken 등)
const User = require('../../models/User'); // 유저 데이터베이스 모델
const authMiddleware = require('../middlewares/authMiddleware');

router.get('/me', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.userId;
        
        // 3. 유저 정보 조회
        const user = await User.findById(userId); // 비밀번호 등 민감 정보 제외
        if (!user) {
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
        });
    } catch (error) {
        console.error(error.message);
        res.status(401).json({ error: 'Failed to fetch user information' });
    }
});

module.exports = router;