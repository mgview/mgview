import type { LoadedSceneData } from '../hooks/useSceneWorkspace.ts';
import type {
  NormalizedSceneConfig,
  SceneSpan,
  SceneSpanVisual,
  SceneObjectInspection,
  SceneVisual,
  VisualType,
} from '../core/types.ts';
import JsonEditorPanel from './JsonEditorPanel.tsx';
import SceneSettingsPanel from './SceneSettingsPanel.tsx';
import SpanEditorPanel from './SpanEditorPanel.tsx';
import VisualEditorPanel from './VisualEditorPanel.tsx';

export type InspectorEditorMode = 'visual' | 'scene' | 'json';

interface InspectorDrawerProps {
  activeScene: NormalizedSceneConfig | null;
  cameraPreview?: {
    cameraParentFrame: string;
    cameraEye: [number, number, number];
    cameraFocus: [number, number, number];
    cameraUp: [number, number, number];
  } | null;
  channelNames: string[];
  clearCameraPreview: () => void;
  editorMode: InspectorEditorMode;
  hasLocalEdits: boolean;
  liveSelectedVisual?: SceneVisual;
  loaded: LoadedSceneData | null;
  savePreview: string;
  selectedObject?: SceneObjectInspection;
  selectedSpanName: string | null;
  selectedSpanVisualName: string | null;
  liveSelectedSpan?: SceneSpan;
  liveSelectedSpanVisual?: SceneSpanVisual;
  selectedVisual?: SceneObjectInspection['visuals'][number];
  updateSelectedObject: (updater: (sceneObject: NormalizedSceneConfig['objects'][string]) => void) => void;
  createVisual: (type: VisualType) => boolean;
  renameVisual: (currentName: string, nextName: string) => boolean;
  deleteSelectedVisual: () => boolean;
  changeSelectedVisualType: (type: VisualType) => void;
  createSpan: () => boolean;
  createSpanVisual: () => boolean;
  deleteSelectedSpan: () => boolean;
  deleteSelectedSpanVisual: () => boolean;
  renameSpan: (currentName: string, nextName: string) => boolean;
  renameSpanVisual: (currentName: string, nextName: string) => boolean;
  selectSpan: (spanName: string, firstVisualName: string | null) => void;
  setEditorMode: (mode: InspectorEditorMode) => void;
  setSelectedVisualName: (name: string | null) => void;
  updateDraftScene: (updater: (scene: NormalizedSceneConfig) => void) => void;
  updateDraftScenePreview: (updater: (scene: NormalizedSceneConfig) => void) => void;
  updateSceneVector: (
    key: 'cameraUp' | 'cameraEye' | 'cameraFocus',
    index: 0 | 1 | 2,
    nextValue: number,
    fallback: [number, number, number]
  ) => void;
  updateSceneVectorPreview: (
    key: 'cameraUp' | 'cameraEye' | 'cameraFocus',
    index: 0 | 1 | 2,
    nextValue: number,
    fallback: [number, number, number]
  ) => void;
  updateSelectedSpan: (updater: (span: SceneSpan) => void) => void;
  updateSelectedSpanVisual: (updater: (visual: SceneSpanVisual) => void) => void;
  updateSelectedSpanVisualPreview: (updater: (visual: SceneSpanVisual) => void) => void;
  updateSelectedVisual: (updater: (visual: SceneVisual) => void) => void;
  updateSelectedVisualPreview: (updater: (visual: SceneVisual) => void) => void;
}

export default function InspectorDrawer({
  activeScene,
  cameraPreview,
  channelNames,
  clearCameraPreview,
  editorMode,
  hasLocalEdits,
  liveSelectedVisual,
  loaded,
  savePreview,
  selectedObject,
  selectedSpanName,
  selectedSpanVisualName,
  liveSelectedSpan,
  liveSelectedSpanVisual,
  selectedVisual,
  updateSelectedObject,
  createVisual,
  renameVisual,
  deleteSelectedVisual,
  changeSelectedVisualType,
  createSpan,
  createSpanVisual,
  deleteSelectedSpan,
  deleteSelectedSpanVisual,
  renameSpan,
  renameSpanVisual,
  selectSpan,
  setEditorMode,
  setSelectedVisualName,
  updateDraftScene,
  updateDraftScenePreview,
  updateSceneVector,
  updateSceneVectorPreview,
  updateSelectedSpan,
  updateSelectedSpanVisual,
  updateSelectedSpanVisualPreview,
  updateSelectedVisual,
  updateSelectedVisualPreview,
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
          Editor
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
          cameraPreview={cameraPreview}
          clearCameraPreview={clearCameraPreview}
          objectNames={activeScene ? Object.keys(activeScene.objects) : []}
          updateDraftScene={updateDraftScene}
          updateDraftScenePreview={updateDraftScenePreview}
          updateSceneVector={updateSceneVector}
          updateSceneVectorPreview={updateSceneVectorPreview}
        />
      ) : editorMode === 'json' ? (
        <JsonEditorPanel
          savePreview={savePreview}
        />
      ) : selectedSpanName ? (
        <SpanEditorPanel
          activeScene={activeScene}
          channelNames={channelNames}
          createSpanVisual={createSpanVisual}
          deleteSelectedSpan={deleteSelectedSpan}
          deleteSelectedSpanVisual={deleteSelectedSpanVisual}
          liveSelectedSpan={liveSelectedSpan}
          liveSelectedSpanVisual={liveSelectedSpanVisual}
          renameSpan={renameSpan}
          renameSpanVisual={renameSpanVisual}
          selectedSpanName={selectedSpanName}
          selectedSpanVisualName={selectedSpanVisualName}
          selectSpan={selectSpan}
          updateSelectedSpan={updateSelectedSpan}
          updateSelectedSpanVisual={updateSelectedSpanVisual}
          updateSelectedSpanVisualPreview={updateSelectedSpanVisualPreview}
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
          updateSelectedVisualPreview={updateSelectedVisualPreview}
        />
      )}
    </section>
  );
}
