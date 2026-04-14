import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'educollab-x2t-wasm-brotli',
        configureServer(server) {
          // The vendored `office-website` ships `x2t.wasm` as a brotli-compressed file.
          // Browsers will only transparently decompress it if we serve it with `Content-Encoding: br`.
          server.middlewares.use((req, res, next) => {
            const url = req.url || '';
            if (url.startsWith('/x2t/') && url.endsWith('/x2t.wasm')) {
              res.setHeader('Content-Encoding', 'br');
              res.setHeader('Content-Type', 'application/wasm');
            }
            if (url.startsWith('/x2t-1/') && url.endsWith('/x2t.wasm')) {
              res.setHeader('Content-Encoding', 'br');
              res.setHeader('Content-Type', 'application/wasm');
            }
            next();
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
