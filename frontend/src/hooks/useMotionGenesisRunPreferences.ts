import { useCallback, useState } from 'react';
import type { MotionGenesisRunOptions } from '../api/localFiles.ts';

export type MotionGenesisRunLayoutMode = 'split' | 'editor' | 'output-only';

export const DEFAULT_RUN_OPTIONS: MotionGenesisRunOptions = {
  autoQuit: true,
  autoDefaultValues: false,
  debug: false,
  scrollbackLimit: 0,
};

const STORAGE_KEYS = {
  autoQuit: 'mgview-run-auto-quit',
  autoDefaultValues: 'mgview-run-auto-default-values',
  debug: 'mgview-run-debug',
  scrollbackLimit: 'mgview-run-scrollback-limit',
  vimMode: 'mgview-run-vim-mode',
  layoutMode: 'mgview-run-layout-mode',
  splitRatio: 'mgview-run-split-ratio',
} as const;

const LEGACY_VIM_KEYS = ['mgview-lab-editor-vim-mode', 'mgview-sim-editor-vim-mode'] as const;

const DEFAULT_SPLIT_RATIO = 0.58;
const MIN_SPLIT_RATIO = 0.15;
const MAX_SPLIT_RATIO = 0.85;

function readStorageItem(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorageItem(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Ignore storage failures.
  }
}

function readStoredBoolean(key: string, fallback: boolean): boolean {
  const value = readStorageItem(key);
  if (value === 'true') {
    return true;
  }
  if (value === 'false') {
    return false;
  }
  return fallback;
}

export function readStoredRunOptions(): MotionGenesisRunOptions {
  const scrollbackRaw = readStorageItem(STORAGE_KEYS.scrollbackLimit);
  let scrollbackLimit = DEFAULT_RUN_OPTIONS.scrollbackLimit;
  if (scrollbackRaw !== null) {
    const parsed = Number.parseInt(scrollbackRaw, 10);
    if (Number.isFinite(parsed) && parsed >= 0) {
      scrollbackLimit = parsed;
    }
  }

  return {
    autoQuit: readStoredBoolean(STORAGE_KEYS.autoQuit, DEFAULT_RUN_OPTIONS.autoQuit),
    autoDefaultValues: readStoredBoolean(
      STORAGE_KEYS.autoDefaultValues,
      DEFAULT_RUN_OPTIONS.autoDefaultValues
    ),
    debug: readStoredBoolean(STORAGE_KEYS.debug, DEFAULT_RUN_OPTIONS.debug),
    scrollbackLimit,
  };
}

export function persistRunOptions(options: MotionGenesisRunOptions): void {
  writeStorageItem(STORAGE_KEYS.autoQuit, String(options.autoQuit));
  writeStorageItem(STORAGE_KEYS.autoDefaultValues, String(options.autoDefaultValues));
  writeStorageItem(STORAGE_KEYS.debug, String(options.debug));
  writeStorageItem(STORAGE_KEYS.scrollbackLimit, String(options.scrollbackLimit));
}

function readStoredVimMode(): boolean {
  const current = readStorageItem(STORAGE_KEYS.vimMode);
  if (current === 'true' || current === 'false') {
    return current === 'true';
  }

  for (const legacyKey of LEGACY_VIM_KEYS) {
    const legacyValue = readStorageItem(legacyKey);
    if (legacyValue === 'true' || legacyValue === 'false') {
      const resolved = legacyValue === 'true';
      writeStorageItem(STORAGE_KEYS.vimMode, String(resolved));
      return resolved;
    }
  }

  return false;
}

function readStoredLayoutMode(defaultLayoutMode: MotionGenesisRunLayoutMode): MotionGenesisRunLayoutMode {
  const value = readStorageItem(STORAGE_KEYS.layoutMode);
  if (value === 'split' || value === 'editor' || value === 'output-only') {
    return value;
  }
  if (value === 'tabs') {
    return 'editor';
  }
  return defaultLayoutMode;
}

function readStoredSplitRatio(): number {
  const value = readStorageItem(STORAGE_KEYS.splitRatio);
  if (!value) {
    return DEFAULT_SPLIT_RATIO;
  }

  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed)) {
    return DEFAULT_SPLIT_RATIO;
  }

  return Math.min(MAX_SPLIT_RATIO, Math.max(MIN_SPLIT_RATIO, parsed));
}

export function useMotionGenesisRunPreferences(
  defaultLayoutMode: MotionGenesisRunLayoutMode = 'split'
) {
  const [options, setOptionsState] = useState<MotionGenesisRunOptions>(readStoredRunOptions);
  const [vimMode, setVimModeState] = useState(readStoredVimMode);
  const [layoutMode, setLayoutModeState] = useState<MotionGenesisRunLayoutMode>(() =>
    readStoredLayoutMode(defaultLayoutMode)
  );
  const [splitRatio, setSplitRatioState] = useState(readStoredSplitRatio);

  const setOptions = useCallback((nextOptions: MotionGenesisRunOptions) => {
    setOptionsState(nextOptions);
    persistRunOptions(nextOptions);
  }, []);

  const setVimMode = useCallback((nextValue: boolean) => {
    setVimModeState(nextValue);
    writeStorageItem(STORAGE_KEYS.vimMode, String(nextValue));
  }, []);

  const setLayoutMode = useCallback((nextMode: MotionGenesisRunLayoutMode) => {
    setLayoutModeState(nextMode);
    writeStorageItem(STORAGE_KEYS.layoutMode, nextMode);
  }, []);

  const setSplitRatio = useCallback((nextRatio: number | ((current: number) => number)) => {
    setSplitRatioState((current) => {
      const resolved = typeof nextRatio === 'function' ? nextRatio(current) : nextRatio;
      const clamped = Math.min(MAX_SPLIT_RATIO, Math.max(MIN_SPLIT_RATIO, resolved));
      writeStorageItem(STORAGE_KEYS.splitRatio, String(clamped));
      return clamped;
    });
  }, []);

  return {
    layoutMode,
    options,
    setLayoutMode,
    setOptions,
    setSplitRatio,
    setVimMode,
    splitRatio,
    vimMode,
  };
}
