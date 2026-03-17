import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@kuip/provable-proof': resolve(__dirname, '../provable-proof-js/src/index.ts'),
      '@kuip/provable-sdk': resolve(__dirname, '../provable-sdk-js/src/index.ts'),
    },
  },
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'ProvableSdkUi',
      fileName: format => (format === 'es' ? 'index.js' : 'index.cjs'),
      formats: ['es', 'cjs']
    },
    rollupOptions: {
      external: ['react', 'react-dom', 'react/jsx-runtime', 'react/jsx-dev-runtime']
    }
  }
});
