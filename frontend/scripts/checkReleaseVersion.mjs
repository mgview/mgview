/**
 * Verify that an exact release tag matches frontend/package.json version.
 *
 * Skips when HEAD is not on a release tag (local inspection builds).
 * Set MGVIEW_RELEASE_TAG to force the check (used by the release workflow).
 * Set MGVIEW_SKIP_VERSION_CHECK=1 to bypass.
 */
import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { frontendDir, repoRoot } from './deployConfig.mjs';

export async function readPackageVersion() {
  const packageJsonPath = path.join(frontendDir, 'package.json');
  const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf8'));
  const version = String(packageJson.version ?? '').trim();
  if (!version) {
    throw new Error(`Could not read version from ${packageJsonPath}`);
  }
  return version;
}

export function getExactReleaseTag() {
  if (process.env.MGVIEW_SKIP_VERSION_CHECK === '1') {
    return null;
  }

  const explicitTag = process.env.MGVIEW_RELEASE_TAG?.trim();
  if (explicitTag) {
    return explicitTag;
  }

  try {
    return execFileSync('git', ['describe', '--exact-match', '--tags', 'HEAD'], {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return null;
  }
}

export function tagToVersion(tag) {
  const match = /^v(.+)$/.exec(tag);
  if (!match) {
    throw new Error(`Release tag must look like v1.2.3, got ${JSON.stringify(tag)}`);
  }
  return match[1];
}

export async function checkReleaseVersion() {
  const tag = getExactReleaseTag();
  if (!tag) {
    console.log('Not on an exact release tag; skipping version check.');
    return;
  }

  const packageVersion = await readPackageVersion();
  const tagVersion = tagToVersion(tag);

  if (tagVersion !== packageVersion) {
    throw new Error(
      `Release tag ${tag} does not match frontend/package.json version ${packageVersion}. ` +
        'Bump frontend/package.json before tagging, or set MGVIEW_SKIP_VERSION_CHECK=1 to bypass.',
    );
  }

  console.log(`Release version OK: ${tag} matches frontend/package.json (${packageVersion})`);
}

const isMain =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (isMain) {
  checkReleaseVersion().catch((error) => {
    console.error(error.message ?? error);
    process.exit(1);
  });
}
