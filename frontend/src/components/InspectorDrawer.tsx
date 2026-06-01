import type { LoadedSceneData } from '../hooks/useSceneWorkspace.ts';
import type {
  NormalizedSceneConfig,
  SceneSpan,
  SceneSpanVisual,
  SceneObjectInspection,
  SceneVisual,
  Timeline,
  VisualType,
} from '../core/types.ts';
import JsonEditorPanel from './JsonEditorPanel.tsx';
import SceneSettingsPanel from './SceneSettingsPanel.tsx';
import SpanEditorPanel from './SpanEditorPanel.tsx';
import VisualEditorPanel from './VisualEditorPanel.tsx';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs.tsx';

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
      <section className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)] rounded-md border border-border bg-card p-2">
        <h2 className="mb-1 text-[0.72rem] font-semibold uppercase tracking-wide text-muted-foreground">Inspector</h2>
        <div className="grid gap-2">
          <div className="h-7 animate-pulse rounded-md bg-muted" />
          <div className="h-7 animate-pulse rounded-md bg-muted" />
          <div className="h-7 animate-pulse rounded-md bg-muted" />
          <div className="h-44 animate-pulse rounded-md bg-muted" />
        </div>
      </section>
    );
  }

  return (
    <section className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)] rounded-md border border-border bg-card p-2">
      <Tabs value={editorMode} onValueChange={(value) => setEditorMode(value as InspectorEditorMode)}>
        <TabsList className="w-full">
          <TabsTrigger value="visual">Editor</TabsTrigger>
          <TabsTrigger value="scene">Scene Settings</TabsTrigger>
          <TabsTrigger value="json">JSON Editor</TabsTrigger>
        </TabsList>

        <TabsContent value="scene" className="min-h-0 overflow-auto">
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
        </TabsContent>

        <TabsContent value="json" className="min-h-0 overflow-auto">
          <JsonEditorPanel savePreview={savePreview} />
        </TabsContent>

        <TabsContent value="visual" className="min-h-0 overflow-auto">
          {selectedSpanName ? (
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
        </TabsContent>
      </Tabs>
    </section>
  );
}
