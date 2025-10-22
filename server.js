require('dotenv').config();
const express = require('express');
const http = require('http');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const RedisStore = require('connect-redis').default;
const mongoSanitize = require('express-mongo-sanitize');
const passport = require('./config/passport');
const connectDB = require('./config/database');
const { connectRedis, getRedisClient } = require('./config/redis');
const { initProducer } = require('./kafka/producer');
const { initSocketServer } = require('./socket/socketServer');
const { metricsAggregator } = require('./kafka/consumer');

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Connect to Database
connectDB();

// Initialize Redis
let redisStore;
connectRedis()
  .then((client) => {
    redisStore = new RedisStore({
      client: client,
      prefix: 'session:',
    });
    console.log('Redis store initialized for sessions');
  })
  .catch((err) => {
    console.error('Failed to connect to Redis:', err);
  });

// Initialize Kafka Producer
initProducer().catch((err) => {
  console.error('Failed to initialize Kafka producer:', err);
});

// Initialize Metrics Aggregator
metricsAggregator.initialize().catch((err) => {
  console.error('Failed to initialize metrics aggregator:', err);
});

// Security Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      connectSrc: ["'self'", "https://cdn.jsdelivr.net", "ws://localhost:3000", "http://localhost:3000"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
      scriptSrcAttr: ["'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// CORS Configuration
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));

// Body Parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Cookie Parser
app.use(cookieParser());

// Express Session with Redis Store
app.use(
  session({
    store: redisStore,
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
      sameSite: 'strict',
    },
  })
);

// Passport Middleware
app.use(passport.initialize());
app.use(passport.session());

// Sanitize data to prevent MongoDB injection
app.use(mongoSanitize());

// Static files (for dashboard)
app.use(express.static('public'));

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/restaurants', require('./routes/restaurants'));
app.use('/api/menu', require('./routes/menu'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/metrics', require('./routes/metrics'));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>Food Delivery API</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 50px auto;
            padding: 20px;
            background-color: #f5f5f5;
          }
          .container {
            background: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          }
          h1 { color: #333; }
          .endpoint { 
            background: #f9f9f9; 
            padding: 10px; 
            margin: 10px 0;
            border-left: 4px solid #4CAF50;
          }
          a { color: #4CAF50; text-decoration: none; }
          a:hover { text-decoration: underline; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>🍕 Food Delivery API</h1>
          <p>Welcome to the Multi-Tenant Food Delivery System API</p>
          
          <h2>Available Endpoints:</h2>
          <div class="endpoint">
            <strong>GET /health</strong> - Health check
          </div>
          <div class="endpoint">
            <strong>POST /api/auth/register</strong> - Register new user
          </div>
          <div class="endpoint">
            <strong>POST /api/auth/login</strong> - Login user
          </div>
          <div class="endpoint">
            <strong>GET /api/auth/google</strong> - Google OAuth login
          </div>
          <div class="endpoint">
            <strong>GET /api/restaurants</strong> - Get restaurants
          </div>
          <div class="endpoint">
            <strong>GET /api/restaurants/:id/menu</strong> - Get restaurant menu
          </div>
          <div class="endpoint">
            <strong>POST /api/orders</strong> - Create order (requires auth)
          </div>
          <div class="endpoint">
            <strong>GET /api/metrics/:tenantId</strong> - Get tenant metrics
          </div>
          
          <h2>Live Dashboard:</h2>
          <p><a href="/dashboard.html">📊 Open Live Metrics Dashboard</a></p>
          
          <h2>Features:</h2>
          <ul>
            <li>✅ JWT & Google OAuth Authentication</li>
            <li>✅ Multi-tenant architecture</li>
            <li>✅ Redis caching & session management</li>
            <li>✅ Rate limiting per tenant & user</li>
            <li>✅ Kafka event streaming</li>
            <li>✅ Real-time updates via Socket.IO</li>
            <li>✅ Live metrics aggregation</li>
          </ul>
        </div>
      </body>
    </html>
  `);
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

// Error Handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err : {},
  });
});

// Start Server
const PORT = process.env.PORT || 3000;

server.listen(PORT, async () => {
  console.log(`
╔═══════════════════════════════════════════════════════╗
║                                                       ║
║     🍕 Food Delivery System - Multi-Tenant API       ║
║                                                       ║
║     Server running on port ${PORT}                      ║
║     Environment: ${process.env.NODE_ENV || 'development'}                       ║
║                                                       ║
║     API: http://localhost:${PORT}                       ║
║     Dashboard: http://localhost:${PORT}/dashboard.html  ║
║                                                       ║
╚═══════════════════════════════════════════════════════╝
  `);

  // Initialize Socket.IO
  try {
    await initSocketServer(server);
    console.log('✅ Socket.IO server initialized');
  } catch (error) {
    console.error('❌ Failed to initialize Socket.IO:', error);
  }
});

// Graceful Shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  server.close(async () => {
    console.log('Server closed');
    
    try {
      const redisClient = getRedisClient();
      await redisClient.quit();
      console.log('Redis connection closed');
    } catch (error) {
      console.error('Error closing Redis:', error);
    }
    
    process.exit(0);
  });
});

module.exports = { app, server };

