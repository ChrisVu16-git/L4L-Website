
import express from 'express';
import multer from 'multer';
import { Readable } from 'node:stream';
import cloudinary from '../config/cloudinary.js';
import { protect, admin } from '../middleware/auth.js';

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB
    files: 1,
  },
  fileFilter: (_req, file, callback) => {
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/avif',
    ];

    if (!allowedTypes.includes(file.mimetype)) {
      return callback(
        new Error('Only JPEG, PNG, WebP, and AVIF images are allowed.')
      );
    }

    callback(null, true);
  },
});

const uploadToCloudinary = (buffer) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'l4lstore/products',
        resource_type: 'image',
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );

    stream.end(buffer);
  });

router.post(
  '/image',
  protect,
  admin,
  (req, res, next) => {
    upload.single('image')(req, res, (error) => {
      if (error) {
        return res.status(400).json({
          message: error.message || 'Invalid image upload',
        });
      }

      next();
    });
  },
  async (req, res) => {
    if (!req.file) {
      return res.status(400).json({
        message: 'Please select an image to upload',
      });
    }

    try {
      const result = await uploadToCloudinary(req.file.buffer);

      return res.status(201).json({
        message: 'Image uploaded successfully',
        imageUrl: result.secure_url,
        publicId: result.public_id,
      });
    } catch (error) {
      console.error('Cloudinary upload failed:', error.message);

      return res.status(502).json({
        message: 'Image upload failed. Please try again.',
      });
    }
    
  }
 
);

export default router;
