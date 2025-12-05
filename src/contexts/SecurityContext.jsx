import React, { createContext, useContext, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { generateCSRFToken } from '../utils/securityValidation';

const SecurityContext = createContext();

/**
 * Security Context Provider - Manages CSRF tokens and security state
 */
export const SecurityProvider = ({ children }) => {
  const [csrfToken, setCsrfToken] = useState(null);
  const [isSecurityReady, setIsSecurityReady] = useState(false);

  // Generate and store CSRF token on mount
  useEffect(() => {
    const initializeSecurity = () => {
      try {
        // Generate new CSRF token
        const token = generateCSRFToken();
        setCsrfToken(token);
        
        // Store in session storage for validation
        sessionStorage.setItem('csrf_token', token);
        
        setIsSecurityReady(true);
      } catch (error) {
        console.error('Failed to initialize security context:', error);
        setIsSecurityReady(false);
      }
    };

    initializeSecurity();

    // Regenerate token periodically (every 30 minutes)
    const tokenRefreshInterval = setInterval(() => {
      initializeSecurity();
    }, 30 * 60 * 1000);

    return () => {
      clearInterval(tokenRefreshInterval);
    };
  }, []);

  // Regenerate token when user navigates away and back
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Check if token is still valid (not older than 1 hour)
        const tokenTimestamp = sessionStorage.getItem('csrf_token_timestamp');
        const now = Date.now();
        const oneHour = 60 * 60 * 1000;
        
        if (!tokenTimestamp || (now - parseInt(tokenTimestamp)) > oneHour) {
          const token = generateCSRFToken();
          setCsrfToken(token);
          sessionStorage.setItem('csrf_token', token);
          sessionStorage.setItem('csrf_token_timestamp', now.toString());
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const refreshCSRFToken = () => {
    const token = generateCSRFToken();
    setCsrfToken(token);
    sessionStorage.setItem('csrf_token', token);
    sessionStorage.setItem('csrf_token_timestamp', Date.now().toString());
    return token;
  };

  const value = {
    csrfToken,
    isSecurityReady,
    refreshCSRFToken,
  };

  return (
    <SecurityContext.Provider value={value}>
      {children}
    </SecurityContext.Provider>
  );
};

SecurityProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

/**
 * Hook to use security context
 */
export const useSecurity = () => {
  const context = useContext(SecurityContext);
  if (!context) {
    throw new Error('useSecurity must be used within a SecurityProvider');
  }
  return context;
};

export default SecurityContext;