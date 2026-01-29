/**
 * Part Routes
 * Handles vehicle parts listings
 */

const express = require('express');
const router = express.Router();
const partController = require('../controllers/part.controller');
const { verifyClerkToken, restrictTo } = require('../middleware/clerk.middleware');
const { upload } = require('../middleware/upload.middleware');
const { partValidation, validate } = require('../middleware/validation');

// Public Routes
router.get('/', partController.getAllParts);
router.get('/search', partController.searchParts);
router.get('/categories', partController.getCategories);
router.get('/compatible/:vehicleId', partController.getCompatibleParts);
router.get('/:partId', partController.getPartById);

// Protected Routes
router.use(verifyClerkToken);

// Create Part Listing
router.post(
  '/',
  partValidation,
  validate,
  partController.createPart
);

// Update Part
router.put(
  '/:partId',
  partController.checkOwnership,
  partController.updatePart
);

// Delete Part
router.delete(
  '/:partId',
  partController.checkOwnership,
  partController.deletePart
);

// Part Images
router.post(
  '/:partId/images',
  partController.checkOwnership,
  partController.addImages
);

router.delete(
  '/:partId/images/:imageId',
  partController.checkOwnership,
  partController.deleteImage
);

// Part Status
router.patch(
  '/:partId/status',
  partController.checkOwnership,
  partController.updateStatus
);

// Featured/Boost
router.post(
  '/:partId/feature',
  partController.checkOwnership,
  partController.featurePart
);

router.post(
  '/:partId/boost',
  partController.checkOwnership,
  partController.boostPart
);

// Mark as Sold
router.patch(
  '/:partId/sold',
  partController.checkOwnership,
  partController.markAsSold
);

// Compatibility
router.post(
  '/:partId/compatible-vehicles',
  partController.checkOwnership,
  partController.addCompatibleVehicles
);

router.delete(
  '/:partId/compatible-vehicles/:vehicleId',
  partController.checkOwnership,
  partController.removeCompatibleVehicle
);

// Admin Routes
router.patch(
  '/:partId/approve',
  restrictTo('admin'),
  partController.approvePart
);

router.patch(
  '/:partId/reject',
  restrictTo('admin'),
  partController.rejectPart
);

module.exports = router;
