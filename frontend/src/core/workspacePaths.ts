/**
 * Optional install-folder prefix for static workspace-layout previews only.
 * Local server + GitHub Pages use app-relative paths (`samples/...`) with no prefix.
 */
export const APP_DIR = (import.meta.env?.VITE_MGVIEW_APP_DIR ?? '').replace(/^\/+|\/+$/g, '');

export function workspacePath(...segments: string[]): string {
  const parts = segments
    .flatMap((segment) => segment.split('/'))
    .filter((segment) => segment.length > 0);
  if (APP_DIR.length === 0) {
    return parts.join('/');
  }
  return [APP_DIR, ...parts].join('/');
}
