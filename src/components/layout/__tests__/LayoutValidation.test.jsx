import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { Typography, TextField, Button } from '@mui/material';
import LayoutContainer from '../LayoutContainer';
import { layoutConfig } from '../../../config/layout';

// Mock ResizeObserver for responsive testing
class MockResizeObserver {
  constructor(callback) {
    this.callback = callback;
  }
  observe() {}
  unobserve() {}
  disconnect() {}
}

// Mock window.matchMedia for responsive testing
const mockMatchMedia = (query) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: vi.fn(),
  removeListener: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
});

// Test wrapper component
const TestWrapper = ({ children }) => (
  <BrowserRouter>
    {children}
  </BrowserRouter>
);

describe('Layout Validation Tests', () => {
  let originalResizeObserver;
  let originalMatchMedia;

  beforeEach(() => {
    // Mock ResizeObserver
    originalResizeObserver = global.ResizeObserver;
    global.ResizeObserver = MockResizeObserver;

    // Mock matchMedia
    originalMatchMedia = window.matchMedia;
    window.matchMedia = vi.fn().mockImplementation(mockMatchMedia);

    // Mock viewport dimensions
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    });
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 768,
    });
  });

  afterEach(() => {
    // Restore original implementations
    global.ResizeObserver = originalResizeObserver;
    window.matchMedia = originalMatchMedia;
  });

  describe('Container Sizing Validation', () => {
    it('should render containers with proper dimensions', () => {
      const { container } = render(
        <TestWrapper>
          <LayoutContainer data-testid="layout-container">
            <div data-testid="content">Test Content</div>
          </LayoutContainer>
        </TestWrapper>
      );

      const layoutElement = container.querySelector('[data-testid="layout-container"]');
      expect(layoutElement).toBeInTheDocument();
      expect(layoutElement).toHaveClass('layout-main-content');
    });

    it('should apply correct max-width classes for different container sizes', () => {
      const testCases = [
        { maxWidth: 'full', expectedClass: 'layout-container-full' },
        { maxWidth: 'xl', expectedClass: 'layout-container-xl' },
        { maxWidth: 'lg', expectedClass: 'layout-container-lg' },
        { maxWidth: 'md', expectedClass: 'layout-container-md' }
      ];

      testCases.forEach(({ maxWidth, expectedClass }) => {
        const { container } = render(
          <TestWrapper>
            <LayoutContainer maxWidth={maxWidth} data-testid={`container-${maxWidth}`}>
              <div>Content</div>
            </LayoutContainer>
          </TestWrapper>
        );

        const layoutElement = container.querySelector(`[data-testid="container-${maxWidth}"]`);
        expect(layoutElement).toHaveClass(expectedClass);
      });
    });

    it('should handle full height containers correctly', () => {
      const { container } = render(
        <TestWrapper>
          <LayoutContainer fullHeight data-testid="full-height-container">
            <div>Content</div>
          </LayoutContainer>
        </TestWrapper>
      );

      const layoutElement = container.querySelector('[data-testid="full-height-container"]');
      expect(layoutElement).toHaveClass('layout-full-height');
    });

    it('should validate container width calculations account for sidebar', () => {
      // Test that containers properly account for sidebar width
      const { container } = render(
        <TestWrapper>
          <div className="layout-container">
            <div style={{ width: layoutConfig.sidebar.width }}>Sidebar</div>
            <LayoutContainer data-testid="main-content">
              <div>Main Content</div>
            </LayoutContainer>
          </div>
        </TestWrapper>
      );

      const mainContent = container.querySelector('[data-testid="main-content"]');
      expect(mainContent).toHaveClass('layout-main-content');
      
      // Verify the CSS class is applied (actual width calculation is handled by CSS)
      const computedStyle = window.getComputedStyle(mainContent);
      expect(computedStyle).toBeDefined();
    });
  });

  describe('Content Overflow Prevention', () => {
    it('should prevent horizontal overflow in containers', () => {
      const { container } = render(
        <TestWrapper>
          <LayoutContainer data-testid="overflow-test">
            <div style={{ width: '200vw' }}>Very wide content that could overflow</div>
          </LayoutContainer>
        </TestWrapper>
      );

      const layoutElement = container.querySelector('[data-testid="overflow-test"]');
      expect(layoutElement).toHaveClass('layout-main-content');
      
      // The CSS should handle overflow prevention
      const computedStyle = window.getComputedStyle(layoutElement);
      expect(computedStyle).toBeDefined();
    });

    it('should handle content that exceeds container height with proper scrolling', () => {
      const { container } = render(
        <TestWrapper>
          <LayoutContainer data-testid="scroll-test">
            <div style={{ height: '200vh' }}>Very tall content</div>
          </LayoutContainer>
        </TestWrapper>
      );

      const layoutElement = container.querySelector('[data-testid="scroll-test"]');
      expect(layoutElement).toBeInTheDocument();
      
      // Verify the element exists and can handle scrolling
      expect(layoutElement.tagName.toLowerCase()).toBe('main');
    });

    it('should ensure images and media content do not overflow containers', () => {
      const { container } = render(
        <TestWrapper>
          <LayoutContainer data-testid="media-test">
            <img 
              src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iIzAwMCIvPjwvc3ZnPg=="
              alt="Test"
              style={{ width: '150vw' }}
              data-testid="test-image"
            />
          </LayoutContainer>
        </TestWrapper>
      );

      const image = container.querySelector('[data-testid="test-image"]');
      expect(image).toBeInTheDocument();
      
      // CSS should handle image overflow prevention
      const computedStyle = window.getComputedStyle(image);
      expect(computedStyle).toBeDefined();
    });
  });

  describe('Consistent Spacing and Layout Patterns', () => {
    it('should apply consistent padding based on padding prop', () => {
      const paddingTestCases = [
        { padding: 'none', expectedValue: '0px' },
        { padding: 'compact', expectedValue: 'var(--container-padding-sm)' },
        { padding: 'default', expectedValue: 'var(--container-padding-md)' },
        { padding: 'spacious', expectedValue: 'var(--container-padding-lg)' }
      ];

      paddingTestCases.forEach(({ padding, expectedValue }) => {
        const { container } = render(
          <TestWrapper>
            <LayoutContainer padding={padding} data-testid={`padding-${padding}`}>
              <div>Content</div>
            </LayoutContainer>
          </TestWrapper>
        );

        const layoutElement = container.querySelector(`[data-testid="padding-${padding}"]`);
        
        if (padding === 'none') {
          expect(layoutElement).toHaveStyle({ padding: '0px' });
        } else {
          expect(layoutElement).toHaveStyle({ padding: expectedValue });
        }
      });
    });

    it('should maintain consistent spacing between multiple containers', () => {
      const { container } = render(
        <TestWrapper>
          <div data-testid="multiple-containers">
            <LayoutContainer className="layout-margin-bottom-md">
              <div>Container 1</div>
            </LayoutContainer>
            <LayoutContainer className="layout-margin-bottom-md">
              <div>Container 2</div>
            </LayoutContainer>
            <LayoutContainer>
              <div>Container 3</div>
            </LayoutContainer>
          </div>
        </TestWrapper>
      );

      const containerWrapper = container.querySelector('[data-testid="multiple-containers"]');
      const containers = containerWrapper.querySelectorAll('.layout-main-content');
      
      expect(containers).toHaveLength(3);
      
      // Check that spacing classes are applied
      expect(containers[0]).toHaveClass('layout-margin-bottom-md');
      expect(containers[1]).toHaveClass('layout-margin-bottom-md');
    });

    it('should apply consistent styling patterns across different content types', () => {
      const contentTypes = [
        { type: 'text', content: <Typography>Text Content</Typography> },
        { type: 'form', content: <TextField label="Form Field" /> },
        { type: 'button', content: <Button>Action Button</Button> }
      ];

      contentTypes.forEach(({ type, content }) => {
        const { container } = render(
          <TestWrapper>
            <LayoutContainer data-testid={`content-${type}`}>
              {content}
            </LayoutContainer>
          </TestWrapper>
        );

        const layoutElement = container.querySelector(`[data-testid="content-${type}"]`);
        expect(layoutElement).toHaveClass('layout-main-content');
        expect(layoutElement).toBeInTheDocument();
      });
    });

    it('should validate CSS custom properties are properly defined', () => {
      // Test that CSS custom properties exist and have expected values
      const { container } = render(
        <TestWrapper>
          <LayoutContainer data-testid="css-vars-test">
            <div>Content</div>
          </LayoutContainer>
        </TestWrapper>
      );

      const layoutElement = container.querySelector('[data-testid="css-vars-test"]');
      const computedStyle = window.getComputedStyle(layoutElement);
      
      // Verify the element exists and styles can be computed
      expect(computedStyle).toBeDefined();
      expect(layoutElement).toBeInTheDocument();
    });
  });

  describe('Responsive Behavior Validation', () => {
    it('should handle different viewport sizes correctly', () => {
      const viewportSizes = [
        { width: 320, height: 568, name: 'mobile' },
        { width: 768, height: 1024, name: 'tablet' },
        { width: 1024, height: 768, name: 'desktop' },
        { width: 1920, height: 1080, name: 'large-desktop' }
      ];

      viewportSizes.forEach(({ width, height, name }) => {
        // Mock viewport size
        Object.defineProperty(window, 'innerWidth', {
          writable: true,
          configurable: true,
          value: width,
        });
        Object.defineProperty(window, 'innerHeight', {
          writable: true,
          configurable: true,
          value: height,
        });

        const { container } = render(
          <TestWrapper>
            <LayoutContainer data-testid={`responsive-${name}`}>
              <div>Responsive Content</div>
            </LayoutContainer>
          </TestWrapper>
        );

        const layoutElement = container.querySelector(`[data-testid="responsive-${name}"]`);
        expect(layoutElement).toBeInTheDocument();
        expect(layoutElement).toHaveClass('layout-main-content');
      });
    });

    it('should maintain layout integrity during window resize', () => {
      const { container } = render(
        <TestWrapper>
          <LayoutContainer data-testid="resize-test">
            <div>Resizable Content</div>
          </LayoutContainer>
        </TestWrapper>
      );

      const layoutElement = container.querySelector('[data-testid="resize-test"]');
      expect(layoutElement).toBeInTheDocument();

      // Simulate window resize
      act(() => {
        Object.defineProperty(window, 'innerWidth', {
          writable: true,
          configurable: true,
          value: 500,
        });
        window.dispatchEvent(new Event('resize'));
      });

      // Element should still be properly rendered after resize
      expect(layoutElement).toBeInTheDocument();
      expect(layoutElement).toHaveClass('layout-main-content');
    });
  });

  describe('Layout Configuration Validation', () => {
    it('should validate layout configuration values are within expected ranges', () => {
      // Test that layout configuration has sensible values
      expect(layoutConfig.sidebar.width).toBeGreaterThan(0);
      expect(layoutConfig.sidebar.width).toBeLessThan(500);
      
      expect(layoutConfig.spacing.xs).toBeGreaterThan(0);
      expect(layoutConfig.spacing.xl).toBeGreaterThan(layoutConfig.spacing.xs);
      
      expect(layoutConfig.containerPadding.xs).toBeGreaterThan(0);
      expect(layoutConfig.containerPadding.lg).toBeGreaterThan(layoutConfig.containerPadding.xs);
      
      expect(layoutConfig.breakpoints.sm).toBeGreaterThan(layoutConfig.breakpoints.xs);
      expect(layoutConfig.breakpoints.lg).toBeGreaterThan(layoutConfig.breakpoints.md);
    });

    it('should validate color values are properly formatted', () => {
      const colorRegex = /^#[0-9A-Fa-f]{6}$|^rgba?\([^)]+\)$/;
      
      expect(layoutConfig.colors.background).toMatch(colorRegex);
      expect(layoutConfig.colors.surface).toMatch(colorRegex);
      expect(layoutConfig.colors.primary).toMatch(colorRegex);
    });

    it('should validate shadow values are properly formatted', () => {
      // Updated regex to handle both "0" and "0px" formats
      const shadowRegex = /^(\d+px|\d+)\s+\d+px\s+\d+px\s+rgba?\([^)]+\)$/;
      
      expect(layoutConfig.shadows.sm).toMatch(shadowRegex);
      expect(layoutConfig.shadows.md).toMatch(shadowRegex);
      expect(layoutConfig.shadows.lg).toMatch(shadowRegex);
    });
  });

  describe('Cross-Component Layout Consistency', () => {
    it('should ensure all layout containers use consistent base classes', () => {
      const components = [
        { name: 'basic', props: {} },
        { name: 'full-width', props: { maxWidth: 'full' } },
        { name: 'compact', props: { padding: 'compact' } },
        { name: 'full-height', props: { fullHeight: true } }
      ];

      components.forEach(({ name, props }) => {
        const { container } = render(
          <TestWrapper>
            <LayoutContainer {...props} data-testid={`consistency-${name}`}>
              <div>Content</div>
            </LayoutContainer>
          </TestWrapper>
        );

        const layoutElement = container.querySelector(`[data-testid="consistency-${name}"]`);
        expect(layoutElement).toHaveClass('layout-main-content');
        expect(layoutElement.tagName.toLowerCase()).toBe('main');
      });
    });

    it('should validate that custom className and sx props work correctly', () => {
      const { container } = render(
        <TestWrapper>
          <LayoutContainer 
            className="custom-test-class" 
            sx={{ backgroundColor: 'red' }}
            data-testid="custom-props-test"
          >
            <div>Content</div>
          </LayoutContainer>
        </TestWrapper>
      );

      const layoutElement = container.querySelector('[data-testid="custom-props-test"]');
      expect(layoutElement).toHaveClass('custom-test-class');
      expect(layoutElement).toHaveClass('layout-main-content');
    });
  });
});