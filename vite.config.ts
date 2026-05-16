import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      base: './',  // Use relative paths for Electron + file:// compatibility
      server: {
        port: 3000,
        host: '0.0.0.0',
        allowedHosts: [
          '.ngrok-free.dev',  // Allow all ngrok domains
          '.ngrok.io',        // Alternative ngrok domain
        ],
        headers: {
          'Cache-Control': 'no-store',  // Prevent caching during development
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
        sourcemap: true,
        rollupOptions: {
          output: {
            manualChunks: {
              'react-vendor': ['react', 'react-dom'],
              'charts': ['recharts'],
              'validation': ['zod'],
            }
          }
        }
      }
    };
});
