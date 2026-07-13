/**
 * Assemble a local-download release tree under build/release/mgview-<version>/.
 *
 * Includes only what MGView runtime needs: Node server, modern app build, samples,
 * shared runtime assets, and bundled server-side native dependencies. Does NOT include
 * legacy/ or frontend source.
 *
 * Native PTY: microsoft/node-pty (N-API) with darwin/win32 prebuilds plus the
 * Linux build/Release produced by npm ci on the release runner. Debug symbols (.pdb)
 * are stripped. spawn-helper binaries are marked executable before zipping.
 */
import { chmod, cp, mkdir, readdir, readFile, rm, stat } from 'node:fs/promises';
import path from 'node:path';
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

const releaseFiles = [
  'bin',
  'RunMGViewMac',
  'RunMGViewLinux',
  'RunMGViewWindows.bat',
  'README.md',
  'LICENSE',
];

/** Runtime PTY package only — N-API prebuilds cover macOS/Windows; Linux uses build/. */
const bundledNodeModules = ['node-pty'];

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

function excludeReleaseNativeJunk(src) {
  if (excludeDotfiles(src)) {
    return true;
  }
  const base = path.basename(src);
  // Debug symbols dominate Windows prebuild size and are unused at runtime.
  if (base.endsWith('.pdb')) {
    return true;
  }
  return false;
}

async function markSpawnHelpersExecutable(rootDir) {
  const stack = [rootDir];
  while (stack.length > 0) {
    const current = stack.pop();
    let entries;
    try {
      entries = await readdir(current, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
        continue;
      }
      if (entry.name === 'spawn-helper') {
        await chmod(fullPath, 0o755);
      }
    }
  }
}

async function assertNodePtyReleaseLayout(nodePtyDir) {
  const required = [
    path.join(nodePtyDir, 'prebuilds', 'darwin-arm64', 'pty.node'),
    path.join(nodePtyDir, 'prebuilds', 'darwin-arm64', 'spawn-helper'),
    path.join(nodePtyDir, 'prebuilds', 'darwin-x64', 'pty.node'),
    path.join(nodePtyDir, 'prebuilds', 'darwin-x64', 'spawn-helper'),
    path.join(nodePtyDir, 'prebuilds', 'win32-x64', 'pty.node'),
  ];

  if (process.platform === 'linux') {
    required.push(
      path.join(nodePtyDir, 'build', 'Release', 'pty.node'),
      path.join(nodePtyDir, 'build', 'Release', 'spawn-helper')
    );
  } else {
    console.warn(
      'assembleRelease: building on non-Linux host. ' +
        'Linux users need bin/node_modules/node-pty/build/Release from a Linux npm ci ' +
        '(release CI runs on ubuntu-latest).'
    );
  }

  for (const filePath of required) {
    try {
      const info = await stat(filePath);
      if (!info.isFile()) {
        throw new Error(`not a file: ${filePath}`);
      }
    } catch (error) {
      throw new Error(
        `Release node-pty layout incomplete (missing ${filePath}). ` +
          `Ensure frontend npm ci installed node-pty with platform prebuilds. ` +
          `(${error instanceof Error ? error.message : error})`
      );
    }
  }
}

async function zipDirectory(parentDir, folderName, zipPath) {
  await rm(zipPath, { force: true });
  await new Promise((resolve, reject) => {
    // -y store symlinks as links; unix modes (incl. +x) are preserved by Info-ZIP.
    const child = spawn('zip', ['-ry', zipPath, folderName], {
      cwd: parentDir,
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
  const topLevelName = `mgview-${version}`;
  const stagingDir = path.join(releaseDir, topLevelName);
  const zipPath = path.join(releaseDir, `${topLevelName}.zip`);

  await rm(stagingDir, { recursive: true, force: true });
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
    const source = path.join(frontendDir, 'node_modules', moduleName);
    const target = path.join(stagingDir, 'bin', 'node_modules', moduleName);
    await copyTree(source, target, {
      exclude: excludeReleaseNativeJunk,
    });
  }

  const stagedNodePty = path.join(stagingDir, 'bin', 'node_modules', 'node-pty');
  await markSpawnHelpersExecutable(stagedNodePty);
  await assertNodePtyReleaseLayout(stagedNodePty);

  await zipDirectory(releaseDir, topLevelName, zipPath);
  console.log(`Release zip: ${zipPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
