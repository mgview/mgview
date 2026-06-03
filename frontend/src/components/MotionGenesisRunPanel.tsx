import type { MotionGenesisRunOptions, MotionGenesisRunState } from '../api/localFiles.ts';
import { Badge } from './ui/badge.tsx';
import { Button } from './ui/button.tsx';
import { Input } from './ui/input.tsx';

interface MotionGenesisRunPanelProps {
  canRun: boolean;
  error: string | null;
  input: string;
  loadedScenePath: string | null;
  options: MotionGenesisRunOptions;
  onInputChange: (value: string) => void;
  onOptionsChange: (nextOptions: MotionGenesisRunOptions) => void;
  onRun: () => void;
  onSendInput: () => void;
  run: MotionGenesisRunState | null;
  simulationSettings: string | null | undefined;
  starting: boolean;
  sendingInput: boolean;
}

function getStatusLabel(run: MotionGenesisRunState | null): string {
  if (!run) {
    return 'Idle';
  }
  if (run.status === 'waiting-input') {
    return 'Waiting for input';
  }
  if (run.status === 'success') {
    return 'Success';
  }
  if (run.status === 'failed') {
    return 'Failed';
  }
  return 'Running';
}

export default function MotionGenesisRunPanel({
  canRun,
  error,
  input,
  loadedScenePath,
  options,
  onInputChange,
  onOptionsChange,
  onRun,
  onSendInput,
  run,
  simulationSettings,
  starting,
  sendingInput,
}: MotionGenesisRunPanelProps) {
  const runActive = run?.status === 'running' || run?.status === 'waiting-input';
  const runDisabledReason = !loadedScenePath
    ? 'Load a workspace scene to run Motion Genesis.'
    : !simulationSettings
      ? 'This scene does not define simulationSettings.'
      : null;
  const output = run?.output ?? '';

  return (
    <div className="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)_auto] gap-2">
      <div className="grid gap-1 rounded-md border border-border bg-muted/20 p-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="grid gap-0.5">
            <span className="text-[0.68rem] uppercase tracking-wide text-muted-foreground">Motion Genesis Input</span>
            <code className="text-xs text-foreground">
              {simulationSettings ?? 'No simulationSettings linked'}
            </code>
          </div>
          <Badge variant={run?.status === 'failed' ? 'destructive' : 'outline'}>{getStatusLabel(run)}</Badge>
        </div>
        {run ? (
          <div className="grid gap-0.5 text-[0.72rem] text-muted-foreground">
            <div>
              Exact Command: <code className="text-foreground">{run.commandLine}</code>
            </div>
            <div>
              Command: <code className="text-foreground">{run.command}</code>
            </div>
            <div>
              CWD: <code className="text-foreground">{run.workingDirectory}</code>
            </div>
            <div>
              Scene: <code className="text-foreground">{run.scenePath}</code>
            </div>
            <div>
              PID: <code className="text-foreground">{run.pid ?? 'unavailable'}</code>
            </div>
            <div>
              Source: <code className="text-foreground">{run.commandSource}</code>
            </div>
            <div>
              Started: <code className="text-foreground">{run.startedAt}</code>
            </div>
            {run.endedAt ? (
              <div>
                Ended: <code className="text-foreground">{run.endedAt}</code>
              </div>
            ) : null}
            {run.exitCode !== null ? (
              <div>
                Exit Code: <code className="text-foreground">{run.exitCode}</code>
              </div>
            ) : null}
          </div>
        ) : loadedScenePath ? (
          <div className="text-[0.72rem] text-muted-foreground">
            Scene: <code className="text-foreground">{loadedScenePath}</code>
          </div>
        ) : null}
        {runDisabledReason ? (
          <p className="text-xs text-muted-foreground">{runDisabledReason}</p>
        ) : null}
        {error ? <p className="text-xs text-destructive">{error}</p> : null}
        <div className="grid gap-2 rounded-md border border-border/70 bg-background/80 p-2 text-xs">
          <span className="font-medium text-foreground">Run Options</span>
          <label className="flex items-center gap-2 text-muted-foreground">
            <input
              type="checkbox"
              checked={options.autoQuit}
              onChange={(event) => onOptionsChange({ ...options, autoQuit: event.target.checked })}
            />
            <span className="text-foreground">Auto-quit at end of file</span>
          </label>
          <label className="flex items-center gap-2 text-muted-foreground">
            <input
              type="checkbox"
              checked={options.autoDefaultValues}
              onChange={(event) => onOptionsChange({ ...options, autoDefaultValues: event.target.checked })}
            />
            <span className="text-foreground">Auto-send default value prompts</span>
          </label>
          <label className="flex items-center gap-2 text-muted-foreground">
            <input
              type="checkbox"
              checked={options.debug}
              onChange={(event) => onOptionsChange({ ...options, debug: event.target.checked })}
            />
            <span className="text-foreground">Verbose / debug output</span>
          </label>
        </div>
        <div className="flex justify-end">
          <Button type="button" size="sm" onClick={onRun} disabled={!canRun || starting || runActive}>
            {starting ? 'Running…' : 'Run Sim'}
          </Button>
        </div>
      </div>

      <textarea
        className="h-full min-h-0 w-full resize-none rounded-md border border-border bg-background px-3 py-2 font-mono text-xs leading-5 text-foreground"
        readOnly
        spellCheck={false}
        value={output}
      />

      <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-1.5">
        <Input
          type="text"
          value={input}
          onChange={(event) => onInputChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              onSendInput();
            }
          }}
          placeholder="Send one line of input to the running process (Enter sends blank line too)"
          disabled={!run?.canSendInput || sendingInput}
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={!run?.canSendInput || sendingInput}
          onClick={onSendInput}
        >
          {sendingInput ? 'Sending…' : 'Send'}
        </Button>
      </div>
    </div>
  );
}
