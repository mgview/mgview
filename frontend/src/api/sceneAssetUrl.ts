import { normalizePathSeparators } from '../core/pathUtils.ts';
import { resolveBundledAssetUrl, resolvePublicAssetUrl } from './assetPaths.ts';

export function resolveSceneAssetUrl(scenePath: string, assetPath: string): string {
  const normalizedAssetPath = normalizePathSeparators(assetPath).replace(/^\/+/, '');
  if (normalizedAssetPath.startsWith('assets/')) {
    return resolveBundledAssetUrl(normalizedAssetPath);
  }

  const normalizedSceneBase = normalizePathSeparators(scenePath);
  const baseUrl = resolvePublicAssetUrl(
    normalizedSceneBase.endsWith('/') ? normalizedSceneBase : `${normalizedSceneBase}/`
  );
  return new URL(normalizedAssetPath, baseUrl).toString();
}
