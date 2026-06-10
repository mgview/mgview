import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react';
import PlaybackStrip from './PlaybackStrip.tsx';
import PlotsPanel from './PlotsPanel.tsx';
import RendererPanel from './RendererPanel.tsx';
import type { NormalizedSceneConfig, Timeline, TimelineFrame } from '../core/types.ts';
import type { usePlaybackController } from '../hooks/usePlaybackController.ts';
import type { useWorkspaceShell } from '../hooks/useWorkspaceShell.ts';

interface WorkspaceVisualRegionProps {
  activeScene: NormalizedSceneConfig | null;
  channelNames: string[];
  currentFrame: TimelineFrame | undefined;
  onClearSelection: () => void;
  onOpenEditorRail: () => void;
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
  selectedObjectName: string | null;
  selectedSpanName: string | null;
  shell: ReturnType<typeof useWorkspaceShell>;
  showEditorRail: boolean;
  showPlots: boolean;
  showRenderer: boolean;
  timeline: Timeline;
  timelineOwner: 'renderer' | 'plots' | null;
  updateDraftScene: (updater: (scene: NormalizedSceneConfig) => void) => void;
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
  onOpenEditorRail,
  onSelectObject,
  onSelectSpan,
  onStartSplitterDrag,
  playback,
  playbackSpeed,
  rendererSceneBasePath,
  selectedObjectName,
  selectedSpanName,
  shell,
  showEditorRail,
  showPlots,
  showRenderer,
  timeline,
  timelineOwner,
  updateDraftScene,
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
              layoutSizeKey={`${showRenderer}-${showPlots}-${showEditorRail}`}
              onCameraPreviewChange={shell.setCameraPreview}
              onCameraCommit={shell.commitCameraPreview}
              onClearSelection={onClearSelection}
              onSelectObject={(objectName, visualName) => {
                onOpenEditorRail();
                onSelectObject(objectName, visualName);
              }}
              onSelectSpan={(spanName, visualName) => {
                onOpenEditorRail();
                onSelectSpan(spanName, visualName);
              }}
              scenePath={rendererSceneBasePath}
              scene={activeScene}
              frame={currentFrame}
              selectedObjectName={selectedObjectName}
              selectedSpanName={selectedSpanName}
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
