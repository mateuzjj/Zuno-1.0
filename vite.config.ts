import path from 'path';
import fs from 'fs';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');

  // HTTPS configuration - only in development with certificates
  const isDev = mode === 'development';
  const certPath = './.certs/localhost-cert.pem';
  const keyPath = './.certs/localhost-key.pem';

  const isTunnel = !!env.TUNNEL;
  let httpsConfig = undefined;
  if (isDev && !isTunnel) {
    try {
      // Only use HTTPS if certificate files exist (skip when using tunnel)
      if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
        httpsConfig = {
          key: fs.readFileSync(keyPath),
          cert: fs.readFileSync(certPath),
        };
      }
    } catch (error) {
      console.warn('HTTPS certificates not found, using HTTP');
    }
  }

  return {
    server: {
      port: 3002,
      host: '0.0.0.0', // Allow network access
      allowedHosts: true,
      https: httpsConfig,
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
