import { normalizePathSeparators } from '../core/pathUtils.ts';

function ensureTrailingSlash(value: string): string {
  return value.endsWith('/') ? value : `${value}/`;
}

const MGVIEW_MOUNT = '/mgview/';

/** Browser mount prefix for app-relative URLs (samples/, assets/, …). */
export function getAppMountPrefix(): string {
  const configured = import.meta.env?.VITE_MGVIEW_PUBLIC_BASE;
  if (configured !== undefined && configured !== '') {
    return ensureTrailingSlash(configured);
  }

  if (typeof window !== 'undefined') {
    const { pathname } = window.location;
    if (pathname === '/mgview' || pathname.startsWith(MGVIEW_MOUNT)) {
      return MGVIEW_MOUNT;
    }
  }

  return '/';
}

/** @deprecated Prefer getAppMountPrefix — kept for existing imports. */
export function getPublicBaseUrl(): string {
  return getAppMountPrefix();
}

export function resolvePublicAssetUrl(relativePath: string): string {
  const normalizedPath = normalizePathSeparators(relativePath).replace(/^\/+/, '');
  const origin =
    typeof window !== 'undefined' ? window.location.origin : 'http://localhost';
  return new URL(normalizedPath, new URL(getAppMountPrefix(), origin)).toString();
}

export function resolveBundledAssetUrl(relativePath: string): string {
  const normalized = relativePath.replace(/^\/+/, '');
  return resolvePublicAssetUrl(normalized);
}

/** @deprecated Use resolveBundledAssetUrl */
export function resolveAppAssetUrl(relativePath: string): string {
  return resolveBundledAssetUrl(relativePath);
}

/** @deprecated Use getPublicBaseUrl — kept for existing imports. */
export function getServerRootPrefix(): string {
  return getPublicBaseUrl();
}
