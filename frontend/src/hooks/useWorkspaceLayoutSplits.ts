import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from 'react';
import { DEFAULT_SCENE_LAYOUT } from '../core/workspaceLayout.ts';
import type { NormalizedSceneConfig, NormalizedSceneLayout, WorkspaceRightRail } from '../core/types.ts';

const MIN_RENDERER_PANEL_WIDTH = 320;
const MIN_PLOTS_PANEL_WIDTH = 320;
const MIN_EDITOR_RAIL_WIDTH = 510;
const MIN_SINGLE_VISUAL_WIDTH = 280;
const WORKSPACE_SPLITTER_WIDTH = 8;
const WORKSPACE_SPLITTER_GAP = 6;
const WORKSPACE_SPLITTER_FOOTPRINT = WORKSPACE_SPLITTER_WIDTH + WORKSPACE_SPLITTER_GAP * 2;
const SPLIT_EPSILON = 0.0001;

interface UseWorkspaceLayoutSplitsOptions {
  loadedScenePath: string | undefined;
  sceneLayout: NormalizedSceneLayout | null;
  showRenderer: boolean;
  showPlots: boolean;
  rightRail: WorkspaceRightRail;
  updateDraftScene: (updater: (scene: NormalizedSceneConfig) => void) => void;
}

interface SceneEditorSplitOptions {
  shellWidth: number;
  showPlots: boolean;
  rightRail: WorkspaceRightRail;
  visualSplit: number;
  workspaceSplit: number;
}

export function calculateSceneEditorWorkspaceSplit({
  shellWidth,
  showPlots,
  rightRail,
  visualSplit,
  workspaceSplit,
}: SceneEditorSplitOptions): number | null {
  const availableWorkspaceWidth = shellWidth - WORKSPACE_SPLITTER_FOOTPRINT;
  if (availableWorkspaceWidth <= 0) {
    return null;
  }

  const visualWorkspaceWidth = rightRail === 'sim'
    ? availableWorkspaceWidth * workspaceSplit
    : shellWidth;
  const rendererWidth = showPlots
    ? Math.max(0, visualWorkspaceWidth - WORKSPACE_SPLITTER_FOOTPRINT) * visualSplit
    : visualWorkspaceWidth;
  return rendererWidth / availableWorkspaceWidth;
}

export function useWorkspaceLayoutSplits({
  loadedScenePath,
  sceneLayout,
  showRenderer,
  showPlots,
  rightRail,
  updateDraftScene,
}: UseWorkspaceLayoutSplitsOptions) {
  const [sceneEditorOpen, setSceneEditorOpen] = useState(false);
  const effectiveShowPlots = showPlots && !sceneEditorOpen;
  const showRightRail = sceneEditorOpen || rightRail === 'sim';
  const showVisualWorkspace = showRenderer || effectiveShowPlots;

  const [visualSplit, setVisualSplit] = useState(sceneLayout?.visualSplit ?? DEFAULT_SCENE_LAYOUT.visualSplit);
  const [workspaceSplit, setWorkspaceSplit] = useState(
    sceneLayout?.workspaceSplit ?? DEFAULT_SCENE_LAYOUT.workspaceSplit
  );
  const draggingSplitterRef = useRef<'visual' | 'workspace' | null>(null);
  const workspaceShellRef = useRef<HTMLDivElement | null>(null);

  const clampSplit = useCallback((value: number, minimum: number, maximum: number, fallback: number) => {
    if (maximum <= minimum) {
      const lockedEdge = value <= fallback ? minimum : maximum;
      return Math.min(1, Math.max(0, lockedEdge));
    }

    return Math.min(maximum, Math.max(minimum, value));
  }, []);

  useEffect(() => {
    if (draggingSplitterRef.current !== 'visual') {
      setVisualSplit(sceneLayout?.visualSplit ?? DEFAULT_SCENE_LAYOUT.visualSplit);
    }
    if (draggingSplitterRef.current !== 'workspace') {
      setWorkspaceSplit(sceneLayout?.workspaceSplit ?? DEFAULT_SCENE_LAYOUT.workspaceSplit);
    }
  }, [loadedScenePath, sceneLayout?.visualSplit, sceneLayout?.workspaceSplit]);

  useEffect(() => {
    setSceneEditorOpen(false);
  }, [loadedScenePath]);

  const updateSceneLayoutVisibility = useCallback(
    (key: 'showRenderer' | 'showPlots', value: boolean) => {
      updateDraftScene((scene) => {
        scene.layout[key] = value;
      });
    },
    [updateDraftScene]
  );

  const setRightRail = useCallback(
    (nextRail: WorkspaceRightRail) => {
      updateDraftScene((scene) => {
        scene.layout.rightRail = nextRail;
      });
    },
    [updateDraftScene]
  );

  const toggleRightRail = useCallback(
    (targetRail: 'scene' | 'sim') => {
      if (targetRail === 'scene') {
        setSceneEditorOpen((open) => {
          if (open) {
            setWorkspaceSplit(sceneLayout?.workspaceSplit ?? DEFAULT_SCENE_LAYOUT.workspaceSplit);
          } else if (showRenderer && showPlots) {
            setWorkspaceSplit(visualSplit);
          }
          return !open;
        });
        return;
      }

      if (sceneEditorOpen) {
        setSceneEditorOpen(false);
        setWorkspaceSplit(sceneLayout?.workspaceSplit ?? DEFAULT_SCENE_LAYOUT.workspaceSplit);
        return;
      }

      setSceneEditorOpen(false);
      setWorkspaceSplit(sceneLayout?.workspaceSplit ?? DEFAULT_SCENE_LAYOUT.workspaceSplit);
      setRightRail(rightRail === targetRail ? 'none' : targetRail);
    },
    [rightRail, sceneEditorOpen, sceneLayout?.workspaceSplit, setRightRail, showPlots, showRenderer, visualSplit]
  );

  const openSceneEditorRailIfClosed = useCallback(() => {
    if (sceneEditorOpen) {
      return;
    }

    const nextWorkspaceSplit = calculateSceneEditorWorkspaceSplit({
      shellWidth: workspaceShellRef.current?.clientWidth ?? 0,
      showPlots,
      rightRail,
      visualSplit,
      workspaceSplit,
    });
    if (showRenderer && nextWorkspaceSplit !== null) {
      setWorkspaceSplit(nextWorkspaceSplit);
    }
    setSceneEditorOpen(true);
  }, [rightRail, sceneEditorOpen, showPlots, showRenderer, visualSplit, workspaceSplit]);

  const commitLayoutSplit = useCallback(
    (key: 'visualSplit' | 'workspaceSplit', value: number) => {
      updateDraftScene((scene) => {
        scene.layout[key] = value;
      });
    },
    [updateDraftScene]
  );

  const persistLayoutSplitIfNeeded = useCallback(
    (key: 'visualSplit' | 'workspaceSplit', value: number) => {
      const currentValue = sceneLayout?.[key] ?? DEFAULT_SCENE_LAYOUT[key];
      if (Math.abs(currentValue - value) <= SPLIT_EPSILON) {
        return;
      }

      commitLayoutSplit(key, value);
    },
    [commitLayoutSplit, sceneLayout]
  );

  const startSplitterDrag = useCallback(
    (
      splitter: 'visual' | 'workspace',
      event: ReactPointerEvent<HTMLDivElement>,
      container: HTMLElement | null
    ) => {
      if (!container || window.matchMedia('(max-width: 900px)').matches) {
        return;
      }

      event.preventDefault();

      const bounds = container.getBoundingClientRect();
      const availableWidth = bounds.width - WORKSPACE_SPLITTER_FOOTPRINT;
      if (availableWidth <= 0) {
        return;
      }

      const minimumPrimaryWidth =
        splitter === 'visual'
          ? MIN_RENDERER_PANEL_WIDTH
          : showRenderer && effectiveShowPlots
            ? MIN_RENDERER_PANEL_WIDTH + MIN_PLOTS_PANEL_WIDTH + 8
            : MIN_SINGLE_VISUAL_WIDTH;
      const minimumSecondaryWidth =
        splitter === 'visual' ? MIN_PLOTS_PANEL_WIDTH : MIN_EDITOR_RAIL_WIDTH;

      const minimum = minimumPrimaryWidth / availableWidth;
      const maximum = 1 - minimumSecondaryWidth / availableWidth;
      const initialValue = splitter === 'visual' ? visualSplit : workspaceSplit;

      draggingSplitterRef.current = splitter;
      document.body.classList.add('workspace-splitter-dragging');

      const updateValue = (clientX: number) => {
        const pointerValue = (clientX - bounds.left - WORKSPACE_SPLITTER_FOOTPRINT / 2) / availableWidth;
        const nextValue = clampSplit(pointerValue, minimum, maximum, initialValue);
        if (splitter === 'visual') {
          setVisualSplit(nextValue);
        } else {
          setWorkspaceSplit(nextValue);
        }
        return nextValue;
      };

      let lastValue = updateValue(event.clientX);

      const handlePointerMove = (moveEvent: PointerEvent) => {
        lastValue = updateValue(moveEvent.clientX);
      };

      const finishDrag = () => {
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', finishDrag);
        window.removeEventListener('pointercancel', finishDrag);
        document.body.classList.remove('workspace-splitter-dragging');
        if (splitter !== 'workspace' || !sceneEditorOpen) {
          commitLayoutSplit(splitter === 'visual' ? 'visualSplit' : 'workspaceSplit', lastValue);
        }
        draggingSplitterRef.current = null;
      };

      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', finishDrag);
      window.addEventListener('pointercancel', finishDrag);
    },
    [clampSplit, commitLayoutSplit, effectiveShowPlots, sceneEditorOpen, showRenderer, visualSplit, workspaceSplit]
  );

  useLayoutEffect(() => {
    if (draggingSplitterRef.current !== null) {
      return;
    }

    const shell = workspaceShellRef.current;
    if (!shell) {
      return;
    }

    let nextWorkspaceSplit = workspaceSplit;
    let nextVisualSplit = visualSplit;
    let didAdjustWorkspace = false;
    let didAdjustVisual = false;

    const shellWidth = shell.clientWidth;
    const hasWorkspaceSplitter = showVisualWorkspace && showRightRail;
    const visualNeedsDualSplit = showRenderer && effectiveShowPlots;
    const minimumVisualShellWidth = visualNeedsDualSplit
      ? MIN_RENDERER_PANEL_WIDTH + MIN_PLOTS_PANEL_WIDTH + WORKSPACE_SPLITTER_FOOTPRINT
      : MIN_SINGLE_VISUAL_WIDTH;

    if (hasWorkspaceSplitter) {
      const availableWorkspaceWidth = shellWidth - WORKSPACE_SPLITTER_FOOTPRINT;
      if (availableWorkspaceWidth > 0) {
        const minimumWorkspaceSplit = minimumVisualShellWidth / availableWorkspaceWidth;
        const maximumWorkspaceSplit = 1 - MIN_EDITOR_RAIL_WIDTH / availableWorkspaceWidth;
        const clampedWorkspaceSplit = clampSplit(
          nextWorkspaceSplit,
          minimumWorkspaceSplit,
          maximumWorkspaceSplit,
          nextWorkspaceSplit
        );

        if (Math.abs(clampedWorkspaceSplit - nextWorkspaceSplit) > SPLIT_EPSILON) {
          nextWorkspaceSplit = clampedWorkspaceSplit;
          didAdjustWorkspace = true;
        }
      }
    }

    const visualShellWidth = hasWorkspaceSplitter
      ? Math.max(0, (shellWidth - WORKSPACE_SPLITTER_FOOTPRINT) * nextWorkspaceSplit)
      : shellWidth;

    if (visualNeedsDualSplit) {
      const availableVisualWidth = visualShellWidth - WORKSPACE_SPLITTER_FOOTPRINT;
      if (availableVisualWidth > 0) {
        const minimumVisualSplit = MIN_RENDERER_PANEL_WIDTH / availableVisualWidth;
        const maximumVisualSplit = 1 - MIN_PLOTS_PANEL_WIDTH / availableVisualWidth;
        const clampedVisualSplit = clampSplit(
          nextVisualSplit,
          minimumVisualSplit,
          maximumVisualSplit,
          nextVisualSplit
        );

        if (Math.abs(clampedVisualSplit - nextVisualSplit) > SPLIT_EPSILON) {
          nextVisualSplit = clampedVisualSplit;
          didAdjustVisual = true;
        }
      }
    }

    if (didAdjustWorkspace) {
      setWorkspaceSplit(nextWorkspaceSplit);
      if (!sceneEditorOpen) {
        persistLayoutSplitIfNeeded('workspaceSplit', nextWorkspaceSplit);
      }
    }

    if (didAdjustVisual) {
      setVisualSplit(nextVisualSplit);
      persistLayoutSplitIfNeeded('visualSplit', nextVisualSplit);
    }
  }, [
    clampSplit,
    persistLayoutSplitIfNeeded,
    sceneEditorOpen,
    effectiveShowPlots,
    showRenderer,
    showRightRail,
    showVisualWorkspace,
    visualSplit,
    workspaceSplit,
  ]);

  const workspaceShellStyle = useMemo((): CSSProperties => {
    if (showVisualWorkspace && showRightRail) {
      return {
        gridTemplateColumns: `minmax(0, calc((100% - ${WORKSPACE_SPLITTER_FOOTPRINT}px) * ${workspaceSplit})) ${WORKSPACE_SPLITTER_WIDTH}px minmax(${MIN_EDITOR_RAIL_WIDTH}px, calc((100% - ${WORKSPACE_SPLITTER_FOOTPRINT}px) * ${1 - workspaceSplit}))`,
      };
    }

    if (showRightRail && !showVisualWorkspace) {
      return {
        gridTemplateColumns: `minmax(0, 1fr)`,
      };
    }

    return {
      gridTemplateColumns: 'minmax(0, 1fr)',
    };
  }, [showRightRail, showVisualWorkspace, workspaceSplit]);

  const visualShellStyle = useMemo((): CSSProperties => {
    if (showRenderer && effectiveShowPlots) {
      return {
        gridTemplateColumns: `minmax(${MIN_RENDERER_PANEL_WIDTH}px, calc((100% - ${WORKSPACE_SPLITTER_FOOTPRINT}px) * ${visualSplit})) ${WORKSPACE_SPLITTER_WIDTH}px minmax(${MIN_PLOTS_PANEL_WIDTH}px, calc((100% - ${WORKSPACE_SPLITTER_FOOTPRINT}px) * ${1 - visualSplit}))`,
      };
    }

    return {
      gridTemplateColumns: 'minmax(0, 1fr)',
    };
  }, [effectiveShowPlots, showRenderer, visualSplit]);

  return {
    effectiveShowPlots,
    openSceneEditorRailIfClosed,
    sceneEditorOpen,
    setRightRail,
    showVisualWorkspace,
    startSplitterDrag,
    toggleRightRail,
    updateSceneLayoutVisibility,
    visualShellStyle,
    workspaceShellRef: workspaceShellRef as RefObject<HTMLDivElement>,
    workspaceShellStyle,
  };
}
