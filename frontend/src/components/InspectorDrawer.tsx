import type { LoadedSceneData } from '../hooks/useSceneWorkspace.ts';
import type {
  NormalizedSceneConfig,
  SceneObjectInspection,
  SceneVisual,
  VisualType,
} from '../core/types.ts';
import JsonEditorPanel from './JsonEditorPanel.tsx';
import SceneSettingsPanel from './SceneSettingsPanel.tsx';
import VisualEditorPanel from './VisualEditorPanel.tsx';

export type InspectorEditorMode = 'visual' | 'scene' | 'json';

interface InspectorDrawerProps {
  activeScene: NormalizedSceneConfig | null;
  editorMode: InspectorEditorMode;
  hasLocalEdits: boolean;
  liveSelectedVisual?: SceneVisual;
  loaded: LoadedSceneData | null;
  savePreview: string;
  selectedObject?: SceneObjectInspection;
  selectedVisual?: SceneObjectInspection['visuals'][number];
  updateSelectedObject: (updater: (sceneObject: NormalizedSceneConfig['objects'][string]) => void) => void;
  createVisual: (type: VisualType) => boolean;
  renameVisual: (currentName: string, nextName: string) => boolean;
  deleteSelectedVisual: () => boolean;
  changeSelectedVisualType: (type: VisualType) => void;
  setEditorMode: (mode: InspectorEditorMode) => void;
  setSelectedVisualName: (name: string | null) => void;
  updateDraftScene: (updater: (scene: NormalizedSceneConfig) => void) => void;
  updateSceneVector: (
    key: 'cameraUp' | 'cameraEye' | 'cameraFocus',
    index: 0 | 1 | 2,
    nextValue: number,
    fallback: [number, number, number]
  ) => void;
  updateSelectedVisual: (updater: (visual: SceneVisual) => void) => void;
}

export default function InspectorDrawer({
  activeScene,
  editorMode,
  hasLocalEdits,
  liveSelectedVisual,
  loaded,
  savePreview,
  selectedObject,
  selectedVisual,
  updateSelectedObject,
  createVisual,
  renameVisual,
  deleteSelectedVisual,
  changeSelectedVisualType,
  setEditorMode,
  setSelectedVisualName,
  updateDraftScene,
  updateSceneVector,
  updateSelectedVisual,
}: InspectorDrawerProps) {
  if (!loaded) {
    return (
      <section className="panel drawer-panel loading-panel">
        <h2>Inspector</h2>
        <div className="loading-placeholder-list">
          <div className="loading-placeholder-row" />
          <div className="loading-placeholder-row" />
          <div className="loading-placeholder-row" />
          <div className="loading-placeholder-row loading-placeholder-row-tall" />
        </div>
      </section>
    );
  }

  return (
    <section className="panel drawer-panel">
      <div className="drawer-tabs">
        <button
          type="button"
          className={`tag-button ${editorMode === 'visual' ? 'tag-button-active' : ''}`}
          onClick={() => setEditorMode('visual')}
        >
          Visual Editor
        </button>
        <button
          type="button"
          className={`tag-button ${editorMode === 'scene' ? 'tag-button-active' : ''}`}
          onClick={() => setEditorMode('scene')}
        >
          Scene Settings
        </button>
        <button
          type="button"
          className={`tag-button ${editorMode === 'json' ? 'tag-button-active' : ''}`}
          onClick={() => setEditorMode('json')}
        >
          JSON Editor
        </button>
      </div>

      {editorMode === 'scene' ? (
        <SceneSettingsPanel
          activeScene={activeScene}
          objectNames={activeScene ? Object.keys(activeScene.objects) : []}
          updateDraftScene={updateDraftScene}
          updateSceneVector={updateSceneVector}
        />
      ) : editorMode === 'json' ? (
        <JsonEditorPanel
          scenePath={loaded.scenePath}
          hasLocalEdits={hasLocalEdits}
          savePreview={savePreview}
        />
      ) : (
        <VisualEditorPanel
          liveSelectedVisual={liveSelectedVisual}
          selectedObject={selectedObject}
          selectedVisual={selectedVisual}
          updateSelectedObject={updateSelectedObject}
          createVisual={createVisual}
          renameVisual={renameVisual}
          deleteSelectedVisual={deleteSelectedVisual}
          changeSelectedVisualType={changeSelectedVisualType}
          setSelectedVisualName={setSelectedVisualName}
          updateSelectedVisual={updateSelectedVisual}
        />
      )}
    </section>
  );
}
