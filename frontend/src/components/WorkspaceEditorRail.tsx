import InspectorDrawer from './InspectorDrawer.tsx';
import ObjectList from './ObjectList.tsx';
import { Tabs, TabsList, TabsTrigger } from './ui/tabs.tsx';
import type { InspectorEditorMode } from './InspectorDrawer.tsx';
import type { MotionGenesisRunOptions } from '../api/localFiles.ts';
import type { MotionGenesisRunState } from '../api/localFiles.ts';
import type {
  NormalizedSceneConfig,
  SceneObjectInspection,
  SceneSpan,
  SceneSpanVisual,
  SceneVisual,
  VisualType,
} from '../core/types.ts';
import type { LoadedSceneData } from '../hooks/useSceneWorkspace.ts';
import type { useWorkspaceShell } from '../hooks/useWorkspaceShell.ts';

export interface WorkspaceSpanEntry {
  name: string;
  type: string;
  point1: string;
  point2: string;
  visualCount: number;
  visualNames: string[];
}

interface WorkspaceEditorRailProps {
  activeScene: NormalizedSceneConfig | null;
  activeSelectedObject: SceneObjectInspection | undefined;
  activeSelectedVisual: SceneObjectInspection['visuals'][number] | undefined;
  activeLiveSelectedVisual: SceneVisual | undefined;
  channelNames: string[];
  editorMode: InspectorEditorMode;
  loaded: LoadedSceneData | null;
  liveSelectedSpan: SceneSpan | undefined;
  liveSelectedSpanVisual: SceneSpanVisual | undefined;
  motionGenesisError: string | null;
  motionGenesisInput: string;
  motionGenesisOptions: MotionGenesisRunOptions;
  motionGenesisRun: MotionGenesisRunState | null;
  motionGenesisSendingInput: boolean;
  motionGenesisStarting: boolean;
  motionGenesisStopping: boolean;
  objectInspections: SceneObjectInspection[];
  onBeginSpanCreation: () => void;
  onEditorModeChange: (mode: InspectorEditorMode) => void;
  onMotionGenesisInputChange: (value: string) => void;
  onMotionGenesisOptionsChange: (options: MotionGenesisRunOptions) => void;
  onRunMotionGenesis: () => void | Promise<void>;
  onSelectObject: (objectName: string, firstVisualName: string | null) => void;
  onSelectSpan: (spanName: string, firstVisualName: string | null) => void;
  onSendMotionGenesisInput: () => void;
  onSimFileChange: (value: string) => void;
  onSimulationSettingsChange: (value: string) => void;
  onStopMotionGenesis: () => void;
  savePreview: string;
  selectedSpanName: string | null;
  selectedSpanVisualName: string | null;
  setSelectedVisualName: (name: string | null) => void;
  shell: ReturnType<typeof useWorkspaceShell>;
  simFileContent: string;
  simFileDirty: boolean;
  simFileError: string | null;
  simFileLoading: boolean;
  simFileReadOnly: boolean;
  spanEntries: WorkspaceSpanEntry[];
  updateDraftScene: (updater: (scene: NormalizedSceneConfig) => void) => void;
  updateDraftScenePreview: (updater: (scene: NormalizedSceneConfig) => void) => void;
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
  updateSelectedSpan: (updater: (span: SceneSpan) => void) => void;
  updateSelectedSpanVisual: (updater: (visual: SceneSpanVisual) => void) => void;
  updateSelectedSpanVisualPreview: (updater: (visual: SceneSpanVisual) => void) => void;
  updateSelectedVisual: (updater: (visual: SceneVisual) => void) => void;
  updateSelectedVisualPreview: (updater: (visual: SceneVisual) => void) => void;
}

export default function WorkspaceEditorRail({
  activeScene,
  activeSelectedObject,
  activeSelectedVisual,
  activeLiveSelectedVisual,
  channelNames,
  editorMode,
  loaded,
  liveSelectedSpan,
  liveSelectedSpanVisual,
  motionGenesisError,
  motionGenesisInput,
  motionGenesisOptions,
  motionGenesisRun,
  motionGenesisSendingInput,
  motionGenesisStarting,
  motionGenesisStopping,
  objectInspections,
  onBeginSpanCreation,
  onEditorModeChange,
  onMotionGenesisInputChange,
  onMotionGenesisOptionsChange,
  onRunMotionGenesis,
  onSelectObject,
  onSelectSpan,
  onSendMotionGenesisInput,
  onSimFileChange,
  onSimulationSettingsChange,
  onStopMotionGenesis,
  savePreview,
  selectedSpanName,
  selectedSpanVisualName,
  setSelectedVisualName,
  shell,
  simFileContent,
  simFileDirty,
  simFileError,
  simFileLoading,
  simFileReadOnly,
  spanEntries,
  updateDraftScene,
  updateDraftScenePreview,
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
  updateSelectedSpan,
  updateSelectedSpanVisual,
  updateSelectedSpanVisualPreview,
  updateSelectedVisual,
  updateSelectedVisualPreview,
}: WorkspaceEditorRailProps) {
  return (
    <div className="workspace-editor-rail">
      <Tabs value={editorMode} onValueChange={(value) => onEditorModeChange(value as InspectorEditorMode)} className="workspace-editor-rail-tabs">
        <div className="workspace-editor-rail-header">
          <TabsList className="w-full">
            <TabsTrigger value="visual">Editor</TabsTrigger>
            <TabsTrigger value="scene">Scene Settings</TabsTrigger>
            <TabsTrigger value="json">JSON Editor</TabsTrigger>
            <TabsTrigger value="sim">Sim Run</TabsTrigger>
          </TabsList>
        </div>

        <div
          className={`workspace-editor-rail-body ${editorMode === 'sim' ? 'workspace-editor-rail-body-sim' : ''}`}
        >
          {editorMode !== 'sim' ? (
            <div className="min-h-0 min-w-0">
              <div className="h-full min-h-0 overflow-auto pr-0.5">
                {loaded ? (
                  <ObjectList
                    entries={objectInspections}
                    onCreateSpan={onBeginSpanCreation}
                    selectedObjectName={activeSelectedObject?.name ?? null}
                    selectedSpanName={selectedSpanName}
                    spans={spanEntries}
                    onSelectObject={onSelectObject}
                    onSelectSpan={onSelectSpan}
                  />
                ) : (
                  <section className="rounded-md border border-border bg-card p-2">
                    <h2 className="mb-1 text-[0.72rem] font-semibold uppercase tracking-wide text-muted-foreground">
                      Objects
                    </h2>
                    <div className="grid gap-2">
                      <div className="h-7 animate-pulse rounded-md bg-muted" />
                      <div className="h-7 animate-pulse rounded-md bg-muted" />
                      <div className="h-7 animate-pulse rounded-md bg-muted" />
                      <div className="h-7 animate-pulse rounded-md bg-muted" />
                    </div>
                  </section>
                )}
              </div>
            </div>
          ) : null}

          <div className="workspace-content-panel">
            <div className="h-full min-h-0 overflow-auto pr-0.5">
              <InspectorDrawer
                activeScene={activeScene}
                cameraPreview={shell.cameraPreview}
                channelNames={channelNames}
                clearCameraPreview={() => shell.setCameraPreview(null)}
                editorMode={editorMode}
                liveSelectedSpan={liveSelectedSpan}
                liveSelectedSpanVisual={liveSelectedSpanVisual}
                liveSelectedVisual={activeLiveSelectedVisual}
                loaded={loaded}
                motionGenesisError={motionGenesisError}
                motionGenesisInput={motionGenesisInput}
                motionGenesisRun={motionGenesisRun}
                motionGenesisSendingInput={motionGenesisSendingInput}
                motionGenesisOptions={motionGenesisOptions}
                motionGenesisStarting={motionGenesisStarting}
                motionGenesisStopping={motionGenesisStopping}
                onMotionGenesisInputChange={onMotionGenesisInputChange}
                onMotionGenesisOptionsChange={onMotionGenesisOptionsChange}
                onSimulationSettingsChange={onSimulationSettingsChange}
                onRunMotionGenesis={onRunMotionGenesis}
                onStopMotionGenesis={onStopMotionGenesis}
                onSendMotionGenesisInput={onSendMotionGenesisInput}
                onSimFileChange={onSimFileChange}
                simFileContent={simFileContent}
                simFileDirty={simFileDirty}
                simFileError={simFileError}
                simFileLoading={simFileLoading}
                simFileReadOnly={simFileReadOnly}
                savePreview={savePreview}
                selectedObject={activeSelectedObject}
                selectedObjectName={activeSelectedObject?.name ?? null}
                selectedSpanName={selectedSpanName}
                selectedSpanVisualName={selectedSpanVisualName}
                selectedVisual={activeSelectedVisual}
                updateSelectedObject={updateSelectedObject}
                createVisual={createVisual}
                renameVisual={renameVisual}
                deleteSelectedVisual={deleteSelectedVisual}
                changeSelectedVisualType={changeSelectedVisualType}
                createSpan={createSpan}
                createSpanVisual={createSpanVisual}
                deleteSelectedSpan={deleteSelectedSpan}
                deleteSelectedSpanVisual={deleteSelectedSpanVisual}
                renameSpan={renameSpan}
                renameSpanVisual={renameSpanVisual}
                selectSpan={onSelectSpan}
                setSelectedVisualName={setSelectedVisualName}
                updateDraftScene={updateDraftScene}
                updateDraftScenePreview={updateDraftScenePreview}
                updateSceneVector={shell.updateSceneVector}
                updateSceneVectorPreview={shell.updateSceneVectorPreview}
                updateSelectedSpan={updateSelectedSpan}
                updateSelectedSpanVisual={updateSelectedSpanVisual}
                updateSelectedSpanVisualPreview={updateSelectedSpanVisualPreview}
                updateSelectedVisual={updateSelectedVisual}
                updateSelectedVisualPreview={updateSelectedVisualPreview}
              />
            </div>
          </div>
        </div>
      </Tabs>
    </div>
  );
}
