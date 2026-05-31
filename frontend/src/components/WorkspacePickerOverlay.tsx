import type { WorkspaceInfo } from '../api/localFiles.ts';
import OverlayPanel from './OverlayPanel.tsx';

interface WorkspacePickerOverlayProps {
  appRoot: string | null;
  defaultWorkspaceRoot: string | null;
  draftWorkspaceRoot: string;
  errorMessage: string | null;
  saving: boolean;
  workspaceInfo: WorkspaceInfo | null;
  onApply: () => void;
  onClose: () => void;
  onDraftChange: (value: string) => void;
  onUseDefault: () => void;
}

export default function WorkspacePickerOverlay({
  appRoot,
  defaultWorkspaceRoot,
  draftWorkspaceRoot,
  errorMessage,
  saving,
  workspaceInfo,
  onApply,
  onClose,
  onDraftChange,
  onUseDefault,
}: WorkspacePickerOverlayProps) {
  return (
    <OverlayPanel title="Open Workspace" size="narrow" onClose={onClose}>
      <div className="overlay-layout">
        <div className="overlay-section">
          <form
            className="loader-form loader-form-single"
            onSubmit={(event) => {
              event.preventDefault();
              onApply();
            }}
          >
            <input
              id="workspace-root-input"
              type="text"
              value={draftWorkspaceRoot}
              onChange={(event) => onDraftChange(event.target.value)}
              placeholder="/path/to/MotionGenesis"
              spellCheck={false}
              aria-label="Workspace folder"
            />
            <button type="submit" disabled={saving}>
              {saving ? 'Applying…' : 'Apply'}
            </button>
          </form>

          {workspaceInfo || appRoot || defaultWorkspaceRoot ? (
            <div className="workspace-hint">
              {workspaceInfo ? (
                <div>
                  Current: <code>{workspaceInfo.workspaceRoot}</code>
                </div>
              ) : null}
              {appRoot ? (
                <div>
                  App: <code>{appRoot}</code>
                </div>
              ) : null}
              {defaultWorkspaceRoot ? (
                <div>
                  Default: <code>{defaultWorkspaceRoot}</code>
                </div>
              ) : null}
            </div>
          ) : null}

          {errorMessage ? <div className="status error">{errorMessage}</div> : null}

          {defaultWorkspaceRoot ? (
            <div className="visual-toolbar-actions">
              <button type="button" className="secondary-button" onClick={onUseDefault}>
                Use default
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </OverlayPanel>
  );
}
