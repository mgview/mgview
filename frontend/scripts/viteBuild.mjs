/**
 * Cross-platform Vite build wrapper.
 *
 * Windows shells do not support `VAR=value command` syntax in npm scripts.
 *
 * Usage:
 *   node scripts/viteBuild.mjs --server
 *   node scripts/viteBuild.mjs --static:github
 *   node scripts/viteBuild.mjs --static:workspace
 */

import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendDir = path.resolve(scriptDir, '..');
const vitePackageJson = require.resolve('vite/package.json');
const viteBin = path.join(path.dirname(vitePackageJson), 'bin', 'vite.js');

const PRESETS = {
  server: {
    env: {
      VITE_MGVIEW_PUBLIC_BASE: '/mgview/',
      VITE_MGVIEW_BASE: '/mgview/',
    },
  },
  'static:github': {
    env: {
      VITE_MGVIEW_STATIC: 'true',
      VITE_MGVIEW_APP_DIR: '',
      VITE_MGVIEW_PUBLIC_BASE: '/mgview/',
      VITE_MGVIEW_BASE: '/mgview/',
    },
    outDir: 'dist-pages',
  },
  'static:workspace': {
    env: {
      VITE_MGVIEW_STATIC: 'true',
      VITE_MGVIEW_APP_DIR: 'mgview',
      VITE_MGVIEW_PUBLIC_BASE: '/',
      VITE_MGVIEW_BASE: '/mgview/',
    },
    outDir: 'dist-pages',
  },
};

function parseArgs(argv) {
  let preset = 'server';
  const viteArgs = [];

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--server') {
      preset = 'server';
      continue;
    }
    if (arg === '--static:github') {
      preset = 'static:github';
      continue;
    }
    if (arg === '--static:workspace') {
      preset = 'static:workspace';
      continue;
    }
    if (arg === '--') {
      viteArgs.push(...argv.slice(index + 1));
      break;
    }
    viteArgs.push(arg);
  }

  return { preset, viteArgs };
}

function runViteBuild(presetName, viteArgs) {
  const preset = PRESETS[presetName];
  if (!preset) {
    throw new Error(`Unknown Vite build preset: ${presetName}`);
  }

  const args = ['build'];
  if (preset.outDir) {
    args.push('--outDir', preset.outDir);
  }
  args.push(...viteArgs);

  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [viteBin, ...args], {
      cwd: frontendDir,
      env: { ...process.env, ...preset.env },
      stdio: 'inherit',
    });

    child.on('error', reject);
    child.on('close', (code) => {
      resolve(code ?? 1);
    });
  });
}

async function main() {
  const { preset, viteArgs } = parseArgs(process.argv.slice(2));
  const exitCode = await runViteBuild(preset, viteArgs);
  process.exit(exitCode);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
