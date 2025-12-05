// src/__tests__/hooks/useDebounce.test.js - Tests for useDebounce hook
import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import useDebounce from '../../hooks/useDebounce';

describe('useDebounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('initial', 500));
    expect(result.current).toBe('initial');
  });

  it('should debounce value changes', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'initial', delay: 500 } }
    );

    expect(result.current).toBe('initial');

    // Change value
    rerender({ value: 'updated', delay: 500 });
    
    // Should still be initial value
    expect(result.current).toBe('initial');

    // Fast-forward time by less than delay
    act(() => {
      vi.advanceTimersByTime(300);
    });
    
    // Should still be initial value
    expect(result.current).toBe('initial');

    // Fast-forward time to complete delay
    act(() => {
      vi.advanceTimersByTime(200);
    });
    
    // Should now be updated value
    expect(result.current).toBe('updated');
  });

  it('should reset timer on rapid changes', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'initial', delay: 500 } }
    );

    // Rapid changes
    rerender({ value: 'change1', delay: 500 });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    
    rerender({ value: 'change2', delay: 500 });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    
    rerender({ value: 'final', delay: 500 });
    
    // Should still be initial
    expect(result.current).toBe('initial');
    
    // Complete the delay
    act(() => {
      vi.advanceTimersByTime(500);
    });
    
    // Should be the final value
    expect(result.current).toBe('final');
  });

  it('should handle different delay values', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'initial', delay: 1000 } }
    );

    rerender({ value: 'updated', delay: 1000 });
    
    // Advance by less than delay
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(result.current).toBe('initial');
    
    // Complete the delay
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(result.current).toBe('updated');
  });

  it('should handle zero delay', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'initial', delay: 0 } }
    );

    rerender({ value: 'updated', delay: 0 });
    
    // Should update immediately with zero delay
    act(() => {
      vi.advanceTimersByTime(0);
    });
    expect(result.current).toBe('updated');
  });

  it('should cleanup timer on unmount', () => {
    const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');
    
    const { unmount } = renderHook(() => useDebounce('test', 500));
    
    unmount();
    
    expect(clearTimeoutSpy).toHaveBeenCalled();
    clearTimeoutSpy.mockRestore();
  });
});