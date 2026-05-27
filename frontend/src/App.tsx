import { useEffect, useMemo, useState } from 'react';
import DiagnosticsOverlay from './components/DiagnosticsOverlay.tsx';
import InspectorDrawer, { type InspectorEditorMode } from './components/InspectorDrawer.tsx';
import LoadSceneOverlay from './components/LoadSceneOverlay.tsx';
import ObjectList from './components/ObjectList.tsx';
import PlaybackStrip from './components/PlaybackStrip.tsx';
import RendererPanel from './components/RendererPanel.tsx';
import SceneHeaderBar from './components/SceneHeaderBar.tsx';
import SimulationDataOverlay from './components/SimulationDataOverlay.tsx';
import { getBasePath, getRelativePath } from './core/pathUtils.ts';
import { getFrameAtTime } from './core/timeline.ts';
import { usePlaybackController } from './hooks/usePlaybackController.ts';
import { createSavableScene, getDirectoryPath, useSceneWorkspace } from './hooks/useSceneWorkspace.ts';
import { useSceneSelectionEditor } from './hooks/useSceneSelectionEditor.ts';

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

function tupleApproximatelyEqual(
  left: [number, number, number] | undefined,
  right: [number, number, number],
  epsilon = 1e-6
) {
  return (
    left !== undefined &&
    Math.abs(left[0] - right[0]) <= epsilon &&
    Math.abs(left[1] - right[1]) <= epsilon &&
    Math.abs(left[2] - right[2]) <= epsilon
  );
}

type CameraDraftPreview = {
  cameraParentFrame: string;
  cameraEye: [number, number, number];
  cameraFocus: [number, number, number];
  cameraUp: [number, number, number];
};

type SceneOverlayMode = 'load' | 'create';

export default function App() {
  const workspace = useSceneWorkspace(getScenePathFromUrl());
  const [loadOverlayOpen, setLoadOverlayOpen] = useState(false);
  const [sceneOverlayMode, setSceneOverlayMode] = useState<SceneOverlayMode>('load');
  const [diagnosticsOpen, setDiagnosticsOpen] = useState(false);
  const [simulationOverlayOpen, setSimulationOverlayOpen] = useState(false);
  const [simulationEntryInput, setSimulationEntryInput] = useState('');
  const [editorMode, setEditorMode] = useState<InspectorEditorMode>('visual');
  const [leftRailCollapsed, setLeftRailCollapsed] = useState(false);
  const [sampleBrowserExpanded, setSampleBrowserExpanded] = useState(false);
  const [cameraPreview, setCameraPreview] = useState<CameraDraftPreview | null>(null);
  const {
    activeScene,
    browserError,
    browserListing,
    browserLoading,
    browseSceneInputDirectory,
    draftScene,
    error,
    handleBrowse,
    handleCreateScene,
    handleLoad,
    handleRevertDraft,
    handleSaveScene,
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
  } = workspace;

  useEffect(() => {
    if (loaded) {
      setEditorMode('visual');
    }
  }, [loaded?.scenePath]);

  useEffect(() => {
    if (!activeScene || !cameraPreview) {
      return;
    }

    const parentMatches = activeScene.cameraParentFrame === cameraPreview.cameraParentFrame;
    const eyeMatches = tupleApproximatelyEqual(activeScene.cameraEye, cameraPreview.cameraEye);
    const focusMatches = tupleApproximatelyEqual(activeScene.cameraFocus, cameraPreview.cameraFocus);
    const upMatches = tupleApproximatelyEqual(activeScene.cameraUp, cameraPreview.cameraUp);

    if (parentMatches && eyeMatches && focusMatches && upMatches) {
      setCameraPreview(null);
    }
  }, [activeScene, cameraPreview]);

  const playbackSpeed = activeScene?.speedFactor ?? loaded?.scene.speedFactor ?? 1;
  const playback = usePlaybackController(loaded ? timeline : null, playbackSpeed);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.repeat || event.code !== 'Space') {
        return;
      }

      if (loadOverlayOpen || diagnosticsOpen || simulationOverlayOpen) {
        return;
      }

      const target = event.target;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        target instanceof HTMLButtonElement ||
        (target instanceof HTMLElement && target.isContentEditable)
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
  }, [diagnosticsOpen, loadOverlayOpen, playback.togglePlay, simulationOverlayOpen]);

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
  } = useSceneSelectionEditor({
    activeScene,
    draftScene,
    objectInspections,
    selectedObjectName,
    selectedVisualName,
    setSelectedObjectName,
    setSelectedVisualName,
    updateDraftScene,
  });

  useEffect(() => {
    if (selectedObject) {
      setEditorMode('visual');
    }
  }, [selectedObject?.name]);

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

  const openLoadOverlay = () => {
    setError(null);
    setSceneOverlayMode('load');
    setLoadOverlayOpen(true);
    void browseSceneInputDirectory();
  };

  const openCreateOverlay = () => {
    setError(null);
    setSceneOverlayMode('create');
    const defaultDirectory = loaded ? getBasePath(loaded.scenePath).replace(/\/$/, '') : getDirectoryPath(sceneInput);
    const nextPath = defaultDirectory && defaultDirectory !== '.' ? `${defaultDirectory}/new_scene.json` : 'new_scene.json';
    setSceneInput(nextPath);
    setLoadOverlayOpen(true);
    void handleBrowse(defaultDirectory || '.');
  };

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

  const handleOpenScenePath = (path: string) => {
    void handleLoad(path, {
      actionLabel: 'Loading a scene by path',
    }).then((didLoad) => {
      if (didLoad) {
        setLoadOverlayOpen(false);
        setEditorMode('visual');
      }
    });
  };

  const handleCreateScenePath = (path: string) => {
    void handleCreateScene(path).then((didCreate) => {
      if (didCreate) {
        setLoadOverlayOpen(false);
        setEditorMode('visual');
      }
    });
  };

  const groupedSamples = useMemo(() => sampleGroups(), []);

  const updateSceneVector = (
    key: 'cameraUp' | 'cameraEye' | 'cameraFocus',
    index: 0 | 1 | 2,
    nextValue: number,
    fallback: [number, number, number]
  ) => {
    setCameraPreview(null);
    updateDraftScene((scene) => {
      const current = scene[key] ?? fallback;
      const nextTuple: [number, number, number] = [...current] as [number, number, number];
      nextTuple[index] = nextValue;
      scene[key] = nextTuple;
    });
  };

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
        onOpenCreateOverlay={openCreateOverlay}
        onOpenLoadOverlay={openLoadOverlay}
        onOpenDiagnostics={() => setDiagnosticsOpen(true)}
        onOpenChannels={() => {
          setSimulationOverlayOpen(true);
          if (loaded) {
            void handleBrowse(getBasePath(loaded.scenePath));
          }
        }}
        onSceneNameChange={(nextName) => {
          updateDraftScene((scene) => {
            scene.name = nextName;
          });
        }}
        onSave={() => void handleSaveScene()}
        onRevert={() => {
          if (handleRevertDraft()) {
            setEditorMode('visual');
          }
        }}
      />

      {showWorkspaceShell ? (
          <div
            className={`workspace-shell ${leftRailCollapsed ? 'workspace-shell-left-rail-collapsed' : ''}`}
          >
            <div className="workspace-main">
              {activeScene ? (
                <>
                  <RendererPanel
                    cameraSeedKey={cameraSeedKey}
                    layoutSizeKey={`${leftRailCollapsed}`}
                    onCameraPreviewChange={(nextCameraPreview) => {
                      setCameraPreview(nextCameraPreview);
                    }}
                    onCameraCommit={({ cameraParentFrame, cameraEye, cameraFocus, cameraUp }) => {
                      setCameraPreview({
                        cameraParentFrame,
                        cameraEye,
                        cameraFocus,
                        cameraUp,
                      });
                      updateDraftScene((scene) => {
                        if (
                          scene.cameraParentFrame === cameraParentFrame &&
                          tupleApproximatelyEqual(scene.cameraEye, cameraEye) &&
                          tupleApproximatelyEqual(scene.cameraFocus, cameraFocus) &&
                          tupleApproximatelyEqual(scene.cameraUp, cameraUp)
                        ) {
                          return;
                        }

                        scene.cameraParentFrame = cameraParentFrame;
                        scene.cameraEye = cameraEye;
                        scene.cameraFocus = cameraFocus;
                        scene.cameraUp = cameraUp;
                      });
                    }}
                    scenePath={loaded.scenePath}
                    scene={activeScene}
                    frame={currentFrame?.frame}
                    selectedObjectName={selectedObject?.name ?? null}
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
              onClick={() => setLeftRailCollapsed((current) => !current)}
              aria-label={leftRailCollapsed ? 'Expand editor rail' : 'Collapse editor rail'}
            >
              {leftRailCollapsed ? '<' : '>'}
            </button>

            {!leftRailCollapsed ? (
              <div className="workspace-left-rail">
                <div className="workspace-sidebar">
                  <div className="workspace-pane-scroll">
                    {loaded ? (
                      <ObjectList
                        entries={objectInspections}
                        selectedObjectName={selectedObject?.name ?? null}
                        onSelectObject={selectObject}
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
                      cameraPreview={cameraPreview}
                      clearCameraPreview={() => setCameraPreview(null)}
                      editorMode={editorMode}
                      hasLocalEdits={hasLocalEdits}
                      liveSelectedVisual={liveSelectedVisual}
                      loaded={loaded}
                      savePreview={savePreview}
                      selectedObject={selectedObject}
                      selectedVisual={selectedVisual}
                      updateSelectedObject={updateSelectedObject}
                      createVisual={createVisual}
                      renameVisual={renameVisual}
                      deleteSelectedVisual={deleteSelectedVisual}
                      changeSelectedVisualType={changeSelectedVisualType}
                      setEditorMode={setEditorMode}
                      setSelectedVisualName={setSelectedVisualName}
                      updateDraftScene={updateDraftScene}
                      updateSceneVector={updateSceneVector}
                      updateSelectedVisual={updateSelectedVisual}
                    />
                  </div>
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
          errorMessage={error}
          groupedSamples={groupedSamples}
          loading={loading}
          mode={sceneOverlayMode}
          onBrowse={(path) => {
            void handleBrowse(path);
          }}
          onClose={() => setLoadOverlayOpen(false)}
          onCreateScenePath={handleCreateScenePath}
          onOpenScenePath={handleOpenScenePath}
          onOpenSelectedScene={handleOpenSelectedScene}
          sampleBrowserExpanded={sampleBrowserExpanded}
          sceneInput={sceneInput}
          setSampleBrowserExpanded={setSampleBrowserExpanded}
          setSceneInput={setSceneInput}
        />
      ) : null}

      {diagnosticsOpen && loaded ? (
        <DiagnosticsOverlay
          diagnostics={diagnostics}
          onClose={() => setDiagnosticsOpen(false)}
        />
      ) : null}

      {simulationOverlayOpen && loaded && draftScene ? (
        <SimulationDataOverlay
          browserError={browserError}
          browserListing={browserListing}
          browserLoading={browserLoading}
          channelNames={channelNames}
          expandedFiles={simulationFiles}
          fileErrors={fileErrors}
          onAddSimulationEntry={() => {
            const trimmedEntry = simulationEntryInput.trim();
            if (trimmedEntry.length === 0) {
              return;
            }

            updateDraftScene((scene) => {
              if (!scene.simulationData.includes(trimmedEntry)) {
                scene.simulationData.push(trimmedEntry);
              }
            });
            setSimulationEntryInput('');
          }}
          onBrowse={(path) => {
            void handleBrowse(path);
          }}
          onClose={() => setSimulationOverlayOpen(false)}
          onRemoveSimulationEntry={(entry) => {
            updateDraftScene((scene) => {
              scene.simulationData = scene.simulationData.filter((value) => value !== entry);
            });
          }}
          onSelectBrowserFile={(path) => {
            setSimulationEntryInput(getRelativePath(getBasePath(loaded.scenePath), path));
          }}
          parsedSimulationFiles={parsedSimulationFiles}
          scenePath={loaded.scenePath}
          simulationEntries={draftScene.simulationData}
          simulationEntryInput={simulationEntryInput}
          simulationLoading={simulationLoading}
          setSimulationEntryInput={setSimulationEntryInput}
        />
      ) : null}
    </div>
  );
}
