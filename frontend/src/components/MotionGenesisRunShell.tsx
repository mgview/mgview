import {
  CheckCircle2,
  Columns2,
  FileText,
  Settings2,
  SquareTerminal,
  TriangleAlert,
} from 'lucide-react';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';
import type { MotionGenesisRunOptions, MotionGenesisRunState } from '../api/localFiles.ts';
import { useMotionGenesisRuntime } from '../hooks/useMotionGenesisRuntime.ts';
import {
  useMotionGenesisRunPreferences,
  type MotionGenesisRunLayoutMode,
} from '../hooks/useMotionGenesisRunPreferences.ts';
import { cn } from '../lib/utils.ts';
import CodeEditor from './CodeEditor.tsx';
import MotionGenesisExecutableOverlay from './MotionGenesisExecutableOverlay.tsx';
import MotionGenesisRunOutput from './MotionGenesisRunOutput.tsx';
import { Badge } from './ui/badge.tsx';
import { Button } from './ui/button.tsx';
import { Checkbox } from './ui/checkbox.tsx';
import { Input } from './ui/input.tsx';

const SPLITTER_WIDTH = 8;
const SPLITTER_GAP = 8;
const SPLITTER_FOOTPRINT = SPLITTER_WIDTH + SPLITTER_GAP * 2;
const MIN_EDITOR_PANEL_WIDTH = 320;
const MIN_OUTPUT_PANEL_WIDTH = 320;

export interface MotionGenesisRunShellProps {
  run: MotionGenesisRunState | null;
  error: string | null;
  input: string;
  options: MotionGenesisRunOptions;
  starting: boolean;
  stopping: boolean;
  sendingInput: boolean;
  canRun: boolean;
  runDisabledReason?: string | null;
  runButtonLabel?: 'Run' | 'Run Sim';
  onInputChange: (value: string) => void;
  onOptionsChange: (options: MotionGenesisRunOptions) => void;
  onRun: () => void | Promise<void>;
  onStop: () => void;
  onSendInput: () => void;

  editorValue: string;
  onEditorChange: (value: string) => void;
  editorLoading: boolean;
  editorError?: string | null;
  editorFilePath: string | null;
  editorEmptyMessage?: string;
  editorReadOnly?: boolean;
  onEditorRun?: () => void | Promise<void>;

  canOpenExecutablePicker: boolean;
  defaultLayoutMode?: MotionGenesisRunLayoutMode;

  scenePath?: string | null;
  simulationFilePath?: string | null;

  configureExtras?: ReactNode;

  className?: string;
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

function getStatusVariant(
  run: MotionGenesisRunState | null
): 'outline' | 'primary' | 'warning' | 'destructive' {
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
  const status = run?.status ?? 'idle';
  if (status === 'success') {
    return <CheckCircle2 className="h-3 w-3" />;
  }
  if (status === 'failed' || status === 'waiting-input') {
    return <TriangleAlert className="h-3 w-3" />;
  }
  return <SquareTerminal className={cn('h-3 w-3', status === 'running' && 'animate-spin')} />;
}

export default function MotionGenesisRunShell({
  run,
  error,
  input,
  options,
  starting,
  stopping,
  sendingInput,
  canRun,
  runDisabledReason = null,
  runButtonLabel = 'Run',
  onInputChange,
  onOptionsChange,
  onRun,
  onStop,
  onSendInput,
  editorValue,
  onEditorChange,
  editorLoading,
  editorError = null,
  editorFilePath,
  editorEmptyMessage = 'Open a Motion Genesis input file to start editing.',
  editorReadOnly = false,
  onEditorRun,
  canOpenExecutablePicker,
  defaultLayoutMode = 'split',
  scenePath = null,
  simulationFilePath = null,
  configureExtras = null,
  className,
}: MotionGenesisRunShellProps) {
  const motionGenesisRuntime = useMotionGenesisRuntime();
  const { layoutMode, setLayoutMode, setSplitRatio, setVimMode, splitRatio, vimMode } =
    useMotionGenesisRunPreferences(defaultLayoutMode);

  const [showConfigure, setShowConfigure] = useState(false);
  const [showStatusDetails, setShowStatusDetails] = useState(false);
  const [isDesktopLayout, setIsDesktopLayout] = useState(false);

  const outputRef = useRef<HTMLDivElement | null>(null);
  const contentSectionRef = useRef<HTMLElement | null>(null);
  const stdinInputRef = useRef<HTMLInputElement | null>(null);
  const prevStatusRef = useRef<string>('idle');
  const userChoseEditorWhileWaitingRef = useRef(false);
  const pendingStdinFocusRef = useRef(false);

  const runActive = run?.status === 'running' || run?.status === 'waiting-input';
  const editorLocked = runActive || editorReadOnly;
  const status = run?.status ?? 'idle';
  const statusLabel = useMemo(() => getStatusLabel(run), [run]);
  const statusVariant = useMemo(() => getStatusVariant(run), [run]);
  const resolvedCommand = run?.command ?? motionGenesisRuntime.runtimeInfo?.command ?? 'Not configured';
  const ptySetupError = motionGenesisRuntime.runtimeInfo?.ptyError ?? null;
  const output = run?.output ?? '';

  const chooseLayoutMode = useCallback(
    (nextMode: MotionGenesisRunLayoutMode) => {
      if (status === 'waiting-input' && nextMode === 'editor') {
        userChoseEditorWhileWaitingRef.current = true;
      }
      setLayoutMode(nextMode);
    },
    [setLayoutMode, status]
  );

  useEffect(() => {
    if (!runActive) {
      userChoseEditorWhileWaitingRef.current = false;
    }
  }, [run?.id, runActive]);

  useEffect(() => {
    const prevStatus = prevStatusRef.current;
    prevStatusRef.current = status;

    if (status !== 'waiting-input' || prevStatus === 'waiting-input') {
      return;
    }

    if (layoutMode === 'editor') {
      if (!userChoseEditorWhileWaitingRef.current) {
        setLayoutMode('output-only');
        pendingStdinFocusRef.current = true;
      }
      return;
    }

    pendingStdinFocusRef.current = true;
  }, [layoutMode, setLayoutMode, status]);

  const focusStdinForInput = useCallback(() => {
    if (status !== 'waiting-input') {
      return;
    }
    if (layoutMode === 'editor') {
      chooseLayoutMode('output-only');
    }
    pendingStdinFocusRef.current = true;
  }, [chooseLayoutMode, layoutMode, status]);

  useEffect(() => {
    if (!pendingStdinFocusRef.current || status !== 'waiting-input' || layoutMode === 'editor') {
      return;
    }

    pendingStdinFocusRef.current = false;
    const frame = window.requestAnimationFrame(() => {
      stdinInputRef.current?.focus();
      stdinInputRef.current?.select();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [layoutMode, status]);

  const handleStatusClick = useCallback(() => {
    if (status === 'waiting-input') {
      focusStdinForInput();
      return;
    }
    setShowStatusDetails((current) => !current);
  }, [focusStdinForInput, status]);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 1024px)');
    const updateDesktopLayout = () => {
      setIsDesktopLayout(mediaQuery.matches);
    };

    updateDesktopLayout();
    mediaQuery.addEventListener('change', updateDesktopLayout);
    return () => mediaQuery.removeEventListener('change', updateDesktopLayout);
  }, []);

  const clampContentSplit = useCallback((value: number, containerWidth: number) => {
    const availableWidth = containerWidth - SPLITTER_FOOTPRINT;
    if (availableWidth <= 0) {
      return 0.5;
    }

    const minimum = MIN_EDITOR_PANEL_WIDTH / availableWidth;
    const maximum = 1 - MIN_OUTPUT_PANEL_WIDTH / availableWidth;
    if (maximum <= minimum) {
      return 0.5;
    }

    return Math.min(maximum, Math.max(minimum, value));
  }, []);

  useEffect(() => {
    if (!isDesktopLayout || layoutMode !== 'split') {
      return;
    }

    const updateClamp = () => {
      const container = contentSectionRef.current;
      if (!container) {
        return;
      }
      setSplitRatio((current) => clampContentSplit(current, container.clientWidth));
    };

    updateClamp();
    window.addEventListener('resize', updateClamp);
    return () => window.removeEventListener('resize', updateClamp);
  }, [clampContentSplit, isDesktopLayout, layoutMode, setSplitRatio]);

  const startContentSplitDrag = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!isDesktopLayout || layoutMode !== 'split') {
        return;
      }

      const container = contentSectionRef.current;
      if (!container) {
        return;
      }

      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);
      const bounds = container.getBoundingClientRect();
      const availableWidth = bounds.width - SPLITTER_FOOTPRINT;
      if (availableWidth <= 0) {
        return;
      }

      document.body.classList.add('workspace-splitter-dragging');

      const updateValue = (clientX: number) => {
        const rawValue = (clientX - bounds.left - SPLITTER_FOOTPRINT / 2) / availableWidth;
        setSplitRatio(clampContentSplit(rawValue, bounds.width));
      };

      updateValue(event.clientX);

      const handlePointerMove = (moveEvent: PointerEvent) => {
        updateValue(moveEvent.clientX);
      };

      const finishDrag = () => {
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', finishDrag);
        window.removeEventListener('pointercancel', finishDrag);
        document.body.classList.remove('workspace-splitter-dragging');
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
          event.currentTarget.releasePointerCapture(event.pointerId);
        }
      };

      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', finishDrag);
      window.addEventListener('pointercancel', finishDrag);
    },
    [clampContentSplit, isDesktopLayout, layoutMode, setSplitRatio]
  );

  const contentSectionStyle = useMemo((): CSSProperties | undefined => {
    if (!isDesktopLayout || layoutMode !== 'split') {
      return undefined;
    }

    return {
      gridTemplateColumns: `minmax(${MIN_EDITOR_PANEL_WIDTH}px, calc((100% - ${SPLITTER_FOOTPRINT}px) * ${splitRatio})) ${SPLITTER_WIDTH}px minmax(${MIN_OUTPUT_PANEL_WIDTH}px, calc((100% - ${SPLITTER_FOOTPRINT}px) * ${1 - splitRatio}))`,
    };
  }, [isDesktopLayout, layoutMode, splitRatio]);

  const renderRunStateOverlay = (interactive: boolean) => {
    if (!runActive) {
      return null;
    }

    const badge = (
      <div
        className={cn(
          'inline-flex items-center gap-3 rounded-full border px-4 py-2 font-mono text-xs font-semibold uppercase tracking-[0.18em] shadow-lg backdrop-blur',
          status === 'waiting-input'
            ? 'border-amber-700/35 bg-amber-100/92 text-amber-950 dark:border-amber-400/60 dark:bg-amber-500/15 dark:text-amber-100'
            : 'border-sky-700/35 bg-sky-100/92 text-sky-950 dark:border-sky-400/60 dark:bg-sky-500/15 dark:text-sky-100'
        )}
      >
        <SquareTerminal className={cn('h-4 w-4', status === 'running' && 'animate-spin')} />
        <span>{status === 'waiting-input' ? 'Waiting For Input' : 'Running'}</span>
      </div>
    );

    return (
      <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center p-6">
        {interactive && status === 'waiting-input' ? (
          <button
            type="button"
            className="pointer-events-auto rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Waiting for input. Click to focus the command input."
            onClick={focusStdinForInput}
          >
            {badge}
          </button>
        ) : (
          badge
        )}
      </div>
    );
  };

  const renderEditorPanel = () => (
    <div className="relative grid h-full min-h-0 min-w-0 grid-rows-[minmax(0,1fr)] rounded-xl border border-border bg-card p-2 shadow-sm">
      {renderRunStateOverlay(status === 'waiting-input')}
      {editorLoading ? (
        <div className="flex min-h-0 items-center justify-center rounded-md border border-border bg-background text-sm text-muted-foreground">
          Loading Motion Genesis file…
        </div>
      ) : editorFilePath ? (
        <CodeEditor
          className={cn('min-h-0 transition-[filter,opacity] duration-150', runActive && 'opacity-55 grayscale-[0.2]')}
          onChange={onEditorChange}
          onRun={onEditorRun}
          readOnly={editorLocked}
          value={editorValue}
          vimMode={vimMode}
        />
      ) : (
        <div className="flex min-h-0 items-center justify-center rounded-md border border-dashed border-border bg-muted/10 px-6 text-center text-sm text-muted-foreground">
          {editorEmptyMessage}
        </div>
      )}
    </div>
  );

  const renderOutputPanel = () => (
    <div className="min-h-0 h-full overflow-hidden">
      <MotionGenesisRunOutput
        ref={outputRef}
        output={output}
        className="h-full min-h-0 rounded-xl border border-border bg-card p-2 shadow-sm"
        runId={run?.id ?? null}
        runStatus={status}
        showToolbar
        waitingInputOverlay={
          status === 'waiting-input' && layoutMode !== 'split' ? renderRunStateOverlay(true) : null
        }
      />
    </div>
  );

  const renderStdin = () => (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 border-t border-border/70 pt-2">
      <Input
        ref={stdinInputRef}
        type="text"
        className="font-mono transition-colors focus:border-ring focus:bg-accent focus:outline-none focus:ring-0 focus-visible:ring-0"
        value={input}
        onChange={(event) => onInputChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            onSendInput();
          }
        }}
        placeholder="Send one line of input to the running Motion Genesis process"
        disabled={!run?.canSendInput || sendingInput}
      />
      <Button
        type="button"
        variant="outline"
        disabled={!run?.canSendInput || sendingInput}
        onClick={onSendInput}
      >
        {sendingInput ? 'Sending…' : 'Send'}
      </Button>
    </div>
  );

  const renderContent = () => {
    if (layoutMode === 'output-only') {
      return (
        <div className="grid h-full min-h-0 grid-rows-[minmax(0,1fr)_auto] gap-2">
          {renderOutputPanel()}
          {renderStdin()}
        </div>
      );
    }

    if (layoutMode === 'editor') {
      return <div className="grid h-full min-h-0">{renderEditorPanel()}</div>;
    }

    return (
      <section ref={contentSectionRef} className="grid h-full min-h-0 gap-2" style={contentSectionStyle}>
        {renderEditorPanel()}
        <div
          role="separator"
          aria-label="Resize editor and output"
          aria-orientation="vertical"
          className="workspace-horizontal-splitter hidden lg:block"
          onPointerDown={startContentSplitDrag}
        />
        <div className="grid h-full min-h-0 min-w-0 grid-rows-[minmax(0,1fr)_auto] gap-2">
          {renderOutputPanel()}
          {renderStdin()}
        </div>
      </section>
    );
  };

  const renderStatusDetails = () => (
    <div className="grid gap-2 border-t border-border/70 pt-2">
      <div className="flex flex-wrap items-center gap-2">
        {run && run.exitCode !== null ? (
          <Badge
            variant={run.exitCode === 0 ? 'primary' : 'destructive'}
            className="rounded-md px-2 py-1 text-[0.72rem]"
          >
            Exit Code: {run.exitCode}
          </Badge>
        ) : null}
        {run?.pid ? (
          <Badge variant="outline" className="rounded-md px-2 py-1 text-[0.72rem]">
            PID: {run.pid}
          </Badge>
        ) : null}
      </div>
      {run ? (
        <div className="grid gap-1 text-[0.72rem] text-muted-foreground">
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
          {run.scenePath ? (
            <div>
              Scene: <code className="text-foreground">{run.scenePath}</code>
            </div>
          ) : scenePath ? (
            <div>
              Scene: <code className="text-foreground">{scenePath}</code>
            </div>
          ) : null}
          {run.sceneFilePath ? (
            <div>
              Scene File: <code className="text-foreground">{run.sceneFilePath}</code>
            </div>
          ) : simulationFilePath ? (
            <div>
              Scene File: <code className="text-foreground">{simulationFilePath}</code>
            </div>
          ) : null}
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
        <div className="text-[0.72rem] text-muted-foreground">
          No run metadata yet. Start a simulation to populate process details.
        </div>
      )}
    </div>
  );

  const renderConfigureSection = () => (
    <div className="grid gap-3 border-t border-border/70 pt-2">
      {configureExtras}
      <div className="grid gap-1 text-sm">
        <div className="min-w-0">
          <span className="text-muted-foreground">Command: </span>
          {canOpenExecutablePicker ? (
            <button
              type="button"
              className="rounded-sm text-left underline decoration-dotted underline-offset-4 transition-colors hover:text-primary"
              onClick={motionGenesisRuntime.openPicker}
            >
              <code className="break-all text-foreground">{resolvedCommand}</code>
            </button>
          ) : (
            <code className="break-all text-foreground">{resolvedCommand}</code>
          )}
        </div>
        {ptySetupError ? (
          <pre className="overflow-x-auto whitespace-pre-wrap text-xs text-destructive">{ptySetupError}</pre>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <label className="flex items-center gap-2">
          <Checkbox
            checked={options.autoQuit}
            onCheckedChange={(checked) => onOptionsChange({ ...options, autoQuit: checked === true })}
          />
          <span className="text-foreground">Auto-quit</span>
        </label>
        <label className="flex items-center gap-2">
          <Checkbox
            checked={options.autoDefaultValues}
            onCheckedChange={(checked) => onOptionsChange({ ...options, autoDefaultValues: checked === true })}
          />
          <span className="text-foreground">Auto defaults</span>
        </label>
        <label className="flex items-center gap-2">
          <Checkbox
            checked={options.debug}
            onCheckedChange={(checked) => onOptionsChange({ ...options, debug: checked === true })}
          />
          <span className="text-foreground">Debug output</span>
        </label>
        <label className="flex items-center gap-2">
          <span className="text-foreground">Scrollback</span>
          <Input
            type="number"
            min="0"
            step="10"
            inputMode="numeric"
            className="h-8 w-28"
            value={String(options.scrollbackLimit)}
            onChange={(event) => {
              const nextValue = event.target.value.trim();
              const parsed = nextValue.length === 0 ? 0 : Number.parseInt(nextValue, 10);
              onOptionsChange({
                ...options,
                scrollbackLimit: Number.isFinite(parsed) && parsed >= 0 ? parsed : 0,
              });
            }}
          />
          <span className="text-[11px]">lines, `0` = all</span>
        </label>
        <label className="flex items-center gap-2">
          <Checkbox
            checked={vimMode}
            disabled={editorLoading || !editorFilePath}
            onCheckedChange={(checked) => setVimMode(checked === true)}
          />
          <span className="text-foreground">Vim</span>
        </label>
      </div>
    </div>
  );

  return (
    <div className={cn('grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-2', className)}>
      <div className="grid gap-1.5 rounded-xl border border-border bg-card px-2.5 py-1.5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              className="group inline-flex h-6 cursor-pointer items-center rounded-md transition-shadow hover:ring-2 hover:ring-ring/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-expanded={showStatusDetails}
              title={
                status === 'waiting-input'
                  ? 'Click to show run output'
                  : showStatusDetails
                    ? 'Click to hide run details'
                    : 'Click for run details'
              }
              aria-label={
                status === 'waiting-input'
                  ? `Run status: ${statusLabel}. Click to show run output.`
                  : `Run status: ${statusLabel}. Click for details.`
              }
              onClick={handleStatusClick}
            >
              <Badge
                variant={statusVariant}
                className="h-6 gap-1 rounded-md px-2 py-0 text-[0.72rem] transition-colors group-hover:brightness-95 dark:group-hover:brightness-110"
              >
                <StatusIcon run={run} />
                {statusLabel}
              </Badge>
            </button>
            {run?.canSendInput ? (
              <Badge variant="warning" className="h-6 rounded-md px-2 py-0 text-[0.72rem]">
                Interactive
              </Badge>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <Button
              type="button"
              size="sm"
              variant={showConfigure ? 'default' : 'outline'}
              onClick={() => setShowConfigure((current) => !current)}
            >
              <Settings2 className="h-3 w-3" />
              Configure
            </Button>
            <div className="inline-flex h-6 items-center gap-0.5 rounded-md border border-border p-0.5">
              <Button
                type="button"
                size="sm"
                variant={layoutMode === 'split' ? 'default' : 'ghost'}
                className="h-5 w-5 p-0"
                aria-label="Split layout"
                onClick={() => chooseLayoutMode('split')}
              >
                <Columns2 className="h-3 w-3" />
              </Button>
              <Button
                type="button"
                size="sm"
                variant={layoutMode === 'editor' ? 'default' : 'ghost'}
                className="h-5 w-5 p-0"
                aria-label="Editor only"
                onClick={() => chooseLayoutMode('editor')}
              >
                <FileText className="h-3 w-3" />
              </Button>
              <Button
                type="button"
                size="sm"
                variant={layoutMode === 'output-only' ? 'default' : 'ghost'}
                className="h-5 w-5 p-0"
                aria-label="Run output only"
                onClick={() => chooseLayoutMode('output-only')}
              >
                <SquareTerminal className="h-3 w-3" />
              </Button>
            </div>
            <Button type="button" variant="outline" size="sm" disabled={!runActive || stopping} onClick={onStop}>
              {stopping ? 'Stopping…' : 'Stop'}
            </Button>
            <Button type="button" size="sm" disabled={!canRun || starting || runActive} onClick={onRun}>
              {starting ? 'Running…' : runButtonLabel}
            </Button>
          </div>
        </div>
        {runDisabledReason ? <p className="text-xs text-muted-foreground">{runDisabledReason}</p> : null}
        {error ? <p className="text-xs text-destructive">{error}</p> : null}
        {editorError ? <p className="text-xs text-destructive">{editorError}</p> : null}
        {showStatusDetails ? renderStatusDetails() : null}
        {showConfigure ? renderConfigureSection() : null}
      </div>

      <div className="min-h-0 h-full overflow-hidden">{renderContent()}</div>

      {motionGenesisRuntime.pickerOpen ? (
        <MotionGenesisExecutableOverlay
          draftExecutablePath={motionGenesisRuntime.draftExecutablePath}
          errorMessage={motionGenesisRuntime.error}
          runtimeInfo={motionGenesisRuntime.runtimeInfo}
          saving={motionGenesisRuntime.saving}
          onApply={() => {
            void motionGenesisRuntime.applyExecutablePath();
          }}
          onClearConfigured={() => {
            void motionGenesisRuntime.clearConfiguredExecutable();
          }}
          onClose={motionGenesisRuntime.closePicker}
          onDraftChange={motionGenesisRuntime.setDraftExecutablePath}
          onSelectCandidate={motionGenesisRuntime.selectCandidate}
        />
      ) : null}
    </div>
  );
}
