const express = require('express');
const authRoutes = require('./routes/auth');
const connectDB = require('../config/db');
const app = express();
const cors = require('cors');

const PORT = 8000;
require('dotenv').config();

app.use(express.json());

//MongoDB
connectDB();

// CORS 설정
app.use(cors({
  origin: 'http://localhost:3000', // 허용할 출처 (프론트엔드 URL)
  methods: 'GET,POST,PUT,DELETE', // 허용할 HTTP 메서드
  credentials: true               // 쿠키 및 인증 정보 허용
}));

// 인증 라우트 추가
app.use('/api/auth', authRoutes);

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});