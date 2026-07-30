import { defineConfig } from 'tsup';

export default defineConfig({
  clean: true,
  dts: true,
  entry: ['src/cli.ts'],
  format: ['esm'],
  outDir: 'dist',
  platform: 'node',
  sourcemap: true,
  splitting: false,
  target: 'node22'
});
