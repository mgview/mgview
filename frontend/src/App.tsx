import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import AboutOverlay from './components/AboutOverlay.tsx';
import DocumentationPage from './components/DocumentationPage.tsx';
import { canPersistScenesToServer } from './api/runtimeMode.ts';
import DemoNotice from './components/DemoNotice.tsx';
import DiagnosticsOverlay from './components/DiagnosticsOverlay.tsx';
import InspectorDrawer from './components/InspectorDrawer.tsx';
import LoadSceneOverlay from './components/LoadSceneOverlay.tsx';
import SamplesOverlay from './components/SamplesOverlay.tsx';
import ObjectList from './components/ObjectList.tsx';
import PlaybackStrip from './components/PlaybackStrip.tsx';
import PlotsPanel from './components/PlotsPanel.tsx';
import RendererPanel from './components/RendererPanel.tsx';
import SceneHeaderBar from './components/SceneHeaderBar.tsx';
import SimulationDataOverlay from './components/SimulationDataOverlay.tsx';
import { Tabs, TabsList, TabsTrigger } from './components/ui/tabs.tsx';
import { getFrameAtTime } from './core/timeline.ts';
import { DEFAULT_SCENE_LAYOUT } from './core/workspaceLayout.ts';
import { useInspectorSelectionState } from './hooks/useInspectorSelectionState.ts';
import { usePlaybackController } from './hooks/usePlaybackController.ts';
import { useMotionGenesisRun } from './hooks/useMotionGenesisRun.ts';
import { useSimulationSettingsEditor } from './hooks/useSimulationSettingsEditor.ts';
import { createSavableScene, useSceneWorkspace } from './hooks/useSceneWorkspace.ts';
import { useSceneSelectionEditor } from './hooks/useSceneSelectionEditor.ts';
import { useSceneSpanEditor } from './hooks/useSceneSpanEditor.ts';
import { useToasts } from './hooks/useToasts.ts';
import { useWorkspaceShell } from './hooks/useWorkspaceShell.ts';
import { createSampleRef, getSceneBasePath, parseSceneRefFromUrl } from './core/sceneRef.ts';
import { groupSampleScenes } from './core/samplesManifest.ts';
import { useServerWorkspace } from './hooks/useServerWorkspace.ts';
import WorkspacePickerOverlay from './components/WorkspacePickerOverlay.tsx';
import { getCurrentAppRoute } from './core/appRoutes.ts';

function isLikelyMotionGenesisInputPath(filePath: string): boolean {
  return /\.(al|txt|in)$/i.test(filePath);
}

const MIN_RENDERER_PANEL_WIDTH = 320;
const MIN_PLOTS_PANEL_WIDTH = 320;
const MIN_EDITOR_RAIL_WIDTH = 510;
const MIN_SINGLE_VISUAL_WIDTH = 280;
const WORKSPACE_SPLITTER_WIDTH = 8;
const WORKSPACE_SPLITTER_GAP = 6;
const WORKSPACE_SPLITTER_FOOTPRINT = WORKSPACE_SPLITTER_WIDTH + WORKSPACE_SPLITTER_GAP * 2;
const SPLIT_EPSILON = 0.0001;

export default function App() {
  if (getCurrentAppRoute() === 'documentation') {
    return <DocumentationPage />;
  }

  return <WorkspaceApp />;
}

function WorkspaceApp() {
  const [aboutOpen, setAboutOpen] = useState(false);
  const { dismissErrors, showSuccess, showError } = useToasts();
  const serverWorkspace = useServerWorkspace(showSuccess, showError);
  const initialSceneRef = useMemo(
    () => parseSceneRefFromUrl(new URLSearchParams(window.location.search)),
    []
  );
  const workspace = useSceneWorkspace(initialSceneRef, { showSuccess, showError });
  const {
    activeScene,
    browserError,
    browserListing,
    browserLoading,
    draftScene,
    error,
    confirmWorkspaceChange,
    handleBrowse,
    handleCreateScene,
    handleLoad,
    handleWorkspaceChange,
    handleLoadWorkspacePath,
    handleRefreshSimulationData,
    handleRevertDraft,
    handleRedo,
    handleSaveSceneAs,
    handleSaveScene,
    handleUndo,
    hasLocalEdits,
    canSaveScene,
    channelNames,
    diagnostics,
    fileErrors,
    loaded,
    loading,
    objectInspections,
    parsedSimulationFiles,
    saving,
    canRedoDraftScene,
    canUndoDraftScene,
    sceneInput,
    setError,
    selectedObjectName,
    selectedVisualName,
    setSceneInput,
    setSelectedObjectName,
    setSelectedVisualName,
    showWorkspaceShell,
    simulationFiles,
    simulationLoading,
    timeline,
    updateDraftScene,
    updateDraftScenePreview,
  } = workspace;

  const setWorkspaceError = useCallback(
    (message: string | null) => {
      setError(message);
      if (message === null) {
        dismissErrors();
      }
    },
    [dismissErrors, setError]
  );

  const diagnosticsWarningCount = useMemo(
    () => diagnostics.filter((diagnostic) => diagnostic.severity === 'warning').length,
    [diagnostics]
  );

  const handleLoadSample = useCallback(
    (path: string, options?: { actionLabel?: string }) =>
      handleLoad(createSampleRef(path), options),
    [handleLoad]
  );

  const shell = useWorkspaceShell({
    activeScene,
    browserPath: browserListing?.path,
    handleBrowse,
    handleCreateScene,
    handleLoadWorkspacePath,
    handleLoadSample,
    handleSaveSceneAs,
    loaded,
    sceneInput,
    setError: setWorkspaceError,
    setSceneInput,
    updateDraftScene,
    updateDraftScenePreview,
  });

  const playbackSpeed = activeScene?.speedFactor ?? loaded?.scene.speedFactor ?? 1;
  const playback = usePlaybackController(loaded ? timeline : null, playbackSpeed, loaded?.scenePath ?? null);
  const handleMotionGenesisSuccess = useCallback(async () => {
      await handleRefreshSimulationData('Reloaded simulation data after Motion Genesis finished.');
    }, [handleRefreshSimulationData]);
  const motionGenesisRun = useMotionGenesisRun(handleMotionGenesisSuccess);
  const handleSimulationSettingsChange = useCallback(
    (value: string) => {
      updateDraftScene((scene) => {
        const trimmedValue = value.trim();
        if (trimmedValue.length > 0) {
          scene.simulationSettings = trimmedValue;
          return;
        }

        delete scene.simulationSettings;
      });
    },
    [updateDraftScene]
  );
  const simulationSettingsEditor = useSimulationSettingsEditor({
    canEdit: loaded?.sceneRef.source === 'workspace',
    scenePath: loaded?.sceneRef.source === 'workspace' ? loaded.sceneRef.path : null,
    simulationSettings: activeScene?.simulationSettings,
  });
  const runMotionGenesis = useCallback(async () => {
    if (!loaded || loaded.sceneRef.source !== 'workspace' || !activeScene?.simulationSettings) {
      motionGenesisRun.setError('Load a workspace scene with simulationSettings before running Motion Genesis.');
      return;
    }
    if (!isLikelyMotionGenesisInputPath(activeScene.simulationSettings)) {
      motionGenesisRun.setError(
        'Simulation File must point to a Motion Genesis input file with a .al, .txt, or .in extension.'
      );
      return;
    }
    if (simulationSettingsEditor.saving) {
      return;
    }

    if (simulationSettingsEditor.hasSimEdits && simulationSettingsEditor.canSaveSimFile) {
      const didSaveSim = await simulationSettingsEditor.saveSimFile();
      if (!didSaveSim) {
        return;
      }
    }

    void motionGenesisRun.beginRun(loaded.sceneRef.path, activeScene.simulationSettings);
  }, [
    activeScene,
    loaded,
    motionGenesisRun,
    simulationSettingsEditor.canSaveSimFile,
    simulationSettingsEditor.hasSimEdits,
    simulationSettingsEditor.saveSimFile,
    simulationSettingsEditor.saving,
  ]);
  const hasUnsavedChanges = hasLocalEdits || simulationSettingsEditor.hasSimEdits;
  const canSaveAnything =
    (hasLocalEdits && canSaveScene) ||
    (simulationSettingsEditor.hasSimEdits && simulationSettingsEditor.canSaveSimFile);
  const handleSaveAll = useCallback(async () => {
    if (simulationSettingsEditor.hasSimEdits && simulationSettingsEditor.canSaveSimFile) {
      const didSaveSim = await simulationSettingsEditor.saveSimFile();
      if (!didSaveSim) {
        return;
      }
      showSuccess(`Saved simulation file ${simulationSettingsEditor.filePath ?? ''}`.trim());
    }

    if (hasLocalEdits && canSaveScene) {
      await handleSaveScene();
    }
  }, [
    canSaveScene,
    handleSaveScene,
    hasLocalEdits,
    showSuccess,
    simulationSettingsEditor.canSaveSimFile,
    simulationSettingsEditor.filePath,
    simulationSettingsEditor.hasSimEdits,
    simulationSettingsEditor.saveSimFile,
  ]);

  useEffect(() => {
    if (!hasUnsavedChanges) {
      return;
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const currentFrame = useMemo(() => {
    if (!loaded) {
      return undefined;
    }
    return getFrameAtTime(timeline, playback.currentTime);
  }, [loaded, playback.currentTime, timeline]);

  const {
    changeSelectedVisualType,
    createVisual,
    deleteSelectedVisual,
    liveSelectedVisual,
    renameVisual,
    selectObject,
    selectedObject,
    selectedVisual,
    updateSelectedObject,
    updateSelectedVisual,
    updateSelectedVisualPreview,
  } = useSceneSelectionEditor({
    activeScene,
    draftScene,
    objectInspections,
    selectedObjectName,
    selectedVisualName,
    setSelectedObjectName,
    setSelectedVisualName,
    updateDraftScene,
    updateDraftScenePreview,
  });
  const selectionState = useInspectorSelectionState({
    loadedScenePath: loaded?.scenePath,
    selectedObject,
    selectedObjectName,
    setSelectedObjectName,
    setSelectedVisualName,
  });

  const {
    createSpan,
    createSpanVisual,
    deleteSelectedSpan,
    deleteSelectedSpanVisual,
    liveSelectedSpan,
    liveSelectedSpanVisual,
    renameSpan,
    renameSpanVisual,
    selectSpan: selectSpanOnly,
    selectedSpanResolvedName,
    selectedSpanVisualResolvedName,
    updateSelectedSpan,
    updateSelectedSpanVisual,
    updateSelectedSpanVisualPreview,
  } = useSceneSpanEditor({
    activeScene,
    draftScene,
    selectedSpanName: selectionState.selectedSpanName,
    selectedSpanVisualName: selectionState.selectedSpanVisualName,
    setSelectedSpanName: selectionState.setSelectedSpanName,
    setSelectedSpanVisualName: selectionState.setSelectedSpanVisualName,
    updateDraftScene,
    updateDraftScenePreview,
  });

  useEffect(() => {
    if (selectedSpanResolvedName) {
      selectionState.setEditorMode('visual');
    }
  }, [selectedSpanResolvedName, selectionState]);

  useEffect(() => {
    const isTextEditingTarget = (target: EventTarget | null) => {
      if (target instanceof HTMLTextAreaElement) {
        return true;
      }

      if (target instanceof HTMLInputElement) {
        return !['checkbox', 'radio', 'button', 'submit', 'reset', 'range', 'color'].includes(target.type);
      }

      return target instanceof HTMLElement && target.isContentEditable;
    };

    const isInteractiveTarget = (target: EventTarget | null) =>
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      target instanceof HTMLSelectElement ||
      target instanceof HTMLButtonElement ||
      (target instanceof HTMLElement && target.isContentEditable);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) {
        return;
      }

      const target = event.target;
      const isTextEditing = isTextEditingTarget(target);
      const isInteractive = isInteractiveTarget(target);
      const hasModifier = event.ctrlKey || event.metaKey;

      if (event.key === 'Escape') {
        const activeElement = document.activeElement;
        if (
          activeElement instanceof HTMLInputElement ||
          activeElement instanceof HTMLTextAreaElement ||
          activeElement instanceof HTMLSelectElement ||
          activeElement instanceof HTMLButtonElement ||
          (activeElement instanceof HTMLElement && activeElement.isContentEditable)
        ) {
          event.preventDefault();
          activeElement.blur();
          return;
        }

        if (
          !shell.loadOverlayOpen &&
          !shell.samplesOverlayOpen &&
          !shell.diagnosticsOpen &&
          !shell.simulationOverlayOpen
        ) {
          if (selectionState.hasAnySelection) {
            event.preventDefault();
            selectionState.clearAllSelections();
            return;
          }
        }
      }

      if (hasModifier && !isTextEditing && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        if (event.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
        return;
      }

      if (hasModifier && !isTextEditing && event.key.toLowerCase() === 'y') {
        event.preventDefault();
        handleRedo();
        return;
      }

      if (hasModifier && event.key.toLowerCase() === 's') {
        event.preventDefault();
        if (
          canSaveAnything &&
          !shell.loadOverlayOpen &&
          !loading &&
          !saving &&
          !simulationSettingsEditor.saving &&
          hasUnsavedChanges
        ) {
          void handleSaveAll();
        }
        return;
      }

      if (event.defaultPrevented || event.repeat || event.code !== 'Space') {
        return;
      }

      if (
        shell.loadOverlayOpen ||
        shell.samplesOverlayOpen ||
        shell.diagnosticsOpen ||
        shell.simulationOverlayOpen
      ) {
        return;
      }

      if (
        isInteractive
      ) {
        return;
      }

      event.preventDefault();
      playback.togglePlay();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    canSaveAnything,
    handleRedo,
    handleSaveAll,
    handleUndo,
    hasUnsavedChanges,
    loading,
    playback.togglePlay,
    saving,
    selectionState,
    shell.diagnosticsOpen,
    shell.loadOverlayOpen,
    shell.samplesOverlayOpen,
    shell.simulationOverlayOpen,
    simulationSettingsEditor.saving,
  ]);

  const spanEntries = useMemo(
    () =>
      Object.entries(activeScene?.spans ?? {}).map(([name, span]) => ({
        name,
        type: span.type,
        point1: span.point1,
        point2: span.point2,
        visualCount: Object.keys(span.visual ?? {}).length,
        visualNames: Object.keys(span.visual ?? {}),
      })),
    [activeScene?.spans]
  );

  const activeSelectedObject = selectedSpanResolvedName ? undefined : selectedObject;
  const activeSelectedVisual = selectedSpanResolvedName ? undefined : selectedVisual;
  const activeLiveSelectedVisual = selectedSpanResolvedName ? undefined : liveSelectedVisual;

  const savePreview = useMemo(() => {
    if (!loaded || !draftScene) {
      return '';
    }

    return JSON.stringify(createSavableScene(loaded.rawScene, draftScene), null, 2);
  }, [draftScene, loaded]);

  const groupedSamples = useMemo(() => groupSampleScenes(), []);
  const rendererSceneBasePath = loaded ? getSceneBasePath(loaded.sceneRef) : '';
  const sceneLayout = activeScene?.layout ?? null;
  const showRenderer = sceneLayout?.showRenderer ?? DEFAULT_SCENE_LAYOUT.showRenderer;
  const showPlots = sceneLayout?.showPlots ?? DEFAULT_SCENE_LAYOUT.showPlots;
  const showEditorRail = sceneLayout?.showEditorRail ?? DEFAULT_SCENE_LAYOUT.showEditorRail;
  const showVisualWorkspace = showRenderer || showPlots;
  const timelineOwner = showRenderer ? 'renderer' : showPlots ? 'plots' : null;
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
  }, [loaded?.scenePath, sceneLayout?.visualSplit, sceneLayout?.workspaceSplit]);

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

  const workspaceShellStyle = useMemo(() => {
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

  const visualShellStyle = useMemo(() => {
    if (showRenderer && showPlots) {
      return {
        gridTemplateColumns: `minmax(${MIN_RENDERER_PANEL_WIDTH}px, calc((100% - ${WORKSPACE_SPLITTER_FOOTPRINT}px) * ${visualSplit})) ${WORKSPACE_SPLITTER_WIDTH}px minmax(${MIN_PLOTS_PANEL_WIDTH}px, calc((100% - ${WORKSPACE_SPLITTER_FOOTPRINT}px) * ${1 - visualSplit}))`,
      };
    }

    return {
      gridTemplateColumns: 'minmax(0, 1fr)',
    };
  }, [showPlots, showRenderer, visualSplit]);

  return (
    <div className="grid h-screen grid-rows-[auto_minmax(0,1fr)] overflow-hidden p-2">
      <DemoNotice />
      <SceneHeaderBar
        scenePath={loaded?.scenePath ?? null}
        layout={sceneLayout}
        hasLocalEdits={hasUnsavedChanges}
        canSaveScene={canSaveAnything}
        loading={loading}
        saving={saving || simulationSettingsEditor.saving}
        canRedo={canRedoDraftScene}
        canUndo={canUndoDraftScene}
        diagnosticsWarningCount={diagnosticsWarningCount}
        onOpenAbout={() => setAboutOpen(true)}
        onOpenWorkspace={canPersistScenesToServer ? serverWorkspace.openPicker : undefined}
        onOpenCreateOverlay={shell.openCreateOverlay}
        onOpenLoadOverlay={shell.openLoadOverlay}
        onOpenSamplesOverlay={shell.openSamplesOverlay}
        onOpenDiagnostics={shell.openDiagnostics}
        onOpenChannels={shell.openSimulationOverlay}
        onSetLayoutVisibility={updateSceneLayoutVisibility}
        performanceOverlayOpen={shell.performanceOverlayOpen}
        onSetPerformanceOverlayOpen={shell.setPerformanceOverlayOpen}
        onOpenSaveAsOverlay={shell.openSaveAsOverlay}
        onRedo={handleRedo}
        onSave={() => void handleSaveAll()}
        onRevert={() => {
          if (simulationSettingsEditor.hasSimEdits && !hasLocalEdits) {
            if (!window.confirm('Discard unsaved simulation file edits?')) {
              return;
            }
            simulationSettingsEditor.revertSimFile();
            return;
          }

          if (handleRevertDraft()) {
            if (simulationSettingsEditor.hasSimEdits) {
              simulationSettingsEditor.revertSimFile();
            }
            selectionState.setEditorMode('visual');
          }
        }}
        onUndo={handleUndo}
      />

      {showWorkspaceShell ? (
          <div
            className={`workspace-shell ${!showEditorRail ? 'workspace-shell-no-editor-rail' : ''}`}
            ref={workspaceShellRef}
            style={workspaceShellStyle}
          >
            {showVisualWorkspace ? (
              <div
                className={`workspace-visual-shell ${
                  showRenderer && showPlots ? 'workspace-visual-shell-dual' : 'workspace-visual-shell-single'
                }`}
                style={visualShellStyle}
              >
                {showRenderer ? (
                  <div className="workspace-panel-stack">
                    {activeScene ? (
                      <RendererPanel
                        cameraSeedKey={shell.cameraSeedKey}
                        layoutSizeKey={`${showRenderer}-${showPlots}-${showEditorRail}`}
                        onCameraPreviewChange={shell.setCameraPreview}
                        onCameraCommit={shell.commitCameraPreview}
                        onClearSelection={selectionState.clearAllSelections}
                        onSelectObject={(objectName, visualName) => {
                          openEditorRailIfClosed();
                          selectionState.selectObjectForEditor(objectName, visualName, selectObject);
                        }}
                        onSelectSpan={(spanName, visualName) => {
                          openEditorRailIfClosed();
                          selectionState.selectSpanForEditor(spanName, visualName, selectSpanOnly);
                        }}
                        scenePath={rendererSceneBasePath}
                        scene={activeScene}
                        frame={currentFrame?.frame}
                        selectedObjectName={activeSelectedObject?.name ?? null}
                        selectedSpanName={selectedSpanResolvedName}
                        showPerformanceOverlay={shell.performanceOverlayOpen}
                        onHidePerformanceOverlay={() => shell.setPerformanceOverlayOpen(false)}
                      />
                    ) : (
                      <section className="flex min-h-0 h-full rounded-md border border-border bg-card p-1.5">
                        <div className="renderer-surface flex items-center justify-center">
                          <div className="text-xs uppercase tracking-wide text-muted-foreground">
                            Loading scene and simulation data…
                          </div>
                        </div>
                      </section>
                    )}

                    {timelineOwner === 'renderer' ? (
                      <PlaybackStrip
                        isPlaying={playback.isPlaying}
                        currentTime={playback.currentTime}
                        tInitial={timeline.tInitial}
                        tFinal={timeline.tFinal}
                        tStep={timeline.tStep || 0.001}
                        playbackSpeed={playbackSpeed}
                        onTogglePlay={playback.togglePlay}
                        onReset={playback.resetPlayback}
                        onChangeTime={playback.changeTime}
                        onChangeSpeed={(nextValue) => {
                          if (!Number.isFinite(nextValue)) {
                            return;
                          }

                          updateDraftScene((scene) => {
                            scene.speedFactor = Math.min(10, Math.max(0.1, nextValue));
                          });
                        }}
                      />
                    ) : null}
                  </div>
                ) : null}

                {showRenderer && showPlots ? (
                  <div
                    className="workspace-horizontal-splitter"
                    role="separator"
                    aria-orientation="vertical"
                    aria-label="Resize 3D view and plots"
                    onPointerDown={(event) =>
                      startSplitterDrag('visual', event, event.currentTarget.parentElement)
                    }
                  />
                ) : null}

                {showPlots ? (
                  <div className="workspace-panel-stack">
                    <section className="workspace-content-panel">
                      <div className="h-full min-h-0">
                        <PlotsPanel
                          activeScene={activeScene}
                          channelNames={channelNames}
                          currentTime={playback.currentTime}
                          timeline={timeline}
                          onChangeTime={playback.changeTime}
                          updateDraftScene={updateDraftScene}
                        />
                      </div>
                    </section>

                    {timelineOwner === 'plots' ? (
                      <PlaybackStrip
                        isPlaying={playback.isPlaying}
                        currentTime={playback.currentTime}
                        tInitial={timeline.tInitial}
                        tFinal={timeline.tFinal}
                        tStep={timeline.tStep || 0.001}
                        playbackSpeed={playbackSpeed}
                        onTogglePlay={playback.togglePlay}
                        onReset={playback.resetPlayback}
                        onChangeTime={playback.changeTime}
                        onChangeSpeed={(nextValue) => {
                          if (!Number.isFinite(nextValue)) {
                            return;
                          }

                          updateDraftScene((scene) => {
                            scene.speedFactor = Math.min(10, Math.max(0.1, nextValue));
                          });
                        }}
                      />
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : null}

            {showVisualWorkspace && showEditorRail ? (
              <div
                className="workspace-horizontal-splitter"
                role="separator"
                aria-orientation="vertical"
                aria-label="Resize workspace and inspector"
                onPointerDown={(event) =>
                  startSplitterDrag('workspace', event, event.currentTarget.parentElement)
                }
              />
            ) : null}

            {showEditorRail ? (
              <div className="workspace-editor-rail">
                <Tabs
                  value={selectionState.editorMode}
                  onValueChange={(value) =>
                    selectionState.setEditorMode(value as Parameters<typeof selectionState.setEditorMode>[0])
                  }
                  className="workspace-editor-rail-tabs"
                >
                  <div className="workspace-editor-rail-header">
                    <TabsList className="w-full">
                      <TabsTrigger value="visual">Editor</TabsTrigger>
                      <TabsTrigger value="scene">Scene Settings</TabsTrigger>
                      <TabsTrigger value="json">JSON Editor</TabsTrigger>
                      <TabsTrigger value="sim">Sim Run</TabsTrigger>
                    </TabsList>
                  </div>

                  <div
                    className={`workspace-editor-rail-body ${
                      selectionState.editorMode === 'sim' ? 'workspace-editor-rail-body-sim' : ''
                    }`}
                  >
                    {selectionState.editorMode !== 'sim' ? (
                      <div className="min-h-0 min-w-0">
                        <div className="h-full min-h-0 overflow-auto pr-0.5">
                          {loaded ? (
                            <ObjectList
                              entries={objectInspections}
                              onCreateSpan={() => {
                                selectionState.beginSpanCreation(createSpan);
                              }}
                              selectedObjectName={activeSelectedObject?.name ?? null}
                              selectedSpanName={selectedSpanResolvedName}
                              spans={spanEntries}
                              onSelectObject={(objectName, firstVisualName) => {
                                selectionState.selectObjectForEditor(objectName, firstVisualName, selectObject);
                              }}
                              onSelectSpan={(spanName, firstVisualName) => {
                                selectionState.selectSpanForEditor(spanName, firstVisualName, selectSpanOnly);
                              }}
                            />
                          ) : (
                            <section className="rounded-md border border-border bg-card p-2">
                              <h2 className="mb-1 text-[0.72rem] font-semibold uppercase tracking-wide text-muted-foreground">Objects</h2>
                              <div className="grid gap-2">
                                <div className="h-7 animate-pulse rounded-md bg-muted" />
                                <div className="h-7 animate-pulse rounded-md bg-muted" />
                                <div className="h-7 animate-pulse rounded-md bg-muted" />
                                <div className="h-7 animate-pulse rounded-md bg-muted" />
                              </div>
                            </section>
                          )}
                        </div>
                      </div>
                    ) : null}

                    <div className="workspace-content-panel">
                      <div className="h-full min-h-0 overflow-auto pr-0.5">
                        <InspectorDrawer
                          activeScene={activeScene}
                          cameraPreview={shell.cameraPreview}
                          channelNames={channelNames}
                          clearCameraPreview={() => shell.setCameraPreview(null)}
                          editorMode={selectionState.editorMode}
                          liveSelectedSpan={liveSelectedSpan}
                          liveSelectedSpanVisual={liveSelectedSpanVisual}
                          liveSelectedVisual={activeLiveSelectedVisual}
                          loaded={loaded}
                          motionGenesisError={motionGenesisRun.error}
                          motionGenesisInput={motionGenesisRun.input}
                          motionGenesisRun={motionGenesisRun.run}
                          motionGenesisSendingInput={motionGenesisRun.sendingInput}
                          motionGenesisOptions={motionGenesisRun.options}
                          motionGenesisStarting={motionGenesisRun.starting}
                          motionGenesisStopping={motionGenesisRun.stopping}
                          onMotionGenesisInputChange={motionGenesisRun.setInput}
                          onMotionGenesisOptionsChange={motionGenesisRun.setOptions}
                          onSimulationSettingsChange={handleSimulationSettingsChange}
                          onRunMotionGenesis={runMotionGenesis}
                          onStopMotionGenesis={() => {
                            void motionGenesisRun.stopRun();
                          }}
                          onSendMotionGenesisInput={() => {
                            void motionGenesisRun.submitInput();
                          }}
                          onSimFileChange={simulationSettingsEditor.setDraftContent}
                          simFileContent={simulationSettingsEditor.draftContent}
                          simFileDirty={simulationSettingsEditor.hasSimEdits}
                          simFileError={simulationSettingsEditor.error}
                          simFileLoading={simulationSettingsEditor.loading}
                          simFileReadOnly={!simulationSettingsEditor.canSaveSimFile}
                          savePreview={savePreview}
                          selectedObject={activeSelectedObject}
                          selectedObjectName={activeSelectedObject?.name ?? null}
                          selectedSpanName={selectedSpanResolvedName}
                          selectedSpanVisualName={selectedSpanVisualResolvedName}
                          selectedVisual={activeSelectedVisual}
                          updateSelectedObject={updateSelectedObject}
                          createVisual={createVisual}
                          renameVisual={renameVisual}
                          deleteSelectedVisual={deleteSelectedVisual}
                          changeSelectedVisualType={changeSelectedVisualType}
                          createSpan={createSpan}
                          createSpanVisual={createSpanVisual}
                          deleteSelectedSpan={deleteSelectedSpan}
                          deleteSelectedSpanVisual={deleteSelectedSpanVisual}
                          renameSpan={renameSpan}
                          renameSpanVisual={renameSpanVisual}
                          selectSpan={(spanName, firstVisualName) => {
                            selectionState.selectSpanForEditor(spanName, firstVisualName, selectSpanOnly);
                          }}
                          setSelectedVisualName={setSelectedVisualName}
                          updateDraftScene={updateDraftScene}
                          updateDraftScenePreview={updateDraftScenePreview}
                          updateSceneVector={shell.updateSceneVector}
                          updateSceneVectorPreview={shell.updateSceneVectorPreview}
                          updateSelectedSpan={updateSelectedSpan}
                          updateSelectedSpanVisual={updateSelectedSpanVisual}
                          updateSelectedSpanVisualPreview={updateSelectedSpanVisualPreview}
                          updateSelectedVisual={updateSelectedVisual}
                          updateSelectedVisualPreview={updateSelectedVisualPreview}
                        />
                      </div>
                    </div>
                  </div>
                </Tabs>
              </div>
            ) : null}

            {!showVisualWorkspace && !showEditorRail ? (
              <section className="workspace-empty-state">
                <p className="text-sm font-medium">All workspace panels are hidden.</p>
                <p className="text-xs text-muted-foreground">Use the Layout menu to show the 3D view, plots, or the editor rail.</p>
              </section>
            ) : null}
          </div>
      ) : null}

      {shell.loadOverlayOpen ? (
        <LoadSceneOverlay
          canPersistScenes={canPersistScenesToServer}
          browserError={browserError}
          browserListing={browserListing}
          browserLoading={browserLoading}
          errorMessage={error}
          loading={loading}
          mode={shell.sceneOverlayMode}
          onBrowse={(path) => {
            void handleBrowse(path, 'workspace');
          }}
          onClose={shell.closeLoadOverlay}
          onCreateFolder={shell.handleCreateFolder}
          onCreateScenePath={(path) => {
            void shell.handleCreateScenePath(path);
          }}
          onOpenScenePath={(path) => {
            void shell.handleOpenScenePath(path);
          }}
          onOpenSelectedScene={() => {
            void shell.handleOpenSelectedScene();
          }}
          onOpenWorkspace={canPersistScenesToServer ? serverWorkspace.openPicker : undefined}
          onSaveScenePath={(path) => {
            void shell.handleSaveScenePath(path);
          }}
          sceneInput={sceneInput}
          setSceneInput={setSceneInput}
        />
      ) : null}

      {shell.samplesOverlayOpen ? (
        <SamplesOverlay
          groupedSamples={groupedSamples}
          loading={loading}
          onClose={shell.closeSamplesOverlay}
          onOpenSample={(path) => {
            void shell.handleOpenSamplePath(path);
          }}
        />
      ) : null}

      {shell.diagnosticsOpen && loaded ? (
        <DiagnosticsOverlay diagnostics={diagnostics} onClose={shell.closeDiagnostics} />
      ) : null}

      {serverWorkspace.pickerOpen ? (
        <WorkspacePickerOverlay
          appRoot={serverWorkspace.workspaceInfo?.appRoot ?? null}
          defaultWorkspaceRoot={serverWorkspace.workspaceInfo?.defaultWorkspaceRoot ?? null}
          draftWorkspaceRoot={serverWorkspace.draftWorkspaceRoot}
          errorMessage={serverWorkspace.error}
          saving={serverWorkspace.saving}
          workspaceInfo={serverWorkspace.workspaceInfo}
          onApply={() => {
            void serverWorkspace.applyWorkspaceRoot(
              confirmWorkspaceChange,
              async () => {
                await handleWorkspaceChange(() => {
                  shell.openLoadOverlay();
                });
              }
            );
          }}
          onClose={serverWorkspace.closePicker}
          onDraftChange={serverWorkspace.setDraftWorkspaceRoot}
          onUseDefault={serverWorkspace.useDefaultWorkspaceRoot}
        />
      ) : null}

      {shell.simulationOverlayOpen && loaded && draftScene ? (
        <SimulationDataOverlay
          activeScene={draftScene}
          browserError={browserError}
          browserListing={browserListing}
          browserLoading={browserLoading}
          channelNames={channelNames}
          expandedFiles={simulationFiles}
          fileErrors={fileErrors}
          onAddSimulationEntry={shell.addSimulationEntry}
          onAddSimulationEntries={shell.addSimulationEntries}
          onBrowse={(path) => {
            if (loaded) {
              void handleBrowse(path, loaded.sceneRef.source === 'sample' ? 'sample' : 'workspace');
            }
          }}
          onClose={shell.closeSimulationOverlay}
          onRemoveSimulationEntry={shell.removeSimulationEntry}
          parsedSimulationFiles={parsedSimulationFiles}
          scenePath={loaded.scenePath}
          simulationEntries={draftScene.simulationData}
          simulationEntryInput={shell.simulationEntryInput}
          simulationLoading={simulationLoading}
          setSimulationEntryInput={shell.setSimulationEntryInput}
        />
      ) : null}

      {aboutOpen ? <AboutOverlay onClose={() => setAboutOpen(false)} /> : null}
    </div>
  );
}
