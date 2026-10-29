import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';
import { lookupSepCedula, normalizeCedula } from './server/sepCedulaLookup.js';

function sepCedulaProxyPlugin(): Plugin {
  return {
    name: 'sep-cedula-proxy',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/verify-cedula')) {
          return next();
        }
        res.setHeader('Access-Control-Allow-Origin', 'http://localhost:5173');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Vary', 'Origin');

        if (req.method === 'OPTIONS') {
          res.statusCode = 204;
          res.end();
          return;
        }

        try {
          const url = new URL(req.url, 'http://localhost');
          let cedula = url.searchParams.get('cedula');

          if (!cedula && req.method === 'POST') {
            const body = await new Promise<string>((resolve) => {
              let data = '';
              req.on('data', (chunk) => (data += chunk));
              req.on('end', () => resolve(data));
            });
            try {
              const parsed = JSON.parse(body);
              cedula = parsed.cedula;
            } catch {}
          }

          if (!cedula || typeof cedula !== 'string') {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(JSON.stringify({ success: false, error: 'Número de cédula requerido' }));
            return;
          }

          const cleanCedula = normalizeCedula(cedula);
          if (cleanCedula.length < 5 || cleanCedula.length > 10) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(JSON.stringify({ success: false, error: 'Formato de cédula no válido' }));
            return;
          }

          const items = await lookupSepCedula(cleanCedula);
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(JSON.stringify({ success: true, items }));
        } catch (err: any) {
          res.statusCode = typeof err?.status === 'number' ? err.status : 500;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(JSON.stringify({ success: false, error: err?.message || 'Error interno al consultar SEP' }));
        }
      });
    },
  };
}

function signAgreementProxyPlugin(): Plugin {
  return {
    name: 'sign-agreement-proxy',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/sign-agreement')) {
          return next();
        }

        if (req.method === 'OPTIONS') {
          res.statusCode = 204;
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
          res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
          res.end();
          return;
        }

        try {
          const body = await new Promise<Buffer>((resolve) => {
            const chunks: Buffer[] = [];
            req.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
            req.on('end', () => resolve(Buffer.concat(chunks)));
          });
          const headers = new Headers();
          for (const [key, value] of Object.entries(req.headers)) {
            if (typeof value === 'string') headers.set(key, value);
            else if (Array.isArray(value)) headers.set(key, value.join(', '));
          }
          const request = new Request(new URL(req.url, 'http://localhost:5173'), {
            method: req.method,
            headers,
            body: req.method === 'GET' || req.method === 'HEAD' ? undefined : body,
          });
          const { handleSignAgreementRequest } = await import('./server/signAgreementHandler');
          const response = await handleSignAgreementRequest(request);
          res.statusCode = response.status;
          response.headers.forEach((value, key) => res.setHeader(key, value));
          res.end(Buffer.from(await response.arrayBuffer()));
        } catch (err: unknown) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          const message = err instanceof Error ? err.message : 'Error al procesar el acuerdo';
          res.end(JSON.stringify({ success: false, error: message }));
        }
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    sepCedulaProxyPlugin(),
    signAgreementProxyPlugin(),
    VitePWA({
      registerType: 'prompt',
      devOptions: { enabled: false },
      includeAssets: ['icons/*.png', 'icons/splash/*.png'],
      manifest: false, // Use the manifest.json in /public
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2,json}'],
        globIgnores: ['**/icons/splash/**', '**/vendor-react-pdf*.js', '**/vendor-docx*.js'],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        // iOS Safari aggressively caches sw.js — these ensure instant updates
        cleanupOutdatedCaches: true,
        skipWaiting: false,
        clientsClaim: false,
        importScripts: ['/custom-sw.js'],
        // SPA offline fallback — serves index.html for any navigation request
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api/, /^\/icons\/splash\//],
        runtimeCaching: [
          {
            // Google Fonts stylesheets
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'google-fonts-stylesheets',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
          {
            // Google Fonts webfont files
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Heavy document generators (loaded on-demand by admin/export tools)
            urlPattern: /\/assets\/(?:vendor-react-pdf|vendor-docx).*\.js$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'document-generators-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
          {
            // External images
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'images-cache',
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      pagedjs: path.resolve(__dirname, './node_modules/pagedjs/src/index.js'),
    },
    // Emitted .js siblings must not shadow the .ts/.tsx source (duplicate Auth context).
    extensions: ['.mjs', '.mts', '.ts', '.tsx', '.jsx', '.js', '.json'],
  },
  optimizeDeps: {
    include: ['@react-pdf/renderer', 'qrcode'],
  },
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          const normalizedId = id.replace(/\\/g, '/');
          if (normalizedId.includes('node_modules/')) {
            if (normalizedId.includes('@react-pdf')) {
              return 'vendor-react-pdf';
            }
            if (normalizedId.includes('docx')) {
              return 'vendor-docx';
            }
            if (normalizedId.includes('pagedjs')) {
              return 'vendor-pagedjs';
            }
            if (normalizedId.includes('framer-motion')) {
              return 'vendor-framer-motion';
            }
            if (normalizedId.includes('lucide-react')) {
              return 'vendor-lucide';
            }
            if (normalizedId.includes('@supabase')) {
              return 'vendor-supabase';
            }
            if (normalizedId.includes('qrcode')) {
              return 'vendor-qrcode';
            }
            if (
              normalizedId.includes('node_modules/react/') ||
              normalizedId.includes('node_modules/react-dom/') ||
              normalizedId.includes('node_modules/react-router/') ||
              normalizedId.includes('node_modules/react-router-dom/') ||
              normalizedId.includes('node_modules/zustand/') ||
              normalizedId.includes('node_modules/react-error-boundary/')
            ) {
              return 'vendor-react-core';
            }
          }
          if (normalizedId.includes('src/content/modules/')) {
            return 'course-modules-content';
          }
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'node',
  },
});