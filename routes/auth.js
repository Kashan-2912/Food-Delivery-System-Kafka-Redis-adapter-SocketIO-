const express = require('express');
const passport = require('passport');
const { v4: uuidv4 } = require('uuid');
const User = require('../models/User');
const Restaurant = require('../models/Restaurant');
const { validateRegister, validateLogin, validate } = require('../middleware/validation');
const { authLimiter } = require('../middleware/rateLimiter');
const { generateToken, sendTokenResponse } = require('../utils/jwt');

const router = express.Router();

// @route   POST /api/auth/register
// @desc    Register new user
// @access  Public
router.post('/register', authLimiter, validateRegister, validate, async (req, res) => {
  try {
    const { name, email, password, role, phone, address } = req.body;

    // Check if user exists
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email',
      });
    }

    // Generate tenant ID for restaurants
    let tenantId = null;
    if (role === 'restaurant') {
      tenantId = uuidv4();
    }

    // Create user
    user = await User.create({
      name,
      email,
      password,
      role: role || 'customer',
      tenantId,
      phone,
      address,
      isVerified: true, // Auto-verify for demo purposes
    });

    // If restaurant, create restaurant entry
    if (role === 'restaurant') {
      await Restaurant.create({
        tenantId,
        name,
        ownerId: user._id,
        email,
        phone,
        address,
      });
    }

    sendTokenResponse(user, 201, res);
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during registration',
      error: error.message,
    });
  }
});

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', authLimiter, validateLogin, validate, async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user with password field
    const user = await User.findOne({ email }).select('+password');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    // Check if password exists (might not exist for OAuth users)
    if (!user.password) {
      return res.status(401).json({
        success: false,
        message: 'Please login with Google',
      });
    }

    // Validate password
    const isMatch = await user.comparePassword(password);
    
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    sendTokenResponse(user, 200, res);
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login',
      error: error.message,
    });
  }
});

// @route   GET /api/auth/google
// @desc    Google OAuth authentication
// @access  Public
router.get(
  '/google',
  passport.authenticate('google', {
    scope: ['profile', 'email'],
  })
);

// @route   GET /api/auth/google/callback
// @desc    Google OAuth callback
// @access  Public
router.get(
  '/google/callback',
  passport.authenticate('google', { 
    failureRedirect: '/login',
    session: false
  }),
  (req, res) => {
    // Successful authentication
    const token = generateToken(req.user._id);
    
    // Redirect to frontend with token
    res.redirect(`${process.env.FRONTEND_URL}/auth-success.html?token=${token}`);
  }
);

// @route   GET /api/auth/me
// @desc    Get current logged in user
// @access  Private
router.get('/me', passport.authenticate('jwt', { session: false }), async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    
    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
});

// @route   POST /api/auth/logout
// @desc    Logout user / clear cookie
// @access  Private
router.post('/logout', (req, res) => {
  res.cookie('token', 'none', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });

  res.status(200).json({
    success: true,
    message: 'User logged out successfully',
  });
});

module.exports = router;

