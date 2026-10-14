import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    // '/src' dibaca Vite relatif ke root project. Pasangannya ada di tsconfig.json (paths).
    alias: { '@': '/src' },
  },
  server: {
    port: 5174,
    strictPort: true,
    // Saat dev, /api diteruskan ke PHP built-in server (npm run backend).
    proxy: { '/api': 'http://localhost:8001' },
  },
  base: '/',
});
