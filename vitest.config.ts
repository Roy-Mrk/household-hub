import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'node',
    reporters: ['verbose', 'json', 'html'],
    outputFile: {
      json: 'test-results/results.json',
      html: 'test-results/index.html',
    },
  },
});
