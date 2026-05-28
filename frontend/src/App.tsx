import { useEffect, useMemo } from 'react';
import DiagnosticsOverlay from './components/DiagnosticsOverlay.tsx';
import InspectorDrawer from './components/InspectorDrawer.tsx';
import LoadSceneOverlay from './components/LoadSceneOverlay.tsx';
import ObjectList from './components/ObjectList.tsx';
import PlaybackStrip from './components/PlaybackStrip.tsx';
import RendererPanel from './components/RendererPanel.tsx';
import SceneHeaderBar from './components/SceneHeaderBar.tsx';
import SimulationDataOverlay from './components/SimulationDataOverlay.tsx';
import { getFrameAtTime } from './core/timeline.ts';
import { useInspectorSelectionState } from './hooks/useInspectorSelectionState.ts';
import { usePlaybackController } from './hooks/usePlaybackController.ts';
import { createSavableScene, useSceneWorkspace } from './hooks/useSceneWorkspace.ts';
import { useSceneSelectionEditor } from './hooks/useSceneSelectionEditor.ts';
import { useSceneSpanEditor } from './hooks/useSceneSpanEditor.ts';
import { useWorkspaceShell } from './hooks/useWorkspaceShell.ts';

const DEFAULT_SCENE_PATH = 'samples/particle_pendulum/particle_pendulum.json';
const SAMPLE_SCENES = [
  { group: 'Basics', label: 'Particle Pendulum', path: 'samples/particle_pendulum/particle_pendulum.json' },
  { group: 'Basics', label: 'Default Template', path: 'samples/default.json' },
  { group: 'Mechanisms', label: 'Ball In Tube', path: 'samples/ball_in_tube/ball_in_tube.json' },
  { group: 'Mechanisms', label: 'Particle In Slot', path: 'samples/particle_in_slot/slot.json' },
  { group: 'Vehicles', label: 'Tricycle', path: 'samples/tricycle/tricycle.json' },
  { group: 'Cameras', label: 'SkyCam Fixed', path: 'samples/skycam/SkyCamFixed.json' },
  { group: 'Robots', label: 'RCM Homogeneous', path: 'samples/rcm_robot/ME328_RCMRobot_Homogeneous.json' },
  { group: 'Robots', label: 'RCM Palpating', path: 'samples/rcm_robot/ME328_RCMRobot_Palpating.json' },
  { group: 'Robots', label: 'RCM Circle 10cm', path: 'samples/rcm_robot/ME328_RCMRobot_Circle_Depth10cm.json' },
  { group: 'Robots', label: 'RCM Circle 20cm', path: 'samples/rcm_robot/ME328_RCMRobot_Circle_Depth20cm.json' },
  { group: 'Meshes', label: 'Wooden Phantom', path: 'samples/wooden_phantom/wooden_phantom.json' },
  { group: 'Meshes', label: 'Wooden Phantom GUI', path: 'samples/wooden_phantom/wooden_phantom_gui.json' },
] as const;

function getScenePathFromUrl(): string {
  const params = new URLSearchParams(window.location.search);
  return params.get('scene') ?? DEFAULT_SCENE_PATH;
}

function sampleGroups() {
  const groups = new Map<string, Array<(typeof SAMPLE_SCENES)[number]>>();
  for (const sample of SAMPLE_SCENES) {
    const group = groups.get(sample.group) ?? [];
    group.push(sample);
    groups.set(sample.group, group);
  }
  return [...groups.entries()];
}

export default function App() {
  const workspace = useSceneWorkspace(getScenePathFromUrl());
  const {
    activeScene,
    browserError,
    browserListing,
    browserLoading,
    draftScene,
    error,
    handleBrowse,
    handleCreateScene,
    handleLoad,
    handleRevertDraft,
    handleRedo,
    handleSaveSceneAs,
    handleSaveScene,
    handleUndo,
    hasLocalEdits,
    channelNames,
    diagnostics,
    fileErrors,
    loaded,
    loading,
    objectInspections,
    parsedSimulationFiles,
    saveMessage,
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
  const shell = useWorkspaceShell({
    activeScene,
    browserPath: browserListing?.path,
    handleBrowse,
    handleCreateScene,
    handleLoad,
    handleSaveSceneAs,
    loaded,
    sceneInput,
    setError,
    setSceneInput,
    updateDraftScene,
    updateDraftScenePreview,
  });

  const playbackSpeed = activeScene?.speedFactor ?? loaded?.scene.speedFactor ?? 1;
  const playback = usePlaybackController(loaded ? timeline : null, playbackSpeed);

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

        if (!shell.loadOverlayOpen && !shell.diagnosticsOpen && !shell.simulationOverlayOpen) {
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
        if (!shell.loadOverlayOpen && !loading && !saving && hasLocalEdits) {
          void handleSaveScene();
        }
        return;
      }

      if (event.defaultPrevented || event.repeat || event.code !== 'Space') {
        return;
      }

      if (shell.loadOverlayOpen || shell.diagnosticsOpen || shell.simulationOverlayOpen) {
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
    handleRedo,
    handleSaveScene,
    handleUndo,
    hasLocalEdits,
    loading,
    playback.togglePlay,
    saving,
    selectionState,
    shell.diagnosticsOpen,
    shell.loadOverlayOpen,
    shell.simulationOverlayOpen,
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

  const groupedSamples = useMemo(() => sampleGroups(), []);

  return (
    <div className="app-shell">
      <SceneHeaderBar
        scenePath={loaded?.scenePath ?? null}
        sceneName={activeScene?.name ?? loaded?.scene.name ?? null}
        hasLocalEdits={hasLocalEdits}
        loading={loading}
        saving={saving}
        canRedo={canRedoDraftScene}
        canUndo={canUndoDraftScene}
        statusMessage={saveMessage}
        errorMessage={error}
        onOpenCreateOverlay={shell.openCreateOverlay}
        onOpenLoadOverlay={shell.openLoadOverlay}
        onOpenDiagnostics={shell.openDiagnostics}
        onOpenChannels={shell.openSimulationOverlay}
        onOpenSaveAsOverlay={shell.openSaveAsOverlay}
        onSceneNameChange={(nextName) => {
          updateDraftScene((scene) => {
            scene.name = nextName;
          });
        }}
        onRedo={handleRedo}
        onSave={() => void handleSaveScene()}
        onRevert={() => {
          if (handleRevertDraft()) {
            selectionState.setEditorMode('visual');
          }
        }}
        onUndo={handleUndo}
      />

      {showWorkspaceShell ? (
          <div
            className={`workspace-shell ${shell.leftRailCollapsed ? 'workspace-shell-left-rail-collapsed' : ''}`}
          >
            <div className="workspace-main">
              {activeScene ? (
                <>
                  <RendererPanel
                    cameraSeedKey={shell.cameraSeedKey}
                    layoutSizeKey={`${shell.leftRailCollapsed}`}
                    onCameraPreviewChange={shell.setCameraPreview}
                    onCameraCommit={shell.commitCameraPreview}
                    scenePath={loaded.scenePath}
                    scene={activeScene}
                    frame={currentFrame?.frame}
                    selectedObjectName={activeSelectedObject?.name ?? null}
                  />

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
                </>
              ) : (
                <>
                  <section className="panel renderer-panel loading-panel">
                    <div className="renderer-surface renderer-loading-surface">
                      <div className="renderer-loading-copy">Loading scene and simulation data…</div>
                    </div>
                  </section>
                  <section className="panel playback-strip loading-panel">
                    <div className="loading-placeholder-row loading-placeholder-row-short" />
                  </section>
                </>
              )}
            </div>

            <button
              type="button"
              className="workspace-edge-handle"
              onClick={() => shell.setLeftRailCollapsed((current) => !current)}
              aria-label={shell.leftRailCollapsed ? 'Expand editor rail' : 'Collapse editor rail'}
            >
              {shell.leftRailCollapsed ? '<' : '>'}
            </button>

            {!shell.leftRailCollapsed ? (
              <div className="workspace-left-rail">
                <div className="workspace-sidebar">
                  <div className="workspace-pane-scroll">
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
                      <section className="panel loading-panel">
                        <h2>Objects</h2>
                        <div className="loading-placeholder-list">
                          <div className="loading-placeholder-row" />
                          <div className="loading-placeholder-row" />
                          <div className="loading-placeholder-row" />
                          <div className="loading-placeholder-row" />
                        </div>
                      </section>
                    )}
                  </div>
                </div>

                <div className="workspace-drawer">
                  <div className="workspace-pane-scroll">
                    <InspectorDrawer
                      activeScene={activeScene}
                      cameraPreview={shell.cameraPreview}
                      channelNames={channelNames}
                      clearCameraPreview={() => shell.setCameraPreview(null)}
                      editorMode={selectionState.editorMode}
                      hasLocalEdits={hasLocalEdits}
                      liveSelectedSpan={liveSelectedSpan}
                      liveSelectedSpanVisual={liveSelectedSpanVisual}
                      liveSelectedVisual={activeLiveSelectedVisual}
                      loaded={loaded}
                      savePreview={savePreview}
                      selectedObject={activeSelectedObject}
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
                      setEditorMode={selectionState.setEditorMode}
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
            ) : null}
          </div>
      ) : null}

      {shell.loadOverlayOpen ? (
        <LoadSceneOverlay
          browserError={browserError}
          browserListing={browserListing}
          browserLoading={browserLoading}
          errorMessage={error}
          groupedSamples={groupedSamples}
          loading={loading}
          mode={shell.sceneOverlayMode}
          onBrowse={(path) => {
            void handleBrowse(path);
          }}
          onClose={shell.closeLoadOverlay}
          onCreateScenePath={(path) => {
            void shell.handleCreateScenePath(path);
          }}
          onOpenScenePath={(path) => {
            void shell.handleOpenScenePath(path);
          }}
          onOpenSelectedScene={() => {
            void shell.handleOpenSelectedScene();
          }}
          onSaveScenePath={(path) => {
            void shell.handleSaveScenePath(path);
          }}
          sampleBrowserExpanded={shell.sampleBrowserExpanded}
          sceneInput={sceneInput}
          setSampleBrowserExpanded={shell.setSampleBrowserExpanded}
          setSceneInput={setSceneInput}
        />
      ) : null}

      {shell.diagnosticsOpen && loaded ? (
        <DiagnosticsOverlay
          diagnostics={diagnostics}
          onClose={shell.closeDiagnostics}
        />
      ) : null}

      {shell.simulationOverlayOpen && loaded && draftScene ? (
        <SimulationDataOverlay
          browserError={browserError}
          browserListing={browserListing}
          browserLoading={browserLoading}
          channelNames={channelNames}
          expandedFiles={simulationFiles}
          fileErrors={fileErrors}
          onAddSimulationEntry={shell.addSimulationEntry}
          onAddSimulationEntries={shell.addSimulationEntries}
          onBrowse={(path) => {
            void handleBrowse(path);
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
    </div>
  );
}
