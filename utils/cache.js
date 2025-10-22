const { getRedisClient } = require('../config/redis');

class CacheService {
  constructor() {
    this.defaultTTL = 3600; // 1 hour in seconds
  }

  // Generate tenant-scoped cache key
  getTenantKey(tenantId, key) {
    return `tenant:${tenantId}:${key}`;
  }

  // Set cache with tenant scope
  async setTenantCache(tenantId, key, value, ttl = this.defaultTTL) {
    try {
      const redisClient = getRedisClient();
      const tenantKey = this.getTenantKey(tenantId, key);
      const serializedValue = JSON.stringify(value);
      await redisClient.setEx(tenantKey, ttl, serializedValue);
      return true;
    } catch (error) {
      console.error('Cache set error:', error);
      return false;
    }
  }

  // Get cache with tenant scope
  async getTenantCache(tenantId, key) {
    try {
      const redisClient = getRedisClient();
      const tenantKey = this.getTenantKey(tenantId, key);
      const cachedValue = await redisClient.get(tenantKey);
      
      if (cachedValue) {
        return JSON.parse(cachedValue);
      }
      return null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  // Delete cache with tenant scope
  async deleteTenantCache(tenantId, key) {
    try {
      const redisClient = getRedisClient();
      const tenantKey = this.getTenantKey(tenantId, key);
      await redisClient.del(tenantKey);
      return true;
    } catch (error) {
      console.error('Cache delete error:', error);
      return false;
    }
  }

  // Delete all cache for a tenant
  async clearTenantCache(tenantId) {
    try {
      const redisClient = getRedisClient();
      const pattern = `tenant:${tenantId}:*`;
      const keys = await redisClient.keys(pattern);
      
      if (keys.length > 0) {
        await redisClient.del(keys);
      }
      return true;
    } catch (error) {
      console.error('Cache clear error:', error);
      return false;
    }
  }

  // Cache restaurants list
  async cacheRestaurants(tenantId, restaurants, ttl = 1800) {
    return await this.setTenantCache(tenantId, 'restaurants', restaurants, ttl);
  }

  // Get cached restaurants list
  async getCachedRestaurants(tenantId) {
    return await this.getTenantCache(tenantId, 'restaurants');
  }

  // Cache menu items
  async cacheMenu(tenantId, restaurantId, menuItems, ttl = 1800) {
    const key = `menu:${restaurantId}`;
    return await this.setTenantCache(tenantId, key, menuItems, ttl);
  }

  // Get cached menu items
  async getCachedMenu(tenantId, restaurantId) {
    const key = `menu:${restaurantId}`;
    return await this.getTenantCache(tenantId, key);
  }

  // Invalidate menu cache
  async invalidateMenuCache(tenantId, restaurantId) {
    const key = `menu:${restaurantId}`;
    return await this.deleteTenantCache(tenantId, key);
  }

  // Set general cache (non-tenant specific)
  async set(key, value, ttl = this.defaultTTL) {
    try {
      const redisClient = getRedisClient();
      const serializedValue = JSON.stringify(value);
      await redisClient.setEx(key, ttl, serializedValue);
      return true;
    } catch (error) {
      console.error('Cache set error:', error);
      return false;
    }
  }

  // Get general cache
  async get(key) {
    try {
      const redisClient = getRedisClient();
      const cachedValue = await redisClient.get(key);
      
      if (cachedValue) {
        return JSON.parse(cachedValue);
      }
      return null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  // Delete general cache
  async delete(key) {
    try {
      const redisClient = getRedisClient();
      await redisClient.del(key);
      return true;
    } catch (error) {
      console.error('Cache delete error:', error);
      return false;
    }
  }
}

module.exports = new CacheService();

