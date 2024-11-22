const express = require('express');
const authRoutes = require('./routes/auth');
const connectDB = require('../config/db');
const app = express();
const PORT = 3000;
require('dotenv').config();

app.use(express.json());

//MongoDB
connectDB();

// 인증 라우트 추가
app.use('/api/auth', authRoutes);

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});