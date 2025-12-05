# Layout Components

This directory contains standardized layout components and utilities for consistent UI layout across the application.

## Components

### PageLayout
Main layout wrapper that includes sidebar and content area with proper responsive behavior.

```jsx
import { PageLayout } from './components/layout';

function MyPage() {
  return (
    <PageLayout maxWidth="xl" padding="default">
      {/* Your page content */}
    </PageLayout>
  );
}
```

**Props:**
- `includeSidebar` (boolean): Whether to include the sidebar (default: true)
- `maxWidth` (string): Container max width - 'full', 'xl', 'lg', 'md' (default: 'xl')
- `padding` (string): Container padding - 'none', 'compact', 'default', 'spacious' (default: 'default')
- `fullHeight` (boolean): Whether container should take full viewport height (default: false)

### LayoutContainer
Standardized container for consistent sizing and spacing without sidebar.

```jsx
import { LayoutContainer } from './components/layout';

function MyComponent() {
  return (
    <LayoutContainer maxWidth="lg" padding="spacious">
      {/* Your content */}
    </LayoutContainer>
  );
}
```

### ContentWrapper
White background wrapper for page content with consistent styling.

```jsx
import { ContentWrapper } from './components/layout';

function MySection() {
  return (
    <ContentWrapper padding="default" elevation={1}>
      {/* Your section content */}
    </ContentWrapper>
  );
}
```

**Props:**
- `padding` (string): Wrapper padding - 'none', 'compact', 'default', 'spacious' (default: 'default')
- `elevation` (number): Material-UI Paper elevation (default: 1)

### ResponsiveGrid
Flexible grid system for responsive layouts.

```jsx
import { ResponsiveGrid } from './components/layout';

function MyGrid() {
  return (
    <ResponsiveGrid columns={3} spacing="lg">
      <div>Item 1</div>
      <div>Item 2</div>
      <div>Item 3</div>
    </ResponsiveGrid>
  );
}
```

**Props:**
- `columns` (number): Number of columns - 1, 2, 3, 4 (default: 1)
- `spacing` (string): Grid gap - 'xs', 'sm', 'md', 'lg', 'xl' (default: 'lg')

## CSS Variables

The layout system uses CSS variables for consistent theming:

```css
:root {
  /* Layout Dimensions */
  --sidebar-width: 240px;
  --header-height: 64px;
  
  /* Spacing System */
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;
  --spacing-xl: 32px;
  --spacing-xxl: 48px;
  
  /* Colors */
  --color-background: #F9FAFB;
  --color-surface: #FFFFFF;
  --color-primary: #106EBE;
  --color-border: #E0E0E0;
}
```

## Utility Classes

The layout system provides utility classes for common patterns:

```css
/* Container utilities */
.layout-container-full
.layout-container-xl
.layout-container-lg
.layout-container-md

/* Spacing utilities */
.layout-spacing-xs
.layout-spacing-sm
.layout-spacing-md
.layout-spacing-lg
.layout-spacing-xl

/* Flexbox utilities */
.layout-flex-center
.layout-flex-between
.layout-flex-column

/* Grid utilities */
.layout-grid-1
.layout-grid-2
.layout-grid-3
.layout-grid-4
```

## Responsive Breakpoints

The system uses the following breakpoints:

- **xs**: 0px (mobile)
- **sm**: 600px (tablet)
- **md**: 960px (desktop)
- **lg**: 1280px (large desktop)
- **xl**: 1920px (extra large)

## Usage Examples

### Basic Page Layout
```jsx
import { PageLayout, ContentWrapper } from './components/layout';

function Dashboard() {
  return (
    <PageLayout>
      <ContentWrapper>
        <h1>Dashboard</h1>
        <p>Your dashboard content here</p>
      </ContentWrapper>
    </PageLayout>
  );
}
```

### Grid Layout with Cards
```jsx
import { PageLayout, ContentWrapper, ResponsiveGrid } from './components/layout';

function CardsPage() {
  return (
    <PageLayout>
      <ResponsiveGrid columns={3} spacing="lg">
        <ContentWrapper>Card 1</ContentWrapper>
        <ContentWrapper>Card 2</ContentWrapper>
        <ContentWrapper>Card 3</ContentWrapper>
      </ResponsiveGrid>
    </PageLayout>
  );
}
```

### Custom Layout without Sidebar
```jsx
import { PageLayout, ContentWrapper } from './components/layout';

function LoginPage() {
  return (
    <PageLayout includeSidebar={false} maxWidth="md">
      <ContentWrapper padding="spacious">
        <h1>Login</h1>
        {/* Login form */}
      </ContentWrapper>
    </PageLayout>
  );
}
```

## Responsive Hook

Use the `useResponsive` hook for conditional rendering based on screen size:

```jsx
import { useResponsive } from '../hooks/useResponsive';

function MyComponent() {
  const { isMobile, isTablet, isDesktop } = useResponsive();
  
  return (
    <div>
      {isMobile && <MobileLayout />}
      {isTablet && <TabletLayout />}
      {isDesktop && <DesktopLayout />}
    </div>
  );
}
```

## Best Practices

1. **Always use PageLayout** for main page structure
2. **Wrap content in ContentWrapper** for consistent white backgrounds
3. **Use ResponsiveGrid** instead of custom CSS Grid implementations
4. **Leverage CSS variables** for consistent spacing and colors
5. **Test responsive behavior** at different breakpoints
6. **Use utility classes** for common layout patterns