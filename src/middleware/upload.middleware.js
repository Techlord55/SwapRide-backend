/**
 * Upload Middleware
 * Handles file uploads with Multer for Cloudinary
 */

const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
const uploadsDir = 'uploads/temp';
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('✅ Created uploads directory:', uploadsDir);
}

// File filter function
const fileFilter = (req, file, cb) => {
  // Allowed image types
  const allowedImageTypes = /jpeg|jpg|png|gif|webp/;
  // Allowed document types
  const allowedDocTypes = /pdf|doc|docx/;
  
  const extname = path.extname(file.originalname).toLowerCase();
  const mimetype = file.mimetype;
  
  console.log('📎 Validating file:', {
    fieldname: file.fieldname,
    originalname: file.originalname,
    mimetype,
    extname
  });
  
  // Check file type based on fieldname
  if (file.fieldname === 'images' || file.fieldname === 'avatar' || file.fieldname === 'image') {
    const isValidImage = allowedImageTypes.test(extname.replace('.', '')) && 
                         mimetype.startsWith('image/');
    
    if (isValidImage) {
      console.log('✅ Image file validated');
      return cb(null, true);
    } else {
      console.log('❌ Invalid image file type');
      return cb(new Error('Only image files (JPEG, JPG, PNG, GIF, WEBP) are allowed!'), false);
    }
  }
  
  if (file.fieldname === 'document' || file.fieldname === 'documents') {
    const isValidDoc = allowedDocTypes.test(extname.replace('.', '')) && 
                       (mimetype.startsWith('application/pdf') || 
                        mimetype.startsWith('application/msword') ||
                        mimetype.startsWith('application/vnd.openxmlformats'));
    
    if (isValidDoc) {
      console.log('✅ Document file validated');
      return cb(null, true);
    } else {
      console.log('❌ Invalid document file type');
      return cb(new Error('Only document files (PDF, DOC, DOCX) are allowed!'), false);
    }
  }
  
  // Default: allow all
  console.log('✅ File validated (default)');
  cb(null, true);
};

// Disk storage configuration (needed for Cloudinary upload)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const filename = file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname);
    console.log('💾 Saving file as:', filename);
    cb(null, filename);
  }
});

// Multer upload configuration
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size
    files: 10 // Max 10 files at once
  },
  fileFilter: fileFilter
});

// Error handling middleware
const handleUploadError = (err, req, res, next) => {
  console.error('❌ Upload middleware error:', err);
  
  if (err instanceof multer.MulterError) {
    // Multer-specific errors
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        status: 'error',
        message: 'File size too large. Maximum size is 10MB.'
      });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        status: 'error',
        message: 'Too many files. Maximum is 10 files at once.'
      });
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        status: 'error',
        message: 'Unexpected file field.'
      });
    }
    
    return res.status(400).json({
      status: 'error',
      message: err.message
    });
  } else if (err) {
    // Custom errors (from fileFilter)
    return res.status(400).json({
      status: 'error',
      message: err.message
    });
  }
  
  next();
};

module.exports = {
  upload,
  handleUploadError
};
