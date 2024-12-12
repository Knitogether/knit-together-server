/**
 * @swagger
 * /api/auth/google:
 *   post:
 *     summary: User google login
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               code:
 *                 type: string
 *                 example: weAklDdf....
 *     responses:
 *       200:
 *         description: Login successful from google
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accessToken:
 *                   type: string
 *                   example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *       401:
 *         description: Invalid credentials
 * 
 * /api/auth/naver:
 *   post:
 *     summary: User naver login
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               code:
 *                 type: string
 *                 example: weAklDdf....
 *     responses:
 *       200:
 *         description: Login successful from naver
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accessToken:
 *                   type: string
 *                   example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *       401:
 *         description: Invalid credentials
 * 
 * /api/auth/refresh:
 *   post:
 *     summary: access token expired. Refresh
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 example: weAklDdf....
 *     responses:
 *       200:
 *         description: refreshed access token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accessToken:
 *                   type: string
 *                   example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *       401:
 *         description: Invalid credentials
 *       403: 
 *         description: Session expired. Please log in again
 * 
 * /api/auth/logout:
 *   post:
 *     summary: Logout
 *     tags: [Auth]
 *     requestBody:
 *       required: false
 *     responses:
 *       200:
 *         description: Cookie out, Logout complete
 *       400:
 *         description: Logout failed
 */

const express = require('express');
const router = express.Router();
const googleAuth = require('../services/googleAuth');
const naverAuth = require('../services/naverAuth');
const jwtService = require('../services/jwtService');

// Google 로그인 엔드포인트
router.post('/google', async (req, res) => {
  try {
    const { code } = req.body;
    const { accessToken, refreshToken } = await googleAuth.googleLogin(code);

    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: 30 * 60 * 1000, // 30분
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7일
    });
    res.status(200).json({ message: 'Welcome~^^ from google', accessToken: accessToken, refreshToken: refreshToken });
    res.send();
  } catch (error) {
    console.error(error.message);
    res.status(400).json({ error: 'Google login failed' });
  }
});

// Naver 로그인 엔드포인트
router.post('/naver', async (req, res) => {
  try {
    const { code, state } = req.body;
    const { accessToken, refreshToken } = await naverAuth.naverLogin(code, state);

    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: 30 * 60 * 1000, // 30분
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7일
    });
    
    res.status(200).json({ message: 'Welcome~^^ from naver', accessToken: accessToken, refreshToken: refreshToken });
  } catch (error) {
    console.error(error.message);
    //에러 메시지를 콘솔에만? 아니면 응답에 붙여서?
    res.status(500).json({ error: 'Naver login failed' });
  }
});

router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    console.log('refreshToken: ', refreshToken);
    // Refresh Token 검증
    const decoded = jwtService.verifyToken(refreshToken);
    
    // Access Token 재발급
    const accessToken = jwtService.generateAccessToken({ userId: decoded.userId });

    //밸류 교체만 하는 걸로 바꾸기
    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: 30 * 60 * 1000, // 30분
    });
    res.status(200).json({ message: 'access token refreshed oOo~!', accessToken: accessToken });
  } catch (error) {
    console.error('Invalid refresh token:', error.message);
    // 리프레시 토큰 만료 시 쿠키 제거 및 로그아웃 처리
    res.clearCookie("accessToken", {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
    })
    .clearCookie("refreshToken", {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
    })
    res.status(403).json({ error: 'Session expired. Please log in again.' });
  }
});

router.post('/logout', async (req, res) => {
  try {
    res.clearCookie("accessToken", {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
    })
    .clearCookie("refreshToken", {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
    })
    res.status(200).json({ message: 'Logout complete' });
  } catch (error) {
    res.status(500).json({ error: 'Logout failed' });
  }
});

module.exports = router;