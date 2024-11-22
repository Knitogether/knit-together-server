const axios = require('axios');
const jwtService = require('./jwtService');
const User = require('../../models/User');
require('dotenv').config();

async function naverLogin(code, state) {
  try {
    const tokens = await getNaverTokens(code, state); // 네이버 액세스 토큰 요청
    const userInfo = await getNaverUserInfo(tokens.access_token); // 사용자 정보 요청
    const user = await findOrCreateUser(userInfo); // 사용자 조회 또는 생성

    const token = jwtService.generateToken({ userId: user._id, email: user.email }); // JWT 발급
    
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
        code,
        state,
      },
    });

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

    const { id: naverId, email, name, profile_image: profileImage } = response.data.response;

    return { naverId, email, name, profileImage };
  } catch (error) {
    throw new Error('Failed to get user info from Naver: ' + error.response?.data?.message || error.message);
  }
}

async function findOrCreateUser({ naverId, email, name, profileImage }) {
  try {
    let user = await User.findOne({ naverId });

    if (!user) {
      user = new User({ naverId, email, name, profileImage });
      await user.save();
    }

    return user;
  } catch (error) {
    throw new Error('Failed to find or create user: ' + error.message);
  }
}

module.exports = { naverLogin };
