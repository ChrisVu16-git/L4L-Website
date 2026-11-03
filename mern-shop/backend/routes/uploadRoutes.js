import express from 'express';
// import multer from 'multer';
// import { Readable } from 'node:stream';
// import cloudinary from '../config/cloudinary.js';
import { protect, admin } from '../middleware/auth.js';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'node:crypto';
import r2 from '../config/r2.js';

const router = express.Router();

router.post('/image/presign', protect, admin, async (req, res) => {
  try {
    const { contentType } = req.body;

    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/avif',
    ];

    if (!allowedTypes.includes(contentType)) {
      return res.status(400).json({
        message: 'Unsupported image type',
      });
    }

    const extension = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
      'image/avif': 'avif',
    }[contentType];

    const key = `products/${randomUUID()}.${extension}`;

    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(r2, command, {
      expiresIn: 300,
    });

    return res.json({
      uploadUrl,
      imageUrl: `${process.env.R2_PUBLIC_URL}/${key}`,
      key,
    });
  } catch (error) {
    console.error('R2 presigned URL error:', error.message);

    return res.status(500).json({
      message: 'Could not prepare image upload',
    });
  }
});

export default router;

// const upload = multer({
//   storage: multer.memoryStorage(),
//   limits: {
//     fileSize: 5 * 1024 * 1024, // 5 MB
//     files: 1,
//   },
//   fileFilter: (_req, file, callback) => {
//     const allowedTypes = [
//       'image/jpeg',
//       'image/png',
//       'image/webp',
//       'image/avif',
//     ];

//     if (!allowedTypes.includes(file.mimetype)) {
//       return callback(
//         new Error('Only JPEG, PNG, WebP, and AVIF images are allowed.')
//       );
//     }

//     callback(null, true);
//   },
// });

// const uploadToCloudinary = (buffer) =>
//   new Promise((resolve, reject) => {
//     const stream = cloudinary.uploader.upload_stream(
//       {
//         folder: 'l4lstore/products',
//         resource_type: 'image',
//       },
//       (error, result) => {
//         if (error) return reject(error);
//         resolve(result);
//       }
//     );

//     stream.end(buffer);
//   });

// router.post(
//   '/image',
//   protect,
//   admin,
//   (req, res, next) => {
//     upload.single('image')(req, res, (error) => {
//       if (error) {
//         return res.status(400).json({
//           message: error.message || 'Invalid image upload',
//         });
//       }

//       next();
//     });
//   },
//   async (req, res) => {
//     if (!req.file) {
//       return res.status(400).json({
//         message: 'Please select an image to upload',
//       });
//     }

//     try {
//       const result = await uploadToCloudinary(req.file.buffer);

//       return res.status(201).json({
//         message: 'Image uploaded successfully',
//         imageUrl: result.secure_url,
//         publicId: result.public_id,
//       });
//     } catch (error) {
//       console.error('Cloudinary upload failed:', error.message);

//       return res.status(502).json({
//         message: 'Image upload failed. Please try again.',
//       });
//     }
    
//   }
 
// );

