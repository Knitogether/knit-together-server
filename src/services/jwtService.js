const jwt = require('jsonwebtoken');
require('dotenv').config();

function generateTokens(payload) {
    try {
        const accessToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '30m' });
        const refreshToken = jwt.sign({}, process.env.JWT_SECRET, { expiresIn: '1d' });

        return { accessToken, refreshToken };
    } catch (error) {
        //new Error를 꼭 해야 되는가?
        throw new Error('Fail to generate JWT token');
    }
}

function generateAccessToken(payload) {
  try {
    const accessToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '30m' });

    return accessToken;
  } catch (error) {
    throw new Error('Fail to generate JWT access token');
  }
}

function verifyToken(token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      return decoded;
    } catch (error) {
      throw new Error('Invalid Token');
    }
  }
  
module.exports = { generateTokens, generateAccessToken, verifyToken };