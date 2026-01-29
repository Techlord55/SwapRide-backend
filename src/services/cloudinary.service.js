/**
 * Cloudinary Service
 * Handles image uploads, transformations, and deletions
 */

const cloudinary = require('cloudinary').v2;
const fs = require('fs').promises;

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

/**
 * Upload image to Cloudinary
 * @param {string} filePath - Local file path
 * @param {string} folder - Cloudinary folder name
 * @param {object} options - Additional upload options
 * @returns {Promise<object>} Upload result
 */
exports.uploadToCloudinary = async (filePath, folder = 'swapride', options = {}) => {
  try {
    const defaultOptions = {
      folder,
      resource_type: 'auto',
      quality: 'auto:good',
      fetch_format: 'auto',
      eager: [
        {
          width: 400,
          height: 300,
          crop: 'fill',
          gravity: 'auto',
          quality: 'auto:good'
        }
      ]
    };

    const uploadOptions = { ...defaultOptions, ...options };
    
    const result = await cloudinary.uploader.upload(filePath, uploadOptions);

    // Delete local file after upload
    try {
      await fs.unlink(filePath);
    } catch (unlinkError) {
      console.error('Error deleting local file:', unlinkError);
    }

    return {
      public_id: result.public_id,
      secure_url: result.secure_url,
      url: result.url,
      format: result.format,
      width: result.width,
      height: result.height,
      eager: result.eager || []
    };
  } catch (error) {
    // Clean up local file on error
    try {
      await fs.unlink(filePath);
    } catch (unlinkError) {
      // Ignore cleanup errors
    }
    
    console.error('Cloudinary upload error:', error);
    throw new Error(`Failed to upload image: ${error.message}`);
  }
};

/**
 * Upload multiple images to Cloudinary
 * @param {Array<string>} filePaths - Array of local file paths
 * @param {string} folder - Cloudinary folder name
 * @returns {Promise<Array<object>>} Array of upload results
 */
exports.uploadMultipleToCloudinary = async (filePaths, folder = 'swapride') => {
  try {
    const uploadPromises = filePaths.map(filePath => 
      exports.uploadToCloudinary(filePath, folder)
    );
    
    return await Promise.all(uploadPromises);
  } catch (error) {
    console.error('Multiple upload error:', error);
    throw new Error(`Failed to upload images: ${error.message}`);
  }
};

/**
 * Delete image from Cloudinary
 * @param {string} publicId - Cloudinary public ID
 * @returns {Promise<object>} Deletion result
 */
exports.deleteFromCloudinary = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    
    if (result.result !== 'ok' && result.result !== 'not found') {
      throw new Error(`Failed to delete image: ${result.result}`);
    }
    
    return result;
  } catch (error) {
    console.error('Cloudinary deletion error:', error);
    throw new Error(`Failed to delete image: ${error.message}`);
  }
};

/**
 * Delete multiple images from Cloudinary
 * @param {Array<string>} publicIds - Array of Cloudinary public IDs
 * @returns {Promise<Array<object>>} Array of deletion results
 */
exports.deleteMultipleFromCloudinary = async (publicIds) => {
  try {
    const deletePromises = publicIds.map(publicId => 
      exports.deleteFromCloudinary(publicId)
    );
    
    return await Promise.allSettled(deletePromises);
  } catch (error) {
    console.error('Multiple deletion error:', error);
    throw new Error(`Failed to delete images: ${error.message}`);
  }
};

/**
 * Get image transformation URL
 * @param {string} publicId - Cloudinary public ID
 * @param {object} transformations - Transformation options
 * @returns {string} Transformed image URL
 */
exports.getTransformedUrl = (publicId, transformations = {}) => {
  const defaultTransformations = {
    quality: 'auto:good',
    fetch_format: 'auto'
  };

  const finalTransformations = { ...defaultTransformations, ...transformations };
  
  return cloudinary.url(publicId, finalTransformations);
};

/**
 * Generate thumbnail URL
 * @param {string} publicId - Cloudinary public ID
 * @param {number} width - Thumbnail width
 * @param {number} height - Thumbnail height
 * @returns {string} Thumbnail URL
 */
exports.getThumbnailUrl = (publicId, width = 200, height = 150) => {
  return cloudinary.url(publicId, {
    width,
    height,
    crop: 'fill',
    gravity: 'auto',
    quality: 'auto:good',
    fetch_format: 'auto'
  });
};

/**
 * Upload document to Cloudinary
 * @param {string} filePath - Local file path
 * @param {string} folder - Cloudinary folder name
 * @returns {Promise<object>} Upload result
 */
exports.uploadDocument = async (filePath, folder = 'swapride/documents') => {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder,
      resource_type: 'raw',
      type: 'upload'
    });

    // Delete local file after upload
    try {
      await fs.unlink(filePath);
    } catch (unlinkError) {
      console.error('Error deleting local file:', unlinkError);
    }

    return {
      public_id: result.public_id,
      secure_url: result.secure_url,
      url: result.url,
      format: result.format,
      bytes: result.bytes
    };
  } catch (error) {
    // Clean up local file on error
    try {
      await fs.unlink(filePath);
    } catch (unlinkError) {
      // Ignore cleanup errors
    }
    
    console.error('Cloudinary document upload error:', error);
    throw new Error(`Failed to upload document: ${error.message}`);
  }
};

/**
 * Delete folder from Cloudinary
 * @param {string} folderPath - Folder path in Cloudinary
 * @returns {Promise<object>} Deletion result
 */
exports.deleteFolder = async (folderPath) => {
  try {
    const result = await cloudinary.api.delete_resources_by_prefix(folderPath);
    return result;
  } catch (error) {
    console.error('Cloudinary folder deletion error:', error);
    throw new Error(`Failed to delete folder: ${error.message}`);
  }
};

/**
 * Get resource details
 * @param {string} publicId - Cloudinary public ID
 * @returns {Promise<object>} Resource details
 */
exports.getResourceDetails = async (publicId) => {
  try {
    const result = await cloudinary.api.resource(publicId);
    return result;
  } catch (error) {
    console.error('Error fetching resource details:', error);
    throw new Error(`Failed to get resource details: ${error.message}`);
  }
};

module.exports = exports;
