import 'dotenv/config';
import { v2 as cloudinary } from 'cloudinary';

if (!process.env.CLOUDINARY_URL) {
  throw new Error('CLOUDINARY_URL is missing from the backend environment');
}

cloudinary.config({
  secure: true,
});

export default cloudinary;
