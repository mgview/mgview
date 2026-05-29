import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '../..');
const workspaceRoot = path.resolve(repoRoot, '..');
const configuredAppDir = process.env.VITE_MGVIEW_APP_DIR ?? process.env.MGVIEW_APP_DIR;
const appDirName = (configuredAppDir !== undefined ? configuredAppDir : path.basename(repoRoot)).replace(
  /^\/+|\/+$/g,
  ''
);
const isStaticSiteManifest = process.env.VITE_MGVIEW_STATIC === 'true';
const samplesRoot = path.join(repoRoot, 'samples');

async function listDirectoryEntries(directoryPath) {
  const entries = await fs.readdir(directoryPath, { withFileTypes: true });
  return entries
    .filter((entry) => entry.name.charAt(0) !== '.')
    .map((entry) => ({
      name: entry.name,
      type: entry.isDirectory() ? 'directory' : 'file',
    }))
    .sort((left, right) => {
      if (left.type !== right.type) {
        return left.type === 'directory' ? -1 : 1;
      }
      return left.name.localeCompare(right.name);
    });
}

function listingPath(...segments) {
  return segments.filter((segment) => segment.length > 0).join('/');
}

function addShallowListing(listings, listingKey, absoluteDir, parentPath) {
  return listDirectoryEntries(absoluteDir).then((rawEntries) => {
    listings[listingKey] = {
      path: listingKey,
      parentPath,
      entries: rawEntries.map((entry) => ({
        name: entry.name,
        path: listingPath(listingKey === '.' ? '' : listingKey, entry.name),
        type: entry.type,
      })),
    };
  });
}

export async function generateStaticManifest() {
  const listings = {};

  async function visitSamples(samplesRelativeDir) {
    const absoluteDir =
      samplesRelativeDir.length === 0
        ? samplesRoot
        : path.join(samplesRoot, samplesRelativeDir);
    const listingKey =
      appDirName.length === 0
        ? samplesRelativeDir.length === 0
          ? 'samples'
          : `samples/${samplesRelativeDir}`
        : listingPath(appDirName, 'samples', samplesRelativeDir);
    const parentPath =
      appDirName.length === 0
        ? samplesRelativeDir.length === 0
          ? '.'
          : `samples/${path.posix.dirname(samplesRelativeDir)}`
        : samplesRelativeDir.length === 0
          ? appDirName
          : listingPath(appDirName, 'samples', path.posix.dirname(samplesRelativeDir));

    const rawEntries = await listDirectoryEntries(absoluteDir);
    listings[listingKey] = {
      path: listingKey,
      parentPath,
      entries: rawEntries.map((entry) => ({
        name: entry.name,
        path: listingPath(listingKey, entry.name),
        type: entry.type,
      })),
    };

    for (const entry of rawEntries) {
      if (entry.type === 'directory') {
        const childRelative =
          samplesRelativeDir.length === 0 ? entry.name : `${samplesRelativeDir}/${entry.name}`;
        await visitSamples(childRelative);
      }
    }
  }

  if (appDirName.length === 0) {
    if (isStaticSiteManifest) {
      listings['.'] = {
        path: '.',
        parentPath: null,
        entries: [
          { name: 'samples', path: 'samples', type: 'directory' },
          { name: 'assets', path: 'assets', type: 'directory' },
        ],
      };
    } else {
      await addShallowListing(listings, '.', repoRoot, null);
    }
  } else {
    if (isStaticSiteManifest) {
      listings['.'] = {
        path: '.',
        parentPath: null,
        entries: [{ name: appDirName, path: appDirName, type: 'directory' }],
      };
    } else {
      await addShallowListing(listings, '.', workspaceRoot, null);
    }
    await addShallowListing(listings, appDirName, repoRoot, '.');
  }

  await visitSamples('');
  return { version: 1, listings };
}

async function main() {
  const outputPath = process.argv[2];
  if (!outputPath) {
    throw new Error('Usage: node generateStaticManifest.mjs <output.json>');
  }

  const manifest = await generateStaticManifest();
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  console.log(`Wrote static manifest with ${Object.keys(manifest.listings).length} listings to ${outputPath}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
