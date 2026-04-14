import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'educollab-x2t-wasm-br-decompress',
        configureServer(server) {
          // Dev-only: x2t.wasm in `office-website` is stored as brotli-compressed bytes.
          // Some browsers won't treat it as wasm even if we send Content-Encoding.
          // Instead, we serve the *decompressed* wasm bytes at the expected URL.
          const publicDir = path.resolve(__dirname, 'public');
          const serveWasm = (reqPath: string, brPath: string) => {
            const absBr = path.join(publicDir, brPath);
            if (!fs.existsSync(absBr)) return null;
            const br = fs.readFileSync(absBr);
            const wasm = zlib.brotliDecompressSync(br);
            return wasm;
          };

          server.middlewares.use((req, res, next) => {
            try {
              const raw = req.url || '';
              const pathname = raw.split('?')[0].split('#')[0];
              if (!(req.method === 'GET' || req.method === 'HEAD')) return next();

              if (pathname === '/x2t/x2t.wasm') {
                const wasm = serveWasm('/x2t/x2t.wasm', '/x2t/x2t.wasm.br');
                if (!wasm) return next();
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/wasm');
                res.setHeader('Cache-Control', 'no-store');
                if (req.method === 'HEAD') return res.end();
                return res.end(wasm);
              }
              if (pathname === '/x2t-1/x2t.wasm') {
                const wasm = serveWasm('/x2t-1/x2t.wasm', '/x2t-1/x2t.wasm.br');
                if (!wasm) return next();
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/wasm');
                res.setHeader('Cache-Control', 'no-store');
                if (req.method === 'HEAD') return res.end();
                return res.end(wasm);
              }
              return next();
            } catch {
              return next();
            }
          });
        },
      },
      {
        name: 'educollab-onlyoffice-asset-proxy',
        configureServer(server) {
          // Dev-only: our repo may not yet vendor the full OnlyOffice runtime.
          // To make LAN multi-device testing work (and avoid per-client DNS issues),
          // we proxy missing files under `/v9.3.0.24-1/**` from the upstream demo host,
          // and cache them on disk for subsequent requests.
          //
          // This is a stepping stone: once fully vendored, the proxy becomes a no-op.
          const upstream = 'https://office-editor.ziziyi.com';
          const publicDir = path.resolve(__dirname, 'public');
          const cacheDir = path.resolve(__dirname, '.cache/onlyoffice');

          const ensureDir = (p: string) => {
            fs.mkdirSync(p, { recursive: true });
          };

          const guessContentType = (pathname: string) => {
            if (pathname.endsWith('.js')) return 'application/javascript';
            if (pathname.endsWith('.css')) return 'text/css';
            if (pathname.endsWith('.json')) return 'application/json';
            if (pathname.endsWith('.svg')) return 'image/svg+xml';
            if (pathname.endsWith('.html')) return 'text/html; charset=utf-8';
            if (pathname.endsWith('.wasm')) return 'application/wasm';
            if (pathname.endsWith('.png')) return 'image/png';
            if (pathname.endsWith('.jpg') || pathname.endsWith('.jpeg')) return 'image/jpeg';
            if (pathname.endsWith('.gif')) return 'image/gif';
            if (pathname.endsWith('.woff')) return 'font/woff';
            if (pathname.endsWith('.woff2')) return 'font/woff2';
            if (pathname.endsWith('.ttf')) return 'font/ttf';
            if (pathname.endsWith('.otf')) return 'font/otf';
            // OnlyOffice fonts are served as numeric paths (no extension)
            if (/\/fonts\/\d+$/.test(pathname)) return 'application/octet-stream';
            return 'application/octet-stream';
          };

          server.middlewares.use(async (req, res, next) => {
            try {
              const raw = req.url || '';
              const pathname = raw.split('?')[0].split('#')[0];
              if (!(req.method === 'GET' || req.method === 'HEAD')) return next();

              // Only proxy our vendored OnlyOffice root
              if (!pathname.startsWith('/v9.3.0.24-1/')) return next();

              // If it exists in /public, let Vite serve it
              const localPath = path.join(publicDir, pathname);
              if (fs.existsSync(localPath) && fs.statSync(localPath).isFile()) return next();

              // Cache path
              const cachePath = path.join(cacheDir, pathname);
              if (fs.existsSync(cachePath) && fs.statSync(cachePath).isFile()) {
                res.statusCode = 200;
                res.setHeader('Content-Type', guessContentType(pathname));
                fs.createReadStream(cachePath).pipe(res);
                return;
              }

              // Fetch from upstream and cache
              const url = upstream + pathname;
              const r = await fetch(url);
              if (!r.ok) return next();

              const ab = await r.arrayBuffer();
              ensureDir(path.dirname(cachePath));
              fs.writeFileSync(cachePath, Buffer.from(ab));

              res.statusCode = 200;
              res.setHeader('Content-Type', r.headers.get('content-type') || guessContentType(pathname));
              res.setHeader('Cache-Control', 'no-store');
              res.end(Buffer.from(ab));
              return;
            } catch (e) {
              // On any proxy error, fall back to normal Vite behavior.
              return next();
            }
          });
        },
      },
    ],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        // Keep Vite aliases consistent with tsconfig.json paths:
        // "@/*" -> "./src/*" and "src/*" -> "./src/*"
        '@': path.resolve(__dirname, './src'),
        src: path.resolve(__dirname, './src'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
