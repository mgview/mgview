import { FormEvent, useEffect, useMemo, useState } from 'react';
import { listLocalFiles, loadSceneJson, loadTextFile, saveSceneJson, type FileBrowserListing } from './api/localFiles.ts';
import LocalFileBrowser from './components/LocalFileBrowser.tsx';
import ObjectList from './components/ObjectList.tsx';
import SavePreviewPanel from './components/SavePreviewPanel.tsx';
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

function getDirectoryPath(filePath: string): string {
  const basePath = getBasePath(filePath).replace(/\/$/, '');
  return basePath || '.';
}

function isJsonPath(filePath: string): boolean {
  return filePath.toLowerCase().endsWith('.json');
}

function NumericInput({
  value,
  onValueChange,
}: {
  value: number;
  onValueChange: (value: number) => void;
}) {
  const [text, setText] = useState(String(value));

  useEffect(() => {
    setText(String(value));
  }, [value]);

  return (
    <input
      type="text"
      inputMode="decimal"
      value={text}
      onChange={(event) => {
        const nextText = event.target.value;
        setText(nextText);

        if (nextText.trim() === '') {
          return;
        }

        const nextValue = Number(nextText);
        if (Number.isFinite(nextValue)) {
          onValueChange(nextValue);
        }
      }}
      onBlur={() => {
        const nextValue = Number(text);
        if (text.trim() === '' || !Number.isFinite(nextValue)) {
          setText(String(value));
          return;
        }

        setText(String(nextValue));
        onValueChange(nextValue);
      }}
    />
  );
}

function createSavableScene(rawScene: SceneConfig, draftScene: NormalizedSceneConfig): SceneConfig {
  const nextScene = structuredClone(rawScene);

  // This currently saves the editor's explicit normalized scene state back to disk.
  // A future "save minimal" mode could try to preserve omitted/defaulted authoring shape,
  // but that needs careful round-trip rules so we do not drop intentional edits.
  nextScene.name = draftScene.name;
  nextScene.simulationData = [...draftScene.simulationData];
  nextScene.newtonianFrame = draftScene.newtonianFrame;
  nextScene.sceneOrigin = draftScene.sceneOrigin;
  nextScene.showAxes = draftScene.showAxes;
  nextScene.workspaceSize = draftScene.workspaceSize;
  nextScene.cameraParentFrame = draftScene.cameraParentFrame;
  nextScene.cameraUp = draftScene.cameraUp ? [...draftScene.cameraUp] as [number, number, number] : undefined;
  nextScene.cameraEye = draftScene.cameraEye ? [...draftScene.cameraEye] as [number, number, number] : undefined;
  nextScene.cameraFocus = draftScene.cameraFocus ? [...draftScene.cameraFocus] as [number, number, number] : undefined;
  nextScene.speedFactor = draftScene.speedFactor;

  if (!rawScene.objects) {
    return nextScene;
  }

  nextScene.objects = {};
  for (const [objectName, rawObject] of Object.entries(rawScene.objects)) {
    const draftObject = draftScene.objects[objectName];
    if (!draftObject) {
      nextScene.objects[objectName] = structuredClone(rawObject);
      continue;
    }

    nextScene.objects[objectName] = {
      ...structuredClone(rawObject),
      type: draftObject.type,
      rotationFrame: draftObject.rotationFrame,
      visual: draftObject.visual ? structuredClone(draftObject.visual) : undefined,
    };
  }

  return nextScene;
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
  const rawScene = await loadSceneJson(scenePath);
  const basePath = getBasePath(scenePath);
  const simulationFiles = expandSimulationFiles(rawScene.simulationData ?? [], basePath);

  const tables = await Promise.all(
    simulationFiles.map(async (filePath) => {
      return parseSimulationText(await loadTextFile(filePath), filePath);
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
  const [browserListing, setBrowserListing] = useState<FileBrowserListing | null>(null);
  const [browserLoading, setBrowserLoading] = useState(false);
  const [browserError, setBrowserError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [selectedObjectName, setSelectedObjectName] = useState<string | null>(null);
  const [selectedVisualName, setSelectedVisualName] = useState<string | null>(null);
  const [sampleBrowserExpanded, setSampleBrowserExpanded] = useState(false);

  const confirmDiscardLocalEdits = (nextScenePath: string, actionLabel: string): boolean => {
    if (!loaded || !draftScene) {
      return true;
    }

    if (JSON.stringify(draftScene) === JSON.stringify(loaded.scene)) {
      return true;
    }

    return window.confirm(
      `${actionLabel} will discard unsaved local edits for ${loaded.scenePath}.\n\nContinue to ${nextScenePath}?`
    );
  };

  async function handleBrowse(nextPath: string) {
    setBrowserLoading(true);
    setBrowserError(null);

    try {
      setBrowserListing(await listLocalFiles(nextPath));
    } catch (browseError) {
      setBrowserError(browseError instanceof Error ? browseError.message : 'Unknown browse error');
    } finally {
      setBrowserLoading(false);
    }
  }

  async function handleLoad(
    scenePath: string,
    options?: {
      force?: boolean;
      statusMessage?: string;
      actionLabel?: string;
    }
  ) {
    const settings = options ?? {};
    if (!settings.force && !confirmDiscardLocalEdits(scenePath, settings.actionLabel ?? 'Loading another scene')) {
      return false;
    }

    setLoading(true);
    setError(null);
    setSaveMessage(null);

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
      setSaveMessage(settings.statusMessage ?? `Loaded ${scenePath}`);
      void handleBrowse(getDirectoryPath(scenePath));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unknown load error');
      return false;
    } finally {
      setLoading(false);
    }

    return true;
  }

  async function handleReloadFromDisk() {
    if (!loaded) {
      return;
    }

    void handleLoad(loaded.scenePath, {
      force: true,
      statusMessage: `Reloaded ${loaded.scenePath} from disk`,
      actionLabel: 'Reloading from disk',
    });
  }

  async function handleSaveScene() {
    if (!loaded || !draftScene) {
      return;
    }

    setSaving(true);
    setSaveMessage(null);

    try {
      await saveSceneJson(loaded.scenePath, createSavableScene(loaded.rawScene, draftScene));
      const nextLoaded = await loadSceneData(loaded.scenePath);
      setLoaded(nextLoaded);
      setDraftScene(cloneScene(nextLoaded.scene));
      setCurrentTime(nextLoaded.timeline.tInitial);
      setSelectedObjectName(nextLoaded.objectInspections[0]?.name ?? null);
      setSelectedVisualName(nextLoaded.objectInspections[0]?.visuals[0]?.name ?? null);
      setSaveMessage(`Saved changes to ${loaded.scenePath}`);
      void handleBrowse(getDirectoryPath(loaded.scenePath));
    } catch (saveError) {
      setSaveMessage(saveError instanceof Error ? saveError.message : 'Unknown save error');
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    void handleLoad(sceneInput);
  }, []);

  useEffect(() => {
    void handleBrowse(getDirectoryPath(sceneInput));
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
    });
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
      <section className="hero">
        <div className="hero-kicker">Main App</div>
        <h1>MGView Scene Inspector</h1>
        <p>
          This route is now the richer inspector-oriented app. It still uses the same extracted
          core and local scene files, but it now has local editable scene state on top of the
          normalized model, and it can browse and save scene JSON back through the local server.
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

        <div className="hero-actions">
          <button
            type="button"
            className="secondary-button"
            onClick={() => void handleBrowse(getDirectoryPath(sceneInput))}
            disabled={browserLoading}
          >
            Browse Scene Folder
          </button>
          <button
            type="button"
            className="secondary-button"
            onClick={() => void handleBrowse('..')}
            disabled={browserLoading}
          >
            Browse Workspace Root
          </button>
          <button
            type="button"
            className="secondary-button"
            onClick={() =>
              void handleLoad(sceneInput, {
                actionLabel: 'Opening a scene from the selected path',
              })
            }
            disabled={loading || !isJsonPath(sceneInput)}
          >
            Open Selected Path
          </button>
        </div>

        <div className="hero-links">
          <a href={`${getAppBasePath()}/simple` || '/simple'}>Open Simple App</a>
        </div>

        {loaded ? (
          <div className="status">
            Current scene target: <code>{loaded.scenePath}</code>
          </div>
        ) : null}

        {hasLocalEdits ? (
          <div className="status">Local inspector edits are active and not yet saved back to files.</div>
        ) : null}
        {saveMessage ? <div className={`status ${saveMessage.startsWith('Saved ') ? 'success' : 'error'}`}>{saveMessage}</div> : null}
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
                <label>Scene Folder</label>
                <div className="inline-tags">
                  <code>{getDirectoryPath(loaded.scenePath)}</code>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => void handleBrowse(getDirectoryPath(loaded.scenePath))}
                  >
                    Browse Here
                  </button>
                </div>
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
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => void handleSaveScene()}
                    disabled={!hasLocalEdits || saving}
                  >
                    {saving ? 'Saving…' : 'Save Scene JSON'}
                  </button>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => void handleReloadFromDisk()}
                    disabled={loading || saving || !loaded}
                  >
                    Reload From Disk
                  </button>
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
                  <NumericInput
                    value={activeScene.workspaceSize}
                    onValueChange={(nextValue) => {
                      updateDraftScene((scene) => {
                        scene.workspaceSize = nextValue;
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
                  <NumericInput
                    value={activeScene.cameraUp?.[0] ?? 0}
                    onValueChange={(nextValue) => {
                      updateSceneVector('cameraUp', 0, nextValue, [0, 0, 1]);
                    }}
                  />
                </label>
                <label className="editor-field">
                  <span>Camera Up Y</span>
                  <NumericInput
                    value={activeScene.cameraUp?.[1] ?? 0}
                    onValueChange={(nextValue) => {
                      updateSceneVector('cameraUp', 1, nextValue, [0, 0, 1]);
                    }}
                  />
                </label>
                <label className="editor-field">
                  <span>Camera Up Z</span>
                  <NumericInput
                    value={activeScene.cameraUp?.[2] ?? 1}
                    onValueChange={(nextValue) => {
                      updateSceneVector('cameraUp', 2, nextValue, [0, 0, 1]);
                    }}
                  />
                </label>
                <label className="editor-field">
                  <span>Speed Factor</span>
                  <NumericInput
                    value={activeScene.speedFactor ?? 1}
                    onValueChange={(nextValue) => {
                      updateDraftScene((scene) => {
                        scene.speedFactor = nextValue;
                      });
                    }}
                  />
                </label>
                <label className="editor-field">
                  <span>Camera Eye X</span>
                  <NumericInput
                    value={activeScene.cameraEye?.[0] ?? 0}
                    onValueChange={(nextValue) => {
                      updateSceneVector('cameraEye', 0, nextValue, [0, 0, 10]);
                    }}
                  />
                </label>
                <label className="editor-field">
                  <span>Camera Eye Y</span>
                  <NumericInput
                    value={activeScene.cameraEye?.[1] ?? 0}
                    onValueChange={(nextValue) => {
                      updateSceneVector('cameraEye', 1, nextValue, [0, 0, 10]);
                    }}
                  />
                </label>
                <label className="editor-field">
                  <span>Camera Eye Z</span>
                  <NumericInput
                    value={activeScene.cameraEye?.[2] ?? 10}
                    onValueChange={(nextValue) => {
                      updateSceneVector('cameraEye', 2, nextValue, [0, 0, 10]);
                    }}
                  />
                </label>
                <label className="editor-field">
                  <span>Camera Focus X</span>
                  <NumericInput
                    value={activeScene.cameraFocus?.[0] ?? 0}
                    onValueChange={(nextValue) => {
                      updateSceneVector('cameraFocus', 0, nextValue, [0, 0, 0]);
                    }}
                  />
                </label>
                <label className="editor-field">
                  <span>Camera Focus Y</span>
                  <NumericInput
                    value={activeScene.cameraFocus?.[1] ?? 0}
                    onValueChange={(nextValue) => {
                      updateSceneVector('cameraFocus', 1, nextValue, [0, 0, 0]);
                    }}
                  />
                </label>
                <label className="editor-field">
                  <span>Camera Focus Z</span>
                  <NumericInput
                    value={activeScene.cameraFocus?.[2] ?? 0}
                    onValueChange={(nextValue) => {
                      updateSceneVector('cameraFocus', 2, nextValue, [0, 0, 0]);
                    }}
                  />
                </label>
              </div>
            ) : (
              <div className="empty-state">Load a scene to edit scene-level settings.</div>
            )}
          </section>

          <ObjectList
            entries={activeObjectInspections}
            selectedObjectName={selectedObject?.name ?? null}
            onSelectObject={(objectName, firstVisualName) => {
              setSelectedObjectName(objectName);
              setSelectedVisualName(firstVisualName);
            }}
          />

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
                      <NumericInput
                        value={selectedVisual.position?.x ?? 0}
                        onValueChange={(nextValue) => {
                          updateSelectedVisual((visual) => {
                            visual.position = { ...(visual.position ?? { x: 0, y: 0, z: 0 }), x: nextValue };
                          });
                        }}
                      />
                    </label>
                    <label className="editor-field">
                      <span>Position Y</span>
                      <NumericInput
                        value={selectedVisual.position?.y ?? 0}
                        onValueChange={(nextValue) => {
                          updateSelectedVisual((visual) => {
                            visual.position = { ...(visual.position ?? { x: 0, y: 0, z: 0 }), y: nextValue };
                          });
                        }}
                      />
                    </label>
                    <label className="editor-field">
                      <span>Position Z</span>
                      <NumericInput
                        value={selectedVisual.position?.z ?? 0}
                        onValueChange={(nextValue) => {
                          updateSelectedVisual((visual) => {
                            visual.position = { ...(visual.position ?? { x: 0, y: 0, z: 0 }), z: nextValue };
                          });
                        }}
                      />
                    </label>
                    <label className="editor-field">
                      <span>Rotation X</span>
                      <NumericInput
                        value={selectedVisual.rotation?.x ?? 0}
                        onValueChange={(nextValue) => {
                          updateSelectedVisual((visual) => {
                            visual.rotation = { ...(visual.rotation ?? { x: 0, y: 0, z: 0 }), x: nextValue };
                          });
                        }}
                      />
                    </label>
                    <label className="editor-field">
                      <span>Rotation Y</span>
                      <NumericInput
                        value={selectedVisual.rotation?.y ?? 0}
                        onValueChange={(nextValue) => {
                          updateSelectedVisual((visual) => {
                            visual.rotation = { ...(visual.rotation ?? { x: 0, y: 0, z: 0 }), y: nextValue };
                          });
                        }}
                      />
                    </label>
                    <label className="editor-field">
                      <span>Rotation Z</span>
                      <NumericInput
                        value={selectedVisual.rotation?.z ?? 0}
                        onValueChange={(nextValue) => {
                          updateSelectedVisual((visual) => {
                            visual.rotation = { ...(visual.rotation ?? { x: 0, y: 0, z: 0 }), z: nextValue };
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
                            <NumericInput
                              value={value}
                              onValueChange={(nextValue) => {
                                updateSelectedVisual((visual) => {
                                  visual[key] = nextValue;
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

          <LocalFileBrowser
            browserListing={browserListing}
            browserError={browserError}
            browserLoading={browserLoading}
            sceneInput={sceneInput}
            onBrowse={(path) => {
              void handleBrowse(path);
            }}
            onSelectFile={(path, isSceneFile) => {
              setSceneInput(path);
              if (isSceneFile) {
                void handleLoad(path, {
                  actionLabel: 'Opening a scene from the local file browser',
                });
              }
            }}
            getDirectoryPath={getDirectoryPath}
          />

          <section className="panel span-8">
            <div className="panel-header">
              <div>
                <h2>Built-in Sample Shortcuts</h2>
                <p className="panel-subtitle">
                  Quick-open shortcuts for a few bundled examples. The full filesystem view is above.
                </p>
              </div>
              <button
                type="button"
                className="secondary-button"
                onClick={() => setSampleBrowserExpanded((current) => !current)}
              >
                {sampleBrowserExpanded ? 'Hide Shortcuts' : 'Show Shortcuts'}
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
                            void handleLoad(sample.path, {
                              actionLabel: 'Opening a built-in sample shortcut',
                            });
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
              <div className="empty-state">
                Built-in sample shortcuts are hidden. Use the button above if you want quick access to bundled examples.
              </div>
            )}
          </section>

          <SavePreviewPanel
            scenePath={loaded.scenePath}
            hasLocalEdits={hasLocalEdits}
            savePreview={savePreview}
          />

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
