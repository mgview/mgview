import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
export const frontendDir = path.resolve(scriptDir, '..');
export const repoRoot = path.resolve(frontendDir, '..');

/** GitHub repo name → project-pages URL prefix (https://mgview.github.io/mgview/). */
export const GITHUB_PAGES_REPO = process.env.MGVIEW_GITHUB_REPO ?? 'mgview';
export const githubPagesBase = `/${GITHUB_PAGES_REPO.replace(/^\/+|\/+$/g, '')}`;

/** Local MotionGenesis-style layout: parent folder serves /MGView/… */
export const workspaceAppDir = process.env.MGVIEW_APP_DIR ?? 'MGView';
export const workspaceBase = `/${workspaceAppDir.replace(/^\/+|\/+$/g, '')}/`;

export const buildRoot = path.join(repoRoot, 'build');
export const siteDir = path.join(buildRoot, 'gh-pages');
export const releaseDir = path.join(buildRoot, 'release');
export const distServerDir = path.join(frontendDir, 'dist');
export const distPagesDir = path.join(frontendDir, 'dist-pages');

/** Shared runtime assets shipped with site/release bundles (textures, future fonts/meshes, etc.). */
export const runtimeAssetsDir = 'assets';

/** Vite hashed JS/CSS output dir — must match vite.config.ts build.assetsDir and bin/server.js routing. */
export const viteBundledAssetsDir = 'bundled';

/** Copied into GH Pages output only (historical reference; not in release zips). */
export const githubPagesLegacyDir = 'legacy';
