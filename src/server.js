const express = require('express');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const connectDB = require('../config/db');
const app = express();
const cors = require('cors');
const { swaggerUi, swaggerDocs } = require('../swagger/swagger');
const authMiddleware = require('./middlewares/authMiddleware');

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

//swagger
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

app.use('/api/auth', authRoutes);
app.use('/api/user', authMiddleware, userRoutes);


app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});