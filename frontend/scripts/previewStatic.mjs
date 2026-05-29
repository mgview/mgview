import { spawn } from 'node:child_process';
import { cp, mkdir } from 'node:fs/promises';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendDir = path.resolve(scriptDir, '..');
const repoRoot = path.resolve(frontendDir, '..');
const workspaceRoot = path.resolve(repoRoot, '..');
const distDir = path.join(frontendDir, 'dist-pages');
const modernDir = path.join(repoRoot, 'modern');

const useRepoRootLayout = process.argv.includes('--repo');
const STATIC_PORT = Number(process.env.MGVIEW_STATIC_PORT || 8001);
const NODE_SERVER_PORT = 8000;

function isPortAvailable(port) {
  return new Promise((resolve) => {
    const probe = net.createServer();
    probe.once('error', () => resolve(false));
    probe.once('listening', () => {
      probe.close(() => resolve(true));
    });
    probe.listen(port, '127.0.0.1');
  });
}

async function copyDistToModern() {
  await mkdir(modernDir, { recursive: true });
  await cp(distDir, modernDir, { recursive: true, force: true });
}

async function main() {
  if (!(await isPortAvailable(STATIC_PORT))) {
    console.error(`Port ${STATIC_PORT} is already in use (Node server uses ${NODE_SERVER_PORT}).`);
    console.error(`Free it with: lsof -ti :${STATIC_PORT} | xargs kill`);
    console.error(`Or use another port: MGVIEW_STATIC_PORT=8002 npm run preview:static`);
    process.exit(1);
  }

  const build = spawn('npm', ['run', useRepoRootLayout ? 'build:pages:local' : 'build:pages'], {
    cwd: frontendDir,
    stdio: 'inherit',
    shell: true,
  });

  await new Promise((resolve, reject) => {
    build.on('exit', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`build failed with exit code ${code}`));
      }
    });
  });

  await copyDistToModern();

  const serveRoot = useRepoRootLayout ? repoRoot : workspaceRoot;
  const url = useRepoRootLayout
    ? `http://localhost:${STATIC_PORT}/modern/`
    : `http://localhost:${STATIC_PORT}/MGView/modern/`;

  console.log(`\nStatic demo on port ${STATIC_PORT} (Node server uses ${NODE_SERVER_PORT})`);
  console.log(`Serving ${serveRoot}`);
  console.log(`Open ${url}\n`);

  const server = spawn('python3', ['-m', 'http.server', String(STATIC_PORT)], {
    cwd: serveRoot,
    stdio: 'inherit',
  });

  server.on('exit', (code) => process.exit(code ?? 0));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
