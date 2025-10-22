# ⚡ Quick Start Guide

Get the Food Delivery System running in 5 minutes!

## Prerequisites Check

```bash
# Check Node.js (need v16+)
node --version

# Check MongoDB (should be running)
# Windows: net start MongoDB
# Mac/Linux: sudo systemctl status mongod

# Check Redis (in WSL or locally)
redis-cli ping  # Should return PONG

# Check Kafka (in WSL)
# Start Zookeeper: bin/zookeeper-server-start.sh config/zookeeper.properties
# Start Kafka: bin/kafka-server-start.sh config/server.properties
```

## Installation (2 minutes)

```bash
# 1. Install dependencies
npm install

# 2. Create Kafka topic (in WSL Kafka directory)
bin/kafka-topics.sh --create --topic order-events --bootstrap-server localhost:9092 --partitions 3 --replication-factor 1

# 3. Seed database with sample data
npm run seed
```

**📝 IMPORTANT: Save the tenant IDs displayed after seeding!**

## Start the Application (1 minute)

### Terminal 1: Main Server
```bash
npm start
```

### Terminal 2: Kafka Consumer
```bash
npm run kafka-consumer
```

## Test It! (2 minutes)

### 1. Login as a Restaurant Owner

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "pizza@example.com",
    "password": "password123"
  }'
```

**Save the `token` from the response!**

### 2. Login as a Customer

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "password123"
  }'
```

**Save this `token` too!**

### 3. Get Restaurants

```bash
curl http://localhost:3000/api/restaurants
```

**Copy a `restaurantId` from the response!**

### 4. Get Menu

```bash
curl http://localhost:3000/api/restaurants/RESTAURANT_ID/menu
```

**Copy a `menuItemId` from the response!**

### 5. Create an Order

```bash
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_CUSTOMER_TOKEN" \
  -d '{
    "restaurantId": "RESTAURANT_ID_HERE",
    "items": [
      {
        "menuItemId": "MENU_ITEM_ID_HERE",
        "quantity": 2
      }
    ],
    "deliveryAddress": {
      "street": "123 Main St",
      "city": "Boston",
      "state": "MA",
      "zipCode": "02101"
    },
    "paymentMethod": "card"
  }'
```

### 6. Watch Live Updates!

1. Open browser: `http://localhost:3000/dashboard.html`
2. Enter the tenant ID (from seed script)
3. Click "Load Dashboard"
4. Create more orders and watch the metrics update in real-time! 🎉

## Quick Test with Seeded Data

The seed script creates these accounts:

### Restaurants (role: restaurant)
| Name | Email | Password | Use Case |
|------|-------|----------|----------|
| Pizza Palace | pizza@example.com | password123 | Italian restaurant |
| Burger Hub | burger@example.com | password123 | American burgers |
| Sushi World | sushi@example.com | password123 | Japanese cuisine |

### Customers (role: customer)
| Name | Email | Password |
|------|-------|----------|
| John Doe | john@example.com | password123 |
| Jane Smith | jane@example.com | password123 |

## One-Liner Test

```bash
# Login as customer
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"john@example.com","password":"password123"}' \
  | grep -o '"token":"[^"]*' | cut -d'"' -f4)

# Get restaurants
curl http://localhost:3000/api/restaurants

# Create order (replace IDs)
curl -X POST http://localhost:3000/api/orders \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"restaurantId":"RESTAURANT_ID","items":[{"menuItemId":"MENU_ITEM_ID","quantity":1}],"deliveryAddress":{"street":"123 Main St","city":"Boston","state":"MA","zipCode":"02101"},"paymentMethod":"card"}'
```

## Verify Everything Works

### ✅ Checklist

- [ ] Server running on port 3000
- [ ] Kafka consumer processing events
- [ ] Can access `http://localhost:3000`
- [ ] Can login and get JWT token
- [ ] Can fetch restaurants
- [ ] Can create orders
- [ ] Dashboard loads and shows metrics
- [ ] Real-time updates work

## Troubleshooting

### "Cannot connect to Redis"
```bash
# WSL
sudo service redis-server start

# Or use Docker
docker run -d -p 6379:6379 redis
```

### "Kafka connection failed"
```bash
# In WSL, start Zookeeper first, then Kafka
# Terminal 1:
bin/zookeeper-server-start.sh config/zookeeper.properties

# Terminal 2:
bin/kafka-server-start.sh config/server.properties
```

### "MongoDB connection failed"
```bash
# Windows
net start MongoDB

# Linux/Mac
sudo systemctl start mongod
```

### Port 3000 already in use
```bash
# Change PORT in .env file
PORT=3001
```

## What to Test Next

1. **Multi-Tenancy:**
   - Create orders for different restaurants
   - Check that metrics are isolated per tenant

2. **Real-Time Updates:**
   - Open dashboard for a tenant
   - Create orders via API
   - Watch metrics update live

3. **Rate Limiting:**
   - Try logging in with wrong credentials 10 times
   - Should get rate limited after 5 attempts

4. **Caching:**
   - Fetch restaurant menu twice
   - Second request should be faster (from cache)

5. **Kafka Events:**
   - Monitor Kafka consumer logs
   - Create an order
   - See event being processed

## Dashboard Demo

1. Get tenant ID from seed output
2. Open `http://localhost:3000/dashboard.html`
3. Enter tenant ID
4. Watch real-time metrics:
   - Total orders
   - Average prep time
   - Orders per minute chart
   - Live updates feed

## API Endpoints Summary

```
POST   /api/auth/register        - Register user
POST   /api/auth/login          - Login user
GET    /api/auth/google         - Google OAuth
GET    /api/auth/me             - Get current user

GET    /api/restaurants         - List restaurants
GET    /api/restaurants/:id     - Get restaurant
GET    /api/restaurants/:id/menu - Get menu

POST   /api/menu                - Create menu item
PUT    /api/menu/:id            - Update menu item
DELETE /api/menu/:id            - Delete menu item

POST   /api/orders              - Create order
GET    /api/orders              - List orders
GET    /api/orders/:id          - Get order
PUT    /api/orders/:id/status   - Update order status

GET    /api/metrics/:tenantId   - Get tenant metrics
```

## Next Steps

- Read [README.md](README.md) for full documentation
- Check [API_EXAMPLES.md](API_EXAMPLES.md) for more API examples
- See [SETUP_GUIDE.md](SETUP_GUIDE.md) for detailed setup

---

**You're all set! 🚀 Start building amazing features!**

