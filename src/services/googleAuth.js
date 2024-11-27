const { OAuth2Client } = require('google-auth-library');
const User = require('../../models/User');
const jwtService = require('./jwtService');
require('dotenv').config();
const client = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.LOGIN_REDIRECT_URI
);

async function googleLogin(code) {
    const tokens = await getGoogleTokens(code);  // 인가 코드로 구글 토큰 받기
    const userInfo = await verifyGoogleIdToken(tokens.id_token); // id_token으로 사용자 정보 검증
    let user = await findOrCreateUser(userInfo, tokens);  // 사용자 조회 또는 생성

    const { accessToken, refreshToken } = jwtService.generateTokens({ userId: user._id }); // JWT 발급

    return {accessToken, refreshToken };
}

async function getGoogleTokens(code) {
  try {
    const { tokens } = await client.getToken(code);

    return tokens;
  } catch (error) {
    throw new Error('Failed to get tokens from Google: ' + error.response?.data || error.message);
  }
}

async function verifyGoogleIdToken(id_token) {
  try {
    const ticket = await client.verifyIdToken({
      idToken: id_token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const { sub: providerId, email, name, picture: profileImage } = ticket.getPayload();

    return { providerId, email, name, profileImage };
  } catch (error) {
    throw new Error('Failed to verify Google ID token: ' + error.response?.data || error.message);
  }
}

async function findOrCreateUser({ providerId, email, name, profileImage }, tokens) {
  try {
    let user = await User.findOne({ providerId });

    if (!user) {
      user = new User({
        provider: 'google',
        providerId,
        email,
        name,
        profileImage,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        tokenExpiresAt: tokens.expires_in,
      });
      await user.save();
    }

    return user;
  } catch (error) {
    throw new Error('Failed to find or create user: ' + error.message);
  }
}

module.exports = { googleLogin };
