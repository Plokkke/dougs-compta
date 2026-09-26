import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    exclude: [...configDefaults.exclude, '.stryker-tmp/**'],
    coverage: { include: ['src/**'], exclude: ['src/index.ts'], reportsDirectory: 'reports/coverage' },
  },
});
