import type { MotionGenesisRuntimeInfo } from '../api/motionGenesisTypes.ts';

export const NODE_LTS_DOWNLOAD_URL = 'https://nodejs.org/en/download';

/** True once runtime info has loaded and the native PTY module is unavailable. */
export function isPtyBlocked(runtimeInfo: MotionGenesisRuntimeInfo | null | undefined): boolean {
  return runtimeInfo != null && !runtimeInfo.ptyAvailable;
}

export const PTY_UNAVAILABLE_SUMMARY =
  'Interactive Motion Genesis runs (Run Sim / MG Lab) need a working PTY module. This usually means Node.js is older than 20 or node-pty failed to load.';
