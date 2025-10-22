# 🔧 API Testing Examples

## Quick Test Commands

### 1. Register Restaurant Owner

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Restaurant",
    "email": "myrestaurant@example.com",
    "password": "password123",
    "role": "restaurant",
    "phone": "(555) 999-8888",
    "address": {
      "street": "100 Food Street",
      "city": "Boston",
      "state": "MA",
      "zipCode": "02106"
    }
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "...",
    "name": "My Restaurant",
    "email": "myrestaurant@example.com",
    "role": "restaurant",
    "tenantId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
  }
}
```

**⚠️ SAVE THE `tenantId` - You'll need it for the dashboard!**

### 2. Register Customer

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Alice Johnson",
    "email": "alice@example.com",
    "password": "password123",
    "role": "customer",
    "phone": "(555) 444-5555",
    "address": {
      "street": "200 Customer Lane",
      "city": "Boston",
      "state": "MA",
      "zipCode": "02107"
    }
  }'
```

### 3. Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "alice@example.com",
    "password": "password123"
  }'
```

**⚠️ SAVE THE `token` from response!**

### 4. Get Current User Info

```bash
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE"
```

### 5. Get All Restaurants

```bash
curl http://localhost:3000/api/restaurants
```

**With pagination and filters:**
```bash
curl "http://localhost:3000/api/restaurants?page=1&limit=5&city=Boston"
```

### 6. Get Restaurant by ID

```bash
curl http://localhost:3000/api/restaurants/RESTAURANT_ID_HERE
```

### 7. Get Restaurant Menu

```bash
curl http://localhost:3000/api/restaurants/RESTAURANT_ID_HERE/menu
```

### 8. Create Menu Item (Restaurant Owner Only)

```bash
curl -X POST http://localhost:3000/api/menu \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_RESTAURANT_JWT_TOKEN" \
  -H "x-tenant-id: YOUR_TENANT_ID" \
  -d '{
    "restaurantId": "YOUR_RESTAURANT_ID",
    "name": "Deluxe Pizza",
    "description": "Our signature pizza with premium toppings",
    "category": "main",
    "price": 18.99,
    "isAvailable": true,
    "isVegetarian": false,
    "preparationTime": 25
  }'
```

### 9. Update Menu Item

```bash
curl -X PUT http://localhost:3000/api/menu/MENU_ITEM_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_RESTAURANT_JWT_TOKEN" \
  -H "x-tenant-id: YOUR_TENANT_ID" \
  -d '{
    "name": "Deluxe Pizza - Updated",
    "price": 19.99,
    "isAvailable": true,
    "category": "main"
  }'
```

### 10. Create Order (Customer)

```bash
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_CUSTOMER_JWT_TOKEN" \
  -d '{
    "restaurantId": "RESTAURANT_ID_HERE",
    "items": [
      {
        "menuItemId": "MENU_ITEM_ID_1",
        "quantity": 2,
        "specialInstructions": "Extra cheese please"
      },
      {
        "menuItemId": "MENU_ITEM_ID_2",
        "quantity": 1
      }
    ],
    "deliveryAddress": {
      "street": "200 Customer Lane",
      "city": "Boston",
      "state": "MA",
      "zipCode": "02107"
    },
    "paymentMethod": "card",
    "notes": "Please ring doorbell"
  }'
```

### 11. Get Orders (User-specific)

```bash
# Customer sees their orders
curl -X GET http://localhost:3000/api/orders \
  -H "Authorization: Bearer YOUR_CUSTOMER_JWT_TOKEN"

# Restaurant sees orders for their tenant
curl -X GET http://localhost:3000/api/orders \
  -H "Authorization: Bearer YOUR_RESTAURANT_JWT_TOKEN"
```

**With filters:**
```bash
curl -X GET "http://localhost:3000/api/orders?status=pending&page=1&limit=10" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 12. Get Single Order

```bash
curl -X GET http://localhost:3000/api/orders/ORDER_ID_HERE \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 13. Update Order Status (Restaurant Owner)

```bash
curl -X PUT http://localhost:3000/api/orders/ORDER_ID_HERE/status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_RESTAURANT_JWT_TOKEN" \
  -d '{
    "status": "preparing"
  }'
```

**Order Status Flow:**
- `pending` → `confirmed` → `preparing` → `ready` → `out_for_delivery` → `delivered`
- Or: `cancelled` at any point

### 14. Get Tenant Metrics

```bash
curl http://localhost:3000/api/metrics/YOUR_TENANT_ID
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "tenantId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "totalOrders": 15,
    "avgPrepTime": 18.5,
    "ordersPerMinute": [
      { "minute": "2024-10-22T10:00:00Z", "count": 2 },
      { "minute": "2024-10-22T10:01:00Z", "count": 3 }
    ],
    "lastUpdated": "2024-10-22T10:05:00Z"
  }
}
```

### 15. Get Orders Per Minute

```bash
curl "http://localhost:3000/api/metrics/YOUR_TENANT_ID/orders-per-minute?minutes=10"
```

## Testing Workflow

### Complete Test Scenario

```bash
# 1. Register a restaurant
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Pizza Place","email":"pizza@test.com","password":"pass123","role":"restaurant"}'
# Save: TENANT_ID, RESTAURANT_TOKEN, RESTAURANT_ID

# 2. Register a customer
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Customer","email":"customer@test.com","password":"pass123","role":"customer"}'
# Save: CUSTOMER_TOKEN

# 3. Create menu items (as restaurant)
curl -X POST http://localhost:3000/api/menu \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer RESTAURANT_TOKEN" \
  -H "x-tenant-id: TENANT_ID" \
  -d '{"restaurantId":"RESTAURANT_ID","name":"Pizza","category":"main","price":15.99}'
# Save: MENU_ITEM_ID

# 4. Create order (as customer)
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer CUSTOMER_TOKEN" \
  -d '{
    "restaurantId":"RESTAURANT_ID",
    "items":[{"menuItemId":"MENU_ITEM_ID","quantity":2}],
    "deliveryAddress":{"street":"123 St","city":"Boston","state":"MA","zipCode":"02101"},
    "paymentMethod":"card"
  }'
# Save: ORDER_ID

# 5. Update order status (as restaurant)
curl -X PUT http://localhost:3000/api/orders/ORDER_ID/status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer RESTAURANT_TOKEN" \
  -d '{"status":"confirmed"}'

# 6. Check metrics
curl http://localhost:3000/api/metrics/TENANT_ID

# 7. Open dashboard
# Go to: http://localhost:3000/dashboard.html
# Enter TENANT_ID and watch live updates!
```

## Using Seed Data

If you ran `npm run seed`, use these credentials:

### Restaurant Accounts

**Pizza Palace:**
- Email: `pizza@example.com`
- Password: `password123`

**Burger Hub:**
- Email: `burger@example.com`
- Password: `password123`

**Sushi World:**
- Email: `sushi@example.com`
- Password: `password123`

### Customer Accounts

- Email: `john@example.com`, Password: `password123`
- Email: `jane@example.com`, Password: `password123`

## Postman Collection

Import this into Postman for easy testing:

```json
{
  "info": {
    "name": "Food Delivery API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "variable": [
    {
      "key": "baseUrl",
      "value": "http://localhost:3000"
    },
    {
      "key": "token",
      "value": ""
    },
    {
      "key": "tenantId",
      "value": ""
    }
  ]
}
```

Save this as `food-delivery-api.postman_collection.json` and import into Postman.

## Testing Rate Limiting

```bash
# This should trigger rate limiting after 5 attempts in 15 minutes
for i in {1..10}; do
  curl -X POST http://localhost:3000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"wrong@example.com","password":"wrong"}'
  echo "\nAttempt $i"
done
```

## Testing Multi-Tenancy

```bash
# 1. Create order for Tenant A
curl -X POST http://localhost:3000/api/orders \
  -H "Authorization: Bearer CUSTOMER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"restaurantId":"RESTAURANT_A_ID",...}'

# 2. Create order for Tenant B
curl -X POST http://localhost:3000/api/orders \
  -H "Authorization: Bearer CUSTOMER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"restaurantId":"RESTAURANT_B_ID",...}'

# 3. Check metrics for each tenant separately
curl http://localhost:3000/api/metrics/TENANT_A_ID
curl http://localhost:3000/api/metrics/TENANT_B_ID

# Metrics should be isolated per tenant!
```

## Testing Socket.IO Events

Open browser console on dashboard page:

```javascript
// Connect to Socket.IO
const socket = io();

// Join tenant room
socket.emit('join:tenant', 'YOUR_TENANT_ID');

// Listen for events
socket.on('order:created', (data) => {
  console.log('New order:', data);
});

socket.on('order:updated', (data) => {
  console.log('Order updated:', data);
});

socket.on('metrics:update', (data) => {
  console.log('Metrics updated:', data);
});
```

## Health Check

```bash
curl http://localhost:3000/health
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Server is running",
  "timestamp": "2024-10-22T10:00:00.000Z"
}
```

---

**Happy Testing! 🚀**

