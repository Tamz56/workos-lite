import { defineConfig, configDefaults } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    alias: {
      '@': path.resolve('src'),
    },
    exclude: [...configDefaults.exclude, 'tests/e2e/**/*'],
  },
});
