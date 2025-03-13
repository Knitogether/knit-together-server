const jwt = require('jsonwebtoken');
require('dotenv').config();

function generateTokens(payload) {
    try {
        const accessToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });
        const refreshToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '28d' });

        return { accessToken, refreshToken };
    } catch (error) {
        //new Error를 꼭 해야 되는가?
        throw new Error('Fail to generate JWT token');
    }
}

function generateAccessToken(payload) {
  try {
    console.log('generate AccessToken: ', payload);
    const accessToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });

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
      throw new Error('Invalid Token: ' + error.name + ' ' + error.message);
    }
  }
  
module.exports = { generateTokens, generateAccessToken, verifyToken };