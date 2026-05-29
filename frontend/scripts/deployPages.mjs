/**
 * Push build/gh-pages/ to the gh-pages branch (manual CLI deploy).
 *
 * Requires: git, and push access to origin.
 * Alternative: push to main and let .github/workflows/pages.yml deploy via Actions.
 */
import { spawn } from 'node:child_process';
import { access } from 'node:fs/promises';
import path from 'node:path';
import { siteDir } from './deployConfig.mjs';

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'inherit', ...options });
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} ${args.join(' ')} failed (${code})`));
      }
    });
  });
}

async function main() {
  try {
    await access(path.join(siteDir, 'index.html'));
  } catch {
    throw new Error(`No site at ${siteDir}. Run npm run build:site first.`);
  }

  console.log(`Deploying ${siteDir} to gh-pages branch via npx gh-pages…`);
  await run('npx', ['--yes', 'gh-pages', '-d', siteDir, '--dotfiles', '-m', 'Deploy site'], {
    shell: true,
  });
  console.log('Done. GitHub Pages may take a minute to update.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
