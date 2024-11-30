const jwt = require('jsonwebtoken');

const ACCESS_TOKEN_SECRET = process.env.JWT_ACCESS_SECRET;

module.exports = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const payload = jwt.verify(token, ACCESS_TOKEN_SECRET);
    req.user = payload; // 유저 정보를 요청 객체에 저장
    next();
  } catch (error) {
    res.status(403).json({ error: 'Invalid or expired access token' });
  }
};