import type { LoadedSceneData } from '../hooks/useSceneWorkspace.ts';
import type {
  NormalizedSceneConfig,
  SceneSpan,
  SceneSpanVisual,
  SceneObjectInspection,
  SceneVisual,
  VisualType,
} from '../core/types.ts';
import type { MotionGenesisRunOptions } from '../api/localFiles.ts';
import JsonEditorPanel from './JsonEditorPanel.tsx';
import MotionGenesisRunPanel from './MotionGenesisRunPanel.tsx';
import SceneSettingsPanel from './SceneSettingsPanel.tsx';
import SpanEditorPanel from './SpanEditorPanel.tsx';
import VisualEditorPanel from './VisualEditorPanel.tsx';

export type InspectorEditorMode = 'visual' | 'scene' | 'json' | 'sim';

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
  liveSelectedVisual?: SceneVisual;
  loaded: LoadedSceneData | null;
  savePreview: string;
  selectedObject?: SceneObjectInspection;
  selectedSpanName: string | null;
  selectedSpanVisualName: string | null;
  liveSelectedSpan?: SceneSpan;
  liveSelectedSpanVisual?: SceneSpanVisual;
  selectedVisual?: SceneObjectInspection['visuals'][number];
  selectedObjectName: string | null;
  updateSelectedObject: (updater: (sceneObject: NormalizedSceneConfig['objects'][string]) => void) => void;
  createVisual: (type: VisualType) => boolean;
  renameVisual: (currentName: string, nextName: string) => boolean;
  deleteSelectedVisual: () => boolean;
  changeSelectedVisualType: (type: VisualType) => void;
  createSpan: () => boolean;
  createSpanVisual: () => boolean;
  deleteSelectedSpan: () => boolean;
  deleteSelectedSpanVisual: () => boolean;
  motionGenesisError: string | null;
  motionGenesisInput: string;
  motionGenesisRun: import('../api/localFiles.ts').MotionGenesisRunState | null;
  onMotionGenesisInputChange: (value: string) => void;
  onMotionGenesisOptionsChange: (options: MotionGenesisRunOptions) => void;
  onRunMotionGenesis: () => void;
  onSendMotionGenesisInput: () => void;
  renameSpan: (currentName: string, nextName: string) => boolean;
  renameSpanVisual: (currentName: string, nextName: string) => boolean;
  selectSpan: (spanName: string, firstVisualName: string | null) => void;
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
  motionGenesisStarting: boolean;
  motionGenesisSendingInput: boolean;
  motionGenesisOptions: MotionGenesisRunOptions;
}

export default function InspectorDrawer({
  activeScene,
  cameraPreview,
  channelNames,
  clearCameraPreview,
  editorMode,
  liveSelectedVisual,
  loaded,
  savePreview,
  selectedObject,
  selectedSpanName,
  selectedSpanVisualName,
  liveSelectedSpan,
  liveSelectedSpanVisual,
  selectedVisual,
  selectedObjectName,
  updateSelectedObject,
  createVisual,
  renameVisual,
  deleteSelectedVisual,
  changeSelectedVisualType,
  createSpanVisual,
  deleteSelectedSpan,
  deleteSelectedSpanVisual,
  motionGenesisError,
  motionGenesisInput,
  motionGenesisRun,
  motionGenesisSendingInput,
  motionGenesisStarting,
  onMotionGenesisInputChange,
  onMotionGenesisOptionsChange,
  onRunMotionGenesis,
  onSendMotionGenesisInput,
  renameSpan,
  renameSpanVisual,
  selectSpan,
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
  motionGenesisOptions,
}: InspectorDrawerProps) {
  if (!loaded) {
    return (
      <section className="grid min-h-0">
        <div className="grid gap-2">
          <div className="h-7 animate-pulse rounded-md bg-muted" />
          <div className="h-7 animate-pulse rounded-md bg-muted" />
          <div className="h-7 animate-pulse rounded-md bg-muted" />
          <div className="h-44 animate-pulse rounded-md bg-muted" />
        </div>
      </section>
    );
  }

  if (editorMode === 'scene') {
    return (
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
    );
  }

  if (editorMode === 'json') {
    return <JsonEditorPanel savePreview={savePreview} />;
  }

  if (editorMode === 'sim') {
    return (
      <MotionGenesisRunPanel
        canRun={loaded.sceneRef.source === 'workspace' && Boolean(activeScene?.simulationSettings)}
        error={motionGenesisError}
        input={motionGenesisInput}
        loadedScenePath={loaded.sceneRef.source === 'workspace' ? loaded.scenePath : null}
        options={motionGenesisOptions}
        onInputChange={onMotionGenesisInputChange}
        onOptionsChange={onMotionGenesisOptionsChange}
        onRun={onRunMotionGenesis}
        onSendInput={onSendMotionGenesisInput}
        run={motionGenesisRun}
        simulationSettings={activeScene?.simulationSettings}
        starting={motionGenesisStarting}
        sendingInput={motionGenesisSendingInput}
      />
    );
  }

  return selectedSpanName ? (
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
  );
}
