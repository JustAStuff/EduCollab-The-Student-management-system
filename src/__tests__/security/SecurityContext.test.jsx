// Security Context tests
import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { SecurityProvider, useSecurity } from '../../contexts/SecurityContext';

// Mock the security validation utilities
jest.mock('../../utils/securityValidation', () => ({
  generateCSRFToken: jest.fn(() => 'mock-csrf-token-' + Date.now()),
}));

// Test component that uses the security context
const TestComponent = () => {
  const { csrfToken, isSecurityReady, refreshCSRFToken } = useSecurity();
  
  return (
    <div>
      <div data-testid="csrf-token">{csrfToken || 'no-token'}</div>
      <div data-testid="security-ready">{isSecurityReady ? 'ready' : 'not-ready'}</div>
      <button onClick={refreshCSRFToken} data-testid="refresh-token">
        Refresh Token
      </button>
    </div>
  );
};

describe('SecurityContext', () => {
  beforeEach(() => {
    // Clear session storage before each test
    sessionStorage.clear();
    jest.clearAllMocks();
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  it('should provide CSRF token and security ready state', async () => {
    render(
      <SecurityProvider>
        <TestComponent />
      </SecurityProvider>
    );

    // Initially should show not ready
    expect(screen.getByTestId('security-ready')).toHaveTextContent('not-ready');

    // Wait for security to be ready
    await waitFor(() => {
      expect(screen.getByTestId('security-ready')).toHaveTextContent('ready');
    });

    // Should have a CSRF token
    const tokenElement = screen.getByTestId('csrf-token');
    expect(tokenElement.textContent).not.toBe('no-token');
    expect(tokenElement.textContent).toMatch(/^mock-csrf-token-/);
  });

  it('should store CSRF token in session storage', async () => {
    render(
      <SecurityProvider>
        <TestComponent />
      </SecurityProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('security-ready')).toHaveTextContent('ready');
    });

    // Check that token is stored in session storage
    const storedToken = sessionStorage.getItem('csrf_token');
    expect(storedToken).toBeTruthy();
    expect(storedToken).toMatch(/^mock-csrf-token-/);
  });

  it('should refresh CSRF token when requested', async () => {
    render(
      <SecurityProvider>
        <TestComponent />
      </SecurityProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('security-ready')).toHaveTextContent('ready');
    });

    const initialToken = screen.getByTestId('csrf-token').textContent;

    // Refresh the token
    act(() => {
      screen.getByTestId('refresh-token').click();
    });

    await waitFor(() => {
      const newToken = screen.getByTestId('csrf-token').textContent;
      expect(newToken).not.toBe(initialToken);
    });
  });

  it('should throw error when used outside provider', () => {
    // Suppress console.error for this test
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      render(<TestComponent />);
    }).toThrow('useSecurity must be used within a SecurityProvider');

    consoleSpy.mockRestore();
  });

  it('should handle visibility change events', async () => {
    // Mock document.visibilityState
    Object.defineProperty(document, 'visibilityState', {
      writable: true,
      value: 'visible'
    });

    render(
      <SecurityProvider>
        <TestComponent />
      </SecurityProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('security-ready')).toHaveTextContent('ready');
    });

    const initialToken = screen.getByTestId('csrf-token').textContent;

    // Simulate page becoming hidden and then visible again
    act(() => {
      Object.defineProperty(document, 'visibilityState', {
        value: 'hidden'
      });
      document.dispatchEvent(new Event('visibilitychange'));
    });

    // Set an old timestamp to trigger token refresh
    sessionStorage.setItem('csrf_token_timestamp', (Date.now() - 2 * 60 * 60 * 1000).toString());

    act(() => {
      Object.defineProperty(document, 'visibilityState', {
        value: 'visible'
      });
      document.dispatchEvent(new Event('visibilitychange'));
    });

    await waitFor(() => {
      const newToken = screen.getByTestId('csrf-token').textContent;
      expect(newToken).not.toBe(initialToken);
    });
  });

  it('should not refresh token if timestamp is recent', async () => {
    render(
      <SecurityProvider>
        <TestComponent />
      </SecurityProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('security-ready')).toHaveTextContent('ready');
    });

    const initialToken = screen.getByTestId('csrf-token').textContent;

    // Set a recent timestamp
    sessionStorage.setItem('csrf_token_timestamp', Date.now().toString());

    // Simulate visibility change
    act(() => {
      Object.defineProperty(document, 'visibilityState', {
        value: 'visible'
      });
      document.dispatchEvent(new Event('visibilitychange'));
    });

    // Token should remain the same
    await waitFor(() => {
      const currentToken = screen.getByTestId('csrf-token').textContent;
      expect(currentToken).toBe(initialToken);
    });
  });
});

describe('SecurityProvider Integration', () => {
  it('should work with multiple child components', async () => {
    const ChildComponent1 = () => {
      const { csrfToken } = useSecurity();
      return <div data-testid="child1-token">{csrfToken}</div>;
    };

    const ChildComponent2 = () => {
      const { isSecurityReady } = useSecurity();
      return <div data-testid="child2-ready">{isSecurityReady ? 'ready' : 'not-ready'}</div>;
    };

    render(
      <SecurityProvider>
        <ChildComponent1 />
        <ChildComponent2 />
      </SecurityProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('child2-ready')).toHaveTextContent('ready');
    });

    // Both components should have access to the same context
    const token1 = screen.getByTestId('child1-token').textContent;
    expect(token1).toBeTruthy();
    expect(screen.getByTestId('child2-ready')).toHaveTextContent('ready');
  });

  it('should handle errors gracefully', async () => {
    // Mock generateCSRFToken to throw an error
    const { generateCSRFToken } = require('../../utils/securityValidation');
    generateCSRFToken.mockImplementation(() => {
      throw new Error('Token generation failed');
    });

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <SecurityProvider>
        <TestComponent />
      </SecurityProvider>
    );

    // Should handle the error and not crash
    await waitFor(() => {
      expect(screen.getByTestId('security-ready')).toHaveTextContent('not-ready');
    });

    expect(consoleSpy).toHaveBeenCalledWith(
      'Failed to initialize security context:',
      expect.any(Error)
    );

    consoleSpy.mockRestore();
  });
});

describe('SecurityProvider Performance', () => {
  it('should initialize quickly', async () => {
    const start = performance.now();
    
    render(
      <SecurityProvider>
        <TestComponent />
      </SecurityProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('security-ready')).toHaveTextContent('ready');
    });

    const end = performance.now();
    expect(end - start).toBeLessThan(100); // Should initialize in under 100ms
  });

  it('should not cause memory leaks with intervals', () => {
    const { unmount } = render(
      <SecurityProvider>
        <TestComponent />
      </SecurityProvider>
    );

    // Unmount should clean up intervals
    unmount();

    // No way to directly test interval cleanup, but unmounting should not throw
    expect(true).toBe(true);
  });
});