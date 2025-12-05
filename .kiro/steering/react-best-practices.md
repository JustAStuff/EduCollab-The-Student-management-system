---
title: React Best Practices
inclusion: fileMatch
fileMatchPattern: "src/**/*.{jsx,js}"
---

# React Development Standards

## Component Structure
- Use functional components with hooks
- Keep components focused and single-responsibility
- Extract reusable logic into custom hooks
- Use proper prop-types or TypeScript for type safety

## State Management
- Use useState for local component state
- Use useEffect for side effects with proper cleanup
- Avoid prop drilling - use Context API when needed
- Keep state as close to where it's used as possible

## Performance
- Use React.memo() for expensive components
- Implement proper key props in lists
- Avoid inline function definitions in JSX when possible
- Use useCallback and useMemo appropriately

## Code Style
- Use descriptive component and variable names
- Keep JSX readable with proper indentation
- Extract complex JSX into separate components
- Add comments for complex logic

## Testing
- Write tests for critical user flows
- Test component behavior, not implementation
- Use React Testing Library best practices
- Mock external dependencies appropriately
