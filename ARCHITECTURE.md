# 🏗️ System Architecture

## Overview

The Food Delivery System is built on a **multi-tenant microservices architecture** with real-time capabilities, event-driven processing, and distributed caching.

## System Components

```
┌─────────────────────────────────────────────────────────────────┐
│                          CLIENT LAYER                            │
├─────────────────────────────────────────────────────────────────┤
│  Web Dashboard (HTML/CSS/JS)  │  Mobile/Web App (API Clients)  │
│  - Chart.js for visualization │  - REST API consumers          │
│  - Socket.IO client           │  - JWT authentication          │
└─────────────────────────────────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       APPLICATION LAYER                          │
├─────────────────────────────────────────────────────────────────┤
│                      Express.js Server                           │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Security Middleware                                       │  │
│  │ - Helmet (security headers)                              │  │
│  │ - CORS (cross-origin)                                    │  │
│  │ - express-mongo-sanitize (injection protection)          │  │
│  │ - express-validator (input validation)                   │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Authentication                                            │  │
│  │ - JWT Strategy (stateless tokens)                        │  │
│  │ - Google OAuth 2.0 (SSO)                                │  │
│  │ - Passport.js                                            │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Rate Limiting                                             │  │
│  │ - Redis-backed rate limiter                              │  │
│  │ - Per-IP limiting                                        │  │
│  │ - Per-user limiting                                      │  │
│  │ - Per-tenant limiting                                    │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ API Routes                                                │  │
│  │ /api/auth       - Authentication endpoints               │  │
│  │ /api/restaurants - Restaurant CRUD                       │  │
│  │ /api/menu       - Menu management                        │  │
│  │ /api/orders     - Order processing                       │  │
│  │ /api/metrics    - Analytics & metrics                    │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    REAL-TIME LAYER                               │
├─────────────────────────────────────────────────────────────────┤
│                      Socket.IO Server                            │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Redis Adapter (for horizontal scaling)                   │  │
│  │ - Pub/Sub for multi-server support                       │  │
│  │ - Shared session state                                   │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Event Namespaces & Rooms                                  │  │
│  │ - tenant:{tenantId} - Restaurant-specific updates        │  │
│  │ - user:{userId}     - Personal notifications             │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    EVENT STREAMING LAYER                         │
├─────────────────────────────────────────────────────────────────┤
│                      Apache Kafka                                │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Topics                                                    │  │
│  │ - order-events (3 partitions)                            │  │
│  │   * Partitioned by tenantId for isolation                │  │
│  │   * Events: order_created, order_status_updated          │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────┐              ┌──────────────────────────┐    │
│  │  Producer    │              │  Consumer Group          │    │
│  │  (API layer) │──events────▶│  - Metrics Aggregator    │    │
│  │              │              │  - Analytics Processor   │    │
│  └──────────────┘              └──────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      CACHING LAYER                               │
├─────────────────────────────────────────────────────────────────┤
│                          Redis                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Cache Keys (tenant-scoped)                                │  │
│  │ - tenant:{tenantId}:restaurants                          │  │
│  │ - tenant:{tenantId}:menu:{restaurantId}                  │  │
│  │ - tenant:{tenantId}:metrics:*                            │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Session Store                                             │  │
│  │ - session:{sessionId}                                    │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Rate Limit Counters                                       │  │
│  │ - tenant_limit:{tenantId}                                │  │
│  │ - user_limit:{userId}                                    │  │
│  │ - order_limit:{userId}                                   │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Metrics Storage                                           │  │
│  │ - metrics:{tenantId}:total_orders                        │  │
│  │ - metrics:{tenantId}:avg_prep_time                       │  │
│  │ - metrics:{tenantId}:orders_per_minute:{timestamp}       │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     PERSISTENCE LAYER                            │
├─────────────────────────────────────────────────────────────────┤
│                        MongoDB                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Collections                                               │  │
│  │                                                           │  │
│  │ users                                                     │  │
│  │ ├─ _id, email, password, role, tenantId                 │  │
│  │ └─ Indexes: email (unique), tenantId                    │  │
│  │                                                           │  │
│  │ restaurants                                               │  │
│  │ ├─ _id, tenantId (unique), name, ownerId                │  │
│  │ └─ Indexes: tenantId (unique), ownerId                  │  │
│  │                                                           │  │
│  │ menuitems                                                 │  │
│  │ ├─ _id, tenantId, restaurantId, name, price             │  │
│  │ └─ Indexes: {tenantId, restaurantId}, {tenantId, cat}   │  │
│  │                                                           │  │
│  │ orders                                                    │  │
│  │ ├─ _id, tenantId, restaurantId, customerId, items       │  │
│  │ └─ Indexes: {tenantId, createdAt}, {tenantId, status}   │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow

### 1. Order Creation Flow

```
Customer ──POST /api/orders──▶ API Server
                                    │
                                    ├─▶ Validate JWT
                                    ├─▶ Validate input
                                    ├─▶ Check rate limit (Redis)
                                    │
                                    ├─▶ Get restaurant (check cache)
                                    │   ├─ Cache hit ✓
                                    │   └─ Cache miss → MongoDB → Cache
                                    │
                                    ├─▶ Validate menu items (check cache)
                                    ├─▶ Calculate totals
                                    │
                                    ├─▶ Save order to MongoDB
                                    │
                                    ├─▶ Publish to Kafka
                                    │   Topic: order-events
                                    │   Key: tenantId
                                    │   Event: order_created
                                    │
                                    └─▶ Emit Socket.IO event
                                        Room: tenant:{tenantId}
                                        Event: order:created
                                    
Kafka Consumer ◀──────────────────┘
    │
    ├─▶ Increment order count (Redis)
    │   Key: metrics:{tenantId}:orders_per_minute:{timestamp}
    │
    ├─▶ Update total orders (Redis)
    │   Key: metrics:{tenantId}:total_orders
    │
    └─▶ Emit metrics update (Socket.IO)
        Room: tenant:{tenantId}
        Event: metrics:update

Dashboard ◀───Socket.IO───────┘
    │
    └─▶ Update charts in real-time
```

### 2. Menu Fetch Flow (with caching)

```
Client ──GET /api/restaurants/:id/menu──▶ API Server
                                              │
                                              ├─▶ Get restaurant
                                              │
                                              ├─▶ Check cache
                                              │   Key: tenant:{tenantId}:menu:{restaurantId}
                                              │
                                              ├─ Cache HIT ✓
                                              │   └─▶ Return cached data (fast)
                                              │
                                              └─ Cache MISS
                                                  ├─▶ Query MongoDB
                                                  ├─▶ Store in cache (TTL: 30 min)
                                                  └─▶ Return data
```

### 3. Authentication Flow

```
Client ──POST /api/auth/login──▶ API Server
                                     │
                                     ├─▶ Rate limit check (Redis)
                                     │   Key: auth_limit:{ip}
                                     │   Max: 5 attempts / 15 min
                                     │
                                     ├─▶ Find user in MongoDB
                                     ├─▶ Validate password (bcrypt)
                                     │
                                     ├─▶ Generate JWT token
                                     │   Payload: {id, role, tenantId}
                                     │   Expiry: 7 days
                                     │
                                     ├─▶ Set secure cookie
                                     │   httpOnly: true
                                     │   secure: production
                                     │   sameSite: strict
                                     │
                                     └─▶ Return token + user data
```

## Multi-Tenancy Implementation

### Tenant Isolation Strategies

1. **Data Isolation:**
   - Each restaurant has a unique `tenantId` (UUID)
   - All queries filter by `tenantId`
   - Compound indexes: `{tenantId, otherField}`

2. **Cache Isolation:**
   - Cache keys prefixed with tenant ID
   - Pattern: `tenant:{tenantId}:resource`
   - Prevents cross-tenant data leakage

3. **Event Isolation:**
   - Kafka messages keyed by `tenantId`
   - Ensures events partition by tenant
   - Maintains order within tenant

4. **Rate Limit Isolation:**
   - Separate counters per tenant
   - Pattern: `tenant_limit:{tenantId}`
   - Prevents one tenant from affecting others

5. **Real-time Isolation:**
   - Socket.IO rooms per tenant
   - Room pattern: `tenant:{tenantId}`
   - Updates only broadcast to tenant's clients

### Tenant Access Control

```javascript
// Middleware chain for tenant-scoped operations
app.post('/api/menu',
  protect,                    // Verify JWT
  authorize('restaurant'),    // Check role
  extractTenantId,           // Get tenant ID from header/user
  validateTenantAccess,      // Verify user owns tenant
  tenantLimiter(),           // Apply tenant rate limit
  async (req, res) => {
    // All DB queries use req.tenantId
    const items = await MenuItem.find({ tenantId: req.tenantId });
  }
);
```

## Security Architecture

### Defense in Depth

1. **Network Layer:**
   - CORS configured for allowed origins
   - Helmet.js security headers
   - HTTPS in production

2. **Application Layer:**
   - Input validation (express-validator)
   - MongoDB injection prevention (mongo-sanitize)
   - Rate limiting (multi-level)

3. **Authentication Layer:**
   - JWT with strong secret
   - Password hashing (bcrypt)
   - OAuth 2.0 (Google)

4. **Session Layer:**
   - Secure cookies
   - Redis-backed sessions
   - Session expiry

5. **Data Layer:**
   - Tenant isolation
   - Access control middleware
   - Prepared queries (Mongoose)

## Scalability Considerations

### Horizontal Scaling

1. **Application Servers:**
   - Stateless design (JWT, not sessions for API)
   - Multiple instances behind load balancer
   - Socket.IO with Redis adapter for multi-server

2. **Kafka:**
   - Partitioned by tenant ID
   - Consumer groups for parallel processing
   - Can add more partitions as tenants grow

3. **Redis:**
   - Redis Cluster for high availability
   - Separate instances for cache vs. session
   - Replication for read scaling

4. **MongoDB:**
   - Replica sets for HA
   - Sharding by tenant ID
   - Read preference for scaling reads

### Performance Optimizations

1. **Caching Strategy:**
   - Cache hot data (menus, restaurants)
   - TTL-based expiration
   - Cache invalidation on updates

2. **Database Optimization:**
   - Compound indexes for tenant queries
   - Projection to limit fields
   - Pagination for large result sets

3. **Event Processing:**
   - Async event publishing
   - Batched metric updates
   - Non-blocking I/O

## Monitoring & Observability

### Key Metrics to Track

1. **Application Metrics:**
   - Request rate
   - Response time (p50, p95, p99)
   - Error rate

2. **Business Metrics:**
   - Orders per minute (per tenant)
   - Average preparation time
   - Total orders

3. **System Metrics:**
   - CPU/Memory usage
   - Redis cache hit ratio
   - Kafka consumer lag
   - MongoDB query performance

### Logging Strategy

1. **Application Logs:**
   - Structured logging (JSON)
   - Log levels (error, warn, info, debug)
   - Request/response logging

2. **Event Logs:**
   - Kafka event processing
   - Order lifecycle events
   - Metrics updates

3. **Security Logs:**
   - Authentication attempts
   - Rate limit violations
   - Access control failures

## Technology Choices

| Component | Technology | Reason |
|-----------|-----------|--------|
| **Runtime** | Node.js | Event-driven, non-blocking I/O |
| **Framework** | Express.js | Mature, extensive middleware ecosystem |
| **Database** | MongoDB | Flexible schema, good for multi-tenant |
| **Cache** | Redis | Fast, versatile (cache + sessions + rate limiting) |
| **Message Queue** | Kafka | High throughput, partitioning, durability |
| **Real-time** | Socket.IO | WebSocket abstraction, Redis adapter |
| **Auth** | JWT + Passport | Stateless, scalable |
| **Validation** | express-validator | Comprehensive, sanitization |
| **Security** | Helmet | Standard security headers |

## Future Enhancements

1. **Microservices Split:**
   - Order Service
   - Restaurant Service
   - Notification Service
   - Analytics Service

2. **Advanced Features:**
   - GraphQL API
   - Real-time delivery tracking
   - ML-based delivery time prediction
   - A/B testing framework

3. **Infrastructure:**
   - Docker containerization
   - Kubernetes orchestration
   - CI/CD pipeline
   - Infrastructure as Code (Terraform)

4. **Observability:**
   - Distributed tracing (Jaeger)
   - Metrics (Prometheus + Grafana)
   - Log aggregation (ELK stack)
   - APM (New Relic, DataDog)

---

**Architecture designed for scalability, security, and maintainability! 🚀**

