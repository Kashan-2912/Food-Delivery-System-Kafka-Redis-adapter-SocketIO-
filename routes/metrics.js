const express = require('express');
const { protect, extractTenantId } = require('../middleware/auth');
const { metricsAggregator } = require('../kafka/consumer');
const { generalLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

// @route   GET /api/metrics/:tenantId
// @desc    Get metrics for a specific tenant
// @access  Public (for dashboard)
router.get('/:tenantId', generalLimiter, async (req, res) => {
  try {
    const { tenantId } = req.params;

    let metrics = await metricsAggregator.getTenantMetrics(tenantId);

    // If no metrics yet, return empty metrics instead of 404
    if (!metrics) {
      metrics = {
        tenantId,
        totalOrders: 0,
        avgPrepTime: 0,
        ordersPerMinute: [],
        lastUpdated: new Date().toISOString(),
      };
    }

    res.status(200).json({
      success: true,
      data: metrics,
    });
  } catch (error) {
    console.error('Get metrics error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching metrics',
      error: error.message,
    });
  }
});

// @route   GET /api/metrics/:tenantId/orders-per-minute
// @desc    Get orders per minute for a specific tenant
// @access  Public (for dashboard)
router.get('/:tenantId/orders-per-minute', generalLimiter, async (req, res) => {
  try {
    const { tenantId } = req.params;
    const { minutes = 10 } = req.query;

    const data = await metricsAggregator.getOrdersPerMinute(
      tenantId,
      parseInt(minutes)
    );

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('Get orders per minute error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching orders per minute',
      error: error.message,
    });
  }
});

module.exports = router;

