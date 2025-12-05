import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import LayoutContainer from '../LayoutContainer';

describe('LayoutContainer', () => {
  it('renders children correctly', () => {
    render(
      <LayoutContainer>
        <div>Test Content</div>
      </LayoutContainer>
    );
    
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('applies correct CSS classes', () => {
    const { container } = render(
      <LayoutContainer maxWidth="lg" className="custom-class">
        <div>Test Content</div>
      </LayoutContainer>
    );
    
    const layoutElement = container.firstChild;
    expect(layoutElement).toHaveClass('layout-main-content');
    expect(layoutElement).toHaveClass('layout-container-lg');
    expect(layoutElement).toHaveClass('custom-class');
  });

  it('applies full height when specified', () => {
    const { container } = render(
      <LayoutContainer fullHeight>
        <div>Test Content</div>
      </LayoutContainer>
    );
    
    const layoutElement = container.firstChild;
    expect(layoutElement).toHaveClass('layout-full-height');
  });

  it('handles custom padding values', () => {
    const { container } = render(
      <LayoutContainer padding="compact">
        <div>Test Content</div>
      </LayoutContainer>
    );
    
    const layoutElement = container.firstChild;
    expect(layoutElement).toHaveStyle({
      padding: 'var(--container-padding-sm)'
    });
  });
});