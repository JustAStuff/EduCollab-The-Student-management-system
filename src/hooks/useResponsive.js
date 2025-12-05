import { useState, useEffect } from 'react';

/**
 * useResponsive - Hook for responsive design breakpoints
 * 
 * This hook provides responsive breakpoint detection and utilities
 * for conditional rendering based on screen size.
 */

const breakpoints = {
  xs: 0,
  sm: 600,
  md: 960,
  lg: 1280,
  xl: 1920
};

export const useResponsive = () => {
  const [screenSize, setScreenSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0
  });

  const [currentBreakpoint, setCurrentBreakpoint] = useState('lg');

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      setScreenSize({ width, height });

      // Determine current breakpoint
      if (width >= breakpoints.xl) {
        setCurrentBreakpoint('xl');
      } else if (width >= breakpoints.lg) {
        setCurrentBreakpoint('lg');
      } else if (width >= breakpoints.md) {
        setCurrentBreakpoint('md');
      } else if (width >= breakpoints.sm) {
        setCurrentBreakpoint('sm');
      } else {
        setCurrentBreakpoint('xs');
      }
    };

    // Set initial values
    handleResize();

    // Add event listener
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Utility functions
  const isXs = currentBreakpoint === 'xs';
  const isSm = currentBreakpoint === 'sm';
  const isMd = currentBreakpoint === 'md';
  const isLg = currentBreakpoint === 'lg';
  const isXl = currentBreakpoint === 'xl';

  const isMobile = isXs || isSm;
  const isTablet = isMd;
  const isDesktop = isLg || isXl;

  const isUp = (breakpoint) => {
    return screenSize.width >= breakpoints[breakpoint];
  };

  const isDown = (breakpoint) => {
    return screenSize.width < breakpoints[breakpoint];
  };

  const isBetween = (start, end) => {
    return screenSize.width >= breakpoints[start] && screenSize.width < breakpoints[end];
  };

  return {
    screenSize,
    currentBreakpoint,
    breakpoints,
    isXs,
    isSm,
    isMd,
    isLg,
    isXl,
    isMobile,
    isTablet,
    isDesktop,
    isUp,
    isDown,
    isBetween
  };
};

export default useResponsive;