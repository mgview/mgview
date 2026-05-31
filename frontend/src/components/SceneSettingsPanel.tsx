import type { NormalizedSceneConfig } from '../core/types.ts';
import ColorPicker from './ColorPicker.tsx';
import { NumericInput } from './editorShared.tsx';
import { Checkbox } from './ui/checkbox.tsx';
import { Label } from './ui/label.tsx';
import {
  editorGrid,
  editorFieldLabel,
  fieldClass,
  fieldWideClass,
  numericTriplet,
  emptyState,
} from './editorLayout.ts';

interface SceneSettingsPanelProps {
  activeScene: NormalizedSceneConfig | null;
  cameraPreview?: {
    cameraParentFrame: string;
    cameraEye: [number, number, number];
    cameraFocus: [number, number, number];
    cameraUp: [number, number, number];
  } | null;
  clearCameraPreview: () => void;
  objectNames: string[];
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
}

export default function SceneSettingsPanel({
  activeScene,
  cameraPreview,
  clearCameraPreview,
  objectNames,
  updateDraftScene,
  updateDraftScenePreview,
  updateSceneVector,
  updateSceneVectorPreview,
}: SceneSettingsPanelProps) {
  if (!activeScene) {
    return <div className={emptyState}>Load a scene to edit scene-level settings.</div>;
  }

  const cameraParentFrame = cameraPreview?.cameraParentFrame ?? activeScene.cameraParentFrame;
  const cameraFocus = cameraPreview?.cameraFocus ?? activeScene.cameraFocus ?? [0, 0, 0];
  const cameraEye = cameraPreview?.cameraEye ?? activeScene.cameraEye ?? [0, 0, 10];
  const cameraUp = cameraPreview?.cameraUp ?? activeScene.cameraUp ?? [0, 0, 1];

  return (
    <div className={editorGrid}>
      <label className={fieldClass()}>
        <span className={editorFieldLabel}>Workspace Size</span>
        <NumericInput
          value={activeScene.workspaceSize}
          onValuePreviewChange={(nextValue) => {
            updateDraftScenePreview((scene) => {
              scene.workspaceSize = nextValue;
            });
          }}
          onValueChange={(nextValue) => {
            updateDraftScene((scene) => {
              scene.workspaceSize = nextValue;
            });
          }}
        />
      </label>
      <label className={fieldClass()}>
        <span className={editorFieldLabel}>Background</span>
        <ColorPicker
          value={activeScene.backgroundColor}
          onChange={(nextValue) => {
            updateDraftScene((scene) => {
              scene.backgroundColor = nextValue;
            });
          }}
        />
      </label>
      <div className={fieldClass()}>
        <span className={editorFieldLabel}>Show Axes</span>
        <div className="flex items-center gap-2">
          <Checkbox
            id="show-axes"
            checked={activeScene.showAxes}
            onCheckedChange={(checked) => {
              updateDraftScene((scene) => {
                scene.showAxes = checked === true;
              });
            }}
          />
          <Label htmlFor="show-axes" className="normal-case tracking-normal">
            Visible
          </Label>
        </div>
      </div>
      <label className={fieldClass()}>
        <span className={editorFieldLabel}>Camera Parent Frame</span>
        <select
          className="h-7 w-full rounded-md border border-input bg-background px-2 text-xs"
          value={cameraParentFrame}
          onChange={(event) => {
            clearCameraPreview();
            updateDraftScene((scene) => {
              scene.cameraParentFrame = event.target.value;
            });
          }}
        >
          {objectNames.map((objectName) => (
            <option key={objectName} value={objectName}>
              {objectName}
            </option>
          ))}
        </select>
      </label>
      <div className={fieldWideClass()}>
        <span className={editorFieldLabel}>Camera Focus</span>
        <div className={numericTriplet}>
          <NumericInput
            prefixLabel="x"
            value={cameraFocus[0] ?? 0}
            onValuePreviewChange={(nextValue) => updateSceneVectorPreview('cameraFocus', 0, nextValue, [0, 0, 0])}
            onValueChange={(nextValue) => updateSceneVector('cameraFocus', 0, nextValue, [0, 0, 0])}
          />
          <NumericInput
            prefixLabel="y"
            value={cameraFocus[1] ?? 0}
            onValuePreviewChange={(nextValue) => updateSceneVectorPreview('cameraFocus', 1, nextValue, [0, 0, 0])}
            onValueChange={(nextValue) => updateSceneVector('cameraFocus', 1, nextValue, [0, 0, 0])}
          />
          <NumericInput
            prefixLabel="z"
            value={cameraFocus[2] ?? 0}
            onValuePreviewChange={(nextValue) => updateSceneVectorPreview('cameraFocus', 2, nextValue, [0, 0, 0])}
            onValueChange={(nextValue) => updateSceneVector('cameraFocus', 2, nextValue, [0, 0, 0])}
          />
        </div>
      </div>
      <div className={fieldWideClass()}>
        <span className={editorFieldLabel}>Camera Eye</span>
        <div className={numericTriplet}>
          <NumericInput
            prefixLabel="x"
            value={cameraEye[0] ?? 0}
            onValuePreviewChange={(nextValue) => updateSceneVectorPreview('cameraEye', 0, nextValue, [0, 0, 10])}
            onValueChange={(nextValue) => updateSceneVector('cameraEye', 0, nextValue, [0, 0, 10])}
          />
          <NumericInput
            prefixLabel="y"
            value={cameraEye[1] ?? 0}
            onValuePreviewChange={(nextValue) => updateSceneVectorPreview('cameraEye', 1, nextValue, [0, 0, 10])}
            onValueChange={(nextValue) => updateSceneVector('cameraEye', 1, nextValue, [0, 0, 10])}
          />
          <NumericInput
            prefixLabel="z"
            value={cameraEye[2] ?? 10}
            onValuePreviewChange={(nextValue) => updateSceneVectorPreview('cameraEye', 2, nextValue, [0, 0, 10])}
            onValueChange={(nextValue) => updateSceneVector('cameraEye', 2, nextValue, [0, 0, 10])}
          />
        </div>
      </div>
      <div className={fieldWideClass()}>
        <span className={editorFieldLabel}>Camera Up</span>
        <div className={numericTriplet}>
          <NumericInput
            prefixLabel="x"
            value={cameraUp[0] ?? 0}
            onValuePreviewChange={(nextValue) => updateSceneVectorPreview('cameraUp', 0, nextValue, [0, 0, 1])}
            onValueChange={(nextValue) => updateSceneVector('cameraUp', 0, nextValue, [0, 0, 1])}
          />
          <NumericInput
            prefixLabel="y"
            value={cameraUp[1] ?? 0}
            onValuePreviewChange={(nextValue) => updateSceneVectorPreview('cameraUp', 1, nextValue, [0, 0, 1])}
            onValueChange={(nextValue) => updateSceneVector('cameraUp', 1, nextValue, [0, 0, 1])}
          />
          <NumericInput
            prefixLabel="z"
            value={cameraUp[2] ?? 1}
            onValuePreviewChange={(nextValue) => updateSceneVectorPreview('cameraUp', 2, nextValue, [0, 0, 1])}
            onValueChange={(nextValue) => updateSceneVector('cameraUp', 2, nextValue, [0, 0, 1])}
          />
        </div>
      </div>
    </div>
  );
}
