import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendDir = path.resolve(scriptDir, '..');
const repoRoot = path.resolve(frontendDir, '..');

function getGitCommit() {
  try {
    return execFileSync('git', ['rev-parse', '--short', 'HEAD'], {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return null;
  }
}

async function main() {
  const packageJsonPath = path.join(frontendDir, 'package.json');
  const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf8'));
  const version = String(process.env.MGVIEW_RELEASE_VERSION ?? packageJson.version ?? '').trim();

  if (!version) {
    throw new Error(`Could not read version from ${packageJsonPath}`);
  }

  const buildTimestamp = new Date().toISOString();
  const buildDate = buildTimestamp.slice(0, 10);
  const commit = getGitCommit();
  const generatedDir = path.join(frontendDir, 'src', 'generated');
  const buildInfoPath = path.join(generatedDir, 'buildInfo.ts');
  const versionFilePath = path.join(repoRoot, 'bin', 'VERSION');

  await mkdir(generatedDir, { recursive: true });

  const buildInfoSource = `export interface BuildInfo {
  version: string;
  buildDate: string;
  buildTimestamp: string;
  commit: string | null;
}

const buildInfo: BuildInfo = {
  version: ${JSON.stringify(version)},
  buildDate: ${JSON.stringify(buildDate)},
  buildTimestamp: ${JSON.stringify(buildTimestamp)},
  commit: ${JSON.stringify(commit)},
};

export default buildInfo;
`;

  await writeFile(buildInfoPath, buildInfoSource, 'utf8');
  await writeFile(versionFilePath, `${version} (built ${buildDate})\n`, 'utf8');
}

await main();
