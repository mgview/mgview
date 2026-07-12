import type { CSSProperties, PointerEvent as ReactPointerEvent, RefObject } from 'react';
import MotionGenesisRunPanel from './MotionGenesisRunPanel.tsx';
import WorkspaceEditorRail, { type WorkspaceSpanEntry } from './WorkspaceEditorRail.tsx';
import WorkspaceVisualRegion from './WorkspaceVisualRegion.tsx';
import type { InspectorEditorMode } from './InspectorDrawer.tsx';
import type { MotionGenesisRunOptions } from '../api/localFiles.ts';
import type { MotionGenesisRunState } from '../api/localFiles.ts';
import type {
  NormalizedSceneConfig,
  SceneObjectInspection,
  SceneSpan,
  SceneSpanVisual,
  SceneVisual,
  Timeline,
  TimelineFrame,
  VisualType,
  WorkspaceRightRail,
} from '../core/types.ts';
import type { LoadedSceneData } from '../hooks/useSceneWorkspace.ts';
import type { usePlaybackController } from '../hooks/usePlaybackController.ts';
import type { useWorkspaceShell } from '../hooks/useWorkspaceShell.ts';

interface WorkspaceShellProps {
  activeScene: NormalizedSceneConfig | null;
  activeLiveSelectedVisual: SceneVisual | undefined;
  activeSelectedObject: SceneObjectInspection | undefined;
  activeSelectedVisual: SceneObjectInspection['visuals'][number] | undefined;
  channelNames: string[];
  currentFrame: TimelineFrame | undefined;
  editorMode: InspectorEditorMode;
  loaded: LoadedSceneData | null;
  liveSelectedSpan: SceneSpan | undefined;
  liveSelectedSpanVisual: SceneSpanVisual | undefined;
  motionGenesisError: string | null;
  motionGenesisInput: string;
  motionGenesisOptions: MotionGenesisRunOptions;
  motionGenesisRun: MotionGenesisRunState | null;
  motionGenesisSendingInput: boolean;
  motionGenesisStarting: boolean;
  motionGenesisStopping: boolean;
  objectInspections: SceneObjectInspection[];
  onBeginSpanCreation: () => void;
  onClearSelection: () => void;
  onEditorModeChange: (mode: InspectorEditorMode) => void;
  onMotionGenesisInputChange: (value: string) => void;
  onMotionGenesisOptionsChange: (options: MotionGenesisRunOptions) => void;
  onOpenSceneEditorRail: () => void;
  onRunMotionGenesis: () => void | Promise<void>;
  onSelectObject: (objectName: string, visualName: string | null) => void;
  onSelectSpan: (spanName: string, visualName: string | null) => void;
  onSendMotionGenesisInput: () => void;
  onSimFileChange: (value: string) => void;
  onCreateSimulationFile: (directoryPath: string, fileName: string) => Promise<boolean>;
  onLinkSimulationSettings: (relativePath: string) => Promise<boolean>;
  onStopMotionGenesis: () => void;
  onStartSplitterDrag: (
    splitter: 'visual' | 'workspace',
    event: ReactPointerEvent<HTMLDivElement>,
    container: HTMLElement | null
  ) => void;
  playback: ReturnType<typeof usePlaybackController>;
  playbackSpeed: number;
  rendererSceneBasePath: string;
  rightRail: WorkspaceRightRail;
  savePreview: string;
  selectedSpanName: string | null;
  selectedSpanVisualName: string | null;
  setSelectedVisualName: (name: string | null) => void;
  shell: ReturnType<typeof useWorkspaceShell>;
  showPlots: boolean;
  showRenderer: boolean;
  showVisualWorkspace: boolean;
  simFileContent: string;
  simFileDirty: boolean;
  simFileError: string | null;
  simFileLoading: boolean;
  simFileReadOnly: boolean;
  spanEntries: WorkspaceSpanEntry[];
  timeline: Timeline;
  timelineOwner: 'renderer' | 'plots' | null;
  updateDraftScene: (updater: (scene: NormalizedSceneConfig) => void) => void;
  updateDraftScenePreview: (updater: (scene: NormalizedSceneConfig) => void) => void;
  updateSelectedObject: (updater: (sceneObject: NormalizedSceneConfig['objects'][string]) => void) => void;
  createVisual: (type: VisualType) => boolean;
  renameVisual: (currentName: string, nextName: string) => boolean;
  deleteSelectedVisual: () => boolean;
  changeSelectedVisualType: (type: VisualType) => void;
  createSpan: () => boolean;
  createSpanVisual: () => boolean;
  deleteSelectedSpan: () => boolean;
  deleteSelectedSpanVisual: () => boolean;
  renameSpan: (currentName: string, nextName: string) => boolean;
  renameSpanVisual: (currentName: string, nextName: string) => boolean;
  updateSelectedSpan: (updater: (span: SceneSpan) => void) => void;
  updateSelectedSpanVisual: (updater: (visual: SceneSpanVisual) => void) => void;
  updateSelectedSpanVisualPreview: (updater: (visual: SceneSpanVisual) => void) => void;
  updateSelectedVisual: (updater: (visual: SceneVisual) => void) => void;
  updateSelectedVisualPreview: (updater: (visual: SceneVisual) => void) => void;
  visualShellStyle: CSSProperties;
  workspaceShellRef: RefObject<HTMLDivElement>;
  workspaceShellStyle: CSSProperties;
}

export default function WorkspaceShell({
  activeScene,
  activeLiveSelectedVisual,
  activeSelectedObject,
  activeSelectedVisual,
  channelNames,
  currentFrame,
  editorMode,
  loaded,
  liveSelectedSpan,
  liveSelectedSpanVisual,
  motionGenesisError,
  motionGenesisInput,
  motionGenesisOptions,
  motionGenesisRun,
  motionGenesisSendingInput,
  motionGenesisStarting,
  motionGenesisStopping,
  objectInspections,
  onBeginSpanCreation,
  onClearSelection,
  onEditorModeChange,
  onMotionGenesisInputChange,
  onMotionGenesisOptionsChange,
  onOpenSceneEditorRail,
  onRunMotionGenesis,
  onSelectObject,
  onSelectSpan,
  onSendMotionGenesisInput,
  onSimFileChange,
  onCreateSimulationFile,
  onLinkSimulationSettings,
  onStopMotionGenesis,
  onStartSplitterDrag,
  playback,
  playbackSpeed,
  rendererSceneBasePath,
  rightRail,
  savePreview,
  selectedSpanName,
  selectedSpanVisualName,
  setSelectedVisualName,
  shell,
  showPlots,
  showRenderer,
  showVisualWorkspace,
  simFileContent,
  simFileDirty,
  simFileError,
  simFileLoading,
  simFileReadOnly,
  spanEntries,
  timeline,
  timelineOwner,
  updateDraftScene,
  updateDraftScenePreview,
  updateSelectedObject,
  createVisual,
  renameVisual,
  deleteSelectedVisual,
  changeSelectedVisualType,
  createSpan,
  createSpanVisual,
  deleteSelectedSpan,
  deleteSelectedSpanVisual,
  renameSpan,
  renameSpanVisual,
  updateSelectedSpan,
  updateSelectedSpanVisual,
  updateSelectedSpanVisualPreview,
  updateSelectedVisual,
  updateSelectedVisualPreview,
  visualShellStyle,
  workspaceShellRef,
  workspaceShellStyle,
}: WorkspaceShellProps) {
  const showRightRail = rightRail !== 'none';

  return (
    <div
      className={`workspace-shell ${!showRightRail ? 'workspace-shell-no-editor-rail' : ''}`}
      ref={workspaceShellRef}
      style={workspaceShellStyle}
    >
      {showVisualWorkspace ? (
        <WorkspaceVisualRegion
          activeScene={activeScene}
          channelNames={channelNames}
          currentFrame={currentFrame}
          onClearSelection={onClearSelection}
          onOpenSceneEditorRail={onOpenSceneEditorRail}
          onSelectObject={onSelectObject}
          onSelectSpan={onSelectSpan}
          onStartSplitterDrag={onStartSplitterDrag}
          playback={playback}
          playbackSpeed={playbackSpeed}
          rendererSceneBasePath={rendererSceneBasePath}
          rightRail={rightRail}
          selectedObjectName={activeSelectedObject?.name ?? null}
          selectedSpanName={selectedSpanName}
          shell={shell}
          showPlots={showPlots}
          showRenderer={showRenderer}
          timeline={timeline}
          timelineOwner={timelineOwner}
          updateDraftScene={updateDraftScene}
          visualShellStyle={visualShellStyle}
        />
      ) : null}

      {showVisualWorkspace && showRightRail ? (
        <div
          className="workspace-horizontal-splitter"
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize workspace and inspector"
          onPointerDown={(event) => onStartSplitterDrag('workspace', event, event.currentTarget.parentElement)}
        />
      ) : null}

      {rightRail === 'scene' ? (
        <WorkspaceEditorRail
          activeScene={activeScene}
          activeSelectedObject={activeSelectedObject}
          activeSelectedVisual={activeSelectedVisual}
          activeLiveSelectedVisual={activeLiveSelectedVisual}
          channelNames={channelNames}
          editorMode={editorMode}
          loaded={loaded}
          liveSelectedSpan={liveSelectedSpan}
          liveSelectedSpanVisual={liveSelectedSpanVisual}
          objectInspections={objectInspections}
          onBeginSpanCreation={onBeginSpanCreation}
          onEditorModeChange={onEditorModeChange}
          onSelectObject={onSelectObject}
          onSelectSpan={onSelectSpan}
          savePreview={savePreview}
          selectedSpanName={selectedSpanName}
          selectedSpanVisualName={selectedSpanVisualName}
          setSelectedVisualName={setSelectedVisualName}
          shell={shell}
          spanEntries={spanEntries}
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
        />
      ) : null}

      {rightRail === 'sim' ? (
        <div className="workspace-editor-rail workspace-sim-rail min-h-0">
          <MotionGenesisRunPanel
            canRun={loaded?.sceneRef.source === 'workspace' && Boolean(activeScene?.simulationSettings)}
            error={motionGenesisError}
            input={motionGenesisInput}
            loadedScenePath={loaded?.sceneRef.source === 'workspace' ? loaded.scenePath : null}
            options={motionGenesisOptions}
            onInputChange={onMotionGenesisInputChange}
            onOptionsChange={onMotionGenesisOptionsChange}
            onCreateSimulationFile={onCreateSimulationFile}
            onLinkSimulationSettings={onLinkSimulationSettings}
            onRun={onRunMotionGenesis}
            onSimFileChange={onSimFileChange}
            onStop={onStopMotionGenesis}
            onSendInput={onSendMotionGenesisInput}
            run={motionGenesisRun}
            simFileContent={simFileContent}
            simFileDirty={simFileDirty}
            simFileError={simFileError}
            simFileLoading={simFileLoading}
            simFileReadOnly={simFileReadOnly}
            simulationSettings={activeScene?.simulationSettings}
            starting={motionGenesisStarting}
            stopping={motionGenesisStopping}
            sendingInput={motionGenesisSendingInput}
          />
        </div>
      ) : null}

      {!showVisualWorkspace && !showRightRail ? (
        <section className="workspace-empty-state">
          <p className="text-sm font-medium">All workspace panels are hidden.</p>
          <p className="text-xs text-muted-foreground">
            Use the Layout menu to show the 3D view, plots, scene editor, or sim editor.
          </p>
        </section>
      ) : null}
    </div>
  );
}
