import type { SceneConfig } from '../core/types.ts';
import { resolvePublicAssetUrl } from './assetPaths.ts';
import type { FileBrowserListing, StaticFileManifest } from './localFilesTypes.ts';

let manifestPromise: Promise<StaticFileManifest> | null = null;

function getManifestUrl(): string {
  return new URL('static-file-manifest.json', window.location.href).toString();
}

function loadManifest(): Promise<StaticFileManifest> {
  if (!manifestPromise) {
    manifestPromise = fetch(getManifestUrl()).then(async (response) => {
      if (!response.ok) {
        throw new Error('Could not load static file manifest.');
      }
      return (await response.json()) as StaticFileManifest;
    });
  }
  return manifestPromise;
}

async function expectOk(response: Response, fallbackMessage: string): Promise<Response> {
  if (response.ok) {
    return response;
  }
  throw new Error(fallbackMessage);
}

function normalizeBrowserPath(filePath: string): string {
  const normalized = filePath.replace(/\\/g, '/').replace(/^\/+/, '');
  return normalized.length === 0 ? '.' : normalized;
}

function downloadJson(scenePath: string, scene: SceneConfig): void {
  const fileName = scenePath.split('/').pop() || 'scene.json';
  const blob = new Blob([`${JSON.stringify(scene, null, 2)}\n`], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function listLocalFiles(filePath: string): Promise<FileBrowserListing> {
  const manifest = await loadManifest();
  const normalizedPath = normalizeBrowserPath(filePath);
  const listing = manifest.listings[normalizedPath];
  if (!listing) {
    throw new Error(`Directory not found: ${normalizedPath}`);
  }
  return listing;
}

export async function loadSceneJson(scenePath: string): Promise<SceneConfig> {
  const response = await fetch(resolvePublicAssetUrl(scenePath));
  await expectOk(response, `Could not load scene file: ${scenePath}`);
  return (await response.json()) as SceneConfig;
}

export async function loadTextFile(filePath: string): Promise<string> {
  const response = await fetch(resolvePublicAssetUrl(filePath));
  await expectOk(response, `Could not load file: ${filePath}`);
  return response.text();
}

export async function saveSceneJson(scenePath: string, scene: SceneConfig): Promise<void> {
  downloadJson(scenePath, scene);
}

export async function createSceneJson(scenePath: string, scene: SceneConfig): Promise<void> {
  downloadJson(scenePath, scene);
}
