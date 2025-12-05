import React from 'react';
import PropTypes from 'prop-types';
import { Paper } from '@mui/material';
import '../../styles/layout.css';

/**
 * ContentWrapper - Standardized white background wrapper for page content
 * 
 * This component provides consistent white background containers with proper
 * padding, border radius, and shadow effects across all pages.
 */
const ContentWrapper = ({
  children,
  padding = 'default',
  elevation = 1,
  className = '',
  sx = {},
  ...props
}) => {
  // Determine padding class
  const getPaddingClass = () => {
    switch (padding) {
      case 'none': return '';
      case 'compact': return 'layout-card-compact';
      case 'default': return '';
      case 'spacious': return 'layout-card-spacious';
      default: return '';
    }
  };

  // Get padding value for sx
  const getPaddingValue = () => {
    if (typeof padding === 'string') {
      switch (padding) {
        case 'none': return 0;
        case 'compact': return 'var(--container-padding-md)';
        case 'default': return 'var(--container-padding-lg)';
        case 'spacious': return 'var(--spacing-xxl)';
        default: return 'var(--container-padding-lg)';
      }
    }
    return padding; // Allow custom padding values
  };

  const wrapperClasses = [
    'layout-content-wrapper',
    getPaddingClass(),
    className
  ].filter(Boolean).join(' ');

  const wrapperSx = {
    padding: getPaddingValue(),
    borderRadius: 'var(--border-radius-lg)',
    backgroundColor: 'var(--color-surface)',
    boxShadow: 'var(--shadow-sm)',
    width: '100%',
    boxSizing: 'border-box',
    marginBottom: 'var(--spacing-lg)',
    ...sx
  };

  return (
    <Paper
      className={wrapperClasses}
      elevation={elevation}
      sx={wrapperSx}
      {...props}
    >
      {children}
    </Paper>
  );
};

ContentWrapper.propTypes = {
  children: PropTypes.node.isRequired,
  padding: PropTypes.oneOfType([
    PropTypes.oneOf(['none', 'compact', 'default', 'spacious']),
    PropTypes.string,
    PropTypes.number
  ]),
  elevation: PropTypes.number,
  className: PropTypes.string,
  sx: PropTypes.object
};

export default ContentWrapper;