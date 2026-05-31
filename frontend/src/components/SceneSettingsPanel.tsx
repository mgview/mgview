import { useId } from 'react';
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
    return <div className="empty-state">Load a scene to edit scene-level settings.</div>;
  }

  const newtonianFrameOptionsId = useId();
  const sceneOriginOptionsId = useId();
  const frameNames = Object.entries(activeScene.objects)
    .filter(([, sceneObject]) => sceneObject.type === 'frame')
    .map(([name]) => name);
  const pointNames = Object.entries(activeScene.objects)
    .filter(([, sceneObject]) => sceneObject.type === 'point')
    .map(([name]) => name);
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
          <span>Newtonian Frame</span>
          <input
            type="text"
            list={newtonianFrameOptionsId}
            value={activeScene.newtonianFrame}
            onChange={(event) => {
              updateDraftScene((scene) => {
                scene.newtonianFrame = event.target.value;
              });
            }}
          />
          <datalist id={newtonianFrameOptionsId}>
            {frameNames.map((frameName) => (
              <option key={frameName} value={frameName} />
            ))}
          </datalist>
        </label>
        <label className="editor-field">
          <span>Scene Origin</span>
          <input
            type="text"
            list={sceneOriginOptionsId}
            value={activeScene.sceneOrigin}
            onChange={(event) => {
              updateDraftScene((scene) => {
                scene.sceneOrigin = event.target.value;
              });
            }}
          />
          <datalist id={sceneOriginOptionsId}>
            {pointNames.map((pointName) => (
              <option key={pointName} value={pointName} />
            ))}
          </datalist>
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
              onValuePreviewChange={(nextValue) =>
                updateSceneVectorPreview('cameraFocus', 0, nextValue, [0, 0, 0])
              }
              onValueChange={(nextValue) => updateSceneVector('cameraFocus', 0, nextValue, [0, 0, 0])}
            />
            <NumericInput
              className="numeric-input-compact"
              prefixLabel="y"
              value={cameraFocus[1] ?? 0}
              onValuePreviewChange={(nextValue) =>
                updateSceneVectorPreview('cameraFocus', 1, nextValue, [0, 0, 0])
              }
              onValueChange={(nextValue) => updateSceneVector('cameraFocus', 1, nextValue, [0, 0, 0])}
            />
            <NumericInput
              className="numeric-input-compact"
              prefixLabel="z"
              value={cameraFocus[2] ?? 0}
              onValuePreviewChange={(nextValue) =>
                updateSceneVectorPreview('cameraFocus', 2, nextValue, [0, 0, 0])
              }
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
              onValuePreviewChange={(nextValue) =>
                updateSceneVectorPreview('cameraEye', 0, nextValue, [0, 0, 10])
              }
              onValueChange={(nextValue) => updateSceneVector('cameraEye', 0, nextValue, [0, 0, 10])}
            />
            <NumericInput
              className="numeric-input-compact"
              prefixLabel="y"
              value={cameraEye[1] ?? 0}
              onValuePreviewChange={(nextValue) =>
                updateSceneVectorPreview('cameraEye', 1, nextValue, [0, 0, 10])
              }
              onValueChange={(nextValue) => updateSceneVector('cameraEye', 1, nextValue, [0, 0, 10])}
            />
            <NumericInput
              className="numeric-input-compact"
              prefixLabel="z"
              value={cameraEye[2] ?? 10}
              onValuePreviewChange={(nextValue) =>
                updateSceneVectorPreview('cameraEye', 2, nextValue, [0, 0, 10])
              }
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
              onValuePreviewChange={(nextValue) =>
                updateSceneVectorPreview('cameraUp', 0, nextValue, [0, 0, 1])
              }
              onValueChange={(nextValue) => updateSceneVector('cameraUp', 0, nextValue, [0, 0, 1])}
            />
            <NumericInput
              className="numeric-input-compact"
              prefixLabel="y"
              value={cameraUp[1] ?? 0}
              onValuePreviewChange={(nextValue) =>
                updateSceneVectorPreview('cameraUp', 1, nextValue, [0, 0, 1])
              }
              onValueChange={(nextValue) => updateSceneVector('cameraUp', 1, nextValue, [0, 0, 1])}
            />
            <NumericInput
              className="numeric-input-compact"
              prefixLabel="z"
              value={cameraUp[2] ?? 1}
              onValuePreviewChange={(nextValue) =>
                updateSceneVectorPreview('cameraUp', 2, nextValue, [0, 0, 1])
              }
              onValueChange={(nextValue) => updateSceneVector('cameraUp', 2, nextValue, [0, 0, 1])}
            />
          </div>
        </div>
      </div>
    </>
  );
}
