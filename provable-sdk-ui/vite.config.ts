import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  build: {
    lib: {
      entry: {
        index: resolve(__dirname, 'src/index.ts'),
        formSnapshot: resolve(__dirname, 'src/formSnapshot.ts')
      },
      name: 'ProvableSdkUi',
      fileName: (format, entryName) => (format === 'es' ? `${entryName}.js` : `${entryName}.cjs`),
      formats: ['es', 'cjs']
    },
    rollupOptions: {
      external: [
        '@kuip/provable-proof',
        '@kuip/provable-sdk',
        'react',
        'react-dom',
        'react/jsx-runtime',
        'react/jsx-dev-runtime',
      ]
    }
  }
});
