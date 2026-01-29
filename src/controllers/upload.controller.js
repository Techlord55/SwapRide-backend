/**
 * Upload Controller - Cloudinary Implementation
 * Handles file uploads (images, documents)
 */

const { asyncHandler } = require('../middleware/errorHandler');
const { uploadImage: cloudinaryUpload, deleteImage: cloudinaryDelete } = require('../config/cloudinary');
const path = require('path');
const fs = require('fs').promises;

/**
 * @desc    Upload single image
 * @route   POST /api/v1/uploads/image
 * @access  Private
 */
exports.uploadImage = asyncHandler(async (req, res) => {
  console.log('📤 Upload request received');
  console.log('📁 File:', req.file);
  
  if (!req.file) {
    return res.status(400).json({
      status: 'error',
      message: 'No file uploaded'
    });
  }

  const { folder = 'swapride/vehicles' } = req.body;

  try {
    console.log('⬆️ Uploading to Cloudinary...');
    
    // Upload to Cloudinary
    const result = await cloudinaryUpload(req.file.path, folder);
    
    console.log('✅ Cloudinary upload successful:', result);
    
    // Delete local file after successful upload
    try {
      await fs.unlink(req.file.path);
      console.log('🗑️ Local file deleted');
    } catch (unlinkError) {
      console.error('⚠️ Failed to delete local file:', unlinkError);
    }

    res.status(200).json({
      status: 'success',
      message: 'Image uploaded successfully',
      data: {
        url: result.url,
        publicId: result.publicId,
        public_id: result.publicId, // Alternative format
        secure_url: result.url, // Alternative format
        format: result.format,
        width: result.width,
        height: result.height
      }
    });
  } catch (error) {
    console.error('❌ Upload error:', error);
    
    // Try to delete local file even if upload failed
    try {
      if (req.file && req.file.path) {
        await fs.unlink(req.file.path);
      }
    } catch (unlinkError) {
      console.error('⚠️ Failed to delete local file after error:', unlinkError);
    }
    
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to upload image',
      error: process.env.NODE_ENV === 'development' ? error.toString() : undefined
    });
  }
});

/**
 * @desc    Upload multiple images
 * @route   POST /api/v1/uploads/images
 * @access  Private
 */
exports.uploadImages = asyncHandler(async (req, res) => {
  console.log('📤 Multiple upload request received');
  console.log('📁 Files:', req.files);
  
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({
      status: 'error',
      message: 'No files uploaded'
    });
  }

  const { folder = 'swapride/vehicles' } = req.body;
  const uploadedImages = [];
  const errors = [];

  for (const file of req.files) {
    try {
      console.log(`⬆️ Uploading ${file.originalname}...`);
      
      const result = await cloudinaryUpload(file.path, folder);
      
      uploadedImages.push({
        url: result.url,
        publicId: result.publicId,
        public_id: result.publicId,
        secure_url: result.url,
        format: result.format,
        width: result.width,
        height: result.height
      });

      // Delete local file
      try {
        await fs.unlink(file.path);
      } catch (unlinkError) {
        console.error('⚠️ Failed to delete local file:', unlinkError);
      }
      
      console.log(`✅ Uploaded ${file.originalname}`);
    } catch (error) {
      console.error(`❌ Failed to upload ${file.originalname}:`, error);
      errors.push({
        file: file.originalname,
        error: error.message
      });
      
      // Try to delete local file
      try {
        await fs.unlink(file.path);
      } catch (unlinkError) {
        console.error('⚠️ Failed to delete local file:', unlinkError);
      }
    }
  }

  if (uploadedImages.length === 0) {
    return res.status(500).json({
      status: 'error',
      message: 'Failed to upload any images',
      errors
    });
  }

  res.status(200).json({
    status: 'success',
    message: `${uploadedImages.length} of ${req.files.length} images uploaded successfully`,
    data: uploadedImages,
    errors: errors.length > 0 ? errors : undefined
  });
});

/**
 * @desc    Upload document (PDF, DOC, etc.)
 * @route   POST /api/v1/uploads/document
 * @access  Private
 */
exports.uploadDocument = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      status: 'error',
      message: 'No file uploaded'
    });
  }

  const { folder = 'swapride/documents' } = req.body;
  const allowedTypes = ['.pdf', '.doc', '.docx', '.txt'];
  const fileExt = path.extname(req.file.originalname).toLowerCase();

  if (!allowedTypes.includes(fileExt)) {
    return res.status(400).json({
      status: 'error',
      message: 'Invalid file type. Allowed: PDF, DOC, DOCX, TXT'
    });
  }

  try {
    const result = await cloudinaryUpload(req.file.path, folder);

    // Delete local file
    await fs.unlink(req.file.path);

    res.status(200).json({
      status: 'success',
      message: 'Document uploaded successfully',
      data: {
        document: {
          url: result.url,
          publicId: result.publicId,
          originalName: req.file.originalname,
          format: result.format
        }
      }
    });
  } catch (error) {
    console.error('Upload error:', error);
    
    // Try to delete local file
    try {
      await fs.unlink(req.file.path);
    } catch (unlinkError) {
      console.error('Failed to delete local file:', unlinkError);
    }
    
    res.status(500).json({
      status: 'error',
      message: 'Failed to upload document'
    });
  }
});

/**
 * @desc    Delete image from cloud storage
 * @route   DELETE /api/v1/uploads/image/:publicId
 * @access  Private
 */
exports.deleteImage = asyncHandler(async (req, res) => {
  const { publicId } = req.params;

  if (!publicId) {
    return res.status(400).json({
      status: 'error',
      message: 'Public ID is required'
    });
  }

  try {
    const result = await cloudinaryDelete(publicId);
    
    if (result.result !== 'ok' && result.result !== 'not found') {
      return res.status(404).json({
        status: 'error',
        message: 'Failed to delete image'
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Image deleted successfully'
    });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete image'
    });
  }
});

/**
 * @desc    Delete multiple images
 * @route   DELETE /api/v1/uploads/images
 * @access  Private
 */
exports.deleteImages = asyncHandler(async (req, res) => {
  const { publicIds } = req.body;

  if (!publicIds || !Array.isArray(publicIds) || publicIds.length === 0) {
    return res.status(400).json({
      status: 'error',
      message: 'Public IDs array is required'
    });
  }

  try {
    const { deleteMultipleImages } = require('../config/cloudinary');
    const results = await deleteMultipleImages(publicIds);

    res.status(200).json({
      status: 'success',
      message: `${publicIds.length} images deleted successfully`,
      data: { results }
    });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete images'
    });
  }
});

/**
 * @desc    Get upload signature (for client-side direct upload)
 * @route   GET /api/v1/uploads/signature
 * @access  Private
 */
exports.getUploadSignature = asyncHandler(async (req, res) => {
  const { folder = 'swapride' } = req.query;
  const { cloudinary } = require('../config/cloudinary');

  const timestamp = Math.round(new Date().getTime() / 1000);
  const signature = cloudinary.utils.api_sign_request(
    {
      timestamp,
      folder,
    },
    process.env.CLOUDINARY_API_SECRET
  );

  res.status(200).json({
    status: 'success',
    data: {
      signature,
      timestamp,
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      apiKey: process.env.CLOUDINARY_API_KEY,
      folder
    }
  });
});

/**
 * @desc    Upload avatar
 * @route   POST /api/v1/uploads/avatar
 * @access  Private
 */
exports.uploadAvatar = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      status: 'error',
      message: 'No file uploaded'
    });
  }

  try {
    const result = await cloudinaryUpload(req.file.path, 'swapride/avatars');

    // Delete local file
    await fs.unlink(req.file.path);

    // Update user avatar in database
    const prisma = require('../config/prisma');
    await prisma.user.update({
      where: { id: req.user.id },
      data: {
        avatarUrl: result.url,
        avatarPublicId: result.publicId
      }
    });

    res.status(200).json({
      status: 'success',
      message: 'Avatar uploaded successfully',
      data: {
        avatar: {
          url: result.url,
          publicId: result.publicId
        }
      }
    });
  } catch (error) {
    console.error('Avatar upload error:', error);
    
    // Try to delete local file
    try {
      await fs.unlink(req.file.path);
    } catch (unlinkError) {
      console.error('Failed to delete local file:', unlinkError);
    }
    
    res.status(500).json({
      status: 'error',
      message: 'Failed to upload avatar'
    });
  }
});

/**
 * @desc    Delete avatar
 * @route   DELETE /api/v1/uploads/avatar
 * @access  Private
 */
exports.deleteAvatar = asyncHandler(async (req, res) => {
  const prisma = require('../config/prisma');
  
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { avatarPublicId: true }
  });

  if (user.avatarPublicId) {
    try {
      await cloudinaryDelete(user.avatarPublicId);
    } catch (error) {
      console.error('Failed to delete avatar from Cloudinary:', error);
    }
  }

  // Update user
  await prisma.user.update({
    where: { id: req.user.id },
    data: {
      avatarUrl: null,
      avatarPublicId: null
    }
  });

  res.status(200).json({
    status: 'success',
    message: 'Avatar deleted successfully'
  });
});

/**
 * @desc    Get file info
 * @route   GET /api/v1/uploads/info/:publicId
 * @access  Private
 */
exports.getFileInfo = asyncHandler(async (req, res) => {
  const { publicId } = req.params;
  const { cloudinary } = require('../config/cloudinary');

  try {
    const result = await cloudinary.api.resource(publicId);

    res.status(200).json({
      status: 'success',
      data: {
        file: {
          publicId: result.public_id,
          url: result.secure_url,
          format: result.format,
          width: result.width,
          height: result.height,
          size: result.bytes,
          createdAt: result.created_at
        }
      }
    });
  } catch (error) {
    console.error('Get file info error:', error);
    res.status(404).json({
      status: 'error',
      message: 'File not found'
    });
  }
});
