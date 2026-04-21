import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    include: ['**/*.test.ts', '**/__tests__/**/*.ts'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/__tests__/integration.test.ts'
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        '**/*.test.ts',
        '**/__tests__/**',
        '**/dist/**',
        '**/node_modules/**'
      ],
      thresholds: {
        branches: 80,
        functions: 80,
        lines: 80,
        statements: 80
      }
    }
  }
});
