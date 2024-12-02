const jwtService = require('../services/jwtService');

module.exports = (req, res, next) => {
  try {
    const accessToken = req.headers.authorization.split('Bearer ')[1];
    const decoded = jwtService.verifyToken(accessToken);
    req.user = decoded; // 유저 정보를 요청 객체에 저장
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid or expired access token' });
  }
};