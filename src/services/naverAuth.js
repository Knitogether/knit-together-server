const axios = require('axios');
const jwtService = require('./jwtService');
const User = require('../../models/User');
require('dotenv').config();

async function naverLogin(code, state) {
  try {
    const tokens = await getNaverTokens(code, state); // 네이버 액세스 토큰 요청
    const userInfo = await getNaverUserInfo(tokens.access_token); // 사용자 정보 요청
    const user = await findOrCreateUser(userInfo, tokens); // 사용자 조회 또는 생성

    const token = jwtService.generateTokens({ userId: user._id, email: user.email }); // JWT 발급
    
    return token;
  } catch (error) {
    throw new Error(`Naver login failed: ${error.message}`);
  }
}

async function getNaverTokens(code, state) {
  try {
    const response = await axios.post('https://nid.naver.com/oauth2.0/token', null, {
      params: {
        grant_type: 'authorization_code',
        client_id: process.env.NAVER_CLIENT_ID,
        client_secret: process.env.NAVER_CLIENT_SECRET,
        code: code,
        state: state,
      },
    });

    console.log(response.data);
    return response.data;
  } catch (error) {
    throw new Error('Failed to get tokens from Naver: ' + error.response?.data?.error_description || error.message);
  }
}

async function getNaverUserInfo(access_token) {
  try {
    const response = await axios.get('https://openapi.naver.com/v1/nid/me', {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    });

    const { id: providerId, email, nickname, profile_image: profileImage } = response.data.response;
    
    return { providerId, email, nickname, profileImage };
  } catch (error) {
    throw new Error('Failed to get user info from Naver: ' + error.response?.data?.message || error.message);
  }
}

async function findOrCreateUser({ providerId, email, nickname, profileImage }, tokens) {
  try {
    let user = await User.findOne({ providerId });

    if (!user) {
      user = new User({
        provider: 'naver',
        providerId, email,
        name: nickname,
        profileImage,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        tokenExpiresAt: Date.now() + tokens.expires_in * 1000,
      });
      await user.save();
    }

    return user;
  } catch (error) {
    throw new Error('Failed to find or create user: ' + error.message);
  }
}

module.exports = { naverLogin };
