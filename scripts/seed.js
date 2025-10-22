require('dotenv').config();
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const User = require('../models/User');
const Restaurant = require('../models/Restaurant');
const MenuItem = require('../models/MenuItem');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB Connected');
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
};

const seedData = async () => {
  try {
    // Clear existing data
    console.log('Clearing existing data...');
    await User.deleteMany({});
    await Restaurant.deleteMany({});
    await MenuItem.deleteMany({});

    console.log('Creating sample data...');

    // Create Restaurant Owners
    const pizzaPalaceTenantId = uuidv4();
    const burgerHubTenantId = uuidv4();
    const sushiWorldTenantId = uuidv4();

    const pizzaPalaceOwner = await User.create({
      name: 'Pizza Palace',
      email: 'pizza@example.com',
      password: 'password123',
      role: 'restaurant',
      tenantId: pizzaPalaceTenantId,
      isVerified: true,
      phone: '(555) 123-4567',
    });

    const burgerHubOwner = await User.create({
      name: 'Burger Hub',
      email: 'burger@example.com',
      password: 'password123',
      role: 'restaurant',
      tenantId: burgerHubTenantId,
      isVerified: true,
      phone: '(555) 234-5678',
    });

    const sushiWorldOwner = await User.create({
      name: 'Sushi World',
      email: 'sushi@example.com',
      password: 'password123',
      role: 'restaurant',
      tenantId: sushiWorldTenantId,
      isVerified: true,
      phone: '(555) 345-6789',
    });

    // Create Customers
    await User.create({
      name: 'John Doe',
      email: 'john@example.com',
      password: 'password123',
      role: 'customer',
      isVerified: true,
      phone: '(555) 111-2222',
      address: {
        street: '123 Main St',
        city: 'Boston',
        state: 'MA',
        zipCode: '02101',
      },
    });

    await User.create({
      name: 'Jane Smith',
      email: 'jane@example.com',
      password: 'password123',
      role: 'customer',
      isVerified: true,
      phone: '(555) 222-3333',
      address: {
        street: '456 Oak Ave',
        city: 'Boston',
        state: 'MA',
        zipCode: '02102',
      },
    });

    // Create Restaurants
    const pizzaPalace = await Restaurant.create({
      tenantId: pizzaPalaceTenantId,
      name: 'Pizza Palace',
      ownerId: pizzaPalaceOwner._id,
      description: 'Authentic Italian pizzas made with fresh ingredients',
      cuisine: ['Italian', 'Pizza'],
      address: {
        street: '789 Pizza Lane',
        city: 'Boston',
        state: 'MA',
        zipCode: '02103',
        coordinates: { lat: 42.3601, lng: -71.0589 },
      },
      phone: '(555) 123-4567',
      email: 'pizza@example.com',
      rating: 4.5,
      totalReviews: 245,
      isActive: true,
      deliveryFee: 3.99,
      minimumOrder: 15.00,
      estimatedDeliveryTime: 30,
    });

    const burgerHub = await Restaurant.create({
      tenantId: burgerHubTenantId,
      name: 'Burger Hub',
      ownerId: burgerHubOwner._id,
      description: 'Gourmet burgers and classic American favorites',
      cuisine: ['American', 'Burgers'],
      address: {
        street: '321 Burger Blvd',
        city: 'Boston',
        state: 'MA',
        zipCode: '02104',
        coordinates: { lat: 42.3611, lng: -71.0570 },
      },
      phone: '(555) 234-5678',
      email: 'burger@example.com',
      rating: 4.3,
      totalReviews: 189,
      isActive: true,
      deliveryFee: 2.99,
      minimumOrder: 10.00,
      estimatedDeliveryTime: 25,
    });

    const sushiWorld = await Restaurant.create({
      tenantId: sushiWorldTenantId,
      name: 'Sushi World',
      ownerId: sushiWorldOwner._id,
      description: 'Fresh sushi and Japanese cuisine',
      cuisine: ['Japanese', 'Sushi'],
      address: {
        street: '555 Sushi Street',
        city: 'Boston',
        state: 'MA',
        zipCode: '02105',
        coordinates: { lat: 42.3591, lng: -71.0598 },
      },
      phone: '(555) 345-6789',
      email: 'sushi@example.com',
      rating: 4.7,
      totalReviews: 312,
      isActive: true,
      deliveryFee: 4.99,
      minimumOrder: 20.00,
      estimatedDeliveryTime: 35,
    });

    // Create Menu Items for Pizza Palace
    await MenuItem.create([
      {
        tenantId: pizzaPalaceTenantId,
        restaurantId: pizzaPalace._id,
        name: 'Margherita Pizza',
        description: 'Classic pizza with tomato, mozzarella, and basil',
        category: 'main',
        price: 14.99,
        isAvailable: true,
        isVegetarian: true,
        preparationTime: 20,
      },
      {
        tenantId: pizzaPalaceTenantId,
        restaurantId: pizzaPalace._id,
        name: 'Pepperoni Pizza',
        description: 'Traditional pepperoni pizza with extra cheese',
        category: 'main',
        price: 16.99,
        isAvailable: true,
        preparationTime: 20,
      },
      {
        tenantId: pizzaPalaceTenantId,
        restaurantId: pizzaPalace._id,
        name: 'Garlic Bread',
        description: 'Crispy bread with garlic butter and herbs',
        category: 'appetizer',
        price: 5.99,
        isAvailable: true,
        isVegetarian: true,
        preparationTime: 10,
      },
      {
        tenantId: pizzaPalaceTenantId,
        restaurantId: pizzaPalace._id,
        name: 'Tiramisu',
        description: 'Classic Italian dessert',
        category: 'dessert',
        price: 7.99,
        isAvailable: true,
        isVegetarian: true,
        preparationTime: 5,
      },
    ]);

    // Create Menu Items for Burger Hub
    await MenuItem.create([
      {
        tenantId: burgerHubTenantId,
        restaurantId: burgerHub._id,
        name: 'Classic Cheeseburger',
        description: 'Angus beef patty with cheddar, lettuce, and tomato',
        category: 'main',
        price: 12.99,
        isAvailable: true,
        preparationTime: 15,
      },
      {
        tenantId: burgerHubTenantId,
        restaurantId: burgerHub._id,
        name: 'Bacon BBQ Burger',
        description: 'Beef patty with bacon, BBQ sauce, and onion rings',
        category: 'main',
        price: 15.99,
        isAvailable: true,
        preparationTime: 18,
      },
      {
        tenantId: burgerHubTenantId,
        restaurantId: burgerHub._id,
        name: 'French Fries',
        description: 'Crispy golden fries',
        category: 'side',
        price: 4.99,
        isAvailable: true,
        isVegetarian: true,
        preparationTime: 10,
      },
      {
        tenantId: burgerHubTenantId,
        restaurantId: burgerHub._id,
        name: 'Milkshake',
        description: 'Creamy vanilla milkshake',
        category: 'beverage',
        price: 5.99,
        isAvailable: true,
        isVegetarian: true,
        preparationTime: 5,
      },
    ]);

    // Create Menu Items for Sushi World
    await MenuItem.create([
      {
        tenantId: sushiWorldTenantId,
        restaurantId: sushiWorld._id,
        name: 'California Roll',
        description: 'Crab, avocado, and cucumber',
        category: 'main',
        price: 10.99,
        isAvailable: true,
        preparationTime: 15,
      },
      {
        tenantId: sushiWorldTenantId,
        restaurantId: sushiWorld._id,
        name: 'Spicy Tuna Roll',
        description: 'Fresh tuna with spicy mayo',
        category: 'main',
        price: 13.99,
        isAvailable: true,
        spicyLevel: 2,
        preparationTime: 15,
      },
      {
        tenantId: sushiWorldTenantId,
        restaurantId: sushiWorld._id,
        name: 'Edamame',
        description: 'Steamed soybeans with sea salt',
        category: 'appetizer',
        price: 5.99,
        isAvailable: true,
        isVegetarian: true,
        isVegan: true,
        preparationTime: 5,
      },
      {
        tenantId: sushiWorldTenantId,
        restaurantId: sushiWorld._id,
        name: 'Miso Soup',
        description: 'Traditional Japanese soup',
        category: 'appetizer',
        price: 3.99,
        isAvailable: true,
        isVegetarian: true,
        preparationTime: 5,
      },
    ]);

    console.log('\n✅ Sample data created successfully!');
    console.log('\n📋 Test Credentials:');
    console.log('\nRestaurant Accounts:');
    console.log('  Pizza Palace:');
    console.log('    Email: pizza@example.com');
    console.log('    Password: password123');
    console.log('    Tenant ID:', pizzaPalaceTenantId);
    console.log('\n  Burger Hub:');
    console.log('    Email: burger@example.com');
    console.log('    Password: password123');
    console.log('    Tenant ID:', burgerHubTenantId);
    console.log('\n  Sushi World:');
    console.log('    Email: sushi@example.com');
    console.log('    Password: password123');
    console.log('    Tenant ID:', sushiWorldTenantId);
    console.log('\nCustomer Accounts:');
    console.log('  Email: john@example.com / Password: password123');
    console.log('  Email: jane@example.com / Password: password123');

    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
};

connectDB().then(() => seedData());

