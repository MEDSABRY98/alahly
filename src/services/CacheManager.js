/**
 * Unified Cache Manager
 * Single source of truth for all caching needs
 * 
 * Features:
 * - Multi-layer caching (Memory → IndexedDB → Source)
 * - Automatic TTL management
 * - LRU eviction strategy
 * - Cache statistics
 * - Smart invalidation
 * - Preloading support
 */

import { getFromIndexedDB, saveToIndexedDB, deleteFromIndexedDB, clearAllIndexedDB } from '../utils/indexedDB';

class CacheManager {
  constructor() {
    // Layer 1: Memory Cache (Map for O(1) access)
    this.memoryCache = new Map();
    
    // Configuration
    this.config = {
      // Default TTL: 30 minutes
      defaultTTL: 30 * 60 * 1000,
      
      // Max items in memory cache (LRU eviction)
      maxMemoryItems: 100,
      
      // Whether to use IndexedDB
      useIndexedDB: true,
      
      // Cache keys for different data types
      keys: {
        MATCHES: 'matches',
        PLAYER_DATABASE: 'playerDatabase',
        LINEUP_DATA: 'lineupData',
        PLAYER_DETAILS: 'playerDetailsData',
        UNIQUE_VALUES: 'uniqueValues',
        GK_DETAILS: 'gkDetailsData',
        HOW_MISSED: 'howMissedData'
      }
    };
    
    // Statistics tracking
    this.stats = {
      memoryHits: 0,
      indexedDBHits: 0,
      misses: 0,
      sets: 0,
      invalidations: 0
    };
    
    // LRU tracking (key → timestamp)
    this.accessTimestamps = new Map();
    
  }

  /**
   * Get data from cache with fallback chain
   * Memory → IndexedDB → null (fetch from source)
   * 
   * @param {string} key - Cache key
   * @returns {Promise<any>} Cached data or null
   */
  async get(key) {
    try {
      // Layer 1: Try memory cache (fastest)
      if (this.memoryCache.has(key)) {
        const cached = this.memoryCache.get(key);
        
        // Check if expired
        if (!this.isExpired(cached)) {
          this.stats.memoryHits++;
          this.updateAccessTime(key);
          return cached.data;
        } else {
          // Expired - remove from memory
          this.memoryCache.delete(key);
          this.accessTimestamps.delete(key);
        }
      }
      
      // Layer 2: Try IndexedDB (slower but persistent)
      if (this.config.useIndexedDB) {
        const cached = await getFromIndexedDB(key);
        
        if (cached && !this.isExpired(cached)) {
          this.stats.indexedDBHits++;
          
          // Promote to memory cache
          this.setMemoryCache(key, cached.data, cached.ttl);
          this.updateAccessTime(key);
          
          return cached.data;
        } else if (cached) {
          // Expired - remove from IndexedDB
          await deleteFromIndexedDB(key);
        }
      }
      
      // Layer 3: Cache miss - caller should fetch from source
      this.stats.misses++;
      return null;
      
    } catch (error) {
      return null;
    }
  }

  /**
   * Set data in cache (both memory and IndexedDB)
   * 
   * @param {string} key - Cache key
   * @param {any} data - Data to cache
   * @param {number} ttl - Time to live in milliseconds (optional)
   * @returns {Promise<boolean>} Success status
   */
  async set(key, data, ttl = this.config.defaultTTL) {
    try {
      
      // Prepare cache data with metadata
      const cacheData = {
        data,
        timestamp: Date.now(),
        ttl,
        key
      };
      
      // Layer 1: Set in memory cache
      this.setMemoryCache(key, data, ttl);
      
      // Layer 2: Set in IndexedDB (async, non-blocking)
      if (this.config.useIndexedDB) {
        await saveToIndexedDB(key, cacheData);
      }
      
      this.stats.sets++;
      this.updateAccessTime(key);
      
      return true;
      
    } catch (error) {
      return false;
    }
  }

  /**
   * Set data in memory cache with LRU eviction
   * 
   * @param {string} key - Cache key
   * @param {any} data - Data to cache
   * @param {number} ttl - Time to live
   */
  setMemoryCache(key, data, ttl) {
    // Check if we need to evict (LRU)
    if (this.memoryCache.size >= this.config.maxMemoryItems && !this.memoryCache.has(key)) {
      this.evictLRU();
    }
    
    this.memoryCache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  /**
   * Invalidate cache entry (remove from all layers)
   * 
   * @param {string} key - Cache key to invalidate
   * @returns {Promise<boolean>} Success status
   */
  async invalidate(key) {
    try {
      
      // Remove from memory
      this.memoryCache.delete(key);
      this.accessTimestamps.delete(key);
      
      // Remove from IndexedDB
      if (this.config.useIndexedDB) {
        await deleteFromIndexedDB(key);
      }
      
      this.stats.invalidations++;
      return true;
      
    } catch (error) {
      return false;
    }
  }

  /**
   * Invalidate all cache entries matching a pattern
   * 
   * @param {string} pattern - Pattern to match (e.g., 'player-*')
   * @returns {Promise<number>} Number of entries invalidated
   */
  async invalidatePattern(pattern) {
    try {
      
      // Convert pattern to regex
      const regex = new RegExp(pattern.replace('*', '.*'));
      let count = 0;
      
      // Invalidate matching memory cache entries
      for (const key of this.memoryCache.keys()) {
        if (regex.test(key)) {
          await this.invalidate(key);
          count++;
        }
      }
      
      return count;
      
    } catch (error) {
      return 0;
    }
  }

  /**
   * Clear all cache (both memory and IndexedDB)
   * 
   * @returns {Promise<boolean>} Success status
   */
  async clearAll() {
    try {
      
      // Clear memory cache
      this.memoryCache.clear();
      this.accessTimestamps.clear();
      
      // Clear IndexedDB
      if (this.config.useIndexedDB) {
        await clearAllIndexedDB();
      }
      
      // Reset stats
      this.stats = {
        memoryHits: 0,
        indexedDBHits: 0,
        misses: 0,
        sets: 0,
        invalidations: 0
      };
      
      return true;
      
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if cached data is expired
   * 
   * @param {Object} cached - Cached data object
   * @returns {boolean} True if expired
   */
  isExpired(cached) {
    if (!cached || !cached.timestamp || !cached.ttl) {
      return true;
    }
    
    const age = Date.now() - cached.timestamp;
    return age > cached.ttl;
  }

  /**
   * Evict least recently used item from memory cache
   */
  evictLRU() {
    let oldestKey = null;
    let oldestTime = Infinity;
    
    // Find least recently used
    for (const [key, timestamp] of this.accessTimestamps.entries()) {
      if (timestamp < oldestTime) {
        oldestTime = timestamp;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      this.memoryCache.delete(oldestKey);
      this.accessTimestamps.delete(oldestKey);
    }
  }

  /**
   * Update access timestamp for LRU tracking
   * 
   * @param {string} key - Cache key
   */
  updateAccessTime(key) {
    this.accessTimestamps.set(key, Date.now());
  }

  /**
   * Get cache statistics
   * 
   * @returns {Object} Cache statistics
   */
  getStats() {
    const totalRequests = this.stats.memoryHits + this.stats.indexedDBHits + this.stats.misses;
    const hitRate = totalRequests > 0 
      ? ((this.stats.memoryHits + this.stats.indexedDBHits) / totalRequests * 100).toFixed(2)
      : 0;
    
    return {
      ...this.stats,
      totalRequests,
      hitRate: `${hitRate}%`,
      memoryCacheSize: this.memoryCache.size,
      cacheKeys: Array.from(this.memoryCache.keys())
    };
  }

  /**
   * Preload essential data into cache
   * 
   * @param {Array<{key: string, fetchFn: Function}>} dataList - List of data to preload
   * @returns {Promise<Object>} Results of preloading
   */
  async preload(dataList) {
    
    const results = {
      success: 0,
      failed: 0,
      cached: 0
    };
    
    for (const { key, fetchFn } of dataList) {
      try {
        // Check if already cached
        const cached = await this.get(key);
        
        if (cached) {
          results.cached++;
          continue;
        }
        
        // Fetch and cache
        const data = await fetchFn();
        
        if (data) {
          await this.set(key, data);
          results.success++;
        } else {
          results.failed++;
        }
        
      } catch (error) {
        results.failed++;
      }
    }
    
    return results;
  }

  /**
   * Warmup cache on application startup
   * Loads essential data into memory cache
   * 
   * @returns {Promise<boolean>} Success status
   */
  async warmup() {
    
    try {
      const essentialKeys = [
        this.config.keys.MATCHES,
        this.config.keys.PLAYER_DATABASE,
        this.config.keys.UNIQUE_VALUES
      ];
      
      for (const key of essentialKeys) {
        // Try to load from IndexedDB into memory
        const cached = await getFromIndexedDB(key);
        
        if (cached && !this.isExpired(cached)) {
          this.setMemoryCache(key, cached.data, cached.ttl);
        }
      }
      
      return true;
      
    } catch (error) {
      return false;
    }
  }

  /**
   * Get cache size information
   * 
   * @returns {Object} Size information
   */
  getCacheSize() {
    // Estimate memory cache size
    let estimatedMemorySize = 0;
    
    for (const [key, value] of this.memoryCache.entries()) {
      // Rough estimation
      estimatedMemorySize += JSON.stringify(value).length;
    }
    
    return {
      memoryItems: this.memoryCache.size,
      estimatedMemoryBytes: estimatedMemorySize,
      estimatedMemoryMB: (estimatedMemorySize / 1024 / 1024).toFixed(2)
    };
  }

  /**
   * Health check for cache system
   * 
   * @returns {Object} Health status
   */
  async healthCheck() {
    const health = {
      status: 'healthy',
      issues: [],
      timestamp: new Date().toISOString()
    };
    
    // Check memory cache
    if (this.memoryCache.size === 0) {
      health.issues.push('Memory cache is empty');
    }
    
    // Check if IndexedDB is accessible
    try {
      if (this.config.useIndexedDB) {
        await getFromIndexedDB('health-check');
      }
    } catch (error) {
      health.status = 'degraded';
      health.issues.push('IndexedDB not accessible');
    }
    
    if (health.issues.length > 0) {
      health.status = health.issues.length > 2 ? 'unhealthy' : 'degraded';
    }
    
    return health;
  }
}

// Create singleton instance
const cacheManager = new CacheManager();

// Export singleton instance and class
export default cacheManager;
export { CacheManager };
