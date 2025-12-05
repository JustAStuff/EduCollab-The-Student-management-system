import React from 'react';
import PropTypes from 'prop-types';
import { Box } from '@mui/material';
import '../../styles/layout.css';

/**
 * LayoutContainer - Standardized container component for consistent sizing and spacing
 * 
 * This component provides a consistent layout structure across all pages,
 * ensuring proper container sizing, responsive behavior, and unified styling.
 */
const LayoutContainer = ({
  children,
  maxWidth = 'xl',
  padding = 'default',
  fullHeight = false,
  className = '',
  sx = {},
  ...props
}) => {
  // Determine container max width
  const getMaxWidthClass = () => {
    switch (maxWidth) {
      case 'full': return 'layout-container-full';
      case 'xl': return 'layout-container-xl';
      case 'lg': return 'layout-container-lg';
      case 'md': return 'layout-container-md';
      default: return 'layout-container-xl';
    }
  };

  // Determine padding based on prop
  const getPaddingValue = () => {
    if (typeof padding === 'string') {
      switch (padding) {
        case 'none': return 0;
        case 'compact': return 'var(--container-padding-sm)';
        case 'default': return 'var(--container-padding-md)';
        case 'spacious': return 'var(--container-padding-lg)';
        default: return 'var(--container-padding-md)';
      }
    }
    return padding; // Allow custom padding values
  };

  const containerClasses = [
    'layout-main-content',
    getMaxWidthClass(),
    fullHeight ? 'layout-full-height' : '',
    className
  ].filter(Boolean).join(' ');

  const containerSx = {
    padding: getPaddingValue(),
    ...sx
  };

  return (
    <Box
      component="main"
      className={containerClasses}
      sx={containerSx}
      {...props}
    >
      {children}
    </Box>
  );
};

LayoutContainer.propTypes = {
  children: PropTypes.node.isRequired,
  maxWidth: PropTypes.oneOf(['full', 'xl', 'lg', 'md']),
  padding: PropTypes.oneOfType([
    PropTypes.oneOf(['none', 'compact', 'default', 'spacious']),
    PropTypes.string,
    PropTypes.number
  ]),
  fullHeight: PropTypes.bool,
  className: PropTypes.string,
  sx: PropTypes.object
};

export default LayoutContainer;