/**
 * Assemble a local-download release tree under build/release/mgview-<version>/.
 *
 * Includes only what MGView runtime needs: Node server, modern app build, samples,
 * shared runtime assets, and bundled server-side native dependencies. Does NOT include
 * legacy/ or frontend source.
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { cp, mkdir, rm } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import {
  distServerDir,
  frontendDir,
  releaseDir,
  repoRoot,
  runtimeAssetsDir,
} from './deployConfig.mjs';
import { checkReleaseVersion } from './checkReleaseVersion.mjs';
import { copyTree, excludeDotfiles } from './lib/copyTree.mjs';

const RELEASE_TOP_LEVEL = 'mgview';

const releaseFiles = [
  'bin',
  'RunMGViewMac',
  'RunMGViewLinux',
  'RunMGViewWindows.bat',
  'README.md',
  'LICENSE',
];
const bundledNodeModules = ['node-pty', 'node-addon-api'];
const bundledScopedNodeModules = [['@homebridge', 'node-pty-prebuilt-multiarch']];

async function readVersion() {
  const packageJsonPath = path.join(frontendDir, 'package.json');
  const raw = await readFile(packageJsonPath, 'utf8');
  const packageJson = JSON.parse(raw);
  const version = String(packageJson.version ?? '').trim();
  if (!version) {
    throw new Error(`Could not read version from ${packageJsonPath}`);
  }
  return version;
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
  await checkReleaseVersion();

  const version = process.env.MGVIEW_RELEASE_VERSION ?? (await readVersion());
  const stagingRoot = path.join(releaseDir, `mgview-${version}`);
  const stagingDir = path.join(stagingRoot, RELEASE_TOP_LEVEL);
  const zipPath = path.join(releaseDir, `mgview-${version}.zip`);

  await rm(stagingRoot, { recursive: true, force: true });
  await mkdir(stagingDir, { recursive: true });

  for (const entry of releaseFiles) {
    const source = path.join(repoRoot, entry);
    await cp(source, path.join(stagingDir, entry), { recursive: true });
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

  for (const moduleName of bundledNodeModules) {
    await cp(
      path.join(frontendDir, 'node_modules', moduleName),
      path.join(stagingDir, 'bin', 'node_modules', moduleName),
      { recursive: true }
    );
  }

  for (const [scopeName, moduleName] of bundledScopedNodeModules) {
    const targetScopeDir = path.join(stagingDir, 'bin', 'node_modules', scopeName);
    await mkdir(targetScopeDir, { recursive: true });
    await cp(
      path.join(frontendDir, 'node_modules', scopeName, moduleName),
      path.join(targetScopeDir, moduleName),
      { recursive: true }
    );
  }

  await zipDirectory(stagingRoot, zipPath);
  console.log(`Release zip: ${zipPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
