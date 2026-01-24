import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
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
