import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Ensure non-VITE_* vars (e.g. FIREBASE_SERVICE_ACCOUNT_JSON) from .env.local are on
  // process.env for the local /api middleware — same as `vite` CLI usually does, explicit for clarity.
  const loaded = loadEnv(mode, process.cwd(), '');
  for (const key of Object.keys(loaded)) {
    if (process.env[key] === undefined) process.env[key] = loaded[key];
  }

  return {
  build: {
    chunkSizeWarningLimit: 1000, // Increase from default 500KB to suppress chunk size warnings
    // Vite's default publicDir copy can be very slow in CI for large static assets.
    // We selectively copy only the assets the app actually references.
    copyPublicDir: false,
  },
  optimizeDeps: {
    exclude: ['onnxruntime-web', '@bunnio/rembg-web'],
  },
  server: {
    port: Number(process.env.VITE_DEV_PORT) || 5173,
    // Default localhost — avoids uv_interface_addresses crashes on some systems.
    // For phone testing on Wi‑Fi: VITE_DEV_LAN=1 npm run dev (binds 0.0.0.0)
    host: process.env.VITE_DEV_LAN === '1' ? '0.0.0.0' : '127.0.0.1',
    strictPort: false,
  },
  plugins: [
    {
      name: 'japam-copy-public-required',
      apply: 'build',
      async closeBundle() {
        const fs = await import('node:fs/promises');
        const path = await import('node:path');
        const root = process.cwd();
        const publicDir = path.join(root, 'public');
        const outDir = path.join(root, 'dist');

        // Copy only what's referenced by the app at runtime.
        const copyDirs = ['images', 'sounds', 'locales', 'videos', 'weapons', 'asura', 'content', 'models'];
        const copyFiles = [
          'vite.svg',
          'openapi.json',
          'robots.txt',
          'googlee525cd6fc9a02f00.html',
          'birthday.png',
          'anniversary-japa.png',
          'openingvideo.mp4',
          'japam.gif',
          'TWOPLAYER.png',
          'SAVED TWOPLAYER.png',
          'general-japa.mp4',
          'regular-japa-vid.mp4',
          'regular-japa-button-test.html',
          'asura-combat-test.html',
          'SAMPLE NAMA IMAGE.png',
        ];

        async function exists(p: string) {
          try {
            await fs.stat(p);
            return true;
          } catch {
            return false;
          }
        }

        async function fastCopyFile(src: string, dest: string) {
          try {
            await fs.rm(dest, { force: true });
          } catch {}
          try {
            // Prefer hardlink (fast, no duplicate IO); fall back to copyFile.
            await fs.link(src, dest);
          } catch (e) {
            const err = e as NodeJS.ErrnoException;
            if (err?.code === 'EXDEV' || err?.code === 'EPERM' || err?.code === 'EACCES') {
              await fs.copyFile(src, dest);
              return;
            }
            // Some filesystems don't allow linking directories/special files; caller handles dirs.
            await fs.copyFile(src, dest);
          }
        }

        async function fastCopyTree(src: string, dest: string) {
          const st = await fs.stat(src);
          if (st.isDirectory()) {
            await fs.mkdir(dest, { recursive: true });
            const entries = await fs.readdir(src, { withFileTypes: true });
            for (const ent of entries) {
              if (ent.name === '.DS_Store') continue;
              const s = path.join(src, ent.name);
              const d = path.join(dest, ent.name);
              if (ent.isDirectory()) await fastCopyTree(s, d);
              else if (ent.isFile()) {
                await fs.mkdir(path.dirname(d), { recursive: true });
                await fastCopyFile(s, d);
              }
            }
            return;
          }
          if (st.isFile()) {
            await fs.mkdir(path.dirname(dest), { recursive: true });
            await fastCopyFile(src, dest);
          }
        }

        async function copyIfPresent(src: string, dest: string) {
          if (!(await exists(src))) return;
          await fastCopyTree(src, dest);
        }

        for (const d of copyDirs) {
          await copyIfPresent(path.join(publicDir, d), path.join(outDir, d));
        }
        for (const f of copyFiles) {
          await copyIfPresent(path.join(publicDir, f), path.join(outDir, f));
        }
      },
    },
    {
      name: 'japam-local-api',
      configureServer(viteServer) {
        viteServer.middlewares.use('/api', async (req, res, next) => {
          try {
            // Lazy import so `vite build` doesn't load server-only code (Firebase Admin, etc).
            // `api/proxy.js` has no TS types (JS file).
            // @ts-expect-error - JS-only module; no .d.ts (dev-only proxy)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const apiProxy = (await import('./api/proxy.js')) as any;

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
              headers: req.headers as Record<string, string>,
              body: method === 'POST' ? bodyText : undefined,
            });

            type ApiProxyModule = { POST?: (r: Request) => Promise<Response>; GET?: (r: Request) => Promise<Response> };
            const proxy = apiProxy as ApiProxyModule;
            const response: Response =
              method === 'POST' ? await proxy.POST!(request) : await proxy.GET!(request);

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
      registerType: 'prompt',
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,mp3}'],
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024
      },
      manifest: {
        name: 'Japam',
        short_name: 'Japam',
        description: 'Match-3 puzzle game for mantra chanting',
        theme_color: '#D81B60',
        background_color: '#D81B60',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          { src: '/images/favicon.png', sizes: '192x192', type: 'image/png' },
          { src: '/images/favicon.png', sizes: '512x512', type: 'image/png' },
          { src: '/images/favicon.png', sizes: 'any', type: 'image/png', purpose: 'maskable any' }
        ]
      }
    })
  ]
};
})
