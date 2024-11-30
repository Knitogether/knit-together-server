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
    console.error(err.message);
    //에러 메시지를 콘솔에만? 아니면 응답에 붙여서?
    res.status(500).json({ error: 'Naver login failed' });
  }
});

router.post('/refresh', async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;
  } catch (error) {
    console.error('No refreshToken in cookie');
    return res.status(401).json({ error: 'Refresh token is missing' });
  }

  try {
    // Refresh Token 검증
    const decoded = jwtService.verifyToken(refreshToken);
    // Access Token 재발급
    const accessToken = jwtService.generateAccessToken({ userId: decoded.userId });

    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: 30 * 60 * 1000, // 30분
    });

    res.status(200).json({ message: 'access token refreshed oOo~!' });
  } catch (error) {
    console.error('Invalid refresh token:', error.message);
    // 리프레시 토큰 만료 시 쿠키 제거 및 로그아웃 처리
    res.clearCookie('refreshToken', { path: '/', sameSite: 'strict', secure: true });
    res.clearCookie('accessToken', { path: '/', sameSite: 'strict', secure: true });
    res.status(403).json({ error: 'Session expired. Please log in again.' });
  }
});

module.exports = router;