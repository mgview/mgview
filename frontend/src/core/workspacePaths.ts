/**
 * Optional install-folder prefix for static workspace-layout previews only.
 * Local server + GitHub Pages use app-relative paths (`samples/...`) with no prefix.
 */
export const APP_DIR = (import.meta.env?.VITE_MGVIEW_APP_DIR ?? '').replace(/^\/+|\/+$/g, '');

export function combineBrowserPath(currentFolder: string | null | undefined, path: string): string {
  const trimmedPath = path.trim();
  if (!trimmedPath) {
    return trimmedPath;
  }

  return currentFolder && currentFolder !== '.'
    ? `${currentFolder.replace(/\/+$/g, '')}/${trimmedPath}`
    : trimmedPath;
}

export function validateFolderName(name: string): string | null {
  const trimmedName = name.trim();
  if (trimmedName.length === 0) {
    return 'Enter a folder name.';
  }
  if (trimmedName.includes('/') || trimmedName.includes('\\')) {
    return 'Folder names cannot include slashes.';
  }
  if (trimmedName === '..' || trimmedName.includes('..')) {
    return 'Folder names cannot include "..".';
  }
  if (trimmedName.startsWith('.')) {
    return 'Folder names cannot start with ".".';
  }
  return null;
}

export function workspacePath(...segments: string[]): string {
  const parts = segments
    .flatMap((segment) => segment.split('/'))
    .filter((segment) => segment.length > 0);
  if (APP_DIR.length === 0) {
    return parts.join('/');
  }
  return [APP_DIR, ...parts].join('/');
}
