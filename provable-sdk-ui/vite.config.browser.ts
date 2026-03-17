import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      'provable-proof-js': resolve(__dirname, '../provable-proof-js/src/index.ts'),
      'provable-sdk-js': resolve(__dirname, '../provable-sdk-js/src/index.ts'),
    },
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify('production')
  },
  build: {
    outDir: 'dist/browser',
    lib: {
      entry: resolve(__dirname, 'src/browser.tsx'),
      name: 'ProvableSdkUi',
      fileName: () => 'provable-sdk-ui.iife.js',
      formats: ['iife']
    },
    rollupOptions: {
      external: []
    }
  }
});
