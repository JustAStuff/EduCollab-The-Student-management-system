// src/components/common/LazyLoader.jsx - Lazy loading component with intersection observer
import { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { Box, CircularProgress, Skeleton } from '@mui/material';

const LazyLoader = ({ 
  children, 
  fallback = null, 
  threshold = 0.1, 
  rootMargin = '50px',
  onIntersect = null,
  height = 200,
  showSkeleton = true
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const elementRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasLoaded) {
          setIsVisible(true);
          setHasLoaded(true);
          
          if (onIntersect) {
            onIntersect();
          }
          
          // Disconnect after first intersection
          observer.disconnect();
        }
      },
      {
        threshold,
        rootMargin
      }
    );

    const currentElement = elementRef.current;
    if (currentElement) {
      observer.observe(currentElement);
    }

    return () => {
      if (currentElement) {
        observer.unobserve(currentElement);
      }
      observer.disconnect();
    };
  }, [threshold, rootMargin, onIntersect, hasLoaded]);

  const renderFallback = () => {
    if (fallback) {
      return fallback;
    }

    if (showSkeleton) {
      return (
        <Box sx={{ p: 2 }}>
          <Skeleton variant="rectangular" height={height} />
        </Box>
      );
    }

    return (
      <Box 
        sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center',
          height: height,
          p: 2
        }}
      >
        <CircularProgress size={24} />
      </Box>
    );
  };

  return (
    <Box ref={elementRef} sx={{ minHeight: height }}>
      {isVisible ? children : renderFallback()}
    </Box>
  );
};

LazyLoader.propTypes = {
  children: PropTypes.node.isRequired,
  fallback: PropTypes.node,
  threshold: PropTypes.number,
  rootMargin: PropTypes.string,
  onIntersect: PropTypes.func,
  height: PropTypes.number,
  showSkeleton: PropTypes.bool
};

export default LazyLoader;