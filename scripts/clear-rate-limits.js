require('dotenv').config();
const { createClient } = require('redis');

// Script to clear all rate limit data from Redis
async function clearRateLimits() {
  const redisClient = createClient({
    socket: {
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
    },
    password: process.env.REDIS_PASSWORD || undefined,
  });

  try {
    await redisClient.connect();
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

    for (const pattern of patterns) {
      const keys = await redisClient.keys(pattern);
      if (keys.length > 0) {
        console.log(`Deleting ${keys.length} keys matching ${pattern}...`);
        await redisClient.del(keys);
      } else {
        console.log(`No keys found for pattern: ${pattern}`);
      }
    }

    console.log('✅ All rate limit data cleared!');
    console.log('You can now test without rate limit restrictions.');
    
    await redisClient.quit();
    process.exit(0);
  } catch (error) {
    console.error('Error clearing rate limits:', error);
    process.exit(1);
  }
}

clearRateLimits();

