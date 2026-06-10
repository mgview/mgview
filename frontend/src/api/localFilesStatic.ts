import { resolveApiFilePath, type SceneRef } from '../core/sceneRef.ts';
import type { SceneConfig } from '../core/types.ts';
import { resolvePublicAssetUrl } from './assetPaths.ts';
import type {
  FileBrowserListing,
  MotionGenesisRunState,
  StaticFileManifest,
} from './localFilesTypes.ts';

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

function downloadBlob(fileName: string, contents: string, mimeType: string): void {
  const blob = new Blob([contents], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

function downloadJson(scenePath: string, scene: SceneConfig): void {
  const fileName = scenePath.split('/').pop() || 'scene.json';
  downloadBlob(fileName, `${JSON.stringify(scene, null, 2)}\n`, 'application/json');
}

export async function listLocalFiles(
  filePath: string,
  root: 'workspace' | 'sample' | 'app' = 'workspace'
): Promise<FileBrowserListing> {
  const manifest = await loadManifest();
  const normalizedPath = normalizeBrowserPath(filePath);
  const manifestKey = root === 'sample' ? `samples/${normalizedPath}` : normalizedPath;
  const listing = manifest.listings[manifestKey];
  if (!listing) {
    throw new Error(`Directory not found: ${manifestKey}`);
  }
  return listing;
}

export async function loadSceneJson(sceneRef: SceneRef): Promise<SceneConfig> {
  const response = await fetch(resolvePublicAssetUrl(resolveApiFilePath(sceneRef)));
  await expectOk(response, `Could not load scene file: ${sceneRef.path}`);
  return (await response.json()) as SceneConfig;
}

export async function loadTextFile(
  filePath: string,
  root: 'workspace' | 'sample' | 'app' = 'workspace'
): Promise<string> {
  const manifestPath = root === 'sample' ? `samples/${filePath}` : filePath;
  const response = await fetch(resolvePublicAssetUrl(manifestPath));
  await expectOk(response, `Could not load file: ${filePath}`);
  return response.text();
}

export async function saveSceneJson(sceneRef: SceneRef, scene: SceneConfig): Promise<void> {
  downloadJson(resolveApiFilePath(sceneRef), scene);
}

export async function saveTextFile(filePath: string, contents: string): Promise<void> {
  const fileName = filePath.split('/').pop() || 'simulation.txt';
  downloadBlob(fileName, contents, 'text/plain');
}

export async function createSceneJson(sceneRef: SceneRef, scene: SceneConfig): Promise<void> {
  downloadJson(resolveApiFilePath(sceneRef), scene);
}

export async function startMotionGenesisRun(
  scenePath: string,
  simulationSettings: string,
  options?: unknown
): Promise<MotionGenesisRunState> {
  throw new Error(`Motion Genesis runs are unavailable in static mode: ${scenePath} (${simulationSettings})`);
}

export async function startMotionGenesisFileRun(
  filePath: string,
  options?: unknown
): Promise<MotionGenesisRunState> {
  throw new Error(`Motion Genesis runs are unavailable in static mode: ${filePath}`);
}

export async function getMotionGenesisRun(runId: string): Promise<MotionGenesisRunState> {
  throw new Error(`Motion Genesis runs are unavailable in static mode: ${runId}`);
}

export async function sendMotionGenesisInput(
  runId: string,
  input: string
): Promise<MotionGenesisRunState> {
  throw new Error(`Motion Genesis runs are unavailable in static mode: ${runId} (${input})`);
}

export async function stopMotionGenesisRun(runId: string): Promise<MotionGenesisRunState> {
  throw new Error(`Motion Genesis runs are unavailable in static mode: ${runId}`);
}
