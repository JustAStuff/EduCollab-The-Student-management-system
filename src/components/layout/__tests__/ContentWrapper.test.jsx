import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import ContentWrapper from '../ContentWrapper';

describe('ContentWrapper', () => {
  it('renders children correctly', () => {
    render(
      <ContentWrapper>
        <div>Test Content</div>
      </ContentWrapper>
    );
    
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('applies correct CSS classes', () => {
    const { container } = render(
      <ContentWrapper padding="compact" className="custom-class">
        <div>Test Content</div>
      </ContentWrapper>
    );
    
    const wrapperElement = container.firstChild;
    expect(wrapperElement).toHaveClass('layout-content-wrapper');
    expect(wrapperElement).toHaveClass('layout-card-compact');
    expect(wrapperElement).toHaveClass('custom-class');
  });

  it('applies default styling', () => {
    const { container } = render(
      <ContentWrapper>
        <div>Test Content</div>
      </ContentWrapper>
    );
    
    const wrapperElement = container.firstChild;
    expect(wrapperElement).toHaveStyle({
      backgroundColor: 'var(--color-surface)',
      borderRadius: 'var(--border-radius-lg)',
      boxShadow: 'var(--shadow-sm)'
    });
  });
});