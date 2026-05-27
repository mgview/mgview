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
import { createSavableScene, useSceneWorkspace } from './hooks/useSceneWorkspace.ts';
import type { SceneVisual, VisualType } from './core/types.ts';
import { createDefaultVisual } from './components/editorShared.tsx';

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

export default function App() {
  const workspace = useSceneWorkspace(getScenePathFromUrl());
  const [loadOverlayOpen, setLoadOverlayOpen] = useState(false);
  const [diagnosticsOpen, setDiagnosticsOpen] = useState(false);
  const [simulationOverlayOpen, setSimulationOverlayOpen] = useState(false);
  const [simulationEntryInput, setSimulationEntryInput] = useState('');
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

  const playbackSpeed = activeScene?.speedFactor ?? loaded?.scene.speedFactor ?? 1;
  const playback = usePlaybackController(loaded ? timeline : null, playbackSpeed);

  const currentFrame = useMemo(() => {
    if (!loaded) {
      return undefined;
    }
    return getFrameAtTime(timeline, playback.currentTime);
  }, [loaded, playback.currentTime, timeline]);

  const selectedObject = useMemo(() => {
    if (!objectInspections.length) {
      return undefined;
    }

    return objectInspections.find((entry) => entry.name === selectedObjectName) ?? objectInspections[0];
  }, [objectInspections, selectedObjectName]);

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

    updateDraftScene((scene) => {
      const visual = scene.objects[selectedObject.name]?.visual?.[selectedVisual.name];
      if (!visual) {
        return;
      }

      updater(visual);
    });
  };

  const updateSelectedObject = (
    updater: (sceneObject: NonNullable<NonNullable<typeof draftScene>['objects'][string]>) => void
  ) => {
    if (!draftScene || !selectedObject?.name) {
      return;
    }

    updateDraftScene((scene) => {
      const sceneObject = scene.objects[selectedObject.name];
      if (!sceneObject) {
        return;
      }

      updater(sceneObject);
    });
  };

  const createVisual = (type: VisualType) => {
    if (!draftScene || !selectedObject?.name) {
      return false;
    }

    const existingNames = new Set(
      Object.keys(draftScene.objects[selectedObject.name]?.visual ?? {})
    );
    let nextIndex = 1;
    let nextName = `visual_${nextIndex}`;
    while (existingNames.has(nextName)) {
      nextIndex += 1;
      nextName = `visual_${nextIndex}`;
    }

    updateDraftScene((scene) => {
      const sceneObject = scene.objects[selectedObject.name];
      if (!sceneObject) {
        return;
      }

      sceneObject.visual ??= {};
      sceneObject.visual[nextName] = createDefaultVisual(type, undefined, scene.workspaceSize);
    });
    setSelectedVisualName(nextName);
    return true;
  };

  const renameVisual = (currentName: string, nextName: string) => {
    const trimmedName = nextName.trim();
    if (!draftScene || !selectedObject?.name || trimmedName.length === 0 || currentName === trimmedName) {
      return currentName === trimmedName;
    }

    if (draftScene.objects[selectedObject.name]?.visual?.[trimmedName]) {
      return false;
    }

    updateDraftScene((scene) => {
      const sceneObject = scene.objects[selectedObject.name];
      const visuals = sceneObject?.visual;
      const visual = visuals?.[currentName];
      if (!sceneObject || !visuals || !visual) {
        return;
      }

      const reorderedEntries = Object.entries(visuals).map(([name, entry]) =>
        name === currentName ? [trimmedName, entry] : [name, entry]
      );
      sceneObject.visual = Object.fromEntries(reorderedEntries);
    });
    setSelectedVisualName(trimmedName);
    return true;
  };

  const deleteSelectedVisual = () => {
    if (!draftScene || !selectedObject?.name || !selectedVisual?.name) {
      return false;
    }

    const remainingVisualNames = selectedObject.visuals
      .map((visual) => visual.name)
      .filter((name) => name !== selectedVisual.name);

    updateDraftScene((scene) => {
      const sceneObject = scene.objects[selectedObject.name];
      if (!sceneObject?.visual?.[selectedVisual.name]) {
        return;
      }

      delete sceneObject.visual[selectedVisual.name];
    });
    setSelectedVisualName(remainingVisualNames[0] ?? null);
    return true;
  };

  const changeSelectedVisualType = (type: VisualType) => {
    if (!draftScene || !selectedObject?.name || !selectedVisual?.name) {
      return;
    }

    updateSelectedVisual((visual) => {
      const nextVisual = createDefaultVisual(type, visual.material, draftScene.workspaceSize);
      nextVisual.visible = visual.visible ?? true;
      nextVisual.position = visual.position ? { ...visual.position } : nextVisual.position;
      nextVisual.rotation = visual.rotation ? { ...visual.rotation } : nextVisual.rotation;
      nextVisual.material = visual.material ?? nextVisual.material;
      Object.keys(visual).forEach((key) => {
        delete visual[key];
      });
      Object.assign(visual, nextVisual);
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
            className={`workspace-shell ${leftSidebarCollapsed ? 'workspace-shell-left-collapsed' : ''} ${
              rightDrawerCollapsed ? 'workspace-shell-right-collapsed' : ''
            }`}
          >
            {!leftSidebarCollapsed ? (
              <div className="workspace-sidebar">
                <div className="workspace-pane-scroll">
                  {loaded ? (
                    <ObjectList
                      entries={objectInspections}
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
