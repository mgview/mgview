import type { NormalizedSceneConfig } from '../core/types.ts';
import { NumericInput } from './editorShared.tsx';

interface SceneSettingsPanelProps {
  activeScene: NormalizedSceneConfig | null;
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
  updateDraftScene,
  updateSceneVector,
}: SceneSettingsPanelProps) {
  if (!activeScene) {
    return <div className="empty-state">Load a scene to edit scene-level settings.</div>;
  }

  return (
    <>
      <h2>Scene Settings</h2>
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
          <NumericInput value={activeScene.cameraUp?.[0] ?? 0} onValueChange={(nextValue) => updateSceneVector('cameraUp', 0, nextValue, [0, 0, 1])} />
        </label>
        <label className="editor-field">
          <span>Camera Up Y</span>
          <NumericInput value={activeScene.cameraUp?.[1] ?? 0} onValueChange={(nextValue) => updateSceneVector('cameraUp', 1, nextValue, [0, 0, 1])} />
        </label>
        <label className="editor-field">
          <span>Camera Up Z</span>
          <NumericInput value={activeScene.cameraUp?.[2] ?? 1} onValueChange={(nextValue) => updateSceneVector('cameraUp', 2, nextValue, [0, 0, 1])} />
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
          <NumericInput value={activeScene.cameraEye?.[0] ?? 0} onValueChange={(nextValue) => updateSceneVector('cameraEye', 0, nextValue, [0, 0, 10])} />
        </label>
        <label className="editor-field">
          <span>Camera Eye Y</span>
          <NumericInput value={activeScene.cameraEye?.[1] ?? 0} onValueChange={(nextValue) => updateSceneVector('cameraEye', 1, nextValue, [0, 0, 10])} />
        </label>
        <label className="editor-field">
          <span>Camera Eye Z</span>
          <NumericInput value={activeScene.cameraEye?.[2] ?? 10} onValueChange={(nextValue) => updateSceneVector('cameraEye', 2, nextValue, [0, 0, 10])} />
        </label>
        <label className="editor-field">
          <span>Camera Focus X</span>
          <NumericInput value={activeScene.cameraFocus?.[0] ?? 0} onValueChange={(nextValue) => updateSceneVector('cameraFocus', 0, nextValue, [0, 0, 0])} />
        </label>
        <label className="editor-field">
          <span>Camera Focus Y</span>
          <NumericInput value={activeScene.cameraFocus?.[1] ?? 0} onValueChange={(nextValue) => updateSceneVector('cameraFocus', 1, nextValue, [0, 0, 0])} />
        </label>
        <label className="editor-field">
          <span>Camera Focus Z</span>
          <NumericInput value={activeScene.cameraFocus?.[2] ?? 0} onValueChange={(nextValue) => updateSceneVector('cameraFocus', 2, nextValue, [0, 0, 0])} />
        </label>
      </div>
    </>
  );
}
