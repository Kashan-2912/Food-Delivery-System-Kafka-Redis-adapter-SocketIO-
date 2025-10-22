const { consumer, connectKafkaConsumer } = require('../config/kafka');
const { getRedisClient } = require('../config/redis');
const { connectRedis } = require('../config/redis');

// Metrics aggregation in Redis
class MetricsAggregator {
  constructor() {
    this.redisClient = null;
  }

  async initialize() {
    if (!this.redisClient) {
      this.redisClient = await connectRedis();
    }
  }

  // Get tenant-specific metrics key
  getTenantMetricsKey(tenantId, metric) {
    return `metrics:${tenantId}:${metric}`;
  }

  // Increment order count for tenant (per minute window)
  async incrementOrderCount(tenantId) {
    try {
      const now = new Date();
      const minuteKey = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}-${now.getHours()}-${now.getMinutes()}`;
      const key = this.getTenantMetricsKey(tenantId, `orders_per_minute:${minuteKey}`);
      
      await this.redisClient.incr(key);
      await this.redisClient.expire(key, 3600); // Expire after 1 hour

      // Also update total orders count
      const totalKey = this.getTenantMetricsKey(tenantId, 'total_orders');
      await this.redisClient.incr(totalKey);

      return true;
    } catch (error) {
      console.error('Error incrementing order count:', error);
      return false;
    }
  }

  // Update average preparation time
  async updatePreparationTime(tenantId, prepTime) {
    try {
      if (!prepTime || prepTime <= 0) return;

      const avgKey = this.getTenantMetricsKey(tenantId, 'avg_prep_time');
      const countKey = this.getTenantMetricsKey(tenantId, 'prep_time_count');

      // Get current average and count
      const currentAvg = parseFloat(await this.redisClient.get(avgKey) || 0);
      const currentCount = parseInt(await this.redisClient.get(countKey) || 0);

      // Calculate new average
      const newCount = currentCount + 1;
      const newAvg = ((currentAvg * currentCount) + prepTime) / newCount;

      // Store new values
      await this.redisClient.set(avgKey, newAvg.toFixed(2));
      await this.redisClient.set(countKey, newCount);

      return true;
    } catch (error) {
      console.error('Error updating preparation time:', error);
      return false;
    }
  }

  // Get orders per minute for a tenant
  async getOrdersPerMinute(tenantId, minutes = 5) {
    try {
      const results = [];
      const now = new Date();

      for (let i = 0; i < minutes; i++) {
        const time = new Date(now - i * 60 * 1000);
        const minuteKey = `${time.getFullYear()}-${time.getMonth() + 1}-${time.getDate()}-${time.getHours()}-${time.getMinutes()}`;
        const key = this.getTenantMetricsKey(tenantId, `orders_per_minute:${minuteKey}`);
        
        const count = parseInt(await this.redisClient.get(key) || 0);
        results.unshift({
          minute: time.toISOString(),
          count,
        });
      }

      return results;
    } catch (error) {
      console.error('Error getting orders per minute:', error);
      return [];
    }
  }

  // Get all metrics for a tenant
  async getTenantMetrics(tenantId) {
    try {
      const totalOrders = parseInt(await this.redisClient.get(
        this.getTenantMetricsKey(tenantId, 'total_orders')
      ) || 0);

      const avgPrepTime = parseFloat(await this.redisClient.get(
        this.getTenantMetricsKey(tenantId, 'avg_prep_time')
      ) || 0);

      const ordersPerMinute = await this.getOrdersPerMinute(tenantId, 10);

      return {
        tenantId,
        totalOrders,
        avgPrepTime,
        ordersPerMinute,
        lastUpdated: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Error getting tenant metrics:', error);
      return null;
    }
  }
}

const metricsAggregator = new MetricsAggregator();

// Process order events
const processOrderEvent = async (event) => {
  try {
    console.log(`Processing ${event.eventType} for tenant ${event.tenantId}`);

    switch (event.eventType) {
      case 'order_created':
        await metricsAggregator.incrementOrderCount(event.tenantId);
        break;

      case 'order_status_updated':
        if (event.preparationTime) {
          await metricsAggregator.updatePreparationTime(
            event.tenantId,
            event.preparationTime
          );
        }
        break;

      default:
        console.log(`Unknown event type: ${event.eventType}`);
    }
  } catch (error) {
    console.error('Error processing order event:', error);
  }
};

// Start Kafka consumer
const startConsumer = async () => {
  try {
    // Initialize metrics aggregator
    await metricsAggregator.initialize();
    console.log('Metrics aggregator initialized');

    // Connect consumer
    await connectKafkaConsumer();

    // Subscribe to topic
    await consumer.subscribe({
      topic: 'order-events',
      fromBeginning: false,
    });

    console.log('Kafka consumer subscribed to order-events topic');

    // Run consumer
    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          const event = JSON.parse(message.value.toString());
          await processOrderEvent(event);
        } catch (error) {
          console.error('Error processing message:', error);
        }
      },
    });

    console.log('Kafka consumer is running...');
  } catch (error) {
    console.error('Error starting Kafka consumer:', error);
    process.exit(1);
  }
};

// Graceful shutdown
const shutdown = async () => {
  try {
    console.log('Shutting down Kafka consumer...');
    await consumer.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Export for use in other modules
module.exports = {
  startConsumer,
  metricsAggregator,
};

// Run consumer if this file is executed directly
if (require.main === module) {
  startConsumer();
}

