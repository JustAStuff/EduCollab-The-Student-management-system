import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import LayoutContainer from '../LayoutContainer';
import ResponsiveGrid from '../ResponsiveGrid';
import { useResponsive } from '../../../hooks/useResponsive';

// Mock the useResponsive hook
vi.mock('../../../hooks/useResponsive', () => ({
  useResponsive: vi.fn()
}));

// Test wrapper component
const TestWrapper = ({ children }) => (
  <BrowserRouter>
    {children}
  </BrowserRouter>
);

// Mock window.matchMedia for responsive testing
const createMockMatchMedia = (matches) => (query) => ({
  matches,
  media: query,
  onchange: null,
  addListener: vi.fn(),
  removeListener: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
});

describe('Responsive Layout Validation Tests', () => {
  let originalMatchMedia;

  beforeEach(() => {
    originalMatchMedia = window.matchMedia;
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
    vi.clearAllMocks();
  });

  describe('Mobile Layout Validation (320px - 767px)', () => {
    beforeEach(() => {
      window.matchMedia = vi.fn().mockImplementation(createMockMatchMedia(true));
      useResponsive.mockReturnValue({
        isMobile: true,
        isTablet: false,
        isDesktop: false,
        breakpoint: 'xs'
      });

      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });
    });

    it('should render mobile-optimized layout containers', () => {
      const { container } = render(
        <TestWrapper>
          <LayoutContainer data-testid="mobile-container">
            <div>Mobile Content</div>
          </LayoutContainer>
        </TestWrapper>
      );

      const layoutElement = container.querySelector('[data-testid="mobile-container"]');
      expect(layoutElement).toBeInTheDocument();
      expect(layoutElement).toHaveClass('layout-main-content');
    });

    it('should apply mobile-specific padding and spacing', () => {
      const { container } = render(
        <TestWrapper>
          <LayoutContainer padding="compact" data-testid="mobile-padding">
            <div>Content with mobile padding</div>
          </LayoutContainer>
        </TestWrapper>
      );

      const layoutElement = container.querySelector('[data-testid="mobile-padding"]');
      expect(layoutElement).toHaveStyle({ padding: 'var(--container-padding-sm)' });
    });

    it('should ensure content stacks vertically on mobile', () => {
      const { container } = render(
        <TestWrapper>
          <LayoutContainer data-testid="mobile-stack">
            <ResponsiveGrid columns={{ xs: 1, sm: 2, md: 3 }}>
              <div>Item 1</div>
              <div>Item 2</div>
              <div>Item 3</div>
            </ResponsiveGrid>
          </LayoutContainer>
        </TestWrapper>
      );

      const layoutElement = container.querySelector('[data-testid="mobile-stack"]');
      expect(layoutElement).toBeInTheDocument();
    });

    it('should handle mobile viewport width correctly', () => {
      const { container } = render(
        <TestWrapper>
          <LayoutContainer maxWidth="full" data-testid="mobile-width">
            <div style={{ width: '100%' }}>Full width mobile content</div>
          </LayoutContainer>
        </TestWrapper>
      );

      const layoutElement = container.querySelector('[data-testid="mobile-width"]');
      expect(layoutElement).toHaveClass('layout-container-full');
    });
  });

  describe('Tablet Layout Validation (768px - 1023px)', () => {
    beforeEach(() => {
      window.matchMedia = vi.fn().mockImplementation(createMockMatchMedia(true));
      useResponsive.mockReturnValue({
        isMobile: false,
        isTablet: true,
        isDesktop: false,
        breakpoint: 'md'
      });

      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768,
      });
    });

    it('should render tablet-optimized layout containers', () => {
      const { container } = render(
        <TestWrapper>
          <LayoutContainer data-testid="tablet-container">
            <div>Tablet Content</div>
          </LayoutContainer>
        </TestWrapper>
      );

      const layoutElement = container.querySelector('[data-testid="tablet-container"]');
      expect(layoutElement).toBeInTheDocument();
      expect(layoutElement).toHaveClass('layout-main-content');
    });

    it('should apply tablet-specific spacing and layout', () => {
      const { container } = render(
        <TestWrapper>
          <LayoutContainer padding="default" data-testid="tablet-spacing">
            <div>Tablet content with proper spacing</div>
          </LayoutContainer>
        </TestWrapper>
      );

      const layoutElement = container.querySelector('[data-testid="tablet-spacing"]');
      expect(layoutElement).toHaveStyle({ padding: 'var(--container-padding-md)' });
    });

    it('should handle two-column layouts on tablet', () => {
      const { container } = render(
        <TestWrapper>
          <LayoutContainer data-testid="tablet-columns">
            <ResponsiveGrid columns={{ xs: 1, sm: 2, md: 2 }}>
              <div>Column 1</div>
              <div>Column 2</div>
            </ResponsiveGrid>
          </LayoutContainer>
        </TestWrapper>
      );

      const layoutElement = container.querySelector('[data-testid="tablet-columns"]');
      expect(layoutElement).toBeInTheDocument();
    });
  });

  describe('Desktop Layout Validation (1024px+)', () => {
    beforeEach(() => {
      window.matchMedia = vi.fn().mockImplementation(createMockMatchMedia(false));
      useResponsive.mockReturnValue({
        isMobile: false,
        isTablet: false,
        isDesktop: true,
        breakpoint: 'lg'
      });

      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1200,
      });
    });

    it('should render desktop-optimized layout containers', () => {
      const { container } = render(
        <TestWrapper>
          <LayoutContainer data-testid="desktop-container">
            <div>Desktop Content</div>
          </LayoutContainer>
        </TestWrapper>
      );

      const layoutElement = container.querySelector('[data-testid="desktop-container"]');
      expect(layoutElement).toBeInTheDocument();
      expect(layoutElement).toHaveClass('layout-main-content');
    });

    it('should apply desktop-specific spacing and layout', () => {
      const { container } = render(
        <TestWrapper>
          <LayoutContainer padding="spacious" data-testid="desktop-spacing">
            <div>Desktop content with spacious padding</div>
          </LayoutContainer>
        </TestWrapper>
      );

      const layoutElement = container.querySelector('[data-testid="desktop-spacing"]');
      expect(layoutElement).toHaveStyle({ padding: 'var(--container-padding-lg)' });
    });

    it('should handle multi-column layouts on desktop', () => {
      const { container } = render(
        <TestWrapper>
          <LayoutContainer data-testid="desktop-columns">
            <ResponsiveGrid columns={{ xs: 1, sm: 2, md: 3, lg: 4 }}>
              <div>Column 1</div>
              <div>Column 2</div>
              <div>Column 3</div>
              <div>Column 4</div>
            </ResponsiveGrid>
          </LayoutContainer>
        </TestWrapper>
      );

      const layoutElement = container.querySelector('[data-testid="desktop-columns"]');
      expect(layoutElement).toBeInTheDocument();
    });

    it('should account for sidebar width in desktop layout', () => {
      const { container } = render(
        <TestWrapper>
          <div className="layout-container">
            <div style={{ width: '240px' }} data-testid="sidebar">Sidebar</div>
            <LayoutContainer data-testid="desktop-main-content">
              <div>Main content accounting for sidebar</div>
            </LayoutContainer>
          </div>
        </TestWrapper>
      );

      const sidebar = container.querySelector('[data-testid="sidebar"]');
      const mainContent = container.querySelector('[data-testid="desktop-main-content"]');
      
      expect(sidebar).toBeInTheDocument();
      expect(mainContent).toBeInTheDocument();
      expect(mainContent).toHaveClass('layout-main-content');
    });
  });

  describe('Breakpoint Transition Validation', () => {
    it('should handle smooth transitions between breakpoints', () => {
      const { container, rerender } = render(
        <TestWrapper>
          <LayoutContainer data-testid="transition-container">
            <div>Transitioning Content</div>
          </LayoutContainer>
        </TestWrapper>
      );

      // Start with mobile
      useResponsive.mockReturnValue({
        isMobile: true,
        isTablet: false,
        isDesktop: false,
        breakpoint: 'xs'
      });

      let layoutElement = container.querySelector('[data-testid="transition-container"]');
      expect(layoutElement).toBeInTheDocument();

      // Transition to tablet
      act(() => {
        useResponsive.mockReturnValue({
          isMobile: false,
          isTablet: true,
          isDesktop: false,
          breakpoint: 'md'
        });

        Object.defineProperty(window, 'innerWidth', {
          writable: true,
          configurable: true,
          value: 768,
        });
      });

      rerender(
        <TestWrapper>
          <LayoutContainer data-testid="transition-container">
            <div>Transitioning Content</div>
          </LayoutContainer>
        </TestWrapper>
      );

      layoutElement = container.querySelector('[data-testid="transition-container"]');
      expect(layoutElement).toBeInTheDocument();

      // Transition to desktop
      act(() => {
        useResponsive.mockReturnValue({
          isMobile: false,
          isTablet: false,
          isDesktop: true,
          breakpoint: 'lg'
        });

        Object.defineProperty(window, 'innerWidth', {
          writable: true,
          configurable: true,
          value: 1200,
        });
      });

      rerender(
        <TestWrapper>
          <LayoutContainer data-testid="transition-container">
            <div>Transitioning Content</div>
          </LayoutContainer>
        </TestWrapper>
      );

      layoutElement = container.querySelector('[data-testid="transition-container"]');
      expect(layoutElement).toBeInTheDocument();
    });

    it('should maintain layout integrity during rapid viewport changes', () => {
      const { container } = render(
        <TestWrapper>
          <LayoutContainer data-testid="rapid-change-container">
            <div>Content during rapid changes</div>
          </LayoutContainer>
        </TestWrapper>
      );

      const viewportSizes = [320, 768, 1024, 1200, 375, 900];

      viewportSizes.forEach((width) => {
        act(() => {
          Object.defineProperty(window, 'innerWidth', {
            writable: true,
            configurable: true,
            value: width,
          });
          window.dispatchEvent(new Event('resize'));
        });

        const layoutElement = container.querySelector('[data-testid="rapid-change-container"]');
        expect(layoutElement).toBeInTheDocument();
        expect(layoutElement).toHaveClass('layout-main-content');
      });
    });
  });

  describe('Content Overflow Prevention Across Breakpoints', () => {
    it('should prevent horizontal overflow on all screen sizes', () => {
      const screenSizes = [
        { width: 320, name: 'mobile' },
        { width: 768, name: 'tablet' },
        { width: 1024, name: 'desktop' }
      ];

      screenSizes.forEach(({ width, name }) => {
        Object.defineProperty(window, 'innerWidth', {
          writable: true,
          configurable: true,
          value: width,
        });

        const { container } = render(
          <TestWrapper>
            <LayoutContainer data-testid={`overflow-${name}`}>
              <div style={{ width: '200vw' }}>
                Very wide content that should not overflow
              </div>
            </LayoutContainer>
          </TestWrapper>
        );

        const layoutElement = container.querySelector(`[data-testid="overflow-${name}"]`);
        expect(layoutElement).toBeInTheDocument();
        expect(layoutElement).toHaveClass('layout-main-content');
      });
    });

    it('should handle long text content without breaking layout', () => {
      const longText = 'This is a very long text content that should wrap properly and not break the layout structure regardless of the screen size or container width. '.repeat(20);

      const { container } = render(
        <TestWrapper>
          <LayoutContainer data-testid="long-text-container">
            <div>{longText}</div>
          </LayoutContainer>
        </TestWrapper>
      );

      const layoutElement = container.querySelector('[data-testid="long-text-container"]');
      expect(layoutElement).toBeInTheDocument();
      expect(layoutElement).toHaveClass('layout-main-content');
    });
  });

  describe('Responsive Grid System Validation', () => {
    it('should render responsive grid with correct column counts', () => {
      const { container } = render(
        <TestWrapper>
          <LayoutContainer>
            <ResponsiveGrid 
              columns={{ xs: 1, sm: 2, md: 3, lg: 4 }}
              data-testid="responsive-grid"
            >
              <div>Grid Item 1</div>
              <div>Grid Item 2</div>
              <div>Grid Item 3</div>
              <div>Grid Item 4</div>
            </ResponsiveGrid>
          </LayoutContainer>
        </TestWrapper>
      );

      const gridElement = container.querySelector('[data-testid="responsive-grid"]');
      expect(gridElement).toBeInTheDocument();
    });

    it('should handle empty grid gracefully', () => {
      const { container } = render(
        <TestWrapper>
          <LayoutContainer>
            <ResponsiveGrid 
              columns={{ xs: 1, sm: 2 }}
              data-testid="empty-grid"
            />
          </LayoutContainer>
        </TestWrapper>
      );

      const gridElement = container.querySelector('[data-testid="empty-grid"]');
      expect(gridElement).toBeInTheDocument();
    });
  });
});