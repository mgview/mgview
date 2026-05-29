/**
 * Assemble a local-download release tree under build/release/mgview-<version>/.
 *
 * Includes only what RunMGViewMac needs: Node server, modern app build, samples,
 * and shared runtime assets. Does NOT include legacy/, frontend source, or node_modules.
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { cp, mkdir, rm } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import {
  distServerDir,
  releaseDir,
  repoRoot,
  runtimeAssetsDir,
} from './deployConfig.mjs';
import { copyTree, excludeDotfiles } from './lib/copyTree.mjs';

const RELEASE_TOP_LEVEL = 'mgview';

const releaseFiles = [
  'bin',
  'RunMGViewMac',
  'RunMGViewLinux',
  'RunMGViewWindows.lnk',
  'README.md',
  'LICENSE',
];

async function readVersion() {
  const versionFile = path.join(repoRoot, 'bin', 'VERSION');
  const raw = await readFile(versionFile, 'utf8');
  const match = raw.match(/(\d+\.\d+\.\d+)/);
  if (!match) {
    throw new Error(`Could not parse semver from ${versionFile}`);
  }
  return match[1];
}

async function zipDirectory(stagingRoot, zipPath) {
  await rm(zipPath, { force: true });
  await new Promise((resolve, reject) => {
    const child = spawn('zip', ['-r', zipPath, RELEASE_TOP_LEVEL], {
      cwd: stagingRoot,
      stdio: 'inherit',
    });
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`zip failed with exit code ${code}`));
      }
    });
  });
}

async function main() {
  const version = process.env.MGVIEW_RELEASE_VERSION ?? (await readVersion());
  const stagingRoot = path.join(releaseDir, `mgview-${version}`);
  const stagingDir = path.join(stagingRoot, RELEASE_TOP_LEVEL);
  const zipPath = path.join(releaseDir, `mgview-${version}.zip`);

  await rm(stagingRoot, { recursive: true, force: true });
  await mkdir(stagingDir, { recursive: true });

  for (const entry of releaseFiles) {
    const source = path.join(repoRoot, entry);
    try {
      await cp(source, path.join(stagingDir, entry), { recursive: true });
    } catch (error) {
      if (entry.startsWith('RunMGView') && entry.endsWith('.lnk')) {
        continue;
      }
      throw error;
    }
  }

  await copyTree(path.join(repoRoot, 'samples'), path.join(stagingDir, 'samples'), {
    exclude: excludeDotfiles,
  });

  await copyTree(path.join(repoRoot, runtimeAssetsDir), path.join(stagingDir, runtimeAssetsDir), {
    exclude: excludeDotfiles,
  });

  await copyTree(distServerDir, path.join(stagingDir, 'frontend', 'dist'), {
    exclude: excludeDotfiles,
  });

  await zipDirectory(stagingRoot, zipPath);
  console.log(`Release zip: ${zipPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
