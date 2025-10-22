const express = require('express');
const Restaurant = require('../models/Restaurant');
const MenuItem = require('../models/MenuItem');
const { protect, authorize, extractTenantId } = require('../middleware/auth');
const { validateRestaurant, validate, validatePagination } = require('../middleware/validation');
const { generalLimiter, tenantLimiter } = require('../middleware/rateLimiter');
const cacheService = require('../utils/cache');

const router = express.Router();

// @route   GET /api/restaurants
// @desc    Get all active restaurants (with optional tenant filter)
// @access  Public
router.get('/', generalLimiter, validatePagination, validate, async (req, res) => {
  try {
    const { page = 1, limit = 10, cuisine, city, tenantId } = req.query;
    
    const query = { isActive: true };
    
    if (tenantId) {
      query.tenantId = tenantId;
    }
    
    if (cuisine) {
      query.cuisine = { $in: [cuisine] };
    }
    
    if (city) {
      query['address.city'] = new RegExp(city, 'i');
    }

    // Try to get from cache (if tenant-specific)
    if (tenantId) {
      const cacheKey = `restaurants:${JSON.stringify(query)}:${page}:${limit}`;
      const cachedData = await cacheService.getTenantCache(tenantId, cacheKey);
      
      if (cachedData) {
        return res.status(200).json({
          success: true,
          cached: true,
          ...cachedData,
        });
      }
    }

    const restaurants = await Restaurant.find(query)
      .select('-__v')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ rating: -1, createdAt: -1 });

    const count = await Restaurant.countDocuments(query);

    const result = {
      success: true,
      count: restaurants.length,
      total: count,
      page: parseInt(page),
      pages: Math.ceil(count / limit),
      data: restaurants,
    };

    // Cache the result if tenant-specific
    if (tenantId) {
      const cacheKey = `restaurants:${JSON.stringify(query)}:${page}:${limit}`;
      await cacheService.setTenantCache(tenantId, cacheKey, result, 1800);
    }

    res.status(200).json(result);
  } catch (error) {
    console.error('Get restaurants error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching restaurants',
      error: error.message,
    });
  }
});

// @route   GET /api/restaurants/:id
// @desc    Get single restaurant by ID
// @access  Public
router.get('/:id', generalLimiter, async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id);
    
    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: 'Restaurant not found',
      });
    }

    res.status(200).json({
      success: true,
      data: restaurant,
    });
  } catch (error) {
    console.error('Get restaurant error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching restaurant',
      error: error.message,
    });
  }
});

// @route   GET /api/restaurants/tenant/:tenantId
// @desc    Get restaurant by tenant ID
// @access  Public
router.get('/tenant/:tenantId', generalLimiter, async (req, res) => {
  try {
    const restaurant = await Restaurant.findOne({ tenantId: req.params.tenantId });
    
    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: 'Restaurant not found',
      });
    }

    res.status(200).json({
      success: true,
      data: restaurant,
    });
  } catch (error) {
    console.error('Get restaurant by tenant error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching restaurant',
      error: error.message,
    });
  }
});

// @route   PUT /api/restaurants/:id
// @desc    Update restaurant
// @access  Private (Restaurant owner only)
router.put(
  '/:id',
  protect,
  authorize('restaurant', 'admin'),
  validateRestaurant,
  validate,
  async (req, res) => {
    try {
      let restaurant = await Restaurant.findById(req.params.id);
      
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
          message: 'Not authorized to update this restaurant',
        });
      }

      restaurant = await Restaurant.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
      );

      // Clear tenant cache
      await cacheService.clearTenantCache(restaurant.tenantId);

      res.status(200).json({
        success: true,
        data: restaurant,
      });
    } catch (error) {
      console.error('Update restaurant error:', error);
      res.status(500).json({
        success: false,
        message: 'Error updating restaurant',
        error: error.message,
      });
    }
  }
);

// @route   GET /api/restaurants/:restaurantId/menu
// @desc    Get menu items for a restaurant
// @access  Public
router.get('/:restaurantId/menu', generalLimiter, async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.params.restaurantId);
    
    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: 'Restaurant not found',
      });
    }

    // Try to get from cache
    const cachedMenu = await cacheService.getCachedMenu(
      restaurant.tenantId,
      req.params.restaurantId
    );

    if (cachedMenu) {
      return res.status(200).json({
        success: true,
        cached: true,
        count: cachedMenu.length,
        data: cachedMenu,
      });
    }

    const menuItems = await MenuItem.find({
      restaurantId: req.params.restaurantId,
      tenantId: restaurant.tenantId,
      isAvailable: true,
    }).sort({ category: 1, name: 1 });

    // Cache the menu
    await cacheService.cacheMenu(
      restaurant.tenantId,
      req.params.restaurantId,
      menuItems
    );

    res.status(200).json({
      success: true,
      count: menuItems.length,
      data: menuItems,
    });
  } catch (error) {
    console.error('Get menu error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching menu',
      error: error.message,
    });
  }
});

module.exports = router;

