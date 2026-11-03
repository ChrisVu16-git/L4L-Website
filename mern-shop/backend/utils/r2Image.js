import { DeleteObjectCommand } from '@aws-sdk/client-s3';
import Product from '../models/Product.js';
import r2 from '../config/r2.js';

const MANAGED_IMAGE_PREFIX = 'products/';

export const cleanupR2ImageUnused = async (
  imageKey,
  excludedProductId = null
) => {
  // Only delete objects managed by this application.
  if (
    typeof imageKey !== 'string' ||
    !imageKey.startsWith(MANAGED_IMAGE_PREFIX) ||
    imageKey.includes('..')
  ) {
    return;
  }

  try {
    // Check whether another product still uses this image.
    const query = { imageKey };

    if (excludedProductId) {
      query._id = { $ne: excludedProductId };
    }

    const stillUsed = await Product.exists(query);

    if (stillUsed) {
      return;
    }

    // Delete the object from Cloudflare R2.
    await r2.send(
      new DeleteObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: imageKey,
      })
    );

    console.log(`Deleted unused R2 image: ${imageKey}`);
  } catch (error) {
    // Cleanup failure should not undo a successful product operation.
    console.error('R2 image cleanup failed:', error.message);
  }
};