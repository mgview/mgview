import { FormEvent, useEffect, useMemo, useState } from 'react';
import LocalFileBrowser from './components/LocalFileBrowser.tsx';
import InspectorDrawer, { type InspectorEditorMode } from './components/InspectorDrawer.tsx';
import ObjectList from './components/ObjectList.tsx';
import OverlayPanel from './components/OverlayPanel.tsx';
import PlaybackStrip from './components/PlaybackStrip.tsx';
import RendererPanel from './components/RendererPanel.tsx';
import SceneHeaderBar from './components/SceneHeaderBar.tsx';
import { buildObjectInspections } from './core/sceneInspector.ts';
import { getFrameAtTime } from './core/timeline.ts';
import { usePlaybackController } from './hooks/usePlaybackController.ts';
import { createSavableScene, getDirectoryPath, useSceneWorkspace } from './hooks/useSceneWorkspace.ts';
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

function formatNumber(value: number): string {
  if (!Number.isFinite(value)) {
    return 'n/a';
  }

  if (Math.abs(value) >= 1000 || (Math.abs(value) > 0 && Math.abs(value) < 0.001)) {
    return value.toExponential(3);
  }

  return value.toFixed(4).replace(/\.?0+$/, '');
}

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

function isJsonPath(filePath: string): boolean {
  return filePath.toLowerCase().endsWith('.json');
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

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
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
        <OverlayPanel
          title="Load Scene"
          subtitle="Browse local folders or choose a bundled sample, then explicitly open the selected JSON scene."
          actions={
            <button
              type="button"
              onClick={() => {
                void handleLoad(sceneInput, {
                  actionLabel: 'Loading a scene from the load overlay',
                }).then((didLoad) => {
                  if (didLoad) {
                    setLoadOverlayOpen(false);
                    setEditorMode('visual');
                  }
                });
              }}
              disabled={loading || !isJsonPath(sceneInput)}
            >
              Open Selected Scene
            </button>
          }
          onClose={() => setLoadOverlayOpen(false)}
        >
          <div className="overlay-layout">
            <section className="panel">
              <div className="panel-header">
                <div>
                  <h2>Selected Path</h2>
                  <p className="panel-subtitle">Only JSON scene files can be opened.</p>
                </div>
              </div>
              <form className="loader-form" onSubmit={handleSubmit}>
                <input
                  type="text"
                  value={sceneInput}
                  onChange={(event) => setSceneInput(event.target.value)}
                  aria-label="Scene path"
                />
                <button type="submit" disabled={loading || !isJsonPath(sceneInput)}>
                  Open
                </button>
              </form>
            </section>

            <LocalFileBrowser
              browserListing={browserListing}
              browserError={browserError}
              browserLoading={browserLoading}
              sceneInput={sceneInput}
              onBrowse={(path) => {
                void handleBrowse(path);
              }}
              onSelectFile={(path) => {
                setSceneInput(path);
              }}
              getDirectoryPath={getDirectoryPath}
            />

            <section className="panel">
              <div className="panel-header">
                <div>
                  <h2>Built-in Sample Shortcuts</h2>
                  <p className="panel-subtitle">Choose a bundled sample and then open it.</p>
                </div>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setSampleBrowserExpanded((current) => !current)}
                >
                  {sampleBrowserExpanded ? 'Hide Samples' : 'Show Samples'}
                </button>
              </div>

              {sampleBrowserExpanded ? (
                <div className="sample-groups">
                  {groupedSamples.map(([groupName, samples]) => (
                    <div key={groupName} className="sample-group">
                      <div className="sample-group-title">{groupName}</div>
                      <div className="sample-list">
                        {samples.map((sample) => (
                          <button
                            key={sample.path}
                            type="button"
                            className={`sample-button ${sceneInput === sample.path ? 'sample-button-active' : ''}`}
                            onClick={() => {
                              setSceneInput(sample.path);
                            }}
                          >
                            <span>{sample.label}</span>
                            <code>{sample.path}</code>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state">Sample shortcuts are hidden.</div>
              )}
            </section>
          </div>
        </OverlayPanel>
      ) : null}

      {diagnosticsOpen && loaded ? (
        <OverlayPanel
          title="Diagnostics"
          subtitle="Scene normalization, inference, and load diagnostics."
          onClose={() => setDiagnosticsOpen(false)}
        >
          <section className="panel">
            <div className="diagnostic-list">
              {loaded.diagnostics.length === 0 ? (
                <div className="diagnostic diagnostic-info">
                  No scene warnings. Core extraction matched this sample cleanly.
                </div>
              ) : (
                loaded.diagnostics.map((diagnostic, index) => (
                  <div
                    key={`${diagnostic.severity}-${index}`}
                    className={`diagnostic ${diagnostic.severity === 'warning' ? 'diagnostic-warning' : 'diagnostic-info'}`}
                  >
                    <strong>{diagnostic.severity}</strong>
                    <span>{diagnostic.message}</span>
                  </div>
                ))
              )}
            </div>
          </section>
        </OverlayPanel>
      ) : null}

      {channelPreviewOpen && loaded ? (
        <OverlayPanel
          title="Channel Preview"
          subtitle={`First ${PREVIEW_CHANNEL_COUNT} channel values at the current time.`}
          onClose={() => setChannelPreviewOpen(false)}
        >
          <section className="panel">
            <table className="preview-table">
              <tbody>
                {previewEntries.map(([channelName, value]) => (
                  <tr key={channelName}>
                    <td>
                      <code>{channelName}</code>
                    </td>
                    <td>
                      <code>{formatNumber(value)}</code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </OverlayPanel>
      ) : null}

    </div>
  );
}
