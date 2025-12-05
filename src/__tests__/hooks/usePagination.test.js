// src/__tests__/hooks/usePagination.test.js - Tests for usePagination hook
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import usePagination from '../../hooks/usePagination';

describe('usePagination', () => {
  const mockData = Array.from({ length: 25 }, (_, i) => ({ id: i, name: `Item ${i}` }));

  it('should initialize with correct default values', () => {
    const { result } = renderHook(() => usePagination(mockData, 10));

    expect(result.current.currentPage).toBe(1);
    expect(result.current.totalPages).toBe(3);
    expect(result.current.paginatedData).toHaveLength(10);
    expect(result.current.totalItems).toBe(25);
    expect(result.current.startIndex).toBe(1);
    expect(result.current.endIndex).toBe(10);
    expect(result.current.hasNextPage).toBe(true);
    expect(result.current.hasPreviousPage).toBe(false);
  });

  it('should paginate data correctly', () => {
    const { result } = renderHook(() => usePagination(mockData, 10));

    // First page
    expect(result.current.paginatedData[0].id).toBe(0);
    expect(result.current.paginatedData[9].id).toBe(9);

    // Go to second page
    act(() => {
      result.current.goToNextPage();
    });

    expect(result.current.currentPage).toBe(2);
    expect(result.current.paginatedData[0].id).toBe(10);
    expect(result.current.paginatedData[9].id).toBe(19);
    expect(result.current.startIndex).toBe(11);
    expect(result.current.endIndex).toBe(20);
  });

  it('should handle last page correctly', () => {
    const { result } = renderHook(() => usePagination(mockData, 10));

    // Go to last page
    act(() => {
      result.current.goToPage(3);
    });

    expect(result.current.currentPage).toBe(3);
    expect(result.current.paginatedData).toHaveLength(5); // Remaining items
    expect(result.current.paginatedData[0].id).toBe(20);
    expect(result.current.paginatedData[4].id).toBe(24);
    expect(result.current.startIndex).toBe(21);
    expect(result.current.endIndex).toBe(25);
    expect(result.current.hasNextPage).toBe(false);
    expect(result.current.hasPreviousPage).toBe(true);
  });

  it('should navigate pages correctly', () => {
    const { result } = renderHook(() => usePagination(mockData, 10));

    // Go to next page
    act(() => {
      result.current.goToNextPage();
    });
    expect(result.current.currentPage).toBe(2);

    // Go to previous page
    act(() => {
      result.current.goToPreviousPage();
    });
    expect(result.current.currentPage).toBe(1);

    // Go to specific page
    act(() => {
      result.current.goToPage(3);
    });
    expect(result.current.currentPage).toBe(3);
  });

  it('should not navigate beyond boundaries', () => {
    const { result } = renderHook(() => usePagination(mockData, 10));

    // Try to go to previous page from first page
    act(() => {
      result.current.goToPreviousPage();
    });
    expect(result.current.currentPage).toBe(1);

    // Go to last page
    act(() => {
      result.current.goToPage(3);
    });

    // Try to go to next page from last page
    act(() => {
      result.current.goToNextPage();
    });
    expect(result.current.currentPage).toBe(3);

    // Try to go to invalid page
    act(() => {
      result.current.goToPage(5);
    });
    expect(result.current.currentPage).toBe(3);

    act(() => {
      result.current.goToPage(0);
    });
    expect(result.current.currentPage).toBe(3);
  });

  it('should reset pagination', () => {
    const { result } = renderHook(() => usePagination(mockData, 10));

    // Go to different page
    act(() => {
      result.current.goToPage(2);
    });
    expect(result.current.currentPage).toBe(2);

    // Reset
    act(() => {
      result.current.resetPagination();
    });
    expect(result.current.currentPage).toBe(1);
  });

  it('should handle empty data', () => {
    const { result } = renderHook(() => usePagination([], 10));

    expect(result.current.currentPage).toBe(1);
    expect(result.current.totalPages).toBe(0);
    expect(result.current.paginatedData).toHaveLength(0);
    expect(result.current.totalItems).toBe(0);
    expect(result.current.hasNextPage).toBe(false);
    expect(result.current.hasPreviousPage).toBe(false);
  });

  it('should handle null/undefined data', () => {
    const { result } = renderHook(() => usePagination(null, 10));

    expect(result.current.currentPage).toBe(1);
    expect(result.current.totalPages).toBe(0);
    expect(result.current.paginatedData).toHaveLength(0);
    expect(result.current.totalItems).toBe(0);
  });

  it('should handle different items per page', () => {
    const { result } = renderHook(() => usePagination(mockData, 5));

    expect(result.current.totalPages).toBe(5);
    expect(result.current.paginatedData).toHaveLength(5);

    // Change to larger page size
    const { result: result2 } = renderHook(() => usePagination(mockData, 20));
    expect(result2.current.totalPages).toBe(2);
    expect(result2.current.paginatedData).toHaveLength(20);
  });

  it('should update when data changes', () => {
    const { result, rerender } = renderHook(
      ({ data, itemsPerPage }) => usePagination(data, itemsPerPage),
      { initialProps: { data: mockData, itemsPerPage: 10 } }
    );

    expect(result.current.totalItems).toBe(25);

    // Update with new data
    const newData = Array.from({ length: 15 }, (_, i) => ({ id: i, name: `New Item ${i}` }));
    rerender({ data: newData, itemsPerPage: 10 });

    expect(result.current.totalItems).toBe(15);
    expect(result.current.totalPages).toBe(2);
  });

  it('should maintain current page when possible after data change', () => {
    const { result, rerender } = renderHook(
      ({ data, itemsPerPage }) => usePagination(data, itemsPerPage),
      { initialProps: { data: mockData, itemsPerPage: 10 } }
    );

    // Go to page 2
    act(() => {
      result.current.goToPage(2);
    });
    expect(result.current.currentPage).toBe(2);

    // Update with data that still has page 2
    const newData = Array.from({ length: 30 }, (_, i) => ({ id: i, name: `New Item ${i}` }));
    rerender({ data: newData, itemsPerPage: 10 });

    expect(result.current.currentPage).toBe(2); // Should maintain page 2
  });
});