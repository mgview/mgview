import { useCallback, useRef, useState } from 'react';

const DEFAULT_MAX_HISTORY = 50;

interface UseUndoRedoOptions<T> {
  isEqual?: (left: T, right: T) => boolean;
  maxHistory?: number;
}

export function useUndoRedo<T>(initial: T, options?: UseUndoRedoOptions<T>) {
  const isEqual = options?.isEqual ?? Object.is;
  const maxHistory = options?.maxHistory ?? DEFAULT_MAX_HISTORY;
  const historyRef = useRef<T[]>([initial]);
  const indexRef = useRef(0);
  const snapshotRef = useRef(initial);
  const [, setTick] = useState(0);

  const tick = () => setTick((current) => current + 1);

  const reset = useCallback(
    (next: T) => {
      historyRef.current = [next];
      indexRef.current = 0;
      snapshotRef.current = next;
      tick();
    },
    []
  );

  const set = useCallback(
    (next: T) => {
      if (isEqual(snapshotRef.current, next)) {
        return false;
      }

      const nextHistory = historyRef.current.slice(0, indexRef.current + 1);
      nextHistory.push(next);
      if (nextHistory.length > maxHistory) {
        nextHistory.shift();
      } else {
        indexRef.current += 1;
      }

      historyRef.current = nextHistory;
      snapshotRef.current = next;
      tick();
      return true;
    },
    [isEqual, maxHistory]
  );

  const replaceCurrent = useCallback(
    (next: T) => {
      if (isEqual(snapshotRef.current, next)) {
        return false;
      }

      historyRef.current[indexRef.current] = next;
      snapshotRef.current = next;
      tick();
      return true;
    },
    [isEqual]
  );

  const undo = useCallback(() => {
    if (indexRef.current === 0) {
      return false;
    }

    indexRef.current -= 1;
    snapshotRef.current = historyRef.current[indexRef.current];
    tick();
    return true;
  }, []);

  const redo = useCallback(() => {
    if (indexRef.current >= historyRef.current.length - 1) {
      return false;
    }

    indexRef.current += 1;
    snapshotRef.current = historyRef.current[indexRef.current];
    tick();
    return true;
  }, []);

  return {
    snapshot: snapshotRef.current,
    set,
    replaceCurrent,
    reset,
    undo,
    redo,
    canUndo: indexRef.current > 0,
    canRedo: indexRef.current < historyRef.current.length - 1,
  };
}
