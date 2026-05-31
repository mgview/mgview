import { useCallback, useEffect, useMemo, useState } from 'react';
import AboutOverlay from './components/AboutOverlay.tsx';
import { canPersistScenesToServer } from './api/runtimeMode.ts';
import DemoNotice from './components/DemoNotice.tsx';
import DiagnosticsOverlay from './components/DiagnosticsOverlay.tsx';
import InspectorDrawer from './components/InspectorDrawer.tsx';
import LoadSceneOverlay from './components/LoadSceneOverlay.tsx';
import SamplesOverlay from './components/SamplesOverlay.tsx';
import ObjectList from './components/ObjectList.tsx';
import PlaybackStrip from './components/PlaybackStrip.tsx';
import RendererPanel from './components/RendererPanel.tsx';
import SceneHeaderBar from './components/SceneHeaderBar.tsx';
import SimulationDataOverlay from './components/SimulationDataOverlay.tsx';
import ToastStack from './components/ToastStack.tsx';
import { getFrameAtTime } from './core/timeline.ts';
import { useInspectorSelectionState } from './hooks/useInspectorSelectionState.ts';
import { usePlaybackController } from './hooks/usePlaybackController.ts';
import { createSavableScene, useSceneWorkspace } from './hooks/useSceneWorkspace.ts';
import { useSceneSelectionEditor } from './hooks/useSceneSelectionEditor.ts';
import { useSceneSpanEditor } from './hooks/useSceneSpanEditor.ts';
import { useToasts } from './hooks/useToasts.ts';
import { useWorkspaceShell } from './hooks/useWorkspaceShell.ts';
import { createSampleRef, getSceneBasePath, parseSceneRefFromUrl } from './core/sceneRef.ts';
import { groupSampleScenes } from './core/samplesManifest.ts';
import { useServerWorkspace } from './hooks/useServerWorkspace.ts';
import WorkspacePickerOverlay from './components/WorkspacePickerOverlay.tsx';

export default function App() {
  const [aboutOpen, setAboutOpen] = useState(false);
  const { toasts, dismiss, dismissErrors, showSuccess, showError } = useToasts();
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

  const handleDismissToast = useCallback(
    (id: string) => {
      const toast = toasts.find((entry) => entry.id === id);
      dismiss(id);
      if (toast?.kind === 'error') {
        setError(null);
      }
    },
    [dismiss, setError, toasts]
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
          canPersistScenesToServer &&
          !shell.loadOverlayOpen &&
          !loading &&
          !saving &&
          hasLocalEdits
        ) {
          void handleSaveScene();
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
    shell.samplesOverlayOpen,
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

  const groupedSamples = useMemo(() => groupSampleScenes(), []);
  const rendererSceneBasePath = loaded ? getSceneBasePath(loaded.sceneRef) : '';

  return (
    <div className="app-shell">
      <DemoNotice />
      <ToastStack toasts={toasts} onDismiss={handleDismissToast} />
      <SceneHeaderBar
        scenePath={loaded?.scenePath ?? null}
        hasLocalEdits={hasLocalEdits}
        loading={loading}
        saving={saving}
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
        onOpenSaveAsOverlay={shell.openSaveAsOverlay}
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
                    scenePath={rendererSceneBasePath}
                    scene={activeScene}
                    frame={currentFrame?.frame}
                    selectedObjectName={activeSelectedObject?.name ?? null}
                    showPerformanceOverlay={shell.performanceOverlayOpen}
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
        <DiagnosticsOverlay
          diagnostics={diagnostics}
          performanceOverlayOpen={shell.performanceOverlayOpen}
          setPerformanceOverlayOpen={shell.setPerformanceOverlayOpen}
          onClose={shell.closeDiagnostics}
        />
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
