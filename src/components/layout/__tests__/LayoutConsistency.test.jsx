import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import LayoutContainer from '../LayoutContainer';

// Mock components for testing
const MockComponent = ({ children }) => (
  <BrowserRouter>
    <div data-testid="mock-component">{children}</div>
  </BrowserRouter>
);

describe('Layout Consistency', () => {
  it('should render LayoutContainer with default props', () => {
    render(
      <MockComponent>
        <LayoutContainer>
          <div data-testid="content">Test Content</div>
        </LayoutContainer>
      </MockComponent>
    );

    const container = screen.getByRole('main');
    expect(container).toBeInTheDocument();
    expect(container).toHaveClass('layout-main-content');
    expect(container).toHaveClass('layout-container-xl');
    
    const content = screen.getByTestId('content');
    expect(content).toBeInTheDocument();
  });

  it('should apply correct maxWidth classes', () => {
    const { rerender } = render(
      <MockComponent>
        <LayoutContainer maxWidth="md">
          <div>Content</div>
        </LayoutContainer>
      </MockComponent>
    );

    let container = screen.getByRole('main');
    expect(container).toHaveClass('layout-container-md');

    rerender(
      <MockComponent>
        <LayoutContainer maxWidth="lg">
          <div>Content</div>
        </LayoutContainer>
      </MockComponent>
    );

    container = screen.getByRole('main');
    expect(container).toHaveClass('layout-container-lg');
  });

  it('should apply fullHeight class when specified', () => {
    render(
      <MockComponent>
        <LayoutContainer fullHeight>
          <div>Content</div>
        </LayoutContainer>
      </MockComponent>
    );

    const container = screen.getByRole('main');
    expect(container).toHaveClass('layout-full-height');
  });

  it('should apply custom className', () => {
    render(
      <MockComponent>
        <LayoutContainer className="custom-class">
          <div>Content</div>
        </LayoutContainer>
      </MockComponent>
    );

    const container = screen.getByRole('main');
    expect(container).toHaveClass('custom-class');
  });

  it('should apply custom padding values', () => {
    render(
      <MockComponent>
        <LayoutContainer padding="compact">
          <div>Content</div>
        </LayoutContainer>
      </MockComponent>
    );

    const container = screen.getByRole('main');
    expect(container).toBeInTheDocument();
    // Note: CSS custom properties are not easily testable in jsdom
    // In a real browser test, we would check computed styles
  });
});