// src/__tests__/hooks/useOptimisticUpdate.test.js - Tests for useOptimisticUpdate hook
import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';
import useOptimisticUpdate from '../../hooks/useOptimisticUpdate';

describe('useOptimisticUpdate', () => {
  const initialData = { id: 1, name: 'Initial', status: 'pending' };

  it('should initialize with initial data', () => {
    const { result } = renderHook(() => useOptimisticUpdate(initialData));

    expect(result.current.data).toEqual(initialData);
    expect(result.current.isOptimistic).toBe(false);
    expect(result.current.error).toBe(null);
  });

  it('should perform successful optimistic update', async () => {
    const { result } = renderHook(() => useOptimisticUpdate(initialData));

    const optimisticData = { ...initialData, status: 'loading' };
    const finalData = { ...initialData, status: 'completed' };
    const asyncOperation = vi.fn().mockResolvedValue(finalData);

    await act(async () => {
      const promise = result.current.performOptimisticUpdate(
        optimisticData,
        asyncOperation
      );

      // Should immediately show optimistic data
      expect(result.current.data).toEqual(optimisticData);
      expect(result.current.isOptimistic).toBe(true);
      expect(result.current.error).toBe(null);

      await promise;
    });

    // Should show final data after async operation
    expect(result.current.data).toEqual(finalData);
    expect(result.current.isOptimistic).toBe(false);
    expect(result.current.error).toBe(null);
    expect(asyncOperation).toHaveBeenCalledTimes(1);
  });

  it('should rollback on error', async () => {
    const { result } = renderHook(() => useOptimisticUpdate(initialData));

    const optimisticData = { ...initialData, status: 'loading' };
    const rollbackData = { ...initialData, status: 'error' };
    const error = new Error('Operation failed');
    const asyncOperation = vi.fn().mockRejectedValue(error);

    await act(async () => {
      try {
        await result.current.performOptimisticUpdate(
          optimisticData,
          asyncOperation,
          rollbackData
        );
      } catch (e) {
        // Expected to throw
      }
    });

    // Should rollback to rollback data
    expect(result.current.data).toEqual(rollbackData);
    expect(result.current.isOptimistic).toBe(false);
    expect(result.current.error).toEqual(error);
  });

  it('should rollback to initial data when no rollback data provided', async () => {
    const { result } = renderHook(() => useOptimisticUpdate(initialData));

    const optimisticData = { ...initialData, status: 'loading' };
    const error = new Error('Operation failed');
    const asyncOperation = vi.fn().mockRejectedValue(error);

    await act(async () => {
      try {
        await result.current.performOptimisticUpdate(
          optimisticData,
          asyncOperation
        );
      } catch (e) {
        // Expected to throw
      }
    });

    // Should rollback to initial data
    expect(result.current.data).toEqual(initialData);
    expect(result.current.isOptimistic).toBe(false);
    expect(result.current.error).toEqual(error);
  });

  it('should reset data', () => {
    const { result } = renderHook(() => useOptimisticUpdate(initialData));

    // Manually update data
    act(() => {
      result.current.updateData({ ...initialData, status: 'modified' });
    });

    expect(result.current.data.status).toBe('modified');

    // Reset
    act(() => {
      result.current.resetData();
    });

    expect(result.current.data).toEqual(initialData);
    expect(result.current.isOptimistic).toBe(false);
    expect(result.current.error).toBe(null);
  });

  it('should update data manually', () => {
    const { result } = renderHook(() => useOptimisticUpdate(initialData));

    const newData = { ...initialData, status: 'updated' };

    act(() => {
      result.current.updateData(newData);
    });

    expect(result.current.data).toEqual(newData);
    expect(result.current.isOptimistic).toBe(false);
    expect(result.current.error).toBe(null);
  });

  it('should clear error on successful update', async () => {
    const { result } = renderHook(() => useOptimisticUpdate(initialData));

    // First, cause an error
    const error = new Error('First error');
    const failingOperation = vi.fn().mockRejectedValue(error);

    await act(async () => {
      try {
        await result.current.performOptimisticUpdate(
          { ...initialData, status: 'loading' },
          failingOperation
        );
      } catch (e) {
        // Expected
      }
    });

    expect(result.current.error).toEqual(error);

    // Then, perform successful update
    const successfulOperation = vi.fn().mockResolvedValue({ ...initialData, status: 'success' });

    await act(async () => {
      await result.current.performOptimisticUpdate(
        { ...initialData, status: 'loading' },
        successfulOperation
      );
    });

    expect(result.current.error).toBe(null);
  });

  it('should handle multiple concurrent optimistic updates', async () => {
    const { result } = renderHook(() => useOptimisticUpdate(initialData));

    const operation1 = vi.fn().mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({ ...initialData, status: 'op1' }), 100))
    );
    const operation2 = vi.fn().mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({ ...initialData, status: 'op2' }), 50))
    );

    // Start both operations
    const promise1 = act(async () => {
      return result.current.performOptimisticUpdate(
        { ...initialData, status: 'loading1' },
        operation1
      );
    });

    const promise2 = act(async () => {
      return result.current.performOptimisticUpdate(
        { ...initialData, status: 'loading2' },
        operation2
      );
    });

    // Wait for both to complete
    await Promise.all([promise1, promise2]);

    // The last operation should win
    expect(result.current.data.status).toBe('op2');
    expect(result.current.isOptimistic).toBe(false);
  });

  it('should handle async operation that returns undefined', async () => {
    const { result } = renderHook(() => useOptimisticUpdate(initialData));

    const optimisticData = { ...initialData, status: 'loading' };
    const asyncOperation = vi.fn().mockResolvedValue(undefined);

    await act(async () => {
      await result.current.performOptimisticUpdate(
        optimisticData,
        asyncOperation
      );
    });

    // Should use undefined as the final data
    expect(result.current.data).toBeUndefined();
    expect(result.current.isOptimistic).toBe(false);
    expect(result.current.error).toBe(null);
  });
});