import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
  resolve: {
    conditions: ['react-server', 'node', 'import', 'default'],
    alias: {
      // Server modules keep the `server-only` guard so an accidental client
      // import is a build error. Under Next that resolves to a no-op via the
      // react-server export condition; Vite's SSR resolver ignores conditions,
      // so point it at the package's own empty module explicitly.
      'server-only': path.resolve(__dirname, 'node_modules/server-only/empty.js'),
      '@': path.resolve(__dirname, '.'),
    },
  },
  ssr: {
    resolve: { conditions: ['react-server', 'node', 'import', 'default'] },
  },
});
