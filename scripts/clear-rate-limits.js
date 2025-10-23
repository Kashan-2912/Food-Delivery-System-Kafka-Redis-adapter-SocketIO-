require('dotenv').config();
const { connectRedis, getRedisClient } = require('../config/redis');

// Script to clear all rate limit data from Redis
async function clearRateLimits() {
  try {
    // Use existing Redis configuration
    await connectRedis();
    const redisClient = getRedisClient();
    
    console.log('Connected to Redis');

    // Clear all rate limit keys
    const patterns = [
      'rl:*',              // rate-limit-redis default prefix
      'auth_limit:*',      // auth rate limiter
      'general_limit:*',   // general rate limiter
      'order_limit:*',     // order rate limiter
      'tenant_limit:*',    // tenant rate limiter
      'user_limit:*',      // user rate limiter
    ];

    let totalKeysDeleted = 0;

    for (const pattern of patterns) {
      const keys = await redisClient.keys(pattern);
      if (keys.length > 0) {
        console.log(`Deleting ${keys.length} keys matching ${pattern}...`);
        await redisClient.del(keys);
        totalKeysDeleted += keys.length;
      } else {
        console.log(`No keys found for pattern: ${pattern}`);
      }
    }

    console.log('\n✅ Rate limit cleanup complete!');
    console.log(`📊 Total keys deleted: ${totalKeysDeleted}`);
    console.log('🚀 You can now test without rate limit restrictions.');
    
    await redisClient.quit();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error clearing rate limits:', error.message);
    process.exit(1);
  }
}

clearRateLimits();

