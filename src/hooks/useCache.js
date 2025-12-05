// src/hooks/useCache.js - Caching hook for performance optimization
import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Custom hook for caching data with TTL (Time To Live)
 * @param {string} key - Cache key
 * @param {Function} fetchFunction - Function to fetch data
 * @param {Object} options - Cache options
 * @returns {Object} - Cached data and utilities
 */
export function useCache(key, fetchFunction, options = {}) {
  const {
    ttl = 5 * 60 * 1000, // 5 minutes default TTL
    staleWhileRevalidate = true,
    dependencies = []
  } = options;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastFetch, setLastFetch] = useState(null);
  
  const cacheRef = useRef(new Map());
  const abortControllerRef = useRef(null);

  const isStale = useCallback(() => {
    if (!lastFetch) return true;
    return Date.now() - lastFetch > ttl;
  }, [lastFetch, ttl]);

  const getCachedData = useCallback(() => {
    const cached = cacheRef.current.get(key);
    if (cached && Date.now() - cached.timestamp < ttl) {
      return cached.data;
    }
    return null;
  }, [key, ttl]);

  const setCachedData = useCallback((newData) => {
    cacheRef.current.set(key, {
      data: newData,
      timestamp: Date.now()
    });
  }, [key]);

  const fetchData = useCallback(async (force = false) => {
    // Check cache first
    if (!force) {
      const cached = getCachedData();
      if (cached) {
        setData(cached);
        setLastFetch(Date.now());
        return cached;
      }
    }

    // Cancel any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();

    try {
      setLoading(true);
      setError(null);

      const result = await fetchFunction({
        signal: abortControllerRef.current.signal
      });

      setData(result);
      setCachedData(result);
      setLastFetch(Date.now());
      
      return result;
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError(err);
        
        // If we have stale data and staleWhileRevalidate is enabled, use it
        if (staleWhileRevalidate && data) {
          console.warn('Using stale data due to fetch error:', err);
          return data;
        }
      }
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchFunction, getCachedData, setCachedData, staleWhileRevalidate, data]);

  const refresh = useCallback(() => {
    return fetchData(true);
  }, [fetchData]);

  const invalidate = useCallback(() => {
    cacheRef.current.delete(key);
    setData(null);
    setLastFetch(null);
    setError(null);
  }, [key]);

  // Initial fetch and dependency-based refetch
  useEffect(() => {
    fetchData();
    
    // Cleanup on unmount
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [key, ...dependencies]);

  // Background revalidation for stale data
  useEffect(() => {
    if (staleWhileRevalidate && data && isStale()) {
      fetchData().catch(() => {
        // Silently fail background revalidation
      });
    }
  }, [data, isStale, fetchData, staleWhileRevalidate]);

  return {
    data,
    loading,
    error,
    isStale: isStale(),
    refresh,
    invalidate,
    lastFetch
  };
}

export default useCache;