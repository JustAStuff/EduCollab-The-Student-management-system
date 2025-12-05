/**
 * Layout Configuration
 * 
 * Centralized configuration for layout dimensions, spacing, and responsive behavior.
 * This configuration is used by layout components and can be easily modified.
 */

export const layoutConfig = {
  // Sidebar configuration
  sidebar: {
    width: 240,
    collapsedWidth: 64
  },

  // Header configuration
  header: {
    height: 64
  },

  // Spacing system (in pixels)
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48
  },

  // Container padding for different screen sizes
  containerPadding: {
    xs: 16,
    sm: 20,
    md: 24,
    lg: 32
  },

  // Border radius values
  borderRadius: {
    sm: 6,
    md: 8,
    lg: 12
  },

  // Responsive breakpoints (in pixels)
  breakpoints: {
    xs: 0,
    sm: 600,
    md: 960,
    lg: 1280,
    xl: 1920
  },

  // Color palette
  colors: {
    background: '#F9FAFB',
    surface: '#FFFFFF',
    primary: '#106EBE',
    primaryHover: '#0A4E82',
    border: '#E0E0E0',
    shadow: 'rgba(0, 0, 0, 0.1)'
  },

  // Shadow definitions
  shadows: {
    sm: '0 1px 3px rgba(0, 0, 0, 0.1)',
    md: '0 4px 6px rgba(0, 0, 0, 0.1)',
    lg: '0 10px 15px rgba(0, 0, 0, 0.1)'
  },

  // Container max widths
  maxWidths: {
    xs: 444,
    sm: 600,
    md: 720,
    lg: 960,
    xl: 1200,
    full: '100%'
  },

  // Z-index scale
  zIndex: {
    drawer: 1200,
    modal: 1300,
    snackbar: 1400,
    tooltip: 1500
  }
};

export default layoutConfig;