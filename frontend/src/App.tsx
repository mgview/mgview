import { useCallback, useEffect, useMemo, useState } from 'react';
import DocumentationPage from './components/DocumentationPage.tsx';
import MgLabPage from './components/MgLabPage.tsx';
import { canPersistScenesToServer } from './api/runtimeMode.ts';
import DemoNotice from './components/DemoNotice.tsx';
import SceneHeaderBar from './components/SceneHeaderBar.tsx';
import WorkspaceOverlays from './components/WorkspaceOverlays.tsx';
import WorkspaceShell from './components/WorkspaceShell.tsx';
import { getFrameAtTime } from './core/timeline.ts';
import { DEFAULT_SCENE_LAYOUT } from './core/workspaceLayout.ts';
import { useInspectorSelectionState } from './hooks/useInspectorSelectionState.ts';
import { useMotionGenesisWorkspace } from './hooks/useMotionGenesisWorkspace.ts';
import { usePlaybackController } from './hooks/usePlaybackController.ts';
import { createSavableScene, useSceneWorkspace } from './hooks/useSceneWorkspace.ts';
import { useSceneSelectionEditor } from './hooks/useSceneSelectionEditor.ts';
import { useSceneSpanEditor } from './hooks/useSceneSpanEditor.ts';
import { useToasts } from './hooks/useToasts.ts';
import { useWorkspaceKeyboardShortcuts } from './hooks/useWorkspaceKeyboardShortcuts.ts';
import { useWorkspaceLayoutSplits } from './hooks/useWorkspaceLayoutSplits.ts';
import { useWorkspaceShell } from './hooks/useWorkspaceShell.ts';
import { createSampleRef, getSceneBasePath, parseSceneRefFromUrl } from './core/sceneRef.ts';
import { groupSampleScenes } from './core/samplesManifest.ts';
import { useServerWorkspace } from './hooks/useServerWorkspace.ts';
import { getCurrentAppRoute } from './core/appRoutes.ts';

export default function App() {
  const route = getCurrentAppRoute();
  if (route === 'documentation') {
    return <DocumentationPage />;
  }
  if (route === 'lab') {
    return <MgLabPage />;
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

  const motionGenesis = useMotionGenesisWorkspace({
    activeScene,
    canSaveScene,
    handleRefreshSimulationData,
    handleSaveScene,
    hasLocalEdits,
    loaded,
    showSuccess,
    updateDraftScene,
  });

  const {
    canSaveAnything,
    handleSaveAll,
    handleSimulationSettingsChange,
    hasUnsavedChanges,
    motionGenesisRun,
    runMotionGenesis,
    simulationSettingsEditor,
  } = motionGenesis;

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

  useWorkspaceKeyboardShortcuts({
    canSaveAnything,
    handleRedo,
    handleSaveAll,
    handleUndo,
    hasUnsavedChanges,
    loading,
    playback,
    saving,
    selectionState,
    shell,
    simFileSaving: simulationSettingsEditor.saving,
  });

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
  const timelineOwner = showRenderer ? 'renderer' : showPlots ? 'plots' : null;

  const layout = useWorkspaceLayoutSplits({
    loadedScenePath: loaded?.scenePath,
    sceneLayout,
    showRenderer,
    showPlots,
    showEditorRail,
    updateDraftScene,
  });

  const handleRevert = useCallback(() => {
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
  }, [handleRevertDraft, hasLocalEdits, selectionState, simulationSettingsEditor]);

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
        onSetLayoutVisibility={layout.updateSceneLayoutVisibility}
        performanceOverlayOpen={shell.performanceOverlayOpen}
        onSetPerformanceOverlayOpen={shell.setPerformanceOverlayOpen}
        onOpenSaveAsOverlay={shell.openSaveAsOverlay}
        onRedo={handleRedo}
        onSave={() => void handleSaveAll()}
        onRevert={handleRevert}
        onUndo={handleUndo}
      />

      {showWorkspaceShell ? (
        <WorkspaceShell
          activeScene={activeScene}
          activeLiveSelectedVisual={activeLiveSelectedVisual}
          activeSelectedObject={activeSelectedObject}
          activeSelectedVisual={activeSelectedVisual}
          channelNames={channelNames}
          currentFrame={currentFrame?.frame}
          editorMode={selectionState.editorMode}
          loaded={loaded}
          liveSelectedSpan={liveSelectedSpan}
          liveSelectedSpanVisual={liveSelectedSpanVisual}
          motionGenesisError={motionGenesisRun.error}
          motionGenesisInput={motionGenesisRun.input}
          motionGenesisOptions={motionGenesisRun.options}
          motionGenesisRun={motionGenesisRun.run}
          motionGenesisSendingInput={motionGenesisRun.sendingInput}
          motionGenesisStarting={motionGenesisRun.starting}
          motionGenesisStopping={motionGenesisRun.stopping}
          objectInspections={objectInspections}
          onBeginSpanCreation={() => {
            selectionState.beginSpanCreation(createSpan);
          }}
          onClearSelection={selectionState.clearAllSelections}
          onEditorModeChange={selectionState.setEditorMode}
          onMotionGenesisInputChange={motionGenesisRun.setInput}
          onMotionGenesisOptionsChange={motionGenesisRun.setOptions}
          onOpenEditorRail={layout.openEditorRailIfClosed}
          onRunMotionGenesis={runMotionGenesis}
          onSelectObject={(objectName, firstVisualName) => {
            selectionState.selectObjectForEditor(objectName, firstVisualName, selectObject);
          }}
          onSelectSpan={(spanName, firstVisualName) => {
            selectionState.selectSpanForEditor(spanName, firstVisualName, selectSpanOnly);
          }}
          onSendMotionGenesisInput={() => {
            void motionGenesisRun.submitInput();
          }}
          onSimFileChange={simulationSettingsEditor.setDraftContent}
          onSimulationSettingsChange={handleSimulationSettingsChange}
          onStopMotionGenesis={() => {
            void motionGenesisRun.stopRun();
          }}
          onStartSplitterDrag={layout.startSplitterDrag}
          playback={playback}
          playbackSpeed={playbackSpeed}
          rendererSceneBasePath={rendererSceneBasePath}
          savePreview={savePreview}
          selectedSpanName={selectedSpanResolvedName}
          selectedSpanVisualName={selectedSpanVisualResolvedName}
          setSelectedVisualName={setSelectedVisualName}
          shell={shell}
          showEditorRail={showEditorRail}
          showPlots={showPlots}
          showRenderer={showRenderer}
          showVisualWorkspace={layout.showVisualWorkspace}
          simFileContent={simulationSettingsEditor.draftContent}
          simFileDirty={simulationSettingsEditor.hasSimEdits}
          simFileError={simulationSettingsEditor.error}
          simFileLoading={simulationSettingsEditor.loading}
          simFileReadOnly={!simulationSettingsEditor.canSaveSimFile}
          spanEntries={spanEntries}
          timeline={timeline}
          timelineOwner={timelineOwner}
          updateDraftScene={updateDraftScene}
          updateDraftScenePreview={updateDraftScenePreview}
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
          updateSelectedSpan={updateSelectedSpan}
          updateSelectedSpanVisual={updateSelectedSpanVisual}
          updateSelectedSpanVisualPreview={updateSelectedSpanVisualPreview}
          updateSelectedVisual={updateSelectedVisual}
          updateSelectedVisualPreview={updateSelectedVisualPreview}
          visualShellStyle={layout.visualShellStyle}
          workspaceShellRef={layout.workspaceShellRef}
          workspaceShellStyle={layout.workspaceShellStyle}
        />
      ) : null}

      <WorkspaceOverlays
        aboutOpen={aboutOpen}
        browserError={browserError}
        browserListing={browserListing}
        browserLoading={browserLoading}
        channelNames={channelNames}
        confirmWorkspaceChange={confirmWorkspaceChange}
        diagnostics={diagnostics}
        draftScene={draftScene}
        error={error}
        fileErrors={fileErrors}
        groupedSamples={groupedSamples}
        handleBrowse={handleBrowse}
        handleWorkspaceChange={handleWorkspaceChange}
        loaded={loaded}
        loading={loading}
        onCloseAbout={() => setAboutOpen(false)}
        parsedSimulationFiles={parsedSimulationFiles}
        sceneInput={sceneInput}
        serverWorkspace={serverWorkspace}
        setSceneInput={setSceneInput}
        shell={shell}
        simulationFiles={simulationFiles}
        simulationLoading={simulationLoading}
      />
    </div>
  );
}
