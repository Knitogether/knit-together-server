const jwt = require('jsonwebtoken');
require('dotenv').config();

function generateToken(payload) {
    try {
        const accessToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '30m' });
        const refreshToken = jwt.sign({}, process.env.JWT_SECRET, { expiresIn: '1d' });

        return { accessToken, refreshToken };
    } catch (err) {
        //new Error를 꼭 해야 되는가?
        throw new Error('Fail to generate JWT token');
    }
}

function verifyToken(token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      return decoded;
    } catch (err) {
      throw new Error('Invalid Token');
    }
  }
  
module.exports = { generateToken, verifyToken };