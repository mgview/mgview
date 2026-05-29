import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { generateStaticManifest } from './scripts/generateStaticManifest.mjs';
import { viteBundledAssetsDir } from './scripts/deployConfig.mjs';

// Build modes — see BUILD.md at repo root:
//   npm run build                  → frontend/dist/     (local Node server)
//   npm run build:static:github    → frontend/dist-pages/ (GitHub Pages, base /mgview/)
//   npm run build:static:workspace → frontend/dist-pages/ (workspace static preview)
const isStaticHostingBuild = process.env.VITE_MGVIEW_STATIC === 'true';

function legacySamplesPlugin(): Plugin {
  const configDir = path.dirname(fileURLToPath(import.meta.url));
  const samplesRoot = path.resolve(configDir, '../samples');
  const appDirName = process.env.VITE_MGVIEW_APP_DIR ?? 'mgview';
  const samplesUrlPrefix =
    appDirName.length > 0 ? `/${appDirName}/samples/` : '/samples/';

  const serveSamples = async (req: { url?: string }, res: { statusCode: number; setHeader: (name: string, value: string) => void; end: (body?: string | Buffer) => void; }) => {
    const url = req.url ?? '';
    if (!url.startsWith(samplesUrlPrefix)) {
      return false;
    }

    try {
      const relativePath = decodeURIComponent(url.slice(samplesUrlPrefix.length));
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

function staticHostingFlagPlugin(): Plugin {
  const flagPattern = /import\.meta\.env\.VITE_MGVIEW_STATIC\s*===\s*['"]true['"]/g;
  const definePattern = /__MGVIEW_STATIC_HOSTING__\s*\|\|\s*import\.meta\.env\.VITE_MGVIEW_STATIC\s*===\s*['"]true['"]/g;

  return {
    name: 'static-hosting-flag',
    enforce: 'pre',
    transform(code, id) {
      if (!id.includes('runtimeMode.ts')) {
        return;
      }

      if (isStaticHostingBuild) {
        return code
          .replace(definePattern, 'true')
          .replace(flagPattern, 'true');
      }

      return code
        .replace(definePattern, 'false')
        .replace(flagPattern, 'false');
    },
  };
}

function staticHostingManifestPlugin(): Plugin {
  return {
    name: 'static-hosting-manifest',
    async generateBundle() {
      if (!isStaticHostingBuild) {
        return;
      }

      const manifest = await generateStaticManifest();
      this.emitFile({
        type: 'asset',
        fileName: 'static-file-manifest.json',
        source: `${JSON.stringify(manifest, null, 2)}\n`,
      });
    },
  };
}

export default defineConfig({
  base: process.env.VITE_MGVIEW_BASE ?? './',
  plugins: [
    staticHostingFlagPlugin(),
    react(),
    legacySamplesPlugin(),
    staticHostingManifestPlugin(),
  ],
  build: {
    // Separate from repo-root assets/ (textures, etc.) — see deployConfig.mjs viteBundledAssetsDir
    assetsDir: viteBundledAssetsDir,
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
