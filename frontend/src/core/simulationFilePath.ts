import { getBasePath, getRelativePath, normalizeWorkspaceRelativePath } from './pathUtils.ts';
import { getApiRoot, type ApiRoot, type SceneRef } from './sceneRef.ts';

export interface SimulationFileLoadRequest {
  path: string;
  root: ApiRoot;
}

export function getSceneDirectoryPath(scenePath: string | null): string {
  if (!scenePath) {
    return '.';
  }

  const basePath = getBasePath(scenePath).replace(/\/$/, '');
  return basePath.length > 0 ? basePath : '.';
}

export function resolveSimulationFilePath(
  scenePath: string | null,
  simulationSettings: string | null | undefined
): string | null {
  const trimmedSettings = simulationSettings?.trim();
  if (!scenePath || !trimmedSettings) {
    return null;
  }

  const sceneDirectoryPath = getSceneDirectoryPath(scenePath);
  const joinedPath =
    sceneDirectoryPath === '.' ? trimmedSettings : `${sceneDirectoryPath}/${trimmedSettings}`;
  return normalizeWorkspaceRelativePath(joinedPath);
}

export function resolveSimulationFileLoadRequest(
  sceneRef: SceneRef | null,
  simulationSettings: string | null | undefined
): SimulationFileLoadRequest | null {
  if (!sceneRef) {
    return null;
  }

  const path = resolveSimulationFilePath(sceneRef.path, simulationSettings);
  if (!path) {
    return null;
  }

  return {
    path,
    root: getApiRoot(sceneRef),
  };
}

export function isMotionGenesisInputPath(filePath: string): boolean {
  return /\.(al|txt)$/i.test(filePath);
}

export function defaultSimFileNameForScene(scenePath: string): string {
  const normalizedPath = scenePath.replace(/\\/g, '/');
  const fileName = normalizedPath.split('/').pop() ?? normalizedPath;
  const stem = fileName.replace(/\.json$/i, '') || 'new_scene';
  return `${stem}.txt`;
}

export function validateSimFileName(name: string): string | null {
  const trimmedName = name.trim();
  if (trimmedName.length === 0) {
    return 'Enter a simulation file name.';
  }
  if (trimmedName.includes('/') || trimmedName.includes('\\')) {
    return 'File names cannot include slashes.';
  }
  if (trimmedName === '..' || trimmedName.includes('..')) {
    return 'File names cannot include "..".';
  }
  if (trimmedName.startsWith('.')) {
    return 'File names cannot start with ".".';
  }
  if (!isMotionGenesisInputPath(trimmedName)) {
    return 'Simulation files must end in .al or .txt.';
  }
  return null;
}

export function getSimulationSettingsRelativePath(
  scenePath: string,
  simulationFilePath: string
): string | null {
  const sceneDirectoryPath = getSceneDirectoryPath(scenePath);
  const normalizedSceneDirectory =
    sceneDirectoryPath === '.' ? '' : sceneDirectoryPath.replace(/\/$/, '');
  return getRelativePath(normalizedSceneDirectory, simulationFilePath);
}
