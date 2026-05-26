import { useEffect, useMemo, useState } from 'react';
import ChannelPreviewOverlay from './components/ChannelPreviewOverlay.tsx';
import DiagnosticsOverlay from './components/DiagnosticsOverlay.tsx';
import InspectorDrawer, { type InspectorEditorMode } from './components/InspectorDrawer.tsx';
import LoadSceneOverlay from './components/LoadSceneOverlay.tsx';
import ObjectList from './components/ObjectList.tsx';
import PlaybackStrip from './components/PlaybackStrip.tsx';
import RendererPanel from './components/RendererPanel.tsx';
import SceneHeaderBar from './components/SceneHeaderBar.tsx';
import { buildObjectInspections } from './core/sceneInspector.ts';
import { getFrameAtTime } from './core/timeline.ts';
import { usePlaybackController } from './hooks/usePlaybackController.ts';
import { createSavableScene, useSceneWorkspace } from './hooks/useSceneWorkspace.ts';
import type { SceneVisual } from './core/types.ts';

const DEFAULT_SCENE_PATH = 'samples/particle_pendulum/particle_pendulum.json';
const PREVIEW_CHANNEL_COUNT = 14;
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

function getAppBasePath(): string {
  const pathname = window.location.pathname.replace(/\/$/, '');
  if (pathname === '') {
    return '';
  }
  if (pathname.endsWith('/simple')) {
    return pathname.slice(0, -'/simple'.length);
  }
  return pathname;
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
  const [loadOverlayOpen, setLoadOverlayOpen] = useState(false);
  const [diagnosticsOpen, setDiagnosticsOpen] = useState(false);
  const [channelPreviewOpen, setChannelPreviewOpen] = useState(false);
  const [editorMode, setEditorMode] = useState<InspectorEditorMode>('visual');
  const [leftSidebarCollapsed, setLeftSidebarCollapsed] = useState(false);
  const [rightDrawerCollapsed, setRightDrawerCollapsed] = useState(false);
  const [sampleBrowserExpanded, setSampleBrowserExpanded] = useState(false);
  const {
    activeScene,
    browserError,
    browserListing,
    browserLoading,
    browseSceneInputDirectory,
    draftScene,
    error,
    handleBrowse,
    handleLoad,
    handleRevertDraft,
    handleSaveScene,
    hasLocalEdits,
    loaded,
    loading,
    saveMessage,
    saving,
    sceneInput,
    selectedObjectName,
    selectedVisualName,
    setSceneInput,
    setSelectedObjectName,
    setSelectedVisualName,
    showWorkspaceShell,
    updateDraftScene,
  } = workspace;

  useEffect(() => {
    if (loaded) {
      setEditorMode('visual');
    }
  }, [loaded?.scenePath]);

  const activeObjectInspections = useMemo(() => {
    if (!loaded || !activeScene) {
      return [];
    }
    return buildObjectInspections(loaded.rawScene, activeScene);
  }, [loaded, activeScene]);

  const playbackSpeed = activeScene?.speedFactor ?? loaded?.scene.speedFactor ?? 1;
  const playback = usePlaybackController(loaded?.timeline ?? null, playbackSpeed);

  const currentFrame = useMemo(() => {
    if (!loaded) {
      return undefined;
    }
    return getFrameAtTime(loaded.timeline, playback.currentTime);
  }, [loaded, playback.currentTime]);

  const selectedObject = useMemo(() => {
    if (!activeObjectInspections.length) {
      return undefined;
    }

    return activeObjectInspections.find((entry) => entry.name === selectedObjectName) ?? activeObjectInspections[0];
  }, [activeObjectInspections, selectedObjectName]);

  const selectedVisual = useMemo(() => {
    if (!selectedObject) {
      return undefined;
    }

    return selectedObject.visuals.find((entry) => entry.name === selectedVisualName) ?? selectedObject.visuals[0];
  }, [selectedObject, selectedVisualName]);

  useEffect(() => {
    if (!selectedObject) {
      setSelectedVisualName(null);
      return;
    }

    if (!selectedObject.visuals.some((visual) => visual.name === selectedVisualName)) {
      setSelectedVisualName(selectedObject.visuals[0]?.name ?? null);
    }
  }, [selectedObject, selectedVisualName]);

  useEffect(() => {
    if (selectedObject) {
      setEditorMode('visual');
    }
  }, [selectedObject?.name]);

  const previewEntries = useMemo(() => {
    return Object.entries(currentFrame?.frame.data ?? {}).slice(0, PREVIEW_CHANNEL_COUNT);
  }, [currentFrame]);
  const cameraSeedKey = useMemo(() => {
    if (!activeScene || !loaded) {
      return 'no-scene';
    }

    return JSON.stringify({
      scenePath: loaded.scenePath,
      cameraParentFrame: activeScene.cameraParentFrame,
      cameraUp: activeScene.cameraUp ?? null,
      cameraEye: activeScene.cameraEye ?? null,
      cameraFocus: activeScene.cameraFocus ?? null,
    });
  }, [
    activeScene?.cameraEye,
    activeScene?.cameraFocus,
    activeScene?.cameraParentFrame,
    activeScene?.cameraUp,
    loaded,
  ]);

  const savePreview = useMemo(() => {
    if (!loaded || !draftScene) {
      return '';
    }

    return JSON.stringify(createSavableScene(loaded.rawScene, draftScene), null, 2);
  }, [draftScene, loaded]);

  const handleOpenSelectedScene = () => {
    void handleLoad(sceneInput, {
      actionLabel: 'Loading a scene by path',
    }).then((didLoad) => {
      if (didLoad) {
        setLoadOverlayOpen(false);
        setEditorMode('visual');
      }
    });
  };

  const updateSelectedVisual = (updater: (visual: SceneVisual) => void) => {
    if (!draftScene || !selectedObject?.name || !selectedVisual?.name) {
      return;
    }

    setDraftScene((currentDraft) => {
      if (!currentDraft) {
        return currentDraft;
      }

      const nextDraft = structuredClone(currentDraft);
      const visual = nextDraft.objects[selectedObject.name]?.visual?.[selectedVisual.name];
      if (!visual) {
        return currentDraft;
      }

      updater(visual);
      return nextDraft;
    });
  };

  const groupedSamples = useMemo(() => sampleGroups(), []);

  const updateSceneVector = (
    key: 'cameraUp' | 'cameraEye' | 'cameraFocus',
    index: 0 | 1 | 2,
    nextValue: number,
    fallback: [number, number, number]
  ) => {
    updateDraftScene((scene) => {
      const current = scene[key] ?? fallback;
      const nextTuple: [number, number, number] = [...current] as [number, number, number];
      nextTuple[index] = nextValue;
      scene[key] = nextTuple;
    });
  };

  const liveSelectedVisual =
    selectedObject && selectedVisual && activeScene
      ? activeScene.objects[selectedObject.name]?.visual?.[selectedVisual.name]
      : undefined;

  return (
    <div className="app-shell">
      <SceneHeaderBar
        scenePath={loaded?.scenePath ?? null}
        sceneName={activeScene?.name ?? loaded?.scene.name ?? null}
        hasLocalEdits={hasLocalEdits}
        loading={loading}
        saving={saving}
        statusMessage={saveMessage}
        errorMessage={error}
        onOpenLoadOverlay={() => {
          setLoadOverlayOpen(true);
          void browseSceneInputDirectory();
        }}
        onOpenDiagnostics={() => setDiagnosticsOpen(true)}
        onOpenChannels={() => setChannelPreviewOpen(true)}
        onSave={() => void handleSaveScene()}
        onRevert={() => {
          if (handleRevertDraft()) {
            setEditorMode('visual');
          }
        }}
      />

      {showWorkspaceShell ? (
          <div
            className={`workspace-shell ${leftSidebarCollapsed ? 'workspace-shell-left-collapsed' : ''} ${
              rightDrawerCollapsed ? 'workspace-shell-right-collapsed' : ''
            }`}
          >
            {!leftSidebarCollapsed ? (
              <div className="workspace-sidebar">
                <div className="workspace-pane-scroll">
                  {loaded ? (
                    <ObjectList
                      entries={activeObjectInspections}
                      selectedObjectName={selectedObject?.name ?? null}
                      onSelectObject={(objectName, firstVisualName) => {
                        setSelectedObjectName(objectName);
                        setSelectedVisualName(firstVisualName);
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
            ) : null}

            <button
              type="button"
              className="workspace-edge-handle"
              onClick={() => setLeftSidebarCollapsed((current) => !current)}
              aria-label={leftSidebarCollapsed ? 'Expand objects pane' : 'Collapse objects pane'}
            >
              {leftSidebarCollapsed ? '>' : '<'}
            </button>

          <div className="workspace-main">
            {activeScene ? (
              <>
                <RendererPanel
                  cameraSeedKey={cameraSeedKey}
                  scenePath={loaded.scenePath}
                  scene={activeScene}
                  frame={currentFrame?.frame}
                  selectedObjectName={selectedObject?.name ?? null}
                />

                <PlaybackStrip
                  isPlaying={playback.isPlaying}
                  currentTime={playback.currentTime}
                  tInitial={loaded.timeline.tInitial}
                  tFinal={loaded.timeline.tFinal}
                  tStep={loaded.timeline.tStep || 0.001}
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
                <section className="panel span-12 renderer-panel loading-panel">
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
              onClick={() => setRightDrawerCollapsed((current) => !current)}
              aria-label={rightDrawerCollapsed ? 'Expand inspector pane' : 'Collapse inspector pane'}
            >
              {rightDrawerCollapsed ? '<' : '>'}
            </button>

          {!rightDrawerCollapsed ? (
          <div className="workspace-drawer">
            <div className="workspace-pane-scroll">
              <InspectorDrawer
                activeScene={activeScene}
                editorMode={editorMode}
                hasLocalEdits={hasLocalEdits}
                liveSelectedVisual={liveSelectedVisual}
                loaded={loaded}
                savePreview={savePreview}
                selectedObject={selectedObject}
                selectedVisual={selectedVisual}
                setEditorMode={setEditorMode}
                setSelectedVisualName={setSelectedVisualName}
                updateDraftScene={updateDraftScene}
                updateSceneVector={updateSceneVector}
                updateSelectedVisual={updateSelectedVisual}
              />
            </div>
          </div>
          ) : null}
        </div>
      ) : null}

      {loadOverlayOpen ? (
        <LoadSceneOverlay
          browserError={browserError}
          browserListing={browserListing}
          browserLoading={browserLoading}
          groupedSamples={groupedSamples}
          loading={loading}
          onBrowse={(path) => {
            void handleBrowse(path);
          }}
          onClose={() => setLoadOverlayOpen(false)}
          onOpenSelectedScene={handleOpenSelectedScene}
          sampleBrowserExpanded={sampleBrowserExpanded}
          sceneInput={sceneInput}
          setSampleBrowserExpanded={setSampleBrowserExpanded}
          setSceneInput={setSceneInput}
        />
      ) : null}

      {diagnosticsOpen && loaded ? (
        <DiagnosticsOverlay
          diagnostics={loaded.diagnostics}
          onClose={() => setDiagnosticsOpen(false)}
        />
      ) : null}

      {channelPreviewOpen && loaded ? (
        <ChannelPreviewOverlay
          onClose={() => setChannelPreviewOpen(false)}
          previewEntries={previewEntries}
          previewLimit={PREVIEW_CHANNEL_COUNT}
        />
      ) : null}

    </div>
  );
}
