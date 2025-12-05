import React from 'react';
import PropTypes from 'prop-types';
import { Box } from '@mui/material';
import '../../styles/layout.css';

/**
 * ResponsiveGrid - Flexible grid system for responsive layouts
 * 
 * This component provides a CSS Grid-based layout system that automatically
 * adapts to different screen sizes with proper spacing and responsive behavior.
 */
const ResponsiveGrid = ({
  children,
  columns = 1,
  spacing = 'lg',
  className = '',
  sx = {},
  ...props
}) => {
  // Determine grid columns class
  const getColumnsClass = () => {
    switch (columns) {
      case 1: return 'layout-grid-1';
      case 2: return 'layout-grid-2';
      case 3: return 'layout-grid-3';
      case 4: return 'layout-grid-4';
      default: return 'layout-grid-1';
    }
  };

  // Determine spacing class
  const getSpacingClass = () => {
    switch (spacing) {
      case 'xs': return 'layout-spacing-xs';
      case 'sm': return 'layout-spacing-sm';
      case 'md': return 'layout-spacing-md';
      case 'lg': return 'layout-spacing-lg';
      case 'xl': return 'layout-spacing-xl';
      default: return 'layout-spacing-lg';
    }
  };

  // Get gap value for sx
  const getGapValue = () => {
    switch (spacing) {
      case 'xs': return 'var(--spacing-xs)';
      case 'sm': return 'var(--spacing-sm)';
      case 'md': return 'var(--spacing-md)';
      case 'lg': return 'var(--spacing-lg)';
      case 'xl': return 'var(--spacing-xl)';
      default: return 'var(--spacing-lg)';
    }
  };

  const gridClasses = [
    'layout-grid',
    getColumnsClass(),
    getSpacingClass(),
    className
  ].filter(Boolean).join(' ');

  const gridSx = {
    display: 'grid',
    gap: getGapValue(),
    width: '100%',
    ...sx
  };

  return (
    <Box
      className={gridClasses}
      sx={gridSx}
      {...props}
    >
      {children}
    </Box>
  );
};

ResponsiveGrid.propTypes = {
  children: PropTypes.node.isRequired,
  columns: PropTypes.oneOf([1, 2, 3, 4]),
  spacing: PropTypes.oneOf(['xs', 'sm', 'md', 'lg', 'xl']),
  className: PropTypes.string,
  sx: PropTypes.object
};

export default ResponsiveGrid;