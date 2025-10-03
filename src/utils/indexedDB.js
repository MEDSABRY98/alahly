// IndexedDB Helper for storing large datasets
// This provides better performance than localStorage for large data

const DB_NAME = 'FootballDatabase';
const DB_VERSION = 1;
const STORES = {
  MATCHES: 'matches',
  PLAYERS: 'playerDatabase',
  LINEUP: 'lineupData',
  PLAYER_DETAILS: 'playerDetailsData',
  UNIQUE_VALUES: 'uniqueValues',
  CACHE_META: 'cacheMeta'
};

/**
 * Initialize IndexedDB
 * @returns {Promise<IDBDatabase>}
 */
const initDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('❌ IndexedDB error:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      // Create object stores if they don't exist
      Object.values(STORES).forEach(storeName => {
        if (!db.objectStoreNames.contains(storeName)) {
          const objectStore = db.createObjectStore(storeName, { keyPath: 'id' });
          
          // Add indexes for better query performance
          if (storeName === STORES.MATCHES) {
            objectStore.createIndex('MATCH_ID', 'MATCH_ID', { unique: false });
            objectStore.createIndex('DATE', 'DATE', { unique: false });
          }
        }
      });
    };
  });
};

/**
 * Get data from IndexedDB
 * @param {string} key - Key to retrieve
 * @returns {Promise<any>}
 */
export const getFromIndexedDB = async (key) => {
  try {
    const db = await initDB();
    
    // Use a default store for cache data
    const storeName = STORES.CACHE_META;
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readonly');
      const objectStore = transaction.objectStore(storeName);
      const request = objectStore.get(key);

      request.onsuccess = () => {
        if (request.result) {
          resolve(request.result);
        } else {
          resolve(null);
        }
      };

      request.onerror = () => {
        console.error(`❌ Error getting ${key}:`, request.error);
        reject(request.error);
      };

      transaction.oncomplete = () => {
        db.close();
      };
    });
  } catch (error) {
    console.error('Error in getFromIndexedDB:', error);
    return null;
  }
};

/**
 * Save data to IndexedDB
 * @param {string} key - Key to save under
 * @param {any} data - Data to save (should include timestamp and ttl)
 * @returns {Promise<boolean>}
 */
export const saveToIndexedDB = async (key, data) => {
  try {
    const db = await initDB();
    
    // Use default store for cache data
    const storeName = STORES.CACHE_META;
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readwrite');
      const objectStore = transaction.objectStore(storeName);
      
      const dataToStore = {
        id: key,
        ...data
      };
      
      const request = objectStore.put(dataToStore);

      request.onsuccess = () => {
        resolve(true);
      };

      request.onerror = () => {
        console.error(`❌ Error saving ${key}:`, request.error);
        reject(request.error);
      };

      transaction.oncomplete = () => {
        db.close();
      };
    });
  } catch (error) {
    console.error('Error in saveToIndexedDB:', error);
    return false;
  }
};

/**
 * Delete data from IndexedDB
 * @param {string} key - Key to delete
 * @returns {Promise<boolean>}
 */
export const deleteFromIndexedDB = async (key) => {
  try {
    const db = await initDB();
    
    // Use default store for cache data
    const storeName = STORES.CACHE_META;
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readwrite');
      const objectStore = transaction.objectStore(storeName);
      const request = objectStore.delete(key);

      request.onsuccess = () => {
        resolve(true);
      };

      request.onerror = () => {
        console.error(`❌ Error deleting ${key}:`, request.error);
        reject(request.error);
      };

      transaction.oncomplete = () => {
        db.close();
      };
    });
  } catch (error) {
    console.error('Error in deleteFromIndexedDB:', error);
    return false;
  }
};

/**
 * Clear all data from IndexedDB
 * @returns {Promise<boolean>}
 */
export const clearAllIndexedDB = async () => {
  try {
    const db = await initDB();
    
    const promises = Object.values(STORES).map(storeName => {
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readwrite');
        const objectStore = transaction.objectStore(storeName);
        const request = objectStore.clear();

        request.onsuccess = () => {
          resolve(true);
        };

        request.onerror = () => {
          console.error(`❌ Error clearing ${storeName}:`, request.error);
          reject(request.error);
        };
      });
    });

    await Promise.all(promises);
    db.close();
    
    return true;
  } catch (error) {
    console.error('Error in clearAllIndexedDB:', error);
    return false;
  }
};

// Note: isDataValid removed - handled by CacheManager.isExpired()

// Note: getAllCachedData and saveAllData removed - handled by CacheManager

// Export store names for use in other files
export { STORES };