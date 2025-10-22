# 🚀 Complete Setup Guide

This guide will walk you through setting up the Food Delivery System from scratch.

## Step-by-Step Setup

### 1. Prerequisites Installation

#### Install Node.js
- Download and install from [nodejs.org](https://nodejs.org/)
- Verify installation: `node --version` (should be v16+)

#### Install MongoDB
- Download from [mongodb.com](https://www.mongodb.com/try/download/community)
- Start MongoDB:
  ```bash
  # Windows
  net start MongoDB

  # macOS
  brew services start mongodb-community

  # Linux
  sudo systemctl start mongod
  ```

#### Install Redis (WSL or Native)

**Option A: WSL (Windows Subsystem for Linux)**
```bash
# In WSL
sudo apt update
sudo apt install redis-server
sudo service redis-server start
```

**Option B: Native Windows**
- Download from [github.com/microsoftarchive/redis](https://github.com/microsoftarchive/redis/releases)
- Or use Docker: `docker run -d -p 6379:6379 redis`

**Verify Redis:**
```bash
redis-cli ping
# Should return: PONG
```

#### Install Kafka (WSL recommended for Windows)

**In WSL:**
```bash
# Download Kafka
wget https://downloads.apache.org/kafka/3.6.0/kafka_2.13-3.6.0.tgz
tar -xzf kafka_2.13-3.6.0.tgz
cd kafka_2.13-3.6.0

# Start Zookeeper (Terminal 1)
bin/zookeeper-server-start.sh config/zookeeper.properties

# Start Kafka (Terminal 2)
bin/kafka-server-start.sh config/server.properties
```

### 2. Project Setup

#### Clone and Install
```bash
cd food-delivery-AWT
npm install
```

#### Configure Environment
The `.env` file should already exist. Update if needed:
```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/food-delivery-awt
JWT_SECRET=your_secret_key_here
REDIS_HOST=localhost
REDIS_PORT=6379
KAFKA_BROKERS=localhost:9092
```

### 3. Create Kafka Topics

**In WSL (in Kafka directory):**
```bash
bin/kafka-topics.sh --create \
  --topic order-events \
  --bootstrap-server localhost:9092 \
  --partitions 3 \
  --replication-factor 1
```

**Verify:**
```bash
bin/kafka-topics.sh --list --bootstrap-server localhost:9092
```

### 4. Seed Database with Sample Data

```bash
node scripts/seed.js
```

This creates:
- 3 restaurant accounts with menu items
- 2 customer accounts
- Each restaurant gets a unique tenant ID

**Save the tenant IDs displayed after seeding!**

### 5. Start the Application

#### Terminal 1: Main Server
```bash
npm start
# or for development:
npm run dev
```

#### Terminal 2: Kafka Consumer
```bash
npm run kafka-consumer
```

### 6. Verify Everything is Running

1. **Check Server:**
   ```
   http://localhost:3000
   ```

2. **Check Health:**
   ```
   http://localhost:3000/health
   ```

3. **Check Dashboard:**
   ```
   http://localhost:3000/dashboard.html
   ```

## 🧪 Testing the System

### 1. Test Authentication

#### Register a Customer
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "password123",
    "role": "customer"
  }'
```

#### Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

**Save the JWT token from the response!**

### 2. Test Restaurant Endpoints

#### Get All Restaurants
```bash
curl http://localhost:3000/api/restaurants
```

#### Get Restaurant Menu
```bash
curl http://localhost:3000/api/restaurants/<restaurant_id>/menu
```

### 3. Test Order Creation

```bash
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your_jwt_token>" \
  -d '{
    "restaurantId": "<restaurant_id>",
    "items": [
      {
        "menuItemId": "<menu_item_id>",
        "quantity": 2
      }
    ],
    "deliveryAddress": {
      "street": "123 Test St",
      "city": "Boston",
      "state": "MA",
      "zipCode": "02101"
    },
    "paymentMethod": "card"
  }'
```

### 4. Test Live Dashboard

1. Open `http://localhost:3000/dashboard.html`
2. Enter a tenant ID (from seed script output)
3. Click "Load Dashboard"
4. Create orders using the API
5. Watch metrics update in real-time!

### 5. Test Real-Time Updates

**Terminal 3: Watch Kafka Messages**
```bash
# In Kafka directory
bin/kafka-console-consumer.sh \
  --topic order-events \
  --bootstrap-server localhost:9092 \
  --from-beginning
```

Now create an order and watch:
- Kafka consumer processes the event
- Metrics update in Redis
- Dashboard shows live updates via Socket.IO

## 📊 Using the Dashboard

1. **Get Tenant ID:**
   - Login as restaurant owner
   - OR use tenant ID from seed script
   - OR check restaurant data in MongoDB

2. **Load Dashboard:**
   - Enter tenant ID
   - Click "Load Dashboard"

3. **View Metrics:**
   - Total Orders
   - Average Preparation Time
   - Orders Per Minute Chart
   - Live Updates Feed

4. **Trigger Updates:**
   - Create orders via API
   - Update order status
   - Watch real-time changes!

## 🐛 Troubleshooting

### Redis Connection Issues
```bash
# Check if Redis is running
redis-cli ping

# Restart Redis (WSL)
sudo service redis-server restart
```

### Kafka Connection Issues
```bash
# Check if Kafka is running
# In Kafka directory
bin/kafka-broker-api-versions.sh --bootstrap-server localhost:9092

# Restart Kafka
bin/kafka-server-stop.sh
bin/kafka-server-start.sh config/server.properties
```

### MongoDB Connection Issues
```bash
# Check MongoDB status
# Windows
net start MongoDB

# Linux/macOS
sudo systemctl status mongod
```

### Port Already in Use
```bash
# Find and kill process using port 3000
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Linux/macOS
lsof -ti:3000 | xargs kill -9
```

## 📝 Testing Checklist

- [ ] Server starts without errors
- [ ] Kafka consumer connects successfully
- [ ] Can register new user
- [ ] Can login and receive JWT token
- [ ] Can fetch restaurants list
- [ ] Can fetch restaurant menu
- [ ] Can create order (authenticated)
- [ ] Order appears in Kafka logs
- [ ] Metrics update in Redis
- [ ] Dashboard shows live updates
- [ ] Socket.IO connects successfully
- [ ] Charts update in real-time

## 🎯 Next Steps

1. **Explore API Endpoints**
   - Try all CRUD operations
   - Test different user roles
   - Test rate limiting

2. **Monitor System**
   - Watch Kafka consumer logs
   - Check Redis keys: `redis-cli keys '*'`
   - View MongoDB data: `mongo food-delivery-awt`

3. **Extend Functionality**
   - Add more restaurants
   - Create more orders
   - Watch metrics grow!

## 📚 Additional Resources

- [Express.js Documentation](https://expressjs.com/)
- [Socket.IO Documentation](https://socket.io/docs/)
- [KafkaJS Documentation](https://kafka.js.org/)
- [Redis Documentation](https://redis.io/documentation)
- [Mongoose Documentation](https://mongoosejs.com/)

---

**Need Help?** Check the main [README.md](README.md) for more details.

