import type { NormalizedSceneConfig } from '../core/types.ts';
import ColorPicker from './ColorPicker.tsx';
import { NumericInput } from './editorShared.tsx';

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
  updateSceneVector: (
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
  updateSceneVector,
}: SceneSettingsPanelProps) {
  if (!activeScene) {
    return <div className="empty-state">Load a scene to edit scene-level settings.</div>;
  }

  const cameraParentFrame = cameraPreview?.cameraParentFrame ?? activeScene.cameraParentFrame;
  const cameraFocus = cameraPreview?.cameraFocus ?? activeScene.cameraFocus ?? [0, 0, 0];
  const cameraEye = cameraPreview?.cameraEye ?? activeScene.cameraEye ?? [0, 0, 10];
  const cameraUp = cameraPreview?.cameraUp ?? activeScene.cameraUp ?? [0, 0, 1];

  return (
    <>
      <div className="editor-grid">
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
        <label className="editor-field">
          <span>Background</span>
          <ColorPicker
            value={activeScene.backgroundColor}
            onChange={(nextValue) => {
              updateDraftScene((scene) => {
                scene.backgroundColor = nextValue;
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
          <select
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
        <div className="editor-field editor-field-wide">
          <span>Camera Focus</span>
          <div className="numeric-triplet">
            <NumericInput
              className="numeric-input-compact"
              prefixLabel="x"
              value={cameraFocus[0] ?? 0}
              onValueChange={(nextValue) => updateSceneVector('cameraFocus', 0, nextValue, [0, 0, 0])}
            />
            <NumericInput
              className="numeric-input-compact"
              prefixLabel="y"
              value={cameraFocus[1] ?? 0}
              onValueChange={(nextValue) => updateSceneVector('cameraFocus', 1, nextValue, [0, 0, 0])}
            />
            <NumericInput
              className="numeric-input-compact"
              prefixLabel="z"
              value={cameraFocus[2] ?? 0}
              onValueChange={(nextValue) => updateSceneVector('cameraFocus', 2, nextValue, [0, 0, 0])}
            />
          </div>
        </div>
        <div className="editor-field editor-field-wide">
          <span>Camera Eye</span>
          <div className="numeric-triplet">
            <NumericInput
              className="numeric-input-compact"
              prefixLabel="x"
              value={cameraEye[0] ?? 0}
              onValueChange={(nextValue) => updateSceneVector('cameraEye', 0, nextValue, [0, 0, 10])}
            />
            <NumericInput
              className="numeric-input-compact"
              prefixLabel="y"
              value={cameraEye[1] ?? 0}
              onValueChange={(nextValue) => updateSceneVector('cameraEye', 1, nextValue, [0, 0, 10])}
            />
            <NumericInput
              className="numeric-input-compact"
              prefixLabel="z"
              value={cameraEye[2] ?? 10}
              onValueChange={(nextValue) => updateSceneVector('cameraEye', 2, nextValue, [0, 0, 10])}
            />
          </div>
        </div>
        <div className="editor-field editor-field-wide">
          <span>Camera Up</span>
          <div className="numeric-triplet">
            <NumericInput
              className="numeric-input-compact"
              prefixLabel="x"
              value={cameraUp[0] ?? 0}
              onValueChange={(nextValue) => updateSceneVector('cameraUp', 0, nextValue, [0, 0, 1])}
            />
            <NumericInput
              className="numeric-input-compact"
              prefixLabel="y"
              value={cameraUp[1] ?? 0}
              onValueChange={(nextValue) => updateSceneVector('cameraUp', 1, nextValue, [0, 0, 1])}
            />
            <NumericInput
              className="numeric-input-compact"
              prefixLabel="z"
              value={cameraUp[2] ?? 1}
              onValueChange={(nextValue) => updateSceneVector('cameraUp', 2, nextValue, [0, 0, 1])}
            />
          </div>
        </div>
      </div>
    </>
  );
}
