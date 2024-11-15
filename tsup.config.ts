import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/local.ts', 'src/index.ts'],
  clean: true,
  format: ['esm', 'cjs'],
  dts: true,
});
