// src/hooks/useOptimisticUpdate.js - Optimistic UI updates hook
import { useState, useCallback } from 'react';

/**
 * Custom hook for optimistic UI updates
 * @param {any} initialData - Initial data state
 * @returns {Object} - Optimistic update utilities
 */
export function useOptimisticUpdate(initialData) {
  const [data, setData] = useState(initialData);
  const [isOptimistic, setIsOptimistic] = useState(false);
  const [error, setError] = useState(null);

  const performOptimisticUpdate = useCallback(async (
    optimisticUpdate,
    asyncOperation,
    rollbackData = null
  ) => {
    try {
      // Clear any previous errors
      setError(null);
      
      // Apply optimistic update immediately
      setData(optimisticUpdate);
      setIsOptimistic(true);

      // Perform the actual async operation
      const result = await asyncOperation();

      // If successful, update with real data
      setData(result);
      setIsOptimistic(false);

      return result;
    } catch (err) {
      // Rollback on error
      setData(rollbackData || initialData);
      setIsOptimistic(false);
      setError(err);
      throw err;
    }
  }, [initialData]);

  const resetData = useCallback(() => {
    setData(initialData);
    setIsOptimistic(false);
    setError(null);
  }, [initialData]);

  const updateData = useCallback((newData) => {
    setData(newData);
    setIsOptimistic(false);
    setError(null);
  }, []);

  return {
    data,
    isOptimistic,
    error,
    performOptimisticUpdate,
    resetData,
    updateData
  };
}

export default useOptimisticUpdate;