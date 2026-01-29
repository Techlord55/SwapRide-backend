/**
 * Vehicle Routes
 */

const express = require('express');
const router = express.Router();
const vehicleController = require('../controllers/vehicle.controller');
const { verifyClerkToken, optionalClerkAuth } = require('../middleware/clerk.middleware');
const { createListingLimiter, searchLimiter } = require('../middleware/rateLimiter');
const {
  vehicleValidation,
  validateId,
  paginationValidation,
  validate
} = require('../middleware/validation');

// Public routes
router.get(
  '/',
  searchLimiter,
  paginationValidation,
  validate,
  optionalClerkAuth,
  vehicleController.getAllVehicles
);

router.get('/featured', vehicleController.getFeaturedVehicles);
router.get('/nearby', optionalClerkAuth, vehicleController.getNearbyVehicles);

// Protected routes (must be BEFORE /:id route)
router.use(verifyClerkToken);

// My listings routes - MUST come before /:id route to avoid conflict
router.get('/my-listings', vehicleController.getMyListings);
router.get('/my/listings', vehicleController.getMyListings); // Alias for frontend compatibility

router.post(
  '/',
  createListingLimiter,
  vehicleValidation,
  validate,
  vehicleController.createVehicle
);

router.put('/:id', validateId, validate, vehicleController.updateVehicle);
router.delete('/:id', validateId, validate, vehicleController.deleteVehicle);
router.patch('/:id/favorite', validateId, validate, vehicleController.toggleFavorite);
router.post('/:id/contact', validateId, validate, vehicleController.contactSeller);

// This route should be at the end to avoid matching other routes
router.get('/:id', validateId, validate, optionalClerkAuth, vehicleController.getVehicle);

module.exports = router;
