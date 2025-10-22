const socketIO = require('socket.io');
const { createAdapter } = require('@socket.io/redis-adapter');
const { createClient } = require('redis');
const jwt = require('jsonwebtoken');

let io;

const initSocketServer = async (server) => {
  try {
    // Initialize Socket.IO
    io = socketIO(server, {
      cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        methods: ['GET', 'POST'],
        credentials: true,
      },
      transports: ['websocket', 'polling'],
    });

    // Create Redis clients for Socket.IO adapter
    const pubClient = createClient({
      socket: {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
      },
      password: process.env.REDIS_PASSWORD || undefined,
    });

    const subClient = pubClient.duplicate();

    // Connect Redis clients
    await pubClient.connect();
    await subClient.connect();

    // Set up Redis adapter for Socket.IO (for multi-server scaling)
    io.adapter(createAdapter(pubClient, subClient));

    console.log('Socket.IO server initialized with Redis adapter');

    // Authentication middleware for Socket.IO
    io.use((socket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
        
        if (token) {
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          socket.userId = decoded.id;
        }
        
        next();
      } catch (error) {
        // Allow connection even without valid token for public dashboards
        next();
      }
    });

    // Connection handling
    io.on('connection', (socket) => {
      console.log(`Client connected: ${socket.id}`);

      // Join tenant room
      socket.on('join:tenant', (tenantId) => {
        if (tenantId) {
          socket.join(`tenant:${tenantId}`);
          console.log(`Socket ${socket.id} joined tenant room: ${tenantId}`);
          
          socket.emit('joined', {
            room: `tenant:${tenantId}`,
            message: 'Successfully joined tenant room',
          });
        }
      });

      // Join user room (for personal notifications)
      socket.on('join:user', (userId) => {
        if (userId && socket.userId === userId) {
          socket.join(`user:${userId}`);
          console.log(`Socket ${socket.id} joined user room: ${userId}`);
          
          socket.emit('joined', {
            room: `user:${userId}`,
            message: 'Successfully joined user room',
          });
        }
      });

      // Leave tenant room
      socket.on('leave:tenant', (tenantId) => {
        if (tenantId) {
          socket.leave(`tenant:${tenantId}`);
          console.log(`Socket ${socket.id} left tenant room: ${tenantId}`);
        }
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        console.log(`Client disconnected: ${socket.id}`);
      });

      // Handle errors
      socket.on('error', (error) => {
        console.error(`Socket error for ${socket.id}:`, error);
      });
    });

    return io;
  } catch (error) {
    console.error('Error initializing Socket.IO server:', error);
    throw error;
  }
};

const getIO = () => {
  if (!io) {
    throw new Error('Socket.IO not initialized. Call initSocketServer first.');
  }
  return io;
};

// Emit metrics update to tenant room
const emitMetricsUpdate = (tenantId, metrics) => {
  if (io) {
    io.to(`tenant:${tenantId}`).emit('metrics:update', metrics);
  }
};

// Emit order update to tenant room
const emitOrderUpdate = (tenantId, orderData) => {
  if (io) {
    io.to(`tenant:${tenantId}`).emit('order:update', orderData);
  }
};

module.exports = {
  initSocketServer,
  getIO,
  emitMetricsUpdate,
  emitOrderUpdate,
};

