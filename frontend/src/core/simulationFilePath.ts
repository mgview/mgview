import { getBasePath, normalizeWorkspaceRelativePath } from './pathUtils.ts';

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

export function isMotionGenesisInputPath(filePath: string): boolean {
  return /\.(al|txt|in)$/i.test(filePath);
}
