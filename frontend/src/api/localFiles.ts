import type { SceneConfig } from '../core/types.ts';

export interface FileBrowserEntry {
  name: string;
  path: string;
  type: 'directory' | 'file';
}

export interface FileBrowserListing {
  path: string;
  parentPath: string | null;
  entries: FileBrowserEntry[];
}

export function getServerRootPrefix(): string {
  return window.location.pathname.startsWith('/MGView/') ? '/MGView/' : '/';
}

function getApiUrl(endpoint: string, filePath?: string): string {
  const url = new URL(`${getServerRootPrefix()}api/${endpoint}`, window.location.origin);
  if (filePath !== undefined) {
    url.searchParams.set('path', filePath);
  }
  return url.toString();
}

async function expectOk(response: Response, fallbackMessage: string): Promise<Response> {
  if (response.ok) {
    return response;
  }

  try {
    const data = (await response.json()) as { error?: string };
    throw new Error(data.error || fallbackMessage);
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(fallbackMessage);
  }
}

export async function listLocalFiles(filePath: string): Promise<FileBrowserListing> {
  const response = await fetch(getApiUrl('list', filePath));
  await expectOk(response, `Could not list files for ${filePath || '.'}`);
  return (await response.json()) as FileBrowserListing;
}

export async function loadSceneJson(scenePath: string): Promise<SceneConfig> {
  const response = await fetch(getApiUrl('file', scenePath));
  await expectOk(response, `Could not load scene file: ${scenePath}`);
  return (await response.json()) as SceneConfig;
}

export async function loadTextFile(filePath: string): Promise<string> {
  const response = await fetch(getApiUrl('file', filePath));
  await expectOk(response, `Could not load file: ${filePath}`);
  return response.text();
}

export async function saveSceneJson(scenePath: string, scene: SceneConfig): Promise<void> {
  const response = await fetch(getApiUrl('file', scenePath), {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(scene),
  });
  await expectOk(response, `Could not save scene file: ${scenePath}`);
}

export async function createSceneJson(scenePath: string, scene: SceneConfig): Promise<void> {
  const response = await fetch(getApiUrl('file', scenePath), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(scene),
  });
  await expectOk(response, `Could not create scene file: ${scenePath}`);
}
