import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      reportsDirectory: './coverage',
      thresholds: {
        global: {
          // Set just below current coverage to prevent regressions.
          statements: 55,
          branches: 55,
          functions: 70,
          lines: 55,
        },
      },
    },
  },
});

