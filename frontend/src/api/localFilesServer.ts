import type { SceneRef } from '../core/sceneRef.ts';
import { getApiRoot } from '../core/sceneRef.ts';
import type { SceneConfig } from '../core/types.ts';
import type { FileBrowserListing, MotionGenesisRunOptions, MotionGenesisRunState } from './localFilesTypes.ts';
import type { WorkspaceInfo } from './workspaceTypes.ts';

const API_PREFIX = '/mgview/api';

export type ApiRoot = 'workspace' | 'sample' | 'app';

interface ApiRequestOptions {
  root?: ApiRoot;
  path?: string;
}

function getApiUrl(endpoint: string, options?: ApiRequestOptions): string {
  const url = new URL(`${API_PREFIX}/${endpoint}`, window.location.origin);
  if (options?.root) {
    url.searchParams.set('root', options.root);
  }
  if (options?.path !== undefined) {
    url.searchParams.set('path', options.path);
  }
  return url.toString();
}

function apiFetch(url: string, init?: RequestInit): Promise<Response> {
  return fetch(url, { ...init, cache: 'no-store' });
}

async function expectOk(response: Response, fallbackMessage: string): Promise<Response> {
  if (response.ok) {
    return response;
  }

  try {
    const body = await response.text();
    if (!body.trim()) {
      throw new Error(fallbackMessage);
    }

    const data = JSON.parse(body) as { error?: string };
    throw new Error(data.error || fallbackMessage);
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(fallbackMessage);
    }
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(fallbackMessage);
  }
}

export async function getWorkspaceInfo(): Promise<WorkspaceInfo> {
  const response = await apiFetch(getApiUrl('workspace'));
  await expectOk(response, 'Could not load workspace settings');
  return (await response.json()) as WorkspaceInfo;
}

export async function setWorkspaceRoot(workspaceRoot: string): Promise<WorkspaceInfo> {
  const response = await apiFetch(getApiUrl('workspace'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ workspaceRoot }),
  });
  await expectOk(response, 'Could not update workspace');
  return (await response.json()) as WorkspaceInfo;
}

export async function listLocalFiles(
  filePath: string,
  root: ApiRoot = 'workspace'
): Promise<FileBrowserListing> {
  const response = await apiFetch(getApiUrl('list', { root, path: filePath }));
  await expectOk(response, `Could not list files for ${filePath || '.'}`);
  return (await response.json()) as FileBrowserListing;
}

export async function loadSceneJson(sceneRef: SceneRef): Promise<SceneConfig> {
  const response = await apiFetch(
    getApiUrl('file', { root: getApiRoot(sceneRef), path: sceneRef.path })
  );
  await expectOk(response, `Could not load scene file: ${sceneRef.path}`);
  return (await response.json()) as SceneConfig;
}

export async function loadTextFile(filePath: string, root: ApiRoot = 'workspace'): Promise<string> {
  const response = await apiFetch(getApiUrl('file', { root, path: filePath }));
  await expectOk(response, `Could not load file: ${filePath}`);
  return response.text();
}

export async function saveSceneJson(sceneRef: SceneRef, scene: SceneConfig): Promise<void> {
  const response = await apiFetch(getApiUrl('file', { root: getApiRoot(sceneRef), path: sceneRef.path }), {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(scene),
  });
  await expectOk(response, `Could not save scene file: ${sceneRef.path}`);
}

export async function createSceneJson(sceneRef: SceneRef, scene: SceneConfig): Promise<void> {
  const response = await apiFetch(getApiUrl('file', { root: getApiRoot(sceneRef), path: sceneRef.path }), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(scene),
  });
  await expectOk(response, `Could not create scene file: ${sceneRef.path}`);
}

export async function createWorkspaceDirectory(filePath: string): Promise<void> {
  const response = await apiFetch(getApiUrl('mkdir', { root: 'workspace', path: filePath }), {
    method: 'POST',
  });
  await expectOk(response, `Could not create folder: ${filePath}`);
}

export async function startMotionGenesisRun(
  scenePath: string,
  simulationSettings: string,
  options: MotionGenesisRunOptions
): Promise<MotionGenesisRunState> {
  const response = await apiFetch(getApiUrl('mg-run'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ scenePath, simulationSettings, options }),
  });
  await expectOk(response, `Could not start Motion Genesis for ${scenePath}`);
  return (await response.json()) as MotionGenesisRunState;
}

export async function getMotionGenesisRun(runId: string): Promise<MotionGenesisRunState> {
  const response = await apiFetch(getApiUrl(`mg-run/${encodeURIComponent(runId)}`));
  await expectOk(response, `Could not load Motion Genesis run ${runId}`);
  return (await response.json()) as MotionGenesisRunState;
}

export async function sendMotionGenesisInput(
  runId: string,
  input: string
): Promise<MotionGenesisRunState> {
  const response = await apiFetch(getApiUrl(`mg-run/${encodeURIComponent(runId)}/input`), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ input }),
  });
  await expectOk(response, `Could not send input to Motion Genesis run ${runId}`);
  return (await response.json()) as MotionGenesisRunState;
}

export async function stopMotionGenesisRun(runId: string): Promise<MotionGenesisRunState> {
  const response = await apiFetch(getApiUrl(`mg-run/${encodeURIComponent(runId)}`), {
    method: 'DELETE',
  });
  await expectOk(response, `Could not stop Motion Genesis run ${runId}`);
  return (await response.json()) as MotionGenesisRunState;
}
