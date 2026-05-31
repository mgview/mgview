import type { WorkspaceInfo } from '../api/localFiles.ts';
import OverlayPanel from './OverlayPanel.tsx';
import { Button } from './ui/button.tsx';
import { Input } from './ui/input.tsx';

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
      <div className="grid gap-2">
        <form
          className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-1.5"
          onSubmit={(event) => {
            event.preventDefault();
            onApply();
          }}
        >
          <Input
            id="workspace-root-input"
            type="text"
            value={draftWorkspaceRoot}
            onChange={(event) => onDraftChange(event.target.value)}
            placeholder="/path/to/MotionGenesis"
            spellCheck={false}
            aria-label="Workspace folder"
          />
          <Button type="submit" size="sm" disabled={saving}>
            {saving ? 'Applying…' : 'Apply'}
          </Button>
        </form>

        {workspaceInfo || appRoot || defaultWorkspaceRoot ? (
          <div className="grid gap-0.5 text-[0.72rem] text-muted-foreground">
            {workspaceInfo ? (
              <div>
                Current: <code className="text-foreground">{workspaceInfo.workspaceRoot}</code>
              </div>
            ) : null}
            {appRoot ? (
              <div>
                App: <code className="text-foreground">{appRoot}</code>
              </div>
            ) : null}
            {defaultWorkspaceRoot ? (
              <div>
                Default: <code className="text-foreground">{defaultWorkspaceRoot}</code>
              </div>
            ) : null}
          </div>
        ) : null}

        {errorMessage ? <p className="text-xs text-destructive">{errorMessage}</p> : null}

        {defaultWorkspaceRoot ? (
          <div className="flex justify-end">
            <Button type="button" variant="outline" size="sm" onClick={onUseDefault}>
              Use default
            </Button>
          </div>
        ) : null}
      </div>
    </OverlayPanel>
  );
}
