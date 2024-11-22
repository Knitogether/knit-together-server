const express = require('express');
const googleAuth = require('../services/googleAuth');
const naverAuth = require('../services/naverAuth');
const router = express.Router();

// Google 로그인 엔드포인트
router.post('/google', async (req, res) => {
  try {
    const { code } = req.body;
    const token = await googleAuth.googleLogin(code);
    res.status(200).json({ message: 'Google login successful', token });
    // 응답 토큰만? 아니면 유저도?
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Google login failed' });
  }
});

// Naver 로그인 엔드포인트
router.post('/naver', async (req, res) => {
  const { code, state } = req.body;
  try {
    const token = await naverAuth.naverLogin(code, state);
    res.status(200).json({ message: 'Naver login successful', token });
  } catch (err) {
    console.error(err.message);
    //에러 메시지를 콘솔에만? 아니면 응답에 붙여서?
    res.status(500).json({ error: 'Naver login failed' });
  }
});

module.exports = router;