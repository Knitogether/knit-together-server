const { Storage } = require('@google-cloud/storage');
const multer = require('multer');
const { format } = require('util');
require('dotenv').config();

// Google Cloud Storage 설정
const storage = new Storage({
  projectId: 'knit-together-441608',
  keyFilename: '/home/ubuntu/.gcs/knit-together-441608-fda5ef597215.json', // 키 파일 경로
});

const bucket = storage.bucket('knit-together-bucket');

// Multer 설정
const uploadHandler = multer({
  storage: multer.memoryStorage(), // 메모리에 임시 저장
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB 제한
});

// 파일 업로드 함수
const uploadToGCS = (file, folder) => {
  return new Promise((resolve, reject) => {
    const blob = bucket.file(`${folder}/${Date.now()}_${file.originalname}`);
    const blobStream = blob.createWriteStream({
      resumable: false,
      contentType: file.mimetype,
    });

    blobStream.on('error', (err) => reject(err));
    blobStream.on('finish', () => {
      const publicUrl = format(`https://storage.googleapis.com/${bucket.name}/${blob.name}`);
      resolve(publicUrl);
    });

    blobStream.end(file.buffer);
  });
};

module.exports = { uploadHandler, uploadToGCS };
