import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react-swc';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: true,
    // Stale local checkouts under .claude/worktrees/ each carry their own copy
    // of every test file. Gitignoring them does not stop vitest collecting them,
    // which ran 869 tests across 51 files instead of 4, and reports results for
    // code that is not on this branch.
    exclude: ['**/node_modules/**', '**/dist/**', '.claude/worktrees/**'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // Mirrors the "@shared/*" path in tsconfig. Without it any server test
      // that reaches shared/schema.ts fails to resolve at run time.
      '@shared': path.resolve(__dirname, './shared'),
    },
  },
});
