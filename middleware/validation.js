const { body, param, query, validationResult } = require('express-validator');

// Validation error handler
exports.validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array(),
    });
  }
  next();
};

// User registration validation
exports.validateRegister = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
  body('role')
    .optional()
    .isIn(['customer', 'restaurant', 'admin'])
    .withMessage('Invalid role'),
];

// User login validation
exports.validateLogin = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
];

// Restaurant creation validation
exports.validateRestaurant = [
  body('name').trim().notEmpty().withMessage('Restaurant name is required'),
  body('description').optional().trim(),
  body('phone').optional().trim(),
  body('email').optional().isEmail().withMessage('Valid email is required'),
  body('address.street').optional().trim(),
  body('address.city').optional().trim(),
  body('address.state').optional().trim(),
  body('address.zipCode').optional().trim(),
];

// Menu item validation
exports.validateMenuItem = [
  body('name').trim().notEmpty().withMessage('Item name is required'),
  body('description').optional().trim(),
  body('category')
    .isIn(['appetizer', 'main', 'dessert', 'beverage', 'side'])
    .withMessage('Invalid category'),
  body('price')
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number'),
  body('isAvailable').optional().isBoolean(),
  body('isVegetarian').optional().isBoolean(),
  body('isVegan').optional().isBoolean(),
  body('spicyLevel').optional().isInt({ min: 0, max: 3 }),
  body('preparationTime').optional().isInt({ min: 0 }),
];

// Order creation validation
exports.validateOrder = [
  body('restaurantId').notEmpty().withMessage('Restaurant ID is required'),
  body('items').isArray({ min: 1 }).withMessage('Order must have at least one item'),
  body('items.*.menuItemId').notEmpty().withMessage('Menu item ID is required'),
  body('items.*.quantity')
    .isInt({ min: 1 })
    .withMessage('Quantity must be at least 1'),
  body('deliveryAddress.street').notEmpty().withMessage('Street address is required'),
  body('deliveryAddress.city').notEmpty().withMessage('City is required'),
  body('deliveryAddress.state').notEmpty().withMessage('State is required'),
  body('deliveryAddress.zipCode').notEmpty().withMessage('Zip code is required'),
  body('paymentMethod')
    .isIn(['cash', 'card', 'online'])
    .withMessage('Invalid payment method'),
];

// Order status update validation
exports.validateOrderStatus = [
  body('status')
    .isIn(['pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'cancelled'])
    .withMessage('Invalid order status'),
];

// Tenant ID validation
exports.validateTenantId = [
  param('tenantId').notEmpty().withMessage('Tenant ID is required'),
];

// Query pagination validation
exports.validatePagination = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
];

