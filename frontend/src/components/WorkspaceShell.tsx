import type { CSSProperties, PointerEvent as ReactPointerEvent, RefObject } from 'react';
import WorkspaceEditorRail, { type WorkspaceSpanEntry } from './WorkspaceEditorRail.tsx';
import WorkspaceVisualRegion from './WorkspaceVisualRegion.tsx';
import type { InspectorEditorMode } from './InspectorDrawer.tsx';
import type {
  NormalizedSceneConfig,
  SceneObjectInspection,
  SceneSpan,
  SceneSpanVisual,
  SceneVisual,
  Timeline,
  TimelineFrame,
  VisualType,
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
  objectInspections: SceneObjectInspection[];
  onBeginSpanCreation: () => void;
  onClearSelection: () => void;
  onEditorModeChange: (mode: InspectorEditorMode) => void;
  onOpenEditorRail: () => void;
  onSelectObject: (objectName: string, visualName: string | null) => void;
  onSelectSpan: (spanName: string, visualName: string | null) => void;
  onStartSplitterDrag: (
    splitter: 'visual' | 'workspace',
    event: ReactPointerEvent<HTMLDivElement>,
    container: HTMLElement | null
  ) => void;
  playback: ReturnType<typeof usePlaybackController>;
  playbackSpeed: number;
  rendererSceneBasePath: string;
  savePreview: string;
  selectedSpanName: string | null;
  selectedSpanVisualName: string | null;
  setSelectedVisualName: (name: string | null) => void;
  shell: ReturnType<typeof useWorkspaceShell>;
  showEditorRail: boolean;
  showPlots: boolean;
  showRenderer: boolean;
  showVisualWorkspace: boolean;
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
  objectInspections,
  onBeginSpanCreation,
  onClearSelection,
  onEditorModeChange,
  onOpenEditorRail,
  onSelectObject,
  onSelectSpan,
  onStartSplitterDrag,
  playback,
  playbackSpeed,
  rendererSceneBasePath,
  savePreview,
  selectedSpanName,
  selectedSpanVisualName,
  setSelectedVisualName,
  shell,
  showEditorRail,
  showPlots,
  showRenderer,
  showVisualWorkspace,
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
  return (
    <div
      className={`workspace-shell ${!showEditorRail ? 'workspace-shell-no-editor-rail' : ''}`}
      ref={workspaceShellRef}
      style={workspaceShellStyle}
    >
      {showVisualWorkspace ? (
        <WorkspaceVisualRegion
          activeScene={activeScene}
          channelNames={channelNames}
          currentFrame={currentFrame}
          onClearSelection={onClearSelection}
          onOpenEditorRail={onOpenEditorRail}
          onSelectObject={onSelectObject}
          onSelectSpan={onSelectSpan}
          onStartSplitterDrag={onStartSplitterDrag}
          playback={playback}
          playbackSpeed={playbackSpeed}
          rendererSceneBasePath={rendererSceneBasePath}
          selectedObjectName={activeSelectedObject?.name ?? null}
          selectedSpanName={selectedSpanName}
          shell={shell}
          showEditorRail={showEditorRail}
          showPlots={showPlots}
          showRenderer={showRenderer}
          timeline={timeline}
          timelineOwner={timelineOwner}
          updateDraftScene={updateDraftScene}
          visualShellStyle={visualShellStyle}
        />
      ) : null}

      {showVisualWorkspace && showEditorRail ? (
        <div
          className="workspace-horizontal-splitter"
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize workspace and inspector"
          onPointerDown={(event) => onStartSplitterDrag('workspace', event, event.currentTarget.parentElement)}
        />
      ) : null}

      {showEditorRail ? (
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

      {!showVisualWorkspace && !showEditorRail ? (
        <section className="workspace-empty-state">
          <p className="text-sm font-medium">All workspace panels are hidden.</p>
          <p className="text-xs text-muted-foreground">
            Use the Layout menu to show the 3D view, plots, or the editor rail.
          </p>
        </section>
      ) : null}
    </div>
  );
}
