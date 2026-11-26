import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const nm = (pkg) => path.resolve(__dirname, 'node_modules', pkg);

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      { find: /^vitest$/, replacement: nm('vitest/dist/index.js') },
      {
        find: /^@testing-library\/jest-dom\/vitest$/,
        replacement: nm('@testing-library/jest-dom/dist/vitest.mjs'),
      },
      { find: '@testing-library/react', replacement: nm('@testing-library/react') },
      { find: '@testing-library/user-event', replacement: nm('@testing-library/user-event') },
      { find: 'react-router-dom', replacement: nm('react-router-dom') },
      { find: 'react-dom', replacement: nm('react-dom') },
      { find: 'react', replacement: nm('react') },
    ],
  },
  server: {
    fs: {
      allow: ['..'],
    },
  },
  test: {
    environment: 'jsdom',
    include: ['../testscases/frontend/**/*.test.{js,jsx}'],
    setupFiles: ['../testscases/frontend/setup.js'],
    css: false,
  },
});
