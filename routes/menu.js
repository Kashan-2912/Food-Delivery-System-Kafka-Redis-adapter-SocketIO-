const express = require('express');
const MenuItem = require('../models/MenuItem');
const Restaurant = require('../models/Restaurant');
const { protect, authorize, extractTenantId, validateTenantAccess } = require('../middleware/auth');
const { validateMenuItem, validate } = require('../middleware/validation');
const { tenantLimiter } = require('../middleware/rateLimiter');
const cacheService = require('../utils/cache');

const router = express.Router();

// @route   POST /api/menu
// @desc    Create menu item
// @access  Private (Restaurant owner only)
router.post(
  '/',
  protect,
  authorize('restaurant', 'admin'),
  extractTenantId,
  validateTenantAccess,
  validateMenuItem,
  validate,
  tenantLimiter(500, 15),
  async (req, res) => {
    try {
      const { restaurantId, name, description, category, price, image, ...rest } = req.body;

      // Verify restaurant exists and belongs to tenant
      const restaurant = await Restaurant.findOne({
        _id: restaurantId,
        tenantId: req.tenantId,
      });

      if (!restaurant) {
        return res.status(404).json({
          success: false,
          message: 'Restaurant not found',
        });
      }

      // Check ownership
      if (req.user.role === 'restaurant' && restaurant.ownerId.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to add menu items to this restaurant',
        });
      }

      const menuItem = await MenuItem.create({
        tenantId: req.tenantId,
        restaurantId,
        name,
        description,
        category,
        price,
        image,
        ...rest,
      });

      // Invalidate menu cache
      await cacheService.invalidateMenuCache(req.tenantId, restaurantId);

      res.status(201).json({
        success: true,
        data: menuItem,
      });
    } catch (error) {
      console.error('Create menu item error:', error);
      res.status(500).json({
        success: false,
        message: 'Error creating menu item',
        error: error.message,
      });
    }
  }
);

// @route   PUT /api/menu/:id
// @desc    Update menu item
// @access  Private (Restaurant owner only)
router.put(
  '/:id',
  protect,
  authorize('restaurant', 'admin'),
  extractTenantId,
  validateTenantAccess,
  validateMenuItem,
  validate,
  tenantLimiter(500, 15),
  async (req, res) => {
    try {
      let menuItem = await MenuItem.findOne({
        _id: req.params.id,
        tenantId: req.tenantId,
      });

      if (!menuItem) {
        return res.status(404).json({
          success: false,
          message: 'Menu item not found',
        });
      }

      // Verify ownership
      const restaurant = await Restaurant.findById(menuItem.restaurantId);
      if (req.user.role === 'restaurant' && restaurant.ownerId.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to update this menu item',
        });
      }

      menuItem = await MenuItem.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
      );

      // Invalidate menu cache
      await cacheService.invalidateMenuCache(req.tenantId, menuItem.restaurantId);

      res.status(200).json({
        success: true,
        data: menuItem,
      });
    } catch (error) {
      console.error('Update menu item error:', error);
      res.status(500).json({
        success: false,
        message: 'Error updating menu item',
        error: error.message,
      });
    }
  }
);

// @route   DELETE /api/menu/:id
// @desc    Delete menu item
// @access  Private (Restaurant owner only)
router.delete(
  '/:id',
  protect,
  authorize('restaurant', 'admin'),
  extractTenantId,
  validateTenantAccess,
  tenantLimiter(500, 15),
  async (req, res) => {
    try {
      const menuItem = await MenuItem.findOne({
        _id: req.params.id,
        tenantId: req.tenantId,
      });

      if (!menuItem) {
        return res.status(404).json({
          success: false,
          message: 'Menu item not found',
        });
      }

      // Verify ownership
      const restaurant = await Restaurant.findById(menuItem.restaurantId);
      if (req.user.role === 'restaurant' && restaurant.ownerId.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to delete this menu item',
        });
      }

      await menuItem.deleteOne();

      // Invalidate menu cache
      await cacheService.invalidateMenuCache(req.tenantId, menuItem.restaurantId);

      res.status(200).json({
        success: true,
        message: 'Menu item deleted successfully',
      });
    } catch (error) {
      console.error('Delete menu item error:', error);
      res.status(500).json({
        success: false,
        message: 'Error deleting menu item',
        error: error.message,
      });
    }
  }
);

module.exports = router;

