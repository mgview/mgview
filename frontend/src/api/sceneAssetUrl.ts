import { normalizePathSeparators, normalizeWorkspaceRelativePath } from '../core/pathUtils.ts';
import { resolveApiFileUrl, resolveBundledAssetUrl, resolvePublicAssetUrl } from './assetPaths.ts';
import { isStaticHosting } from './runtimeMode.ts';

export type SceneAssetRoot = 'workspace' | 'sample';

export function resolveSceneAssetUrl(
  scenePath: string,
  assetPath: string,
  assetRoot?: SceneAssetRoot
): string {
  const normalizedScenePath = normalizePathSeparators(scenePath);
  const sceneBasePath = normalizedScenePath.endsWith('/')
    ? normalizedScenePath
    : `${normalizedScenePath}/`;
  const normalizedAssetPath = normalizePathSeparators(assetPath).replace(/^\/+/, '');
  if (normalizedAssetPath.startsWith('assets/')) {
    return resolveBundledAssetUrl(normalizedAssetPath);
  }

  if (!isStaticHosting) {
    const root = assetRoot ?? (sceneBasePath.startsWith('samples/') ? 'sample' : 'workspace');
    const rootRelativeBase = root === 'sample' && sceneBasePath.startsWith('samples/')
      ? sceneBasePath.slice('samples/'.length)
      : sceneBasePath;
    const logicalPath = normalizeWorkspaceRelativePath(`${rootRelativeBase}${normalizedAssetPath}`);
    if (logicalPath) {
      return resolveApiFileUrl(root, logicalPath);
    }

    // Keep invalid traversal inside the file API, where it is rejected, rather
    // than accidentally turning it into an app-relative public URL.
    return resolveApiFileUrl(root, normalizedAssetPath);
  }

  const baseUrl = resolvePublicAssetUrl(sceneBasePath);
  return new URL(normalizedAssetPath, baseUrl).toString();
}
