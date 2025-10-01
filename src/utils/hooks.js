// Custom React Hooks for performance optimization
import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * useDebounce Hook
 * Delays updating a value until after a specified delay
 * 
 * @param {any} value - The value to debounce
 * @param {number} delay - Delay in milliseconds (default: 500ms)
 * @returns {any} Debounced value
 * 
 * @example
 * const [searchTerm, setSearchTerm] = useState('');
 * const debouncedSearchTerm = useDebounce(searchTerm, 500);
 * 
 * useEffect(() => {
 *   // This will only run 500ms after user stops typing
 *   performSearch(debouncedSearchTerm);
 * }, [debouncedSearchTerm]);
 */
export const useDebounce = (value, delay = 500) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    // Set timeout to update debounced value after delay
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Clear timeout if value changes before delay completes
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

/**
 * useDebouncedCallback Hook
 * Returns a memoized callback that only executes after a specified delay
 * 
 * @param {Function} callback - The callback function to debounce
 * @param {number} delay - Delay in milliseconds (default: 500ms)
 * @param {Array} dependencies - Dependencies for useCallback
 * @returns {Function} Debounced callback function
 * 
 * @example
 * const handleSearch = useDebouncedCallback((searchTerm) => {
 *   performSearch(searchTerm);
 * }, 500);
 */
export const useDebouncedCallback = (callback, delay = 500, dependencies = []) => {
  const timeoutRef = useRef(null);

  const debouncedCallback = useCallback((...args) => {
    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout
    timeoutRef.current = setTimeout(() => {
      callback(...args);
    }, delay);
  }, [callback, delay, ...dependencies]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return debouncedCallback;
};

/**
 * useThrottle Hook
 * Limits the rate at which a value can update
 * 
 * @param {any} value - The value to throttle
 * @param {number} limit - Minimum time between updates in milliseconds (default: 500ms)
 * @returns {any} Throttled value
 * 
 * @example
 * const [scrollPosition, setScrollPosition] = useState(0);
 * const throttledScrollPosition = useThrottle(scrollPosition, 200);
 */
export const useThrottle = (value, limit = 500) => {
  const [throttledValue, setThrottledValue] = useState(value);
  const lastRan = useRef(Date.now());

  useEffect(() => {
    const handler = setTimeout(() => {
      if (Date.now() - lastRan.current >= limit) {
        setThrottledValue(value);
        lastRan.current = Date.now();
      }
    }, limit - (Date.now() - lastRan.current));

    return () => {
      clearTimeout(handler);
    };
  }, [value, limit]);

  return throttledValue;
};

/**
 * usePrevious Hook
 * Returns the previous value of a state or prop
 * 
 * @param {any} value - The value to track
 * @returns {any} Previous value
 * 
 * @example
 * const [count, setCount] = useState(0);
 * const previousCount = usePrevious(count);
 */
export const usePrevious = (value) => {
  const ref = useRef();
  
  useEffect(() => {
    ref.current = value;
  }, [value]);
  
  return ref.current;
};

/**
 * useLocalStorage Hook
 * Syncs state with localStorage
 * 
 * @param {string} key - localStorage key
 * @param {any} initialValue - Initial value if key doesn't exist
 * @returns {Array} [storedValue, setValue] similar to useState
 * 
 * @example
 * const [name, setName] = useLocalStorage('name', 'Guest');
 */
export const useLocalStorage = (key, initialValue) => {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error loading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  const setValue = useCallback((value) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(`Error saving localStorage key "${key}":`, error);
    }
  }, [key, storedValue]);

  return [storedValue, setValue];
};

/**
 * useMediaQuery Hook
 * Tracks whether a media query matches
 * 
 * @param {string} query - Media query string
 * @returns {boolean} Whether the query matches
 * 
 * @example
 * const isMobile = useMediaQuery('(max-width: 768px)');
 */
export const useMediaQuery = (query) => {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    
    if (media.matches !== matches) {
      setMatches(media.matches);
    }

    const listener = () => setMatches(media.matches);
    media.addEventListener('change', listener);
    
    return () => media.removeEventListener('change', listener);
  }, [matches, query]);

  return matches;
};
