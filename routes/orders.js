const express = require('express');
const { v4: uuidv4 } = require('uuid');
const Order = require('../models/Order');
const Restaurant = require('../models/Restaurant');
const MenuItem = require('../models/MenuItem');
const { protect, extractTenantId } = require('../middleware/auth');
const { validateOrder, validateOrderStatus, validate, validatePagination } = require('../middleware/validation');
const { orderLimiter, tenantLimiter } = require('../middleware/rateLimiter');
const { publishOrderEvent } = require('../kafka/producer');
const { getIO } = require('../socket/socketServer');

const router = express.Router();

// @route   POST /api/orders
// @desc    Create new order
// @access  Private (Customer)
router.post(
  '/',
  protect,
  validateOrder,
  validate,
  orderLimiter,
  async (req, res) => {
    try {
      const { restaurantId, items, deliveryAddress, paymentMethod, notes } = req.body;

      // Get restaurant and verify it exists
      const restaurant = await Restaurant.findById(restaurantId);
      if (!restaurant) {
        return res.status(404).json({
          success: false,
          message: 'Restaurant not found',
        });
      }

      const tenantId = restaurant.tenantId;

      // Validate and calculate order totals
      let subtotal = 0;
      const orderItems = [];

      for (const item of items) {
        const menuItem = await MenuItem.findOne({
          _id: item.menuItemId,
          tenantId,
          restaurantId,
          isAvailable: true,
        });

        if (!menuItem) {
          return res.status(404).json({
            success: false,
            message: `Menu item ${item.menuItemId} not found or unavailable`,
          });
        }

        const itemTotal = menuItem.price * item.quantity;
        subtotal += itemTotal;

        orderItems.push({
          menuItemId: menuItem._id,
          name: menuItem.name,
          price: menuItem.price,
          quantity: item.quantity,
          specialInstructions: item.specialInstructions,
        });
      }

      // Calculate totals
      const deliveryFee = restaurant.deliveryFee || 0;
      const tax = subtotal * 0.08; // 8% tax
      const total = subtotal + deliveryFee + tax;

      // Check minimum order
      if (subtotal < restaurant.minimumOrder) {
        return res.status(400).json({
          success: false,
          message: `Minimum order amount is $${restaurant.minimumOrder}`,
        });
      }

      // Generate unique order number
      const orderNumber = `ORD-${Date.now()}-${uuidv4().substring(0, 8).toUpperCase()}`;

      // Calculate estimated delivery time
      const estimatedDeliveryTime = new Date(
        Date.now() + (restaurant.estimatedDeliveryTime || 30) * 60 * 1000
      );

      // Create order
      const order = await Order.create({
        tenantId,
        restaurantId,
        customerId: req.user._id,
        orderNumber,
        items: orderItems,
        subtotal,
        deliveryFee,
        tax,
        total,
        deliveryAddress,
        paymentMethod,
        notes,
        estimatedDeliveryTime,
        status: 'pending',
        paymentStatus: paymentMethod === 'cash' ? 'pending' : 'paid',
      });

      // Publish order event to Kafka
      await publishOrderEvent({
        eventType: 'order_created',
        tenantId,
        orderId: order._id.toString(),
        orderNumber,
        restaurantId: restaurantId.toString(),
        customerId: req.user._id.toString(),
        total,
        items: orderItems.length,
        timestamp: new Date().toISOString(),
      });

      // Emit real-time update via Socket.IO
      const io = getIO();
      if (io) {
        io.to(`tenant:${tenantId}`).emit('order:created', {
          orderId: order._id,
          orderNumber,
          tenantId,
          restaurantId,
          status: order.status,
          total,
        });
      }

      res.status(201).json({
        success: true,
        data: order,
      });
    } catch (error) {
      console.error('Create order error:', error);
      res.status(500).json({
        success: false,
        message: 'Error creating order',
        error: error.message,
      });
    }
  }
);

// @route   GET /api/orders
// @desc    Get orders (filtered by user role)
// @access  Private
router.get(
  '/',
  protect,
  validatePagination,
  validate,
  async (req, res) => {
    try {
      const { page = 1, limit = 10, status, tenantId } = req.query;

      let query = {};

      // Filter based on user role
      if (req.user.role === 'customer') {
        query.customerId = req.user._id;
      } else if (req.user.role === 'restaurant') {
        if (!req.user.tenantId) {
          return res.status(400).json({
            success: false,
            message: 'Tenant ID required for restaurant users',
          });
        }
        query.tenantId = req.user.tenantId;
      } else if (req.user.role === 'admin' && tenantId) {
        query.tenantId = tenantId;
      }

      if (status) {
        query.status = status;
      }

      const orders = await Order.find(query)
        .populate('restaurantId', 'name image')
        .populate('customerId', 'name email phone')
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .sort({ createdAt: -1 });

      const count = await Order.countDocuments(query);

      res.status(200).json({
        success: true,
        count: orders.length,
        total: count,
        page: parseInt(page),
        pages: Math.ceil(count / limit),
        data: orders,
      });
    } catch (error) {
      console.error('Get orders error:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching orders',
        error: error.message,
      });
    }
  }
);

// @route   GET /api/orders/:id
// @desc    Get single order
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('restaurantId', 'name image phone email')
      .populate('customerId', 'name email phone');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    // Verify access
    if (
      req.user.role === 'customer' &&
      order.customerId._id.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this order',
      });
    }

    if (
      req.user.role === 'restaurant' &&
      order.tenantId !== req.user.tenantId
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this order',
      });
    }

    res.status(200).json({
      success: true,
      data: order,
    });
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching order',
      error: error.message,
    });
  }
});

// @route   PUT /api/orders/:id/status
// @desc    Update order status
// @access  Private (Restaurant/Admin)
router.put(
  '/:id/status',
  protect,
  validateOrderStatus,
  validate,
  tenantLimiter(1000, 15),
  async (req, res) => {
    try {
      const { status } = req.body;

      const order = await Order.findById(req.params.id);

      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found',
        });
      }

      // Verify access
      if (
        req.user.role === 'restaurant' &&
        order.tenantId !== req.user.tenantId
      ) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to update this order',
        });
      }

      // Update timestamps based on status
      if (status === 'preparing' && !order.preparationStartTime) {
        order.preparationStartTime = new Date();
      } else if (status === 'ready' && !order.preparationEndTime) {
        order.preparationEndTime = new Date();
      } else if (status === 'delivered' && !order.actualDeliveryTime) {
        order.actualDeliveryTime = new Date();
      }

      order.status = status;
      await order.save();

      // Publish order status update event to Kafka
      await publishOrderEvent({
        eventType: 'order_status_updated',
        tenantId: order.tenantId,
        orderId: order._id.toString(),
        orderNumber: order.orderNumber,
        status,
        preparationTime: order.preparationEndTime && order.preparationStartTime
          ? (order.preparationEndTime - order.preparationStartTime) / 1000 / 60
          : null,
        timestamp: new Date().toISOString(),
      });

      // Emit real-time update via Socket.IO
      const io = getIO();
      if (io) {
        io.to(`tenant:${order.tenantId}`).emit('order:updated', {
          orderId: order._id,
          orderNumber: order.orderNumber,
          tenantId: order.tenantId,
          status: order.status,
        });

        // Also emit to customer's room if they're connected
        io.to(`user:${order.customerId}`).emit('order:updated', {
          orderId: order._id,
          orderNumber: order.orderNumber,
          status: order.status,
        });
      }

      res.status(200).json({
        success: true,
        data: order,
      });
    } catch (error) {
      console.error('Update order status error:', error);
      res.status(500).json({
        success: false,
        message: 'Error updating order status',
        error: error.message,
      });
    }
  }
);

module.exports = router;

