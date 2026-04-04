const cloudinary = require('cloudinary');
const CloudinaryStorage = require('multer-storage-cloudinary');
const multer = require('multer');
const express = require('express');
require('dotenv').config();

cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary.v2,
  params: async (req, file) => {
      return {
          folder: 'civic_reports',
          public_id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      };
  }
});

const upload = multer({ storage: storage });

const app = express();
app.post('/upload', upload.single('image'), (req, res) => {
  console.log("Req.file:", req.file);
  res.json({ file: req.file });
});

app.listen(9999, () => {
    console.log("Test server running on 9999");
});
