import React from 'react';
import PropTypes from 'prop-types';
import { Box } from '@mui/material';
import Sidebar from '../../Sidebar';
import LayoutContainer from './LayoutContainer';
import '../../styles/layout.css';

/**
 * PageLayout - Main layout wrapper that includes sidebar and content area
 * 
 * This component provides the standard page layout structure with sidebar
 * and properly sized main content area that accounts for sidebar width.
 */
const PageLayout = ({
  children,
  includeSidebar = true,
  maxWidth = 'xl',
  padding = 'default',
  fullHeight = false,
  className = '',
  sx = {},
  ...props
}) => {
  const layoutClasses = [
    'layout-container',
    className
  ].filter(Boolean).join(' ');

  const layoutSx = {
    display: 'flex',
    minHeight: '100vh',
    width: '100vw',
    backgroundColor: 'var(--color-background)',
    fontFamily: "'Roboto', sans-serif",
    ...sx
  };

  return (
    <Box
      className={layoutClasses}
      sx={layoutSx}
      {...props}
    >
      {includeSidebar && <Sidebar />}
      
      <LayoutContainer
        maxWidth={maxWidth}
        padding={padding}
        fullHeight={fullHeight}
        sx={{
          flexGrow: 1,
          width: includeSidebar ? 'calc(100vw - var(--sidebar-width))' : '100vw',
          overflow: 'auto'
        }}
      >
        {children}
      </LayoutContainer>
    </Box>
  );
};

PageLayout.propTypes = {
  children: PropTypes.node.isRequired,
  includeSidebar: PropTypes.bool,
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

export default PageLayout;