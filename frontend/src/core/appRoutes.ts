import { getAppMountPrefix } from '../api/assetPaths.ts';

export type AppRoute = 'app' | 'documentation' | 'lab';

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

  const trimmed = trimSlashes(relativePath);
  if (trimmed === 'docs') {
    return 'documentation';
  }
  if (trimmed === 'lab') {
    return 'lab';
  }
  return 'app';
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
  return `${getHomePath()}docs/`.replace(/\/{2,}/g, '/');
}

export function getLabPath(): string {
  return `${getHomePath()}lab/`.replace(/\/{2,}/g, '/');
}

/** Same-origin MGView pages — open in a new tab so the current workspace tab is preserved. */
export const inAppLinkProps = {
  target: '_blank',
  rel: 'noopener noreferrer',
} as const;
