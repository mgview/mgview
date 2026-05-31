import { getBasePath } from './pathUtils.ts';

export type SceneRef =
  | { source: 'sample'; path: string }
  | { source: 'workspace'; path: string };

export type ApiRoot = 'workspace' | 'sample';

export const DEFAULT_SAMPLE_SCENE_PATH = 'particle_pendulum/particle_pendulum.json';

export function createSampleRef(path: string): SceneRef {
  return { source: 'sample', path: normalizeRefPath(path) };
}

export function createWorkspaceRef(path: string): SceneRef {
  return { source: 'workspace', path: normalizeRefPath(path) };
}

export function getDefaultSceneRef(): SceneRef {
  return createSampleRef(DEFAULT_SAMPLE_SCENE_PATH);
}

function normalizeRefPath(scenePath: string): string {
  return scenePath.replace(/\\/g, '/').replace(/^\/+/, '');
}

export function formatSceneRef(ref: SceneRef): string {
  return ref.path;
}

export function parseSceneRefFromUrl(searchParams: URLSearchParams): SceneRef {
  const sample = searchParams.get('sample');
  const scene = searchParams.get('scene');

  if (sample) {
    return createSampleRef(sample);
  }

  if (scene) {
    return createWorkspaceRef(scene);
  }

  return getDefaultSceneRef();
}

export function buildSceneUrl(ref: SceneRef, origin?: string): string {
  const url = new URL(origin ?? (typeof window !== 'undefined' ? window.location.href : 'http://localhost/'));
  url.searchParams.delete('sample');
  url.searchParams.delete('scene');

  if (ref.source === 'sample') {
    url.searchParams.set('sample', ref.path);
  } else {
    url.searchParams.set('scene', ref.path);
  }

  return url.toString();
}

export function syncSceneRefToUrl(ref: SceneRef): void {
  if (typeof window === 'undefined') {
    return;
  }

  const url = new URL(window.location.href);
  url.searchParams.delete('sample');
  url.searchParams.delete('scene');

  if (ref.source === 'sample') {
    url.searchParams.set('sample', ref.path);
  } else {
    url.searchParams.set('scene', ref.path);
  }

  window.history.replaceState({}, '', url);
}

export function resolveApiFilePath(ref: SceneRef): string {
  if (ref.source === 'sample') {
    return `samples/${ref.path}`;
  }
  return ref.path;
}

export function getApiRoot(ref: SceneRef): ApiRoot {
  return ref.source === 'sample' ? 'sample' : 'workspace';
}

export function getSceneBasePath(ref: SceneRef): string {
  const apiPath = resolveApiFilePath(ref);
  const base = getBasePath(apiPath);
  return base.endsWith('/') ? base : `${base}/`;
}

export function getSceneDirectory(ref: SceneRef): string {
  const directory = getBasePath(ref.path).replace(/\/$/, '');
  return directory.length === 0 ? '.' : directory;
}

export function sceneRefsEqual(left: SceneRef, right: SceneRef): boolean {
  return left.source === right.source && left.path === right.path;
}

export function isForbiddenWorkspacePath(scenePath: string): boolean {
  const normalized = normalizeRefPath(scenePath);
  return normalized.split('/').some((segment) => segment === '..');
}

export function workspacePathFromInput(scenePath: string): string | null {
  const trimmed = scenePath.trim();
  if (trimmed.length === 0 || isForbiddenWorkspacePath(trimmed)) {
    return null;
  }
  return trimmed;
}

export function resolveApiFileRequest(
  filePath: string
): { root: ApiRoot | 'app'; path: string } {
  const normalized = normalizeRefPath(filePath);

  if (normalized.startsWith('samples/')) {
    return { root: 'sample', path: normalized.slice('samples/'.length) };
  }

  if (normalized.startsWith('assets/') || normalized.startsWith('bundled/') || normalized.startsWith('legacy/')) {
    return { root: 'app', path: normalized };
  }

  return { root: 'workspace', path: normalized };
}
