const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Protect routes - verify JWT token
exports.protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route',
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select('-password');
    
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'User not found',
      });
    }

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route',
    });
  }
};

// Grant access to specific roles
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role '${req.user.role}' is not authorized to access this route`,
      });
    }
    next();
  };
};

// Extract and validate tenant ID
exports.extractTenantId = async (req, res, next) => {
  try {
    let tenantId;

    // Get tenant ID from header, query, or user profile
    if (req.headers['x-tenant-id']) {
      tenantId = req.headers['x-tenant-id'];
    } else if (req.query.tenantId) {
      tenantId = req.query.tenantId;
    } else if (req.user && req.user.role === 'restaurant' && req.user.tenantId) {
      tenantId = req.user.tenantId;
    } else if (req.params.tenantId) {
      tenantId = req.params.tenantId;
    }

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: 'Tenant ID is required',
      });
    }

    req.tenantId = tenantId;
    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error extracting tenant ID',
      error: error.message,
    });
  }
};

// Validate tenant access for restaurant owners
exports.validateTenantAccess = async (req, res, next) => {
  try {
    if (req.user.role === 'restaurant' && req.user.tenantId !== req.tenantId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this tenant',
      });
    }
    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error validating tenant access',
      error: error.message,
    });
  }
};

