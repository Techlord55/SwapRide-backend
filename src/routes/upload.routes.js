/**
 * Upload Routes
 * Handles file uploads
 */

const express = require('express');
const router = express.Router();
const uploadController = require('../controllers/upload.controller');
const { verifyClerkToken } = require('../middleware/clerk.middleware');
const { upload } = require('../middleware/upload.middleware');

// Protect all upload routes
router.use(verifyClerkToken);

// Upload single image
router.post(
  '/image',
  upload.single('image'),
  uploadController.uploadImage
);

// Upload multiple images
router.post(
  '/images',
  upload.array('images', 10),
  uploadController.uploadImages
);

// Upload avatar
router.post(
  '/avatar',
  upload.single('avatar'),
  uploadController.uploadAvatar
);

// Upload document
router.post(
  '/document',
  upload.single('document'),
  uploadController.uploadDocument
);

// Delete image
router.delete('/image/:publicId', uploadController.deleteImage);

// Delete multiple images
router.delete('/images', uploadController.deleteImages);

// Delete avatar
router.delete('/avatar', uploadController.deleteAvatar);

// Get upload signature (for client-side direct upload)
router.get('/signature', uploadController.getUploadSignature);

// Get file info
router.get('/info/:publicId', uploadController.getFileInfo);

module.exports = router;
