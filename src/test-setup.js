import { expect, afterEach, beforeAll } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';

// Extend Vitest's expect with jest-dom matchers
expect.extend(matchers);

// Mock ResizeObserver for recharts
beforeAll(() => {
  global.ResizeObserver = class ResizeObserver {
    constructor(cb) {
      this.cb = cb;
    }
    observe() {
      this.cb([{ borderBoxSize: { inlineSize: 0, blockSize: 0 } }], this);
    }
    unobserve() {}
    disconnect() {}
  };
});

// Cleanup after each test case
afterEach(() => {
  cleanup();
});