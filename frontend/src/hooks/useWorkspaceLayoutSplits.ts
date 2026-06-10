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
import type { SceneLayoutConfig } from '../core/types.ts';
import type { NormalizedSceneConfig } from '../core/types.ts';

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
  sceneLayout: SceneLayoutConfig | null;
  showRenderer: boolean;
  showPlots: boolean;
  showEditorRail: boolean;
  updateDraftScene: (updater: (scene: NormalizedSceneConfig) => void) => void;
}

export function useWorkspaceLayoutSplits({
  loadedScenePath,
  sceneLayout,
  showRenderer,
  showPlots,
  showEditorRail,
  updateDraftScene,
}: UseWorkspaceLayoutSplitsOptions) {
  const showVisualWorkspace = showRenderer || showPlots;

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

  const updateSceneLayoutVisibility = useCallback(
    (key: 'showRenderer' | 'showPlots' | 'showEditorRail', value: boolean) => {
      updateDraftScene((scene) => {
        scene.layout[key] = value;
      });
    },
    [updateDraftScene]
  );

  const openEditorRailIfClosed = useCallback(() => {
    if (!showEditorRail) {
      updateSceneLayoutVisibility('showEditorRail', true);
    }
  }, [showEditorRail, updateSceneLayoutVisibility]);

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
          : showRenderer && showPlots
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
        commitLayoutSplit(splitter === 'visual' ? 'visualSplit' : 'workspaceSplit', lastValue);
        draggingSplitterRef.current = null;
      };

      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', finishDrag);
      window.addEventListener('pointercancel', finishDrag);
    },
    [clampSplit, commitLayoutSplit, showPlots, showRenderer, visualSplit, workspaceSplit]
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
    const hasWorkspaceSplitter = showVisualWorkspace && showEditorRail;
    const visualNeedsDualSplit = showRenderer && showPlots;
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
      persistLayoutSplitIfNeeded('workspaceSplit', nextWorkspaceSplit);
    }

    if (didAdjustVisual) {
      setVisualSplit(nextVisualSplit);
      persistLayoutSplitIfNeeded('visualSplit', nextVisualSplit);
    }
  }, [
    clampSplit,
    persistLayoutSplitIfNeeded,
    showEditorRail,
    showPlots,
    showRenderer,
    showVisualWorkspace,
    visualSplit,
    workspaceSplit,
  ]);

  const workspaceShellStyle = useMemo((): CSSProperties => {
    if (showVisualWorkspace && showEditorRail) {
      return {
        gridTemplateColumns: `minmax(0, calc((100% - ${WORKSPACE_SPLITTER_FOOTPRINT}px) * ${workspaceSplit})) ${WORKSPACE_SPLITTER_WIDTH}px minmax(${MIN_EDITOR_RAIL_WIDTH}px, calc((100% - ${WORKSPACE_SPLITTER_FOOTPRINT}px) * ${1 - workspaceSplit}))`,
      };
    }

    if (showEditorRail && !showVisualWorkspace) {
      return {
        gridTemplateColumns: `minmax(0, 1fr)`,
      };
    }

    return {
      gridTemplateColumns: 'minmax(0, 1fr)',
    };
  }, [showEditorRail, showVisualWorkspace, workspaceSplit]);

  const visualShellStyle = useMemo((): CSSProperties => {
    if (showRenderer && showPlots) {
      return {
        gridTemplateColumns: `minmax(${MIN_RENDERER_PANEL_WIDTH}px, calc((100% - ${WORKSPACE_SPLITTER_FOOTPRINT}px) * ${visualSplit})) ${WORKSPACE_SPLITTER_WIDTH}px minmax(${MIN_PLOTS_PANEL_WIDTH}px, calc((100% - ${WORKSPACE_SPLITTER_FOOTPRINT}px) * ${1 - visualSplit}))`,
      };
    }

    return {
      gridTemplateColumns: 'minmax(0, 1fr)',
    };
  }, [showPlots, showRenderer, visualSplit]);

  return {
    openEditorRailIfClosed,
    showVisualWorkspace,
    startSplitterDrag,
    updateSceneLayoutVisibility,
    visualShellStyle,
    workspaceShellRef: workspaceShellRef as RefObject<HTMLDivElement>,
    workspaceShellStyle,
  };
}
