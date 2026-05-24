import { FormEvent, useEffect, useMemo, useState } from 'react';
import { loadSceneJson, loadTextFile } from './api/localFiles.ts';
import { expandSimulationFiles } from './core/expandSimulationFiles.ts';
import { getBasePath } from './core/pathUtils.ts';
import { parseSimulationText } from './core/parseSimulationText.ts';
import { createSceneDocument } from './core/sceneDocument.ts';
import { buildTimeline, getFrameAtTime } from './core/timeline.ts';
import type { NormalizedSceneConfig, SceneConfig, Timeline } from './core/types.ts';

const DEFAULT_SCENE_PATH = 'samples/particle_pendulum/particle_pendulum.json';
const PREVIEW_CHANNEL_COUNT = 10;

interface LoadedSceneData {
  scenePath: string;
  scene: NormalizedSceneConfig;
  simulationFiles: string[];
  timeline: Timeline;
  channelNames: string[];
}

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

async function loadSceneData(scenePath: string): Promise<LoadedSceneData> {
  const rawScene = (await loadSceneJson(scenePath)) as SceneConfig;
  const basePath = getBasePath(scenePath);
  const simulationFiles = expandSimulationFiles(rawScene.simulationData ?? [], basePath);

  const tables = await Promise.all(
    simulationFiles.map(async (filePath) => {
      return parseSimulationText(await loadTextFile(filePath), filePath);
    })
  );

  const channelNames = [...new Set(tables.flatMap((table) => table.channelNames))];
  const scene = createSceneDocument(rawScene, channelNames);
  const timeline = buildTimeline(tables);

  return {
    scenePath,
    scene,
    simulationFiles,
    timeline,
    channelNames,
  };
}

export default function SimpleApp() {
  const [sceneInput, setSceneInput] = useState(getScenePathFromUrl);
  const [loaded, setLoaded] = useState<LoadedSceneData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);

  async function handleLoad(scenePath: string) {
    setLoading(true);
    setError(null);

    try {
      const nextLoaded = await loadSceneData(scenePath);
      setLoaded(nextLoaded);
      setCurrentTime(nextLoaded.timeline.tInitial);
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

  const currentFrame = useMemo(() => {
    if (!loaded) {
      return undefined;
    }
    return getFrameAtTime(loaded.timeline, currentTime);
  }, [loaded, currentTime]);

  const sortedObjects = useMemo(() => {
    return loaded ? Object.entries(loaded.scene.objects).sort(([left], [right]) => left.localeCompare(right)) : [];
  }, [loaded]);

  const previewEntries = useMemo(() => {
    const entries = Object.entries(currentFrame?.frame.data ?? {});
    return entries.slice(0, PREVIEW_CHANNEL_COUNT);
  }, [currentFrame]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void handleLoad(sceneInput);
  };

  return (
    <div className="app-shell">
      <section className="hero">
        <h1>MGView Data Shell</h1>
        <p>
          This is the first visible React consumer of the extracted MGView core. It loads the same
          local scene and simulation files as the legacy app, then shows normalized scene data and
          timeline state without touching the old renderer yet.
        </p>

        <form className="loader-form" onSubmit={handleSubmit}>
          <input
            type="text"
            value={sceneInput}
            onChange={(event) => setSceneInput(event.target.value)}
            aria-label="Scene path"
          />
          <button type="submit" disabled={loading}>
            {loading ? 'Loading…' : 'Load Scene'}
          </button>
        </form>

        {error ? <div className="status error">{error}</div> : null}
        {!error && loading ? <div className="status">Fetching scene and simulation files…</div> : null}
      </section>

      {loaded ? (
        <div className="panel-grid">
          <section className="panel span-4">
            <h2>Overview</h2>
            <div className="stat-grid">
              <div className="stat-card">
                <label>Scene</label>
                <strong>{loaded.scene.name ?? '(unnamed)'}</strong>
              </div>
              <div className="stat-card">
                <label>Objects</label>
                <strong>{Object.keys(loaded.scene.objects).length}</strong>
              </div>
              <div className="stat-card">
                <label>Channels</label>
                <strong>{loaded.channelNames.length}</strong>
              </div>
              <div className="stat-card">
                <label>Frames</label>
                <strong>{loaded.timeline.frames.length}</strong>
              </div>
            </div>
          </section>

          <section className="panel span-8">
            <h2>Scene Metadata</h2>
            <div className="meta-list">
              <div>
                <label>Scene Path</label>
                <code>{loaded.scenePath}</code>
              </div>
              <div>
                <label>Newtonian Frame</label>
                <code>{loaded.scene.newtonianFrame}</code>
              </div>
              <div>
                <label>Scene Origin</label>
                <code>{loaded.scene.sceneOrigin}</code>
              </div>
              <div>
                <label>Camera Parent</label>
                <code>{loaded.scene.cameraParentFrame}</code>
              </div>
              <div>
                <label>Workspace Size</label>
                <code>{formatNumber(loaded.scene.workspaceSize)}</code>
              </div>
              <div>
                <label>Show Axes</label>
                <code>{String(loaded.scene.showAxes)}</code>
              </div>
            </div>
          </section>

          <section className="panel span-6">
            <h2>Simulation Files</h2>
            <div className="pill-list">
              {loaded.simulationFiles.map((filePath) => (
                <span key={filePath} className="pill">
                  <code>{filePath}</code>
                </span>
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
              <span>Scrub current frame</span>
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
            <h2>Objects</h2>
            <div className="object-list">
              {sortedObjects.map(([name, sceneObject]) => (
                <div key={name} className="object-item">
                  <code>{name}</code>
                  <span>{sceneObject.type}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="panel span-6">
            <h2>Channels</h2>
            <div className="channel-list">
              {loaded.channelNames.map((channelName) => (
                <span key={channelName} className="pill">
                  <code>{channelName}</code>
                </span>
              ))}
            </div>
          </section>

          <section className="panel span-12">
            <h2>Current Frame Preview</h2>
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
