import { normalizePathSeparators } from '../core/pathUtils.ts';
import { workspacePath } from '../core/workspacePaths.ts';

function ensureTrailingSlash(value: string): string {
  return value.endsWith('/') ? value : `${value}/`;
}

/** URL prefix for workspace-root assets (MGView/samples/…, MGView/app/…). */
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

export function resolveAppAssetUrl(appRelativePath: string): string {
  const normalized = appRelativePath.replace(/^\/+/, '');
  const path = normalized.startsWith('app/') ? workspacePath(normalized) : normalized;
  return resolvePublicAssetUrl(path);
}

/** @deprecated Use getPublicBaseUrl — kept for existing imports. */
export function getServerRootPrefix(): string {
  return getPublicBaseUrl();
}
