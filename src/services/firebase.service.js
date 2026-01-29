/**
 * Firebase Storage Service
 * Handles document uploads (PDFs, contracts, documents)
 */

const admin = require('firebase-admin');
const { v4: uuidv4 } = require('uuid');
const { ApiError } = require('../utils/ApiError');

// Initialize Firebase Admin
let firebaseApp;
let bucket;

/**
 * Initialize Firebase Admin SDK
 */
const initializeFirebase = () => {
  try {
    // Check if already initialized
    if (firebaseApp) {
      return;
    }

    // Parse service account from environment variable
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT
      ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
      : require('../../firebase-service-account.json'); // Fallback to file

    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET
    });

    bucket = admin.storage().bucket();
    console.log('✅ Firebase initialized successfully');
  } catch (error) {
    console.error('❌ Firebase initialization error:', error.message);
    // Don't throw - allow app to start without Firebase
    // Features requiring Firebase will fail gracefully
  }
};

/**
 * Upload document to Firebase Storage
 * @param {Buffer} fileBuffer - File buffer
 * @param {Object} options - Upload options
 * @returns {Promise<Object>} Upload result with download URL
 */
const uploadDocument = async (fileBuffer, options = {}) => {
  if (!bucket) {
    throw ApiError.serviceUnavailable('Firebase Storage is not initialized');
  }

  try {
    const {
      filename,
      folder = 'documents',
      contentType = 'application/pdf',
      metadata = {}
    } = options;

    // Generate unique filename
    const uniqueFilename = `${uuidv4()}-${filename}`;
    const filePath = `${folder}/${uniqueFilename}`;

    // Create file reference
    const file = bucket.file(filePath);

    // Upload file
    await file.save(fileBuffer, {
      contentType,
      metadata: {
        firebaseStorageDownloadTokens: uuidv4(),
        ...metadata
      },
      public: false
    });

    // Make file accessible
    await file.makePublic();

    // Get download URL
    const downloadURL = `https://storage.googleapis.com/${bucket.name}/${filePath}`;

    return {
      success: true,
      downloadURL,
      filePath,
      filename: uniqueFilename,
      size: fileBuffer.length,
      contentType
    };
  } catch (error) {
    console.error('Firebase upload error:', error);
    throw ApiError.internal('Failed to upload document to Firebase Storage');
  }
};

/**
 * Upload multiple documents
 * @param {Array} files - Array of file objects with buffer and metadata
 * @returns {Promise<Array>} Array of upload results
 */
const uploadMultipleDocuments = async (files) => {
  if (!bucket) {
    throw ApiError.serviceUnavailable('Firebase Storage is not initialized');
  }

  try {
    const uploadPromises = files.map(file =>
      uploadDocument(file.buffer, {
        filename: file.filename,
        folder: file.folder || 'documents',
        contentType: file.contentType,
        metadata: file.metadata
      })
    );

    return await Promise.all(uploadPromises);
  } catch (error) {
    console.error('Multiple upload error:', error);
    throw ApiError.internal('Failed to upload multiple documents');
  }
};

/**
 * Delete document from Firebase Storage
 * @param {String} filePath - Path to file in storage
 * @returns {Promise<Boolean>} Success status
 */
const deleteDocument = async (filePath) => {
  if (!bucket) {
    throw ApiError.serviceUnavailable('Firebase Storage is not initialized');
  }

  try {
    const file = bucket.file(filePath);
    await file.delete();

    return {
      success: true,
      message: 'Document deleted successfully'
    };
  } catch (error) {
    if (error.code === 404) {
      throw ApiError.notFound('Document not found');
    }
    console.error('Firebase delete error:', error);
    throw ApiError.internal('Failed to delete document');
  }
};

/**
 * Get document metadata
 * @param {String} filePath - Path to file in storage
 * @returns {Promise<Object>} File metadata
 */
const getDocumentMetadata = async (filePath) => {
  if (!bucket) {
    throw ApiError.serviceUnavailable('Firebase Storage is not initialized');
  }

  try {
    const file = bucket.file(filePath);
    const [metadata] = await file.getMetadata();

    return {
      success: true,
      metadata: {
        name: metadata.name,
        size: metadata.size,
        contentType: metadata.contentType,
        timeCreated: metadata.timeCreated,
        updated: metadata.updated,
        downloadURL: `https://storage.googleapis.com/${bucket.name}/${filePath}`
      }
    };
  } catch (error) {
    if (error.code === 404) {
      throw ApiError.notFound('Document not found');
    }
    console.error('Firebase metadata error:', error);
    throw ApiError.internal('Failed to get document metadata');
  }
};

/**
 * Generate signed URL for temporary access
 * @param {String} filePath - Path to file in storage
 * @param {Number} expiresIn - Expiration time in minutes (default: 60)
 * @returns {Promise<String>} Signed URL
 */
const generateSignedUrl = async (filePath, expiresIn = 60) => {
  if (!bucket) {
    throw ApiError.serviceUnavailable('Firebase Storage is not initialized');
  }

  try {
    const file = bucket.file(filePath);
    const expirationDate = new Date();
    expirationDate.setMinutes(expirationDate.getMinutes() + expiresIn);

    const [url] = await file.getSignedUrl({
      action: 'read',
      expires: expirationDate
    });

    return {
      success: true,
      signedUrl: url,
      expiresAt: expirationDate.toISOString()
    };
  } catch (error) {
    console.error('Signed URL generation error:', error);
    throw ApiError.internal('Failed to generate signed URL');
  }
};

/**
 * List documents in a folder
 * @param {String} folder - Folder path
 * @param {Object} options - List options
 * @returns {Promise<Array>} List of documents
 */
const listDocuments = async (folder = 'documents', options = {}) => {
  if (!bucket) {
    throw ApiError.serviceUnavailable('Firebase Storage is not initialized');
  }

  try {
    const { maxResults = 100, pageToken } = options;

    const [files, , apiResponse] = await bucket.getFiles({
      prefix: folder,
      maxResults,
      pageToken
    });

    const documents = files.map(file => ({
      name: file.name,
      size: file.metadata.size,
      contentType: file.metadata.contentType,
      timeCreated: file.metadata.timeCreated,
      downloadURL: `https://storage.googleapis.com/${bucket.name}/${file.name}`
    }));

    return {
      success: true,
      documents,
      nextPageToken: apiResponse.nextPageToken || null,
      hasMore: !!apiResponse.nextPageToken
    };
  } catch (error) {
    console.error('List documents error:', error);
    throw ApiError.internal('Failed to list documents');
  }
};

/**
 * Copy document to another location
 * @param {String} sourcePath - Source file path
 * @param {String} destPath - Destination file path
 * @returns {Promise<Object>} Copy result
 */
const copyDocument = async (sourcePath, destPath) => {
  if (!bucket) {
    throw ApiError.serviceUnavailable('Firebase Storage is not initialized');
  }

  try {
    const sourceFile = bucket.file(sourcePath);
    const destFile = bucket.file(destPath);

    await sourceFile.copy(destFile);

    return {
      success: true,
      message: 'Document copied successfully',
      sourcePath,
      destPath
    };
  } catch (error) {
    console.error('Copy document error:', error);
    throw ApiError.internal('Failed to copy document');
  }
};

/**
 * Move document to another location
 * @param {String} sourcePath - Source file path
 * @param {String} destPath - Destination file path
 * @returns {Promise<Object>} Move result
 */
const moveDocument = async (sourcePath, destPath) => {
  if (!bucket) {
    throw ApiError.serviceUnavailable('Firebase Storage is not initialized');
  }

  try {
    const sourceFile = bucket.file(sourcePath);
    const destFile = bucket.file(destPath);

    await sourceFile.move(destFile);

    return {
      success: true,
      message: 'Document moved successfully',
      sourcePath,
      destPath
    };
  } catch (error) {
    console.error('Move document error:', error);
    throw ApiError.internal('Failed to move document');
  }
};

/**
 * Get storage usage statistics
 * @returns {Promise<Object>} Storage statistics
 */
const getStorageStats = async () => {
  if (!bucket) {
    throw ApiError.serviceUnavailable('Firebase Storage is not initialized');
  }

  try {
    const [files] = await bucket.getFiles();

    let totalSize = 0;
    const filesByType = {};

    files.forEach(file => {
      totalSize += parseInt(file.metadata.size || 0);
      const contentType = file.metadata.contentType || 'unknown';
      filesByType[contentType] = (filesByType[contentType] || 0) + 1;
    });

    return {
      success: true,
      statistics: {
        totalFiles: files.length,
        totalSize: totalSize,
        totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
        filesByType
      }
    };
  } catch (error) {
    console.error('Storage stats error:', error);
    throw ApiError.internal('Failed to get storage statistics');
  }
};

// Initialize on module load
initializeFirebase();

module.exports = {
  initializeFirebase,
  uploadDocument,
  uploadMultipleDocuments,
  deleteDocument,
  getDocumentMetadata,
  generateSignedUrl,
  listDocuments,
  copyDocument,
  moveDocument,
  getStorageStats
};