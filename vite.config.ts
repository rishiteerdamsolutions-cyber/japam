import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
// @ts-expect-error api/proxy.js has no types
import * as apiProxy from './api/proxy.js'

// https://vite.dev/config/
export default defineConfig({
  server: {
    port: 5173,
  },
  plugins: [
    {
      name: 'japam-local-api',
      configureServer(viteServer) {
        viteServer.middlewares.use('/api', async (req, res, next) => {
          try {
            const method = (req.method || 'GET').toUpperCase();
            if (method !== 'GET' && method !== 'POST') return next();

            const host = req.headers.host || 'localhost:5173';
            const suffix = req.url || '';
            const normalizedSuffix = suffix.startsWith('/') ? suffix : `/${suffix}`;
            // Connect strips the mount prefix (`/api`) from req.url; add it back so api/proxy.js can route.
            const url = `http://${host}/api${normalizedSuffix}`;

            let bodyText: string | undefined = undefined;
            if (method === 'POST') {
              bodyText = await new Promise<string>((resolve) => {
                let data = '';
                req.on('data', (c) => (data += c));
                req.on('end', () => resolve(data));
                req.on('error', () => resolve(''));
              });
            }

            const request = new Request(url, {
              method,
              headers: req.headers as any,
              body: method === 'POST' ? bodyText : undefined,
            });

            const response: Response =
              method === 'POST' ? await (apiProxy as any).POST(request) : await (apiProxy as any).GET(request);

            res.statusCode = response.status;
            response.headers.forEach((value, key) => {
              if (value != null) res.setHeader(key, value);
            });

            const ab = await response.arrayBuffer();
            res.end(Buffer.from(ab));
          } catch (e) {
            console.error('local api proxy failed', e);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Local API proxy failed' }));
          }
        });
      },
    },
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Japam',
        short_name: 'Japam',
        description: 'Match-3 puzzle game for mantra chanting',
        theme_color: '#FF9933',
        background_color: '#1a1a2e',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          { src: '/vite.svg', sizes: 'any', type: 'image/svg+xml' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024
      }
    })
  ]
})
