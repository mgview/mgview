/**
 * Assemble the GitHub Pages site under build/gh-pages/ (or build/gh-pages-workspace/mgview/).
 *
 * Layout (deployed to https://mgview.github.io/mgview/):
 *   bundled/                ← Vite hashed JS/CSS (build.assetsDir)
 *   assets/textures/        ← bundled runtime media (material presets)
 *   legacy/                 ← optional historical jQuery app (not maintained)
 */
import { access, copyFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  distPagesDir,
  githubPagesLegacyDir,
  repoRoot,
  runtimeAssetsDir,
  siteDir,
  workspaceAppDir,
} from './deployConfig.mjs';
import { copyTree, excludeDotfiles, replaceDir } from './lib/copyTree.mjs';

const useWorkspaceLayout = process.argv.includes('--workspace');
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const workspaceSiteDir = path.join(scriptDir, '../../build/gh-pages-workspace', workspaceAppDir);

async function assertExists(targetPath, label) {
  try {
    await access(targetPath);
  } catch {
    throw new Error(`${label} not found at ${targetPath}. Run the static build first.`);
  }
}

async function main() {
  await assertExists(path.join(distPagesDir, 'index.html'), 'Static app build');
  await assertExists(path.join(repoRoot, 'samples'), 'samples/');

  const outputDir = useWorkspaceLayout ? workspaceSiteDir : siteDir;
  await replaceDir(distPagesDir, outputDir, { exclude: excludeDotfiles });
  await copyTree(path.join(repoRoot, 'samples'), path.join(outputDir, 'samples'), {
    exclude: excludeDotfiles,
  });
  await copyFile(
    path.join(repoRoot, 'samples-manifest.json'),
    path.join(outputDir, 'samples-manifest.json')
  );

  const bundledAssetsSource = path.join(repoRoot, runtimeAssetsDir);
  await assertExists(bundledAssetsSource, `${runtimeAssetsDir}/`);
  await copyTree(bundledAssetsSource, path.join(outputDir, runtimeAssetsDir), {
    exclude: excludeDotfiles,
  });

  if (!useWorkspaceLayout) {
    const legacySource = path.join(repoRoot, githubPagesLegacyDir);
    try {
      await access(legacySource);
      await copyTree(legacySource, path.join(outputDir, githubPagesLegacyDir), {
        exclude: excludeDotfiles,
      });
    } catch {
      console.warn(`Skipping ${githubPagesLegacyDir}/ (not present).`);
    }
    await writeFile(path.join(outputDir, '.nojekyll'), '\n');
  }

  console.log(`Assembled static site at ${outputDir}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
