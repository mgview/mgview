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
    <OverlayPanel
      title="Open Workspace"
      subtitle="Simulation data is read from the workspace root. Bundled samples and assets stay with this MGView install."
      size="narrow"
      onClose={onClose}
    >
      <div className="overlay-layout">
        <section className="panel">
          <div className="stacked-meta">
            <div className="meta-row">
              <label htmlFor="workspace-root-input">Workspace folder</label>
              <input
                id="workspace-root-input"
                type="text"
                value={draftWorkspaceRoot}
                onChange={(event) => onDraftChange(event.target.value)}
                placeholder="/path/to/MotionGenesis"
                spellCheck={false}
              />
            </div>
            {workspaceInfo ? (
              <div className="meta-row">
                <label>Current</label>
                <code>{workspaceInfo.workspaceRoot}</code>
              </div>
            ) : null}
            {appRoot ? (
              <div className="meta-row">
                <label>App install</label>
                <code>{appRoot}</code>
              </div>
            ) : null}
            {defaultWorkspaceRoot ? (
              <div className="meta-row">
                <label>Default</label>
                <code>{defaultWorkspaceRoot}</code>
              </div>
            ) : null}
          </div>

          {errorMessage ? <div className="status error">{errorMessage}</div> : null}

          <div className="visual-toolbar-actions">
            <button type="button" className="secondary-button" onClick={onUseDefault} disabled={!defaultWorkspaceRoot}>
              Use default
            </button>
            <button type="button" onClick={onApply} disabled={saving}>
              {saving ? 'Applying…' : 'Apply'}
            </button>
          </div>
        </section>
      </div>
    </OverlayPanel>
  );
}
