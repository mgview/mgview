import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react';
import PlaybackStrip from './PlaybackStrip.tsx';
import PlotsPanel from './PlotsPanel.tsx';
import RendererPanel from './RendererPanel.tsx';
import type { NormalizedSceneConfig, SceneVisual, Timeline, TimelineFrame, VisualType, WorkspaceRightRail } from '../core/types.ts';
import type { usePlaybackController } from '../hooks/usePlaybackController.ts';
import type { useWorkspaceShell } from '../hooks/useWorkspaceShell.ts';
import type { SceneAssetRoot } from '../api/sceneAssetUrl.ts';

interface WorkspaceVisualRegionProps {
  activeScene: NormalizedSceneConfig | null;
  channelNames: string[];
  currentFrame: TimelineFrame | undefined;
  onClearSelection: () => void;
  onCreateVisual: (objectName: string, type: VisualType) => boolean;
  onDeleteSelectedVisual: () => boolean;
  onOpenSceneEditorRail: () => void;
  onSelectObject: (objectName: string, visualName: string | null) => void;
  onSelectSpan: (spanName: string, visualName: string | null) => void;
  onStartSplitterDrag: (
    splitter: 'visual',
    event: ReactPointerEvent<HTMLDivElement>,
    container: HTMLElement | null
  ) => void;
  playback: ReturnType<typeof usePlaybackController>;
  playbackSpeed: number;
  rendererSceneBasePath: string;
  rendererSceneAssetRoot: SceneAssetRoot;
  renameVisual: (currentName: string, nextName: string) => boolean;
  sceneObjectOptions: Array<{ name: string; type: string }>;
  selectedObjectName: string | null;
  selectedSpanName: string | null;
  selectedSpanVisualName: string | null;
  selectedVisualName: string | null;
  shell: ReturnType<typeof useWorkspaceShell>;
  rightRail: WorkspaceRightRail;
  showPlots: boolean;
  showRenderer: boolean;
  timeline: Timeline;
  timelineOwner: 'renderer' | 'plots' | null;
  updateDraftScene: (updater: (scene: NormalizedSceneConfig) => void) => void;
  updateSelectedVisual: (updater: (visual: SceneVisual) => void) => void;
  updateSelectedVisualPreview: (updater: (visual: SceneVisual) => void) => void;
  visualShellStyle: CSSProperties;
}

function WorkspacePlaybackStrip({
  playback,
  playbackSpeed,
  timeline,
  updateDraftScene,
}: {
  playback: ReturnType<typeof usePlaybackController>;
  playbackSpeed: number;
  timeline: Timeline;
  updateDraftScene: (updater: (scene: NormalizedSceneConfig) => void) => void;
}) {
  return (
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
  );
}

export default function WorkspaceVisualRegion({
  activeScene,
  channelNames,
  currentFrame,
  onClearSelection,
  onCreateVisual,
  onDeleteSelectedVisual,
  onOpenSceneEditorRail,
  onSelectObject,
  onSelectSpan,
  onStartSplitterDrag,
  playback,
  playbackSpeed,
  rendererSceneBasePath,
  rendererSceneAssetRoot,
  renameVisual,
  sceneObjectOptions,
  selectedObjectName,
  selectedSpanName,
  selectedSpanVisualName,
  selectedVisualName,
  shell,
  rightRail,
  showPlots,
  showRenderer,
  timeline,
  timelineOwner,
  updateDraftScene,
  updateSelectedVisual,
  updateSelectedVisualPreview,
  visualShellStyle,
}: WorkspaceVisualRegionProps) {
  return (
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
              layoutSizeKey={`${showRenderer}-${showPlots}-${rightRail}`}
              onCameraPreviewChange={shell.setCameraPreview}
              onCameraCommit={shell.commitCameraPreview}
              onClearSelection={onClearSelection}
              onCreateVisual={onCreateVisual}
              onDeleteSelectedVisual={onDeleteSelectedVisual}
              onRenameVisual={renameVisual}
              onOpenSceneEditorRail={onOpenSceneEditorRail}
              onSelectObject={onSelectObject}
              onSelectSpan={onSelectSpan}
              onVisualTransformChange={({ position, rotation }) => {
                updateSelectedVisual((visual) => {
                  visual.position = position;
                  visual.rotation = rotation;
                });
              }}
              onVisualTransformPreviewChange={({ position, rotation }) => {
                updateSelectedVisualPreview((visual) => {
                  visual.position = position;
                  visual.rotation = rotation;
                });
              }}
              onVisualResizeChange={(patch) => {
                updateSelectedVisual((visual) => {
                  Object.assign(visual, patch);
                });
              }}
              onVisualResizePreviewChange={(patch) => {
                updateSelectedVisualPreview((visual) => {
                  Object.assign(visual, patch);
                });
              }}
              onVisualMaterialChange={(material) => {
                updateSelectedVisual((visual) => {
                  visual.material = material;
                });
              }}
              onVisualMaterialPreviewChange={(material) => {
                updateSelectedVisualPreview((visual) => {
                  visual.material = material;
                });
              }}
              scenePath={rendererSceneBasePath}
              sceneAssetRoot={rendererSceneAssetRoot}
              sceneObjectOptions={sceneObjectOptions}
              scene={activeScene}
              frame={currentFrame}
              selectedObjectName={selectedObjectName}
              selectedSpanName={selectedSpanName}
              selectedSpanVisualName={selectedSpanVisualName}
              selectedVisualName={selectedVisualName}
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
            <WorkspacePlaybackStrip
              playback={playback}
              playbackSpeed={playbackSpeed}
              timeline={timeline}
              updateDraftScene={updateDraftScene}
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
          onPointerDown={(event) => onStartSplitterDrag('visual', event, event.currentTarget.parentElement)}
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
            <WorkspacePlaybackStrip
              playback={playback}
              playbackSpeed={playbackSpeed}
              timeline={timeline}
              updateDraftScene={updateDraftScene}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
