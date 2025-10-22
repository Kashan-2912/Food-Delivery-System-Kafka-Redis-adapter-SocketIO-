const mongoose = require('mongoose');

const menuItemSchema = new mongoose.Schema({
  tenantId: {
    type: String,
    required: true,
    index: true,
  },
  restaurantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: true,
  },
  name: {
    type: String,
    required: [true, 'Please provide item name'],
    trim: true,
  },
  description: {
    type: String,
  },
  category: {
    type: String,
    required: true,
    enum: ['appetizer', 'main', 'dessert', 'beverage', 'side'],
  },
  price: {
    type: Number,
    required: [true, 'Please provide price'],
    min: 0,
  },
  image: {
    type: String,
  },
  isAvailable: {
    type: Boolean,
    default: true,
  },
  isVegetarian: {
    type: Boolean,
    default: false,
  },
  isVegan: {
    type: Boolean,
    default: false,
  },
  spicyLevel: {
    type: Number,
    min: 0,
    max: 3,
    default: 0,
  },
  preparationTime: {
    type: Number, // in minutes
    default: 15,
  },
  calories: {
    type: Number,
  },
  allergens: [{
    type: String,
  }],
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Compound indexes for tenant-scoped queries
menuItemSchema.index({ tenantId: 1, restaurantId: 1 });
menuItemSchema.index({ tenantId: 1, category: 1 });
menuItemSchema.index({ tenantId: 1, isAvailable: 1 });

module.exports = mongoose.model('MenuItem', menuItemSchema);

