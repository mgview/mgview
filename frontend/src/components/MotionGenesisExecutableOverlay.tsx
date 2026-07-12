import type { MotionGenesisRuntimeInfo } from '../api/motionGenesisTypes.ts';
import OverlayPanel from './OverlayPanel.tsx';
import { Button } from './ui/button.tsx';
import { Input } from './ui/input.tsx';

interface MotionGenesisExecutableOverlayProps {
  draftExecutablePath: string;
  errorMessage: string | null;
  runtimeInfo: MotionGenesisRuntimeInfo | null;
  saving: boolean;
  onApply: () => void;
  onClearConfigured: () => void;
  onClose: () => void;
  onDraftChange: (value: string) => void;
  onSelectCandidate: (path: string) => void;
}

export default function MotionGenesisExecutableOverlay({
  draftExecutablePath,
  errorMessage,
  runtimeInfo,
  saving,
  onApply,
  onClearConfigured,
  onClose,
  onDraftChange,
  onSelectCandidate,
}: MotionGenesisExecutableOverlayProps) {
  const discoveredCandidates = runtimeInfo?.candidates.filter((candidate) => candidate.exists) ?? [];

  return (
    <OverlayPanel
      title="Motion Genesis Executable"
      subtitle="Choose the Motion Genesis program MGView should launch for interactive runs."
      size="narrow"
      onClose={onClose}
    >
      <div className="grid gap-2">
        <form
          className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-1.5"
          onSubmit={(event) => {
            event.preventDefault();
            onApply();
          }}
        >
          <Input
            id="motion-genesis-executable-input"
            type="text"
            value={draftExecutablePath}
            onChange={(event) => onDraftChange(event.target.value)}
            placeholder="C:\MotionGenesis\MotionGenesis.exe"
            spellCheck={false}
            aria-label="Motion Genesis executable path"
          />
          <Button type="submit" size="sm" disabled={saving}>
            {saving ? 'Applying…' : 'Apply'}
          </Button>
        </form>

        {runtimeInfo ? (
          <div className="grid gap-0.5 text-[0.72rem] text-muted-foreground">
            <div>
              Resolved: <code className="text-foreground">{runtimeInfo.command}</code>
            </div>
            <div>
              Source: <code className="text-foreground">{runtimeInfo.source}</code>
            </div>
            {runtimeInfo.configuredPath ? (
              <div>
                Saved override: <code className="text-foreground">{runtimeInfo.configuredPath}</code>
              </div>
            ) : null}
            {!runtimeInfo.ptyAvailable && runtimeInfo.ptyError ? (
              <pre className="overflow-x-auto whitespace-pre-wrap rounded-md border border-destructive/30 bg-destructive/5 p-2 text-[0.68rem] text-destructive">
                {runtimeInfo.ptyError}
              </pre>
            ) : null}
            {runtimeInfo.ptyAvailable && runtimeInfo.resolvedModulePath ? (
              <div>
                PTY module: <code className="text-foreground">{runtimeInfo.resolvedModulePath}</code>
              </div>
            ) : null}
          </div>
        ) : null}

        {discoveredCandidates.length > 0 ? (
          <div className="grid max-h-48 gap-1 overflow-y-auto rounded-md border border-border/70 bg-muted/10 p-2 text-xs">
            <div className="font-medium text-foreground">Discovered installs</div>
            {discoveredCandidates.map((candidate) => (
              <button
                key={candidate.path}
                type="button"
                className="rounded-sm px-2 py-1 text-left text-muted-foreground transition-colors hover:bg-muted/30 hover:text-foreground"
                onClick={() => onSelectCandidate(candidate.path)}
              >
                <code className="text-foreground">{candidate.path}</code>
              </button>
            ))}
          </div>
        ) : null}

        {errorMessage ? <p className="text-xs text-destructive">{errorMessage}</p> : null}

        {runtimeInfo?.configuredPath ? (
          <div className="flex justify-end">
            <Button type="button" variant="outline" size="sm" disabled={saving} onClick={onClearConfigured}>
              Use auto-detected path
            </Button>
          </div>
        ) : null}
      </div>
    </OverlayPanel>
  );
}
