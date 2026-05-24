import { FormEvent, useEffect, useMemo, useState } from 'react';
import { expandSimulationFiles } from './core/expandSimulationFiles.ts';
import { getBasePath } from './core/pathUtils.ts';
import { parseSimulationText } from './core/parseSimulationText.ts';
import { createSceneDocument } from './core/sceneDocument.ts';
import { buildObjectInspections, collectSceneDiagnostics } from './core/sceneInspector.ts';
import { buildTimeline, getFrameAtTime } from './core/timeline.ts';
import type {
  NormalizedSceneConfig,
  SceneConfig,
  SceneDiagnostic,
  SceneObjectInspection,
  SceneVisual,
  Timeline,
} from './core/types.ts';

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

interface LoadedSceneData {
  rawScene: SceneConfig;
  scenePath: string;
  scene: NormalizedSceneConfig;
  simulationFiles: string[];
  timeline: Timeline;
  channelNames: string[];
  diagnostics: SceneDiagnostic[];
  objectInspections: SceneObjectInspection[];
}

type EditableScalarKey =
  | 'text'
  | 'path'
  | 'scale'
  | 'radius'
  | 'radius1'
  | 'radius2'
  | 'length'
  | 'thickness'
  | 'capped';

function formatNumber(value: number): string {
  if (!Number.isFinite(value)) {
    return 'n/a';
  }

  if (Math.abs(value) >= 1000 || (Math.abs(value) > 0 && Math.abs(value) < 0.001)) {
    return value.toExponential(3);
  }

  return value.toFixed(4).replace(/\.?0+$/, '');
}

function formatVector(value: { x: number; y: number; z: number } | null): string {
  if (!value) {
    return 'n/a';
  }

  return `${formatNumber(value.x)}, ${formatNumber(value.y)}, ${formatNumber(value.z)}`;
}

function getScenePathFromUrl(): string {
  const params = new URLSearchParams(window.location.search);
  return params.get('scene') ?? DEFAULT_SCENE_PATH;
}

function getServerRootPrefix(): string {
  return window.location.pathname.startsWith('/MGView/') ? '/MGView/' : '/';
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

function cloneScene(scene: NormalizedSceneConfig): NormalizedSceneConfig {
  return structuredClone(scene);
}

function getEditableScalarKeys(visual: SceneVisual): EditableScalarKey[] {
  const orderedKeys: EditableScalarKey[] = [
    'text',
    'path',
    'scale',
    'radius',
    'radius1',
    'radius2',
    'length',
    'thickness',
    'capped',
  ];

  return orderedKeys.filter((key) => visual[key] !== undefined);
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

async function loadSceneData(scenePath: string): Promise<LoadedSceneData> {
  const sceneResponse = await fetch(`${getServerRootPrefix()}${scenePath}`);
  if (!sceneResponse.ok) {
    throw new Error(`Could not load scene file: ${scenePath}`);
  }

  const rawScene = (await sceneResponse.json()) as SceneConfig;
  const basePath = getBasePath(scenePath);
  const simulationFiles = expandSimulationFiles(rawScene.simulationData ?? [], basePath);

  const tables = await Promise.all(
    simulationFiles.map(async (filePath) => {
      const response = await fetch(`${getServerRootPrefix()}${filePath}`);
      if (!response.ok) {
        throw new Error(`Could not load simulation file: ${filePath}`);
      }
      return parseSimulationText(await response.text(), filePath);
    })
  );

  const channelNames = [...new Set(tables.flatMap((table) => table.channelNames))];
  const scene = createSceneDocument(rawScene, channelNames);
  const diagnostics = collectSceneDiagnostics(rawScene, scene, simulationFiles, channelNames);
  const objectInspections = buildObjectInspections(rawScene, scene);
  const timeline = buildTimeline(tables);

  return {
    rawScene,
    scenePath,
    scene,
    simulationFiles,
    timeline,
    channelNames,
    diagnostics,
    objectInspections,
  };
}

export default function App() {
  const [sceneInput, setSceneInput] = useState(getScenePathFromUrl);
  const [loaded, setLoaded] = useState<LoadedSceneData | null>(null);
  const [draftScene, setDraftScene] = useState<NormalizedSceneConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [selectedObjectName, setSelectedObjectName] = useState<string | null>(null);
  const [selectedVisualName, setSelectedVisualName] = useState<string | null>(null);

  async function handleLoad(scenePath: string) {
    setLoading(true);
    setError(null);

    try {
      const nextLoaded = await loadSceneData(scenePath);
      setLoaded(nextLoaded);
      setDraftScene(cloneScene(nextLoaded.scene));
      setCurrentTime(nextLoaded.timeline.tInitial);
      setSelectedObjectName(nextLoaded.objectInspections[0]?.name ?? null);
      setSelectedVisualName(nextLoaded.objectInspections[0]?.visuals[0]?.name ?? null);
      const url = new URL(window.location.href);
      url.searchParams.set('scene', scenePath);
      window.history.replaceState({}, '', url);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unknown load error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void handleLoad(sceneInput);
  }, []);

  const activeScene = draftScene ?? loaded?.scene ?? null;
  const activeObjectInspections = useMemo(() => {
    if (!loaded || !activeScene) {
      return [];
    }
    return buildObjectInspections(loaded.rawScene, activeScene);
  }, [loaded, activeScene]);

  const hasLocalEdits =
    loaded !== null &&
    draftScene !== null &&
    JSON.stringify(draftScene) !== JSON.stringify(loaded.scene);

  const currentFrame = useMemo(() => {
    if (!loaded) {
      return undefined;
    }
    return getFrameAtTime(loaded.timeline, currentTime);
  }, [loaded, currentTime]);

  const selectedObject = useMemo(() => {
    if (!activeObjectInspections.length) {
      return undefined;
    }

    return (
      activeObjectInspections.find((entry) => entry.name === selectedObjectName) ??
      activeObjectInspections[0]
    );
  }, [activeObjectInspections, selectedObjectName]);

  const selectedVisual = useMemo(() => {
    if (!selectedObject) {
      return undefined;
    }

    return (
      selectedObject.visuals.find((entry) => entry.name === selectedVisualName) ??
      selectedObject.visuals[0]
    );
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

  const previewEntries = useMemo(() => {
    return Object.entries(currentFrame?.frame.data ?? {}).slice(0, PREVIEW_CHANNEL_COUNT);
  }, [currentFrame]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void handleLoad(sceneInput);
  };

  const updateDraftScene = (updater: (scene: NormalizedSceneConfig) => void) => {
    setDraftScene((currentDraft) => {
      if (!currentDraft) {
        return currentDraft;
      }

      const nextDraft = cloneScene(currentDraft);
      updater(nextDraft);
      return nextDraft;
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

      const nextDraft = cloneScene(currentDraft);
      const visual = nextDraft.objects[selectedObject.name]?.visual?.[selectedVisual.name];
      if (!visual) {
        return currentDraft;
      }

      updater(visual);
      return nextDraft;
    });
  };

  const resetDraftScene = () => {
    if (!loaded) {
      return;
    }
    setDraftScene(cloneScene(loaded.scene));
  };

  const groupedSamples = useMemo(() => sampleGroups(), []);

  const liveSelectedVisual =
    selectedObject && selectedVisual && activeScene
      ? activeScene.objects[selectedObject.name]?.visual?.[selectedVisual.name]
      : undefined;

  return (
    <div className="app-shell">
      <section className="hero">
        <div className="hero-kicker">Main App</div>
        <h1>MGView Scene Inspector</h1>
        <p>
          This route is now the richer inspector-oriented app. It still uses the same extracted
          core and local scene files, but it now has local editable scene state on top of the
          normalized model, without touching file persistence or the renderer yet.
        </p>

        <form className="loader-form" onSubmit={handleSubmit}>
          <input
            type="text"
            value={sceneInput}
            onChange={(event) => setSceneInput(event.target.value)}
            aria-label="Scene path"
          />
          <button type="submit" disabled={loading}>
            {loading ? 'Loading…' : 'Inspect Scene'}
          </button>
        </form>

        <div className="hero-links">
          <a href={`${getAppBasePath()}/simple` || '/simple'}>Open Simple App</a>
        </div>

        {hasLocalEdits ? (
          <div className="status">Local inspector edits are active and not yet saved back to files.</div>
        ) : null}
        {error ? <div className="status error">{error}</div> : null}
        {!error && loading ? <div className="status">Loading scene, simulation files, and diagnostics…</div> : null}
      </section>

      {loaded ? (
        <div className="panel-grid inspector-grid">
          <section className="panel span-12">
            <h2>Diagnostics</h2>
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

          <section className="panel span-4">
            <h2>Overview</h2>
            <div className="stat-grid">
              <div className="stat-card">
                <label>Scene</label>
                <strong>{activeScene?.name ?? loaded.scene.name ?? '(unnamed)'}</strong>
              </div>
              <div className="stat-card">
                <label>Objects</label>
                <strong>{activeObjectInspections.length}</strong>
              </div>
              <div className="stat-card">
                <label>Visuals</label>
                <strong>{activeObjectInspections.reduce((sum, entry) => sum + entry.visualCount, 0)}</strong>
              </div>
              <div className="stat-card">
                <label>Channels</label>
                <strong>{loaded.channelNames.length}</strong>
              </div>
            </div>

            <div className="stacked-meta">
              <div className="meta-row">
                <label>Scene Path</label>
                <code>{loaded.scenePath}</code>
              </div>
              <div className="meta-row">
                <label>Newtonian Frame</label>
                <code>{activeScene?.newtonianFrame ?? loaded.scene.newtonianFrame}</code>
              </div>
              <div className="meta-row">
                <label>Camera Parent</label>
                <code>{activeScene?.cameraParentFrame ?? loaded.scene.cameraParentFrame}</code>
              </div>
              <div className="meta-row">
                <label>Simulation Specs</label>
                <code>{(loaded.rawScene.simulationData ?? []).join(', ') || '(none)'}</code>
              </div>
              <div className="meta-row">
                <label>Draft State</label>
                <div className="inline-tags">
                  <span className={`tag ${hasLocalEdits ? 'tag-accent' : ''}`}>
                    {hasLocalEdits ? 'edited locally' : 'matches loaded scene'}
                  </span>
                  <button type="button" className="secondary-button" onClick={resetDraftScene}>
                    Reset Draft
                  </button>
                </div>
              </div>
            </div>
          </section>

          <section className="panel span-8">
            <h2>Scene Settings</h2>
            {activeScene ? (
              <div className="editor-grid">
                <label className="editor-field">
                  <span>Scene Name</span>
                  <input
                    type="text"
                    value={activeScene.name ?? ''}
                    onChange={(event) => {
                      updateDraftScene((scene) => {
                        scene.name = event.target.value;
                      });
                    }}
                  />
                </label>
                <label className="editor-field">
                  <span>Workspace Size</span>
                  <input
                    type="number"
                    value={activeScene.workspaceSize}
                    onChange={(event) => {
                      updateDraftScene((scene) => {
                        scene.workspaceSize = Number(event.target.value);
                      });
                    }}
                  />
                </label>
                <label className="editor-field editor-field-checkbox">
                  <span>Show Axes</span>
                  <input
                    type="checkbox"
                    checked={activeScene.showAxes}
                    onChange={(event) => {
                      updateDraftScene((scene) => {
                        scene.showAxes = event.target.checked;
                      });
                    }}
                  />
                </label>
                <label className="editor-field">
                  <span>Camera Parent Frame</span>
                  <input
                    type="text"
                    value={activeScene.cameraParentFrame}
                    onChange={(event) => {
                      updateDraftScene((scene) => {
                        scene.cameraParentFrame = event.target.value;
                      });
                    }}
                  />
                </label>
                <label className="editor-field">
                  <span>Camera Up X</span>
                  <input
                    type="number"
                    value={activeScene.cameraUp?.[0] ?? 0}
                    onChange={(event) => {
                      updateDraftScene((scene) => {
                        const current = scene.cameraUp ?? [0, 0, 1];
                        scene.cameraUp = [Number(event.target.value), current[1], current[2]];
                      });
                    }}
                  />
                </label>
                <label className="editor-field">
                  <span>Camera Up Y</span>
                  <input
                    type="number"
                    value={activeScene.cameraUp?.[1] ?? 0}
                    onChange={(event) => {
                      updateDraftScene((scene) => {
                        const current = scene.cameraUp ?? [0, 0, 1];
                        scene.cameraUp = [current[0], Number(event.target.value), current[2]];
                      });
                    }}
                  />
                </label>
                <label className="editor-field">
                  <span>Camera Up Z</span>
                  <input
                    type="number"
                    value={activeScene.cameraUp?.[2] ?? 1}
                    onChange={(event) => {
                      updateDraftScene((scene) => {
                        const current = scene.cameraUp ?? [0, 0, 1];
                        scene.cameraUp = [current[0], current[1], Number(event.target.value)];
                      });
                    }}
                  />
                </label>
                <label className="editor-field">
                  <span>Speed Factor</span>
                  <input
                    type="number"
                    value={activeScene.speedFactor ?? 1}
                    onChange={(event) => {
                      updateDraftScene((scene) => {
                        scene.speedFactor = Number(event.target.value);
                      });
                    }}
                  />
                </label>
                <label className="editor-field">
                  <span>Camera Eye</span>
                  <input type="text" value={(activeScene.cameraEye ?? []).join(', ')} readOnly />
                </label>
                <label className="editor-field">
                  <span>Camera Focus</span>
                  <input type="text" value={(activeScene.cameraFocus ?? []).join(', ')} readOnly />
                </label>
              </div>
            ) : (
              <div className="empty-state">Load a scene to edit scene-level settings.</div>
            )}
          </section>

          <section className="panel span-4">
            <h2>Objects</h2>
            <div className="inspector-list">
              {activeObjectInspections.map((entry) => (
                <button
                  key={entry.name}
                  type="button"
                  className={`inspector-item ${selectedObject?.name === entry.name ? 'inspector-item-active' : ''}`}
                  onClick={() => {
                    setSelectedObjectName(entry.name);
                    setSelectedVisualName(entry.visuals[0]?.name ?? null);
                  }}
                >
                  <span className="inspector-item-top">
                    <code>{entry.name}</code>
                    <strong>{entry.type}</strong>
                  </span>
                  <span className="inspector-item-bottom">
                    <span>{entry.visualCount} visual{entry.visualCount === 1 ? '' : 's'}</span>
                    {entry.inferred ? <span className="tag tag-accent">inferred</span> : null}
                  </span>
                </button>
              ))}
            </div>
          </section>

          <section className="panel span-4">
            <h2>Selected Object</h2>
            {selectedObject ? (
              <>
                <div className="selected-header">
                  <code>{selectedObject.name}</code>
                  <span className="tag">{selectedObject.type}</span>
                </div>
                <div className="stacked-meta">
                  <div className="meta-row">
                    <label>Rotation Frame</label>
                    <code>{selectedObject.rotationFrame ?? '(none)'}</code>
                  </div>
                  <div className="meta-row">
                    <label>Selected Visual</label>
                    <div className="inline-tags">
                      {selectedObject.visuals.map((visual) => (
                        <button
                          key={visual.name}
                          type="button"
                          className={`tag-button ${selectedVisual?.name === visual.name ? 'tag-button-active' : ''}`}
                          onClick={() => setSelectedVisualName(visual.name)}
                        >
                          {visual.name}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="meta-row">
                    <label>Inspector Tags</label>
                    <div className="inline-tags">
                      {selectedObject.tags.length > 0 ? (
                        selectedObject.tags.map((tag) => (
                          <span key={tag} className="tag tag-accent">
                            {tag}
                          </span>
                        ))
                      ) : (
                        <span className="tag">none</span>
                      )}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="empty-state">Select an object to inspect its visuals.</div>
            )}
          </section>

          <section className="panel span-8">
            <h2>Visual Editor</h2>
            {selectedObject && selectedVisual && liveSelectedVisual ? (
              <div className="visual-card-list">
                <div className="visual-card">
                  <div className="visual-card-header">
                    <code>{selectedVisual.name}</code>
                    <div className="inline-tags">
                      <span className="tag">{selectedVisual.type ?? 'unknown'}</span>
                      <span className="tag">{selectedVisual.visible ? 'visible' : 'hidden'}</span>
                    </div>
                  </div>

                  <div className="editor-grid">
                    <label className="editor-field editor-field-checkbox">
                      <span>Visible</span>
                      <input
                        type="checkbox"
                        checked={selectedVisual.visible}
                        onChange={(event) => {
                          updateSelectedVisual((visual) => {
                            visual.visible = event.target.checked;
                          });
                        }}
                      />
                    </label>
                    <label className="editor-field">
                      <span>Material</span>
                      <input
                        type="text"
                        value={selectedVisual.materialName ?? ''}
                        onChange={(event) => {
                          updateSelectedVisual((visual) => {
                            visual.material = {
                              ...(visual.material ?? { name: '' }),
                              name: event.target.value,
                            };
                          });
                        }}
                      />
                    </label>
                    <label className="editor-field">
                      <span>Position X</span>
                      <input
                        type="number"
                        value={selectedVisual.position?.x ?? 0}
                        onChange={(event) => {
                          updateSelectedVisual((visual) => {
                            visual.position = { ...(visual.position ?? { x: 0, y: 0, z: 0 }), x: Number(event.target.value) };
                          });
                        }}
                      />
                    </label>
                    <label className="editor-field">
                      <span>Position Y</span>
                      <input
                        type="number"
                        value={selectedVisual.position?.y ?? 0}
                        onChange={(event) => {
                          updateSelectedVisual((visual) => {
                            visual.position = { ...(visual.position ?? { x: 0, y: 0, z: 0 }), y: Number(event.target.value) };
                          });
                        }}
                      />
                    </label>
                    <label className="editor-field">
                      <span>Position Z</span>
                      <input
                        type="number"
                        value={selectedVisual.position?.z ?? 0}
                        onChange={(event) => {
                          updateSelectedVisual((visual) => {
                            visual.position = { ...(visual.position ?? { x: 0, y: 0, z: 0 }), z: Number(event.target.value) };
                          });
                        }}
                      />
                    </label>
                    <label className="editor-field">
                      <span>Rotation X</span>
                      <input
                        type="number"
                        value={selectedVisual.rotation?.x ?? 0}
                        onChange={(event) => {
                          updateSelectedVisual((visual) => {
                            visual.rotation = { ...(visual.rotation ?? { x: 0, y: 0, z: 0 }), x: Number(event.target.value) };
                          });
                        }}
                      />
                    </label>
                    <label className="editor-field">
                      <span>Rotation Y</span>
                      <input
                        type="number"
                        value={selectedVisual.rotation?.y ?? 0}
                        onChange={(event) => {
                          updateSelectedVisual((visual) => {
                            visual.rotation = { ...(visual.rotation ?? { x: 0, y: 0, z: 0 }), y: Number(event.target.value) };
                          });
                        }}
                      />
                    </label>
                    <label className="editor-field">
                      <span>Rotation Z</span>
                      <input
                        type="number"
                        value={selectedVisual.rotation?.z ?? 0}
                        onChange={(event) => {
                          updateSelectedVisual((visual) => {
                            visual.rotation = { ...(visual.rotation ?? { x: 0, y: 0, z: 0 }), z: Number(event.target.value) };
                          });
                        }}
                      />
                    </label>

                    {getEditableScalarKeys(liveSelectedVisual).map((key) => {
                      const value = liveSelectedVisual[key];

                      if (typeof value === 'boolean') {
                        return (
                          <label key={key} className="editor-field editor-field-checkbox">
                            <span>{key}</span>
                            <input
                              type="checkbox"
                              checked={value}
                              onChange={(event) => {
                                updateSelectedVisual((visual) => {
                                  visual[key] = event.target.checked;
                                });
                              }}
                            />
                          </label>
                        );
                      }

                      if (typeof value === 'number') {
                        return (
                          <label key={key} className="editor-field">
                            <span>{key}</span>
                            <input
                              type="number"
                              value={value}
                              onChange={(event) => {
                                updateSelectedVisual((visual) => {
                                  visual[key] = Number(event.target.value);
                                });
                              }}
                            />
                          </label>
                        );
                      }

                      if (typeof value === 'string') {
                        return (
                          <label key={key} className="editor-field">
                            <span>{key}</span>
                            <input
                              type="text"
                              value={value}
                              onChange={(event) => {
                                updateSelectedVisual((visual) => {
                                  visual[key] = event.target.value;
                                });
                              }}
                            />
                          </label>
                        );
                      }

                      return null;
                    })}
                  </div>

                  <div className="meta-list visual-meta">
                    <div>
                      <label>Material</label>
                      <code>{selectedVisual.materialName ?? '(none)'}</code>
                    </div>
                    <div>
                      <label>Position</label>
                      <code>{formatVector(selectedVisual.position)}</code>
                    </div>
                    <div>
                      <label>Rotation</label>
                      <code>{formatVector(selectedVisual.rotation)}</code>
                    </div>
                    <div>
                      <label>Tags</label>
                      <div className="inline-tags">
                        {selectedVisual.tags.length > 0 ? (
                          selectedVisual.tags.map((tag) => (
                            <span key={tag} className="tag tag-soft">
                              {tag}
                            </span>
                          ))
                        ) : (
                          <span className="tag">none</span>
                        )}
                      </div>
                    </div>
                    <div className="property-block">
                      <label>Geometry Properties</label>
                      <div className="property-list">
                        {selectedVisual.propertySummary.length > 0 ? (
                          selectedVisual.propertySummary.map((property) => (
                            <div key={property.key} className="property-item">
                              <span>{property.key}</span>
                              <code>{property.value}</code>
                            </div>
                          ))
                        ) : (
                          <div className="property-item">
                            <span>properties</span>
                            <code>none</code>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="empty-state">Select an object and visual to edit its draft scene state.</div>
            )}
          </section>

          <section className="panel span-4">
            <h2>Simulation Files</h2>
            <div className="pill-list">
              {loaded.simulationFiles.map((filePath) => (
                <span key={filePath} className="pill">
                  <code>{filePath}</code>
                </span>
              ))}
            </div>
          </section>

          <section className="panel span-8">
            <h2>Sample Browser</h2>
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
                          void handleLoad(sample.path);
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
          </section>

          <section className="panel span-6">
            <h2>Timeline</h2>
            <div className="meta-list">
              <div>
                <label>Start</label>
                <code>{formatNumber(loaded.timeline.tInitial)}</code>
              </div>
              <div>
                <label>End</label>
                <code>{formatNumber(loaded.timeline.tFinal)}</code>
              </div>
              <div>
                <label>Step</label>
                <code>{formatNumber(loaded.timeline.tStep)}</code>
              </div>
              <div>
                <label>Current Time</label>
                <code>{formatNumber(currentFrame?.frame.time ?? loaded.timeline.tInitial)}</code>
              </div>
            </div>

            <div className="scrubber-meta">
              <span>Current frame preview</span>
              <span>{currentFrame?.tFinalExceeded ? 'clamped to final frame' : 'in range'}</span>
            </div>
            <input
              type="range"
              min={loaded.timeline.tInitial}
              max={loaded.timeline.tFinal}
              step={loaded.timeline.tStep || 0.001}
              value={currentTime}
              onChange={(event) => setCurrentTime(Number(event.target.value))}
            />
          </section>

          <section className="panel span-6">
            <h2>Channel Preview</h2>
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
        </div>
      ) : null}
    </div>
  );
}
