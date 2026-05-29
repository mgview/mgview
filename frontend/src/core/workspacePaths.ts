/** App folder name under the workspace root (parent of this repo). */
export const APP_DIR = (import.meta.env.VITE_MGVIEW_APP_DIR ?? 'mgview').replace(/^\/+|\/+$/g, '');

export function workspacePath(...segments: string[]): string {
  const parts = segments
    .flatMap((segment) => segment.split('/'))
    .filter((segment) => segment.length > 0);
  if (APP_DIR.length === 0) {
    return parts.join('/');
  }
  return [APP_DIR, ...parts].join('/');
}

export function bundledSamplePath(samplesRelative: string): string {
  return workspacePath('samples', samplesRelative.replace(/^\/+/, ''));
}

export const DEFAULT_SCENE_PATH = bundledSamplePath('particle_pendulum/particle_pendulum.json');
