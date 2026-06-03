import {
  ArrowDownToLine,
  ArrowUpToLine,
  CheckCircle2,
  CircleDotDashed,
  Settings2,
  SquareTerminal,
  TriangleAlert,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { listLocalFiles, type FileBrowserListing, type MotionGenesisRunOptions, type MotionGenesisRunState } from '../api/localFiles.ts';
import { getBasePath, getRelativePath } from '../core/pathUtils.ts';
import { getDirectoryPath } from '../hooks/useSceneWorkspace.ts';
import { cn } from '../lib/utils.ts';
import { Badge } from './ui/badge.tsx';
import { Button } from './ui/button.tsx';
import { Checkbox } from './ui/checkbox.tsx';
import { Input } from './ui/input.tsx';
import LocalFileBrowser from './LocalFileBrowser.tsx';
import OverlayPanel from './OverlayPanel.tsx';
import { Separator } from './ui/separator.tsx';

interface MotionGenesisRunPanelProps {
  canRun: boolean;
  error: string | null;
  input: string;
  loadedScenePath: string | null;
  options: MotionGenesisRunOptions;
  onInputChange: (value: string) => void;
  onOptionsChange: (nextOptions: MotionGenesisRunOptions) => void;
  onSimulationSettingsChange: (value: string) => void;
  onRun: () => void;
  onStop: () => void;
  onSendInput: () => void;
  run: MotionGenesisRunState | null;
  simulationSettings: string | null | undefined;
  starting: boolean;
  stopping: boolean;
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

function getStatusVariant(run: MotionGenesisRunState | null): 'outline' | 'primary' | 'warning' | 'destructive' {
  if (!run) {
    return 'outline';
  }
  if (run.status === 'waiting-input') {
    return 'warning';
  }
  if (run.status === 'success') {
    return 'primary';
  }
  if (run.status === 'failed') {
    return 'destructive';
  }
  return 'outline';
}

function StatusIcon({ run }: { run: MotionGenesisRunState | null }) {
  if (!run) {
    return <SquareTerminal className="h-3.5 w-3.5" />;
  }
  if (run.status === 'waiting-input') {
    return <TriangleAlert className="h-3.5 w-3.5" />;
  }
  if (run.status === 'success') {
    return <CheckCircle2 className="h-3.5 w-3.5" />;
  }
  if (run.status === 'failed') {
    return <TriangleAlert className="h-3.5 w-3.5" />;
  }
  return <CircleDotDashed className="h-3.5 w-3.5 animate-spin" />;
}

function getSceneDirectoryPath(scenePath: string | null): string {
  if (!scenePath) {
    return '.';
  }

  const basePath = getBasePath(scenePath).replace(/\/$/, '');
  return basePath.length > 0 ? basePath : '.';
}

function resolveSelectedPath(sceneDirectoryPath: string, simulationSettings: string | null | undefined): string | null {
  const trimmedSettings = simulationSettings?.trim();
  if (!trimmedSettings) {
    return null;
  }

  return sceneDirectoryPath === '.' ? trimmedSettings : `${sceneDirectoryPath}/${trimmedSettings}`;
}

function isMotionGenesisInputPath(filePath: string): boolean {
  return /\.(al|txt|in)$/i.test(filePath);
}

export default function MotionGenesisRunPanel({
  canRun,
  error,
  input,
  loadedScenePath,
  options,
  onInputChange,
  onOptionsChange,
  onSimulationSettingsChange,
  onRun,
  onStop,
  onSendInput,
  run,
  simulationSettings,
  starting,
  stopping,
  sendingInput,
}: MotionGenesisRunPanelProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [activeFlyout, setActiveFlyout] = useState<'configure' | 'status' | null>(null);
  const [browserListing, setBrowserListing] = useState<FileBrowserListing | null>(null);
  const [browserError, setBrowserError] = useState<string | null>(null);
  const [browserLoading, setBrowserLoading] = useState(false);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const flyoutRef = useRef<HTMLDivElement | null>(null);
  const headerRef = useRef<HTMLDivElement | null>(null);
  const outputRef = useRef<HTMLTextAreaElement | null>(null);

  const runActive = run?.status === 'running' || run?.status === 'waiting-input';
  const runDisabledReason = !loadedScenePath
    ? 'Load a workspace scene to run Motion Genesis.'
    : !simulationSettings
      ? 'This scene does not define simulationSettings.'
      : null;
  const output = run?.output ?? '';
  const sceneDirectoryPath = useMemo(() => getSceneDirectoryPath(loadedScenePath), [loadedScenePath]);
  const statusLabel = useMemo(() => getStatusLabel(run), [run]);
  const statusVariant = useMemo(() => getStatusVariant(run), [run]);
  const selectedRelativePath = useMemo(() => {
    if (!selectedPath || !loadedScenePath) {
      return null;
    }

    return getRelativePath(getBasePath(loadedScenePath), selectedPath);
  }, [loadedScenePath, selectedPath]);

  const browse = async (path: string) => {
    setBrowserLoading(true);
    setBrowserError(null);

    try {
      setBrowserListing(await listLocalFiles(path, 'workspace'));
    } catch (browseError) {
      setBrowserListing(null);
      setBrowserError(browseError instanceof Error ? browseError.message : 'Unknown browse error');
    } finally {
      setBrowserLoading(false);
    }
  };

  const closeSimulationFilePicker = () => {
    setPickerOpen(false);
    setActiveFlyout('configure');
  };

  const applySelectedSimulationPath = (relativePath: string | null) => {
    if (!relativePath) {
      return;
    }

    onSimulationSettingsChange(relativePath);
    closeSimulationFilePicker();
  };

  useEffect(() => {
    if (!pickerOpen) {
      return;
    }

    setSelectedPath(resolveSelectedPath(sceneDirectoryPath, simulationSettings));
    void browse(sceneDirectoryPath);
  }, [pickerOpen, sceneDirectoryPath, simulationSettings]);

  useEffect(() => {
    if (!activeFlyout) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (pickerOpen) {
        return;
      }

      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }
      if (headerRef.current?.contains(target) || flyoutRef.current?.contains(target)) {
        return;
      }
      setActiveFlyout(null);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (pickerOpen || event.defaultPrevented) {
          return;
        }
        setActiveFlyout(null);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeFlyout, pickerOpen]);

  return (
    <div className="relative grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)_auto] gap-2">
      <div className="relative" ref={headerRef}>
        <div className="grid gap-2 rounded-md border border-border bg-muted/20 p-2">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="grid gap-1">
              <span className="text-[0.68rem] uppercase tracking-wide text-muted-foreground">Motion Genesis</span>
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge variant={statusVariant} className="gap-1 rounded-md px-2 py-1 text-[0.72rem]">
                  <StatusIcon run={run} />
                  {statusLabel}
                </Badge>
                {run?.canSendInput ? (
                  <Badge variant="warning" className="rounded-md px-2 py-1 text-[0.72rem]">
                    Interactive
                  </Badge>
                ) : null}
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-1.5">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className={cn(
                  activeFlyout === 'configure' &&
                    'border-primary/40 bg-accent text-accent-foreground shadow-sm'
                )}
                aria-expanded={activeFlyout === 'configure'}
                onClick={() => setActiveFlyout(activeFlyout === 'configure' ? null : 'configure')}
              >
                <Settings2 className="h-3.5 w-3.5" />
                Configure
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className={cn(
                  activeFlyout === 'status' && 'border-primary/40 bg-accent text-accent-foreground shadow-sm'
                )}
                aria-expanded={activeFlyout === 'status'}
                onClick={() => setActiveFlyout(activeFlyout === 'status' ? null : 'status')}
              >
                <SquareTerminal className="h-3.5 w-3.5" />
                Status
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={onStop}
                disabled={!runActive || stopping}
              >
                {stopping ? 'Stopping…' : 'Stop'}
              </Button>
              <Button type="button" size="sm" onClick={onRun} disabled={!canRun || starting || runActive}>
                {starting ? 'Running…' : 'Run Sim'}
              </Button>
            </div>
          </div>
        </div>
        {runDisabledReason ? (
          <p className="text-xs text-muted-foreground">{runDisabledReason}</p>
        ) : null}
        {error ? <p className="text-xs text-destructive">{error}</p> : null}

        {activeFlyout ? (
          <div
            ref={flyoutRef}
            className="absolute inset-x-0 top-full z-20 mt-2 rounded-md border border-border bg-popover p-3 text-popover-foreground shadow-lg"
          >
            {activeFlyout === 'configure' ? (
              <div className="grid gap-3">
                <div className="grid gap-1.5 rounded-md border border-border/70 bg-background/80 p-3 text-xs">
                  <span className="font-medium text-foreground">Simulation</span>
                  <div className="text-muted-foreground">
                    Scene: <code className="text-foreground">{loadedScenePath ?? 'No workspace scene loaded'}</code>
                  </div>
                  <div className="text-muted-foreground">
                    Simulation file:{' '}
                    <button
                      type="button"
                      className="group cursor-pointer rounded-sm text-primary underline decoration-primary decoration-2 underline-offset-[3px] transition-colors hover:text-primary/80 hover:decoration-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:no-underline disabled:opacity-50"
                      onClick={() => setPickerOpen(true)}
                      disabled={loadedScenePath === null}
                    >
                      <code className="font-mono text-inherit group-hover:text-inherit">
                        {simulationSettings?.trim() ? simulationSettings : '<click to select>'}
                      </code>
                    </button>
                  </div>
                  <div className="text-muted-foreground">
                    Motion Genesis executable:{' '}
                    <code className="text-foreground">{run?.command ?? '/Applications/MotionGenesis/MotionGenesis'}</code>
                  </div>
                </div>

                <div className="grid gap-2 rounded-md border border-border/70 bg-background/80 p-3 text-xs">
                  <span className="font-medium text-foreground">Run Options</span>
                  <label className="flex items-center gap-2 text-muted-foreground">
                    <Checkbox
                      checked={options.autoQuit}
                      onCheckedChange={(checked) => onOptionsChange({ ...options, autoQuit: checked === true })}
                    />
                    <span className="text-foreground">Auto-quit at end of file</span>
                  </label>
                  <label className="flex items-center gap-2 text-muted-foreground">
                    <Checkbox
                      checked={options.autoDefaultValues}
                      onCheckedChange={(checked) =>
                        onOptionsChange({ ...options, autoDefaultValues: checked === true })
                      }
                    />
                    <span className="text-foreground">Auto-send default value prompts</span>
                  </label>
                  <label className="flex items-center gap-2 text-muted-foreground">
                    <Checkbox
                      checked={options.debug}
                      onCheckedChange={(checked) => onOptionsChange({ ...options, debug: checked === true })}
                    />
                    <span className="text-foreground">Verbose / debug output</span>
                  </label>
                </div>
              </div>
            ) : (
              <div className="grid gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={statusVariant} className="gap-1 rounded-md px-2 py-1 text-[0.72rem]">
                    <StatusIcon run={run} />
                    {statusLabel}
                  </Badge>
                  {run && run.exitCode !== null ? (
                    <Badge
                      variant={run.exitCode === 0 ? 'primary' : 'destructive'}
                      className="rounded-md px-2 py-1 text-[0.72rem]"
                    >
                      Exit Code: {run.exitCode}
                    </Badge>
                  ) : null}
                  {run && run.pid ? (
                    <Badge variant="outline" className="rounded-md px-2 py-1 text-[0.72rem]">
                      PID: {run.pid}
                    </Badge>
                  ) : null}
                </div>

                {run ? (
                  <div className="grid gap-1 rounded-md border border-border/70 bg-background/80 p-3 text-[0.72rem] text-muted-foreground">
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
                      Workspace Root: <code className="text-foreground">{run.workspaceRoot}</code>
                    </div>
                    <div>
                      Scene: <code className="text-foreground">{run.scenePath}</code>
                    </div>
                    <div>
                      Scene File: <code className="text-foreground">{run.sceneFilePath}</code>
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
                  </div>
                ) : (
                  <div className="rounded-md border border-border/70 bg-background/80 p-3 text-[0.72rem] text-muted-foreground">
                    No run metadata yet. Start a simulation to populate process details.
                  </div>
                )}
              </div>
            )}
          </div>
        ) : null}
      </div>

      <div className="relative h-full min-h-0">
        <div className="pointer-events-none absolute right-2 top-2 z-10 flex flex-col gap-0.5">
          <Button
            type="button"
            size="icon"
            variant="outline"
            className="pointer-events-auto h-6 w-6 bg-background/90 shadow-sm"
            aria-label="Scroll to top"
            onClick={() => {
              const outputElement = outputRef.current;
              if (outputElement) {
                outputElement.scrollTop = 0;
              }
            }}
          >
            <ArrowUpToLine className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="outline"
            className="pointer-events-auto h-6 w-6 bg-background/90 shadow-sm"
            aria-label="Scroll to bottom"
            onClick={() => {
              const outputElement = outputRef.current;
              if (outputElement) {
                outputElement.scrollTop = outputElement.scrollHeight;
              }
            }}
          >
            <ArrowDownToLine className="h-3.5 w-3.5" />
          </Button>
        </div>
        <textarea
          ref={outputRef}
          className="h-full min-h-0 w-full resize-none rounded-md border border-border bg-background py-2 pl-3 pr-10 font-mono text-xs leading-5 text-foreground"
          readOnly
          spellCheck={false}
          value={output}
        />
      </div>

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

      {pickerOpen ? (
        <OverlayPanel
          title="Select Simulation File"
          subtitle="Pick the Motion Genesis input file for this scene."
          size="narrow"
          onClose={closeSimulationFilePicker}
        >
          <div className="grid gap-2">
            <div className="grid gap-1 text-xs">
              <div className="text-muted-foreground">
                Scene: <code className="text-foreground">{loadedScenePath ?? 'No workspace scene loaded'}</code>
              </div>
              <div className="text-muted-foreground">
                Current: <code className="text-foreground">{simulationSettings?.trim() || 'Not set'}</code>
              </div>
              <div className="text-muted-foreground">
                Selected: <code className="text-foreground">{selectedRelativePath ?? 'Choose a file below'}</code>
              </div>
            </div>

            <Separator />

            <LocalFileBrowser
              browserListing={browserListing}
              browserError={browserError}
              browserLoading={browserLoading}
              compact
              flat
              emptyStateMessage="Browse to a Motion Genesis input file."
              filterEntry={(entry) => entry.type === 'directory' || isMotionGenesisInputPath(entry.path)}
              hideTitle
              sceneInput={loadedScenePath ?? sceneDirectoryPath}
              selectedPaths={selectedPath ? [selectedPath] : []}
              onBrowse={(path) => {
                void browse(path);
              }}
              onOpenFile={(path) => {
                setSelectedPath(path);
                applySelectedSimulationPath(getRelativePath(getBasePath(loadedScenePath ?? ''), path));
              }}
              onSelectFile={(path) => {
                setSelectedPath(path);
              }}
              getDirectoryPath={getDirectoryPath}
            />

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={closeSimulationFilePicker}>
                Cancel
              </Button>
              <Button
                type="button"
                disabled={!selectedRelativePath}
                onClick={() => {
                  applySelectedSimulationPath(selectedRelativePath);
                }}
              >
                Select
              </Button>
            </div>
          </div>
        </OverlayPanel>
      ) : null}

    </div>
  );
}
