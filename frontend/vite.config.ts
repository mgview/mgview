import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';

function legacySamplesPlugin(): Plugin {
  const configDir = path.dirname(fileURLToPath(import.meta.url));
  const samplesRoot = path.resolve(configDir, '../samples');

  const serveSamples = async (req: { url?: string }, res: { statusCode: number; setHeader: (name: string, value: string) => void; end: (body?: string | Buffer) => void; }) => {
    const url = req.url ?? '';
    if (!url.startsWith('/samples/')) {
      return false;
    }

    try {
      const relativePath = decodeURIComponent(url.slice('/samples/'.length));
      const filePath = path.resolve(samplesRoot, relativePath);

      if (!filePath.startsWith(samplesRoot)) {
        res.statusCode = 403;
        res.end('Forbidden');
        return true;
      }

      const body = await readFile(filePath);
      const extension = path.extname(filePath).toLowerCase();
      const contentType =
        extension === '.json'
          ? 'application/json'
          : extension === '.txt' || extension === '.al' || /^\.\d+$/.test(extension)
            ? 'text/plain; charset=utf-8'
            : extension === '.obj' || extension === '.stl' || extension === '.xml'
              ? 'text/plain; charset=utf-8'
              : 'application/octet-stream';

      res.statusCode = 200;
      res.setHeader('Content-Type', contentType);
      res.end(body);
      return true;
    } catch {
      res.statusCode = 404;
      res.end('Not found');
      return true;
    }
  };

  return {
    name: 'legacy-samples',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        void serveSamples(req, res).then((handled) => {
          if (!handled) {
            next();
          }
        }, next);
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use((req, res, next) => {
        void serveSamples(req, res).then((handled) => {
          if (!handled) {
            next();
          }
        }, next);
      });
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [react(), legacySamplesPlugin()],
  build: {
    chunkSizeWarningLimit: 550,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('/node_modules/three/examples/jsm/') || id.includes('/node_modules/three/addons/')) {
            return 'three-addons';
          }

          if (
            id.includes('/node_modules/three/src/math/') ||
            id.includes('/node_modules/three/src/core/') ||
            id.includes('/node_modules/three/src/constants.js') ||
            id.includes('/node_modules/three/src/utils.js')
          ) {
            return 'three-foundation';
          }

          if (id.includes('/node_modules/three/')) {
            return 'three-vendor';
          }

          if (id.includes('/node_modules/react/') || id.includes('/node_modules/react-dom/')) {
            return 'react-vendor';
          }
        },
      },
    },
  },
  server: {
    fs: {
      allow: ['..'],
    },
  },
});
