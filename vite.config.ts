import fs from 'fs';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import basicSsl from '@vitejs/plugin-basic-ssl';

const certDir = path.resolve(__dirname, '.cert');
const mkcertKey = path.join(certDir, 'dev-key.pem');
const mkcertCert = path.join(certDir, 'dev-cert.pem');
const hasMkcert =
  fs.existsSync(mkcertKey) && fs.existsSync(mkcertCert);

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    const useHttps = env.VITE_HTTPS === '1';
    const httpsConfig = useHttps
      ? hasMkcert
        ? {
            key: fs.readFileSync(mkcertKey),
            cert: fs.readFileSync(mkcertCert),
          }
        : true
      : undefined;
    return {
      base: './',  // Use relative paths for Electron + file:// compatibility
      plugins: [
        react(),
        ...(useHttps && !hasMkcert ? [basicSsl()] : []),
      ],
      server: {
        port: 3000,
        host: '0.0.0.0',
        https: httpsConfig,
        // Phone on LAN IP must be allowed (otherwise Vite returns 403)
        allowedHosts: true,
        headers: {
          'Cache-Control': 'no-store',  // Prevent caching during development
        },
        // HTTPS dev on phone: browser calls /ollama (same origin) → Mac Ollama
        proxy: {
          '/ollama': {
            target: 'http://127.0.0.1:11434',
            changeOrigin: true,
            rewrite: (p) => p.replace(/^\/ollama/, ''),
            timeout: 600_000,
            // Browser sends Origin on fetch(); Ollama rejects unknown origins (403).
            // Same-origin to Vite — strip before forwarding to localhost Ollama.
            configure: (proxy) => {
              proxy.on('proxyReq', (proxyReq) => {
                proxyReq.removeHeader('origin');
                proxyReq.removeHeader('referer');
              });
            },
          },
        },
      },
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
