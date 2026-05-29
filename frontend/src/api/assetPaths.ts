import { normalizePathSeparators } from '../core/pathUtils.ts';
import { workspacePath } from '../core/workspacePaths.ts';

function ensureTrailingSlash(value: string): string {
  return value.endsWith('/') ? value : `${value}/`;
}

/** URL prefix for workspace-root paths (MGView/samples/…, MGView/assets/…). */
export function getPublicBaseUrl(): string {
  const configured = import.meta.env.VITE_MGVIEW_PUBLIC_BASE;
  if (configured !== undefined && configured !== '') {
    return ensureTrailingSlash(configured);
  }
  return '/';
}

export function resolvePublicAssetUrl(relativePath: string): string {
  const normalizedPath = normalizePathSeparators(relativePath).replace(/^\/+/, '');
  return new URL(normalizedPath, new URL(getPublicBaseUrl(), window.location.origin)).toString();
}

export function resolveBundledAssetUrl(relativePath: string): string {
  const normalized = relativePath.replace(/^\/+/, '');
  const path = normalized.startsWith('assets/') ? workspacePath(normalized) : normalized;
  return resolvePublicAssetUrl(path);
}

/** @deprecated Use resolveBundledAssetUrl */
export function resolveAppAssetUrl(relativePath: string): string {
  return resolveBundledAssetUrl(relativePath);
}

/** @deprecated Use getPublicBaseUrl — kept for existing imports. */
export function getServerRootPrefix(): string {
  return getPublicBaseUrl();
}
