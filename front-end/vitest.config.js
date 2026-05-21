import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['tests/observability/**/*.test.{js,jsx}'],
    setupFiles: ['tests/observability/helpers/setup.js'],
    testTimeout: 15000,
    reporters: ['default'],
  },
});
