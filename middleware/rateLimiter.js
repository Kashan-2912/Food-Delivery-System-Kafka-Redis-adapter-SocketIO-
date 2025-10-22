const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const { getRedisClient } = require('../config/redis');

// General rate limiter (per IP)
exports.generalLimiter = rateLimit({
  store: new RedisStore({
    // @ts-expect-error - Known issue: the option exists, but it's not in the TypeScript definition
    sendCommand: (...args) => getRedisClient().sendCommand(args),
  }),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Auth rate limiter (stricter for login/register)
exports.authLimiter = rateLimit({
  store: new RedisStore({
    // @ts-expect-error - Known issue: the option exists, but it's not in the TypeScript definition
    sendCommand: (...args) => getRedisClient().sendCommand(args),
  }),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: 'Too many authentication attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Tenant-specific rate limiter
exports.tenantLimiter = (maxRequests = 1000, windowMinutes = 15) => {
  return rateLimit({
    store: new RedisStore({
      // @ts-expect-error - Known issue: the option exists, but it's not in the TypeScript definition
      sendCommand: (...args) => getRedisClient().sendCommand(args),
      prefix: 'tenant_limit:',
    }),
    windowMs: windowMinutes * 60 * 1000,
    max: maxRequests,
    message: 'Tenant rate limit exceeded, please try again later.',
    keyGenerator: (req) => {
      // Use tenant ID as the key for rate limiting
      return req.tenantId || req.headers['x-tenant-id'] || req.ip;
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
};

// User-specific rate limiter
exports.userLimiter = (maxRequests = 50, windowMinutes = 15) => {
  return rateLimit({
    store: new RedisStore({
      // @ts-expect-error - Known issue: the option exists, but it's not in the TypeScript definition
      sendCommand: (...args) => getRedisClient().sendCommand(args),
      prefix: 'user_limit:',
    }),
    windowMs: windowMinutes * 60 * 1000,
    max: maxRequests,
    message: 'User rate limit exceeded, please try again later.',
    keyGenerator: (req) => {
      // Use user ID if authenticated, otherwise IP
      return req.user ? req.user._id.toString() : req.ip;
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
};

// Order creation rate limiter (per user)
exports.orderLimiter = rateLimit({
  store: new RedisStore({
    // @ts-expect-error - Known issue: the option exists, but it's not in the TypeScript definition
    sendCommand: (...args) => getRedisClient().sendCommand(args),
    prefix: 'order_limit:',
  }),
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // limit to 10 orders per hour per user
  message: 'Too many orders placed, please try again later.',
  keyGenerator: (req) => {
    return req.user ? req.user._id.toString() : req.ip;
  },
  standardHeaders: true,
  legacyHeaders: false,
});

