/**
 * Preview the assembled static site locally.
 *
 * Default (GitHub Pages layout):
 *   npm run preview:site
 *   → http://127.0.0.1:8001/mgview/
 *
 * Workspace layout (parent folder with mgview/ app dir):
 *   npm run preview:site:workspace
 *   → http://127.0.0.1:8001/mgview/
 */
import { spawn } from 'node:child_process';
import { createReadStream, existsSync } from 'node:fs';
import { stat } from 'node:fs/promises';
import http from 'node:http';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  githubPagesBase,
  siteDir,
  workspaceBase,
} from './deployConfig.mjs';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendDir = path.resolve(scriptDir, '..');
const useWorkspaceLayout = process.argv.includes('--workspace');
const siteRoot = useWorkspaceLayout
  ? path.join(siteDir, '..', 'gh-pages-workspace', 'mgview')
  : siteDir;
const urlPrefix = useWorkspaceLayout ? workspaceBase.replace(/\/$/, '') : githubPagesBase;
const STATIC_PORT = Number(process.env.MGVIEW_STATIC_PORT || 8001);
const PREVIEW_HOST = '127.0.0.1';

function canConnect(host, port) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host, port }, () => {
      socket.end();
      resolve(true);
    });
    socket.setTimeout(500);
    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.on('error', () => resolve(false));
  });
}

async function assertPortClear(port) {
  const listeners = [];
  for (const host of ['127.0.0.1', '::1']) {
    if (await canConnect(host, port)) {
      listeners.push(host);
    }
  }

  if (listeners.length === 0) {
    return;
  }

  throw new Error(
    `Port ${port} is already in use (${listeners.join(', ')}). ` +
      'Stop orphaned bin/server.js processes first (npm run cleanup:servers -- --force) ' +
      'or choose another port: MGVIEW_STATIC_PORT=8002 npm run preview:site'
  );
}

function isPortAvailable(port) {
  return new Promise((resolve) => {
    const probe = net.createServer();
    probe.once('error', () => resolve(false));
    probe.once('listening', () => {
      probe.close(() => resolve(true));
    });
    probe.listen(port, PREVIEW_HOST);
  });
}

function contentTypeFor(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  const map = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
  };
  return map[extension] ?? 'application/octet-stream';
}

async function runBuild() {
  const buildScript = useWorkspaceLayout ? 'build:site:workspace' : 'build:site';
  await new Promise((resolve, reject) => {
    const child = spawn('npm', ['run', buildScript], {
      cwd: frontendDir,
      stdio: 'inherit',
      shell: true,
    });
    child.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`build failed (${code})`))));
  });
}

function createServer() {
  return http.createServer(async (req, res) => {
    try {
      const requestUrl = new URL(req.url ?? '/', `http://${PREVIEW_HOST}:${STATIC_PORT}`);
      let pathname = decodeURIComponent(requestUrl.pathname);

      if (pathname === urlPrefix) {
        pathname = `${urlPrefix}/`;
      }

      if (!pathname.startsWith(`${urlPrefix}/`) && pathname !== `${urlPrefix}/`) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Not found');
        return;
      }

      const relativePath = pathname.slice(urlPrefix.length).replace(/^\/+/, '') || 'index.html';
      const filePath = path.join(siteRoot, relativePath);
      if (!filePath.startsWith(siteRoot)) {
        res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Forbidden');
        return;
      }

      let resolvedPath = filePath;
      try {
        const fileStat = await stat(resolvedPath);
        if (fileStat.isDirectory()) {
          resolvedPath = path.join(resolvedPath, 'index.html');
        }
      } catch {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Not found');
        return;
      }

      if (!existsSync(resolvedPath)) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Not found');
        return;
      }

      res.writeHead(200, { 'Content-Type': contentTypeFor(resolvedPath) });
      createReadStream(resolvedPath).pipe(res);
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end(String(error));
    }
  });
}

async function main() {
  await assertPortClear(STATIC_PORT);

  if (!(await isPortAvailable(STATIC_PORT))) {
    console.error(`Port ${STATIC_PORT} is in use on ${PREVIEW_HOST}. Try MGVIEW_STATIC_PORT=8002 npm run preview:site`);
    process.exit(1);
  }

  await runBuild();

  const server = createServer();
  server.listen(STATIC_PORT, PREVIEW_HOST, () => {
    const url = `http://${PREVIEW_HOST}:${STATIC_PORT}${urlPrefix}/`;
    console.log(`\nStatic preview: ${url}`);
    console.log('Use 127.0.0.1 (not localhost) if another server is bound to IPv6 on this port.');
    if (!useWorkspaceLayout) {
      console.log(`Legacy (if assembled): ${url}legacy/Examples.html\n`);
    }
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
