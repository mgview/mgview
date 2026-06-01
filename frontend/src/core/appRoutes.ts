import { getAppMountPrefix } from '../api/assetPaths.ts';

export type AppRoute = 'app' | 'documentation';

function ensureLeadingSlash(value: string): string {
  return value.startsWith('/') ? value : `/${value}`;
}

function ensureTrailingSlash(value: string): string {
  return value.endsWith('/') ? value : `${value}/`;
}

function trimSlashes(value: string): string {
  return value.replace(/^\/+/, '').replace(/\/+$/, '');
}

export function resolveAppRoute(pathname: string, mountPrefix: string): AppRoute {
  const normalizedMountPrefix = ensureTrailingSlash(ensureLeadingSlash(mountPrefix));
  const normalizedPathname = ensureLeadingSlash(pathname).replace(/\/{2,}/g, '/');

  const relativePath = normalizedPathname.startsWith(normalizedMountPrefix)
    ? normalizedPathname.slice(normalizedMountPrefix.length)
    : trimSlashes(normalizedPathname);

  return trimSlashes(relativePath) === 'documentation' ? 'documentation' : 'app';
}

export function getCurrentAppRoute(): AppRoute {
  if (typeof window === 'undefined') {
    return 'app';
  }

  return resolveAppRoute(window.location.pathname, getAppMountPrefix());
}

export function getHomePath(): string {
  return ensureTrailingSlash(getAppMountPrefix());
}

export function getDocumentationPath(): string {
  return `${getHomePath()}documentation/`.replace(/\/{2,}/g, '/');
}
