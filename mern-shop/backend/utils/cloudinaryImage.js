import Product from '../models/Product.js'
import cloudinary from '../config/cloudinary.js';

const MANAGE_IMAGE_PREFIX = 'l4lstore/products/'

export const cleanupCloudinaryImageUnused = async(
    publicId,
    excludedProductId = null
) => {
    // Only delete assets uploaded to this app's product folder
    if(
        typeof publicId != 'string' || !publicId.startsWith(MANAGE_IMAGE_PREFIX)
    ) {
        return;
    }
    try {
        const query = {imagePublicId : publicId};
        if (excludedProductId){
            query._id = {$ne : excludedProductId};
        }
         // Keep the image if another product still references it.
        const stillUsed = await Product.exists(query)

        if (stillUsed)  return ;
        const result = await cloudinary.uploader.destroy(publicId, {
            resource_type : 'image',
        })
        if(!['ok', 'not found'].includes(result.result)){
            console.warn(
                `Cloudinary clean up did not complete for ${publicId}`
            )
        }
    } catch (error) {
        console.error(
            `Cloudinary clean up failed for ${publicId}`,
            error.message
        )
    }
};