import path from 'path';
import fs from 'fs';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3002,
      host: '0.0.0.0', // Allow network access
      https: {
        key: fs.readFileSync('./.certs/localhost-key.pem'),
        cert: fs.readFileSync('./.certs/localhost-cert.pem'),
      },
      proxy: {
        '/api/lyrics': {
          target: 'https://lrclib.net',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/lyrics/, ''),
          secure: false,
        },
      },
    },
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    },
    build: {
      // Otimizações para mobile/iOS
      target: 'es2015',
      minify: 'esbuild',
      rollupOptions: {
        output: {
          manualChunks: {
            'react-vendor': ['react', 'react-dom'],
          },
        },
      },
    },
  };
});
