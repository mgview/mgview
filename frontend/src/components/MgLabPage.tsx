import { ArrowDownToLine, ArrowLeft, ArrowUpToLine, CheckCircle2, Code2, FolderOpen, RotateCcw, Save, SquareTerminal, TriangleAlert } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react';
import { listLocalFiles } from '../api/localFiles.ts';
import { getHomePath, inAppLinkProps } from '../core/appRoutes.ts';
import { getDirectoryPath } from '../hooks/useSceneWorkspace.ts';
import { useMotionGenesisRun } from '../hooks/useMotionGenesisRun.ts';
import { useWorkspaceTextFileEditor } from '../hooks/useWorkspaceTextFileEditor.ts';
import { cn } from '../lib/utils.ts';
import CodeEditor from './CodeEditor.tsx';
import LocalFileBrowser from './LocalFileBrowser.tsx';
import OverlayPanel from './OverlayPanel.tsx';
import { Badge } from './ui/badge.tsx';
import { Button } from './ui/button.tsx';
import { Checkbox } from './ui/checkbox.tsx';
import { Input } from './ui/input.tsx';
import { Separator } from './ui/separator.tsx';

const VIM_MODE_STORAGE_KEY = 'mgview-lab-editor-vim-mode';
const LAB_SPLITTER_WIDTH = 8;
const LAB_SPLITTER_GAP = 8;
const LAB_SPLITTER_FOOTPRINT = LAB_SPLITTER_WIDTH + LAB_SPLITTER_GAP * 2;
const MIN_EDITOR_PANEL_WIDTH = 320;
const MIN_OUTPUT_PANEL_WIDTH = 320;
const MG_LAB_FILE_QUERY_KEY = 'file';
const ODE_BLOCK_AUTO_COLLAPSE_LINE_COUNT = 8;

type OutputLineTone = 'default' | 'comment' | 'generated' | 'input' | 'ode-header' | 'ode-data';

type OdeBlockLine = {
  key: string;
  line: string;
  tone: OutputLineTone;
};

type OutputSegment =
  | {
      type: 'line';
      key: string;
      line: string;
      tone: OutputLineTone;
    }
  | {
      type: 'ode-block';
      key: string;
      commandLine: string;
      lines: OdeBlockLine[];
      collapsedByDefault: boolean;
    };

function getOutputLineTone(line: string): OutputLineTone {
  const trimmed = line.trimStart();
  if (/^\(\d+\)\s*%/.test(trimmed)) {
    return 'comment';
  }
  if (trimmed.startsWith('->')) {
    return 'generated';
  }
  if (/^\(\d+\)/.test(trimmed)) {
    return 'input';
  }
  return 'default';
}

function getOdeBlockLineTone(line: string): OutputLineTone {
  const trimmed = line.trimStart();
  if (trimmed.startsWith('%')) {
    return 'comment';
  }
  if (/^[+\-]?\d\.\d+E[+\-]\d+/.test(trimmed)) {
    return 'ode-data';
  }
  if (trimmed.length > 0) {
    return 'ode-header';
  }
  return 'default';
}

function parseOutputSegments(output: string): OutputSegment[] {
  const lines = output.split('\n');
  const segments: OutputSegment[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? '';
    const trimmed = line.trimStart();

    if (/^\(\d+\)\s+ODE\(\)/.test(trimmed)) {
      const blockLines: OdeBlockLine[] = [];
      let cursor = index + 1;
      while (cursor < lines.length) {
        const nextLine = lines[cursor] ?? '';
        if (/^ODE completed\b/.test(nextLine.trimStart())) {
          break;
        }
        blockLines.push({
          key: `ode-${index}-${cursor}`,
          line: nextLine,
          tone: getOdeBlockLineTone(nextLine),
        });
        cursor += 1;
      }

      if (blockLines.length > 0) {
        segments.push({
          type: 'ode-block',
          key: `ode-${index}`,
          commandLine: line,
          lines: blockLines,
          collapsedByDefault: blockLines.length >= ODE_BLOCK_AUTO_COLLAPSE_LINE_COUNT,
        });
        index = cursor - 1;
        continue;
      }
    }

    segments.push({
      type: 'line',
      key: `line-${index}-${line}`,
      line,
      tone: getOutputLineTone(line),
    });
  }

  return segments;
}

function getToneClassName(tone: OutputLineTone): string {
  if (tone === 'comment') {
    return 'text-emerald-700 dark:text-emerald-300';
  }
  if (tone === 'generated') {
    return 'text-sky-700 dark:text-sky-300';
  }
  if (tone === 'input') {
    return 'text-amber-800 dark:text-amber-100';
  }
  if (tone === 'ode-header') {
    return 'text-violet-700 dark:text-violet-200';
  }
  if (tone === 'ode-data') {
    return 'text-cyan-700 dark:text-cyan-100';
  }
  return 'text-foreground';
}

function isMotionGenesisInputPath(filePath: string): boolean {
  return /\.(al|txt|in)$/i.test(filePath);
}

function readStoredVimMode(): boolean {
  try {
    return window.localStorage.getItem(VIM_MODE_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

function getStatusVariant(
  status: 'running' | 'waiting-input' | 'success' | 'failed' | 'idle'
): 'outline' | 'primary' | 'warning' | 'destructive' {
  if (status === 'waiting-input') {
    return 'warning';
  }
  if (status === 'success') {
    return 'primary';
  }
  if (status === 'failed') {
    return 'destructive';
  }
  return 'outline';
}

export default function MgLabPage() {
  const [filePath, setFilePath] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    const value = params.get(MG_LAB_FILE_QUERY_KEY)?.trim() ?? '';
    return value.length > 0 ? value : null;
  });
  const [pickerOpen, setPickerOpen] = useState(false);
  const [browserListing, setBrowserListing] = useState<Awaited<ReturnType<typeof listLocalFiles>> | null>(null);
  const [browserError, setBrowserError] = useState<string | null>(null);
  const [browserLoading, setBrowserLoading] = useState(false);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [vimMode, setVimMode] = useState(readStoredVimMode);
  const [contentSplit, setContentSplit] = useState(0.58);
  const [isDesktopLayout, setIsDesktopLayout] = useState(false);
  const [collapsedOutputBlocks, setCollapsedOutputBlocks] = useState<Record<string, boolean>>({});
  const outputRef = useRef<HTMLDivElement | null>(null);
  const contentSectionRef = useRef<HTMLElement | null>(null);
  const outputAutoFollowRef = useRef(true);

  const fileEditor = useWorkspaceTextFileEditor({ filePath });
  const motionGenesisRun = useMotionGenesisRun();
  const run = motionGenesisRun.run;
  const runActive = run?.status === 'running' || run?.status === 'waiting-input';
  const status = run?.status ?? 'idle';
  const statusLabel = useMemo(() => {
    if (status === 'waiting-input') {
      return 'Waiting for input';
    }
    if (status === 'success') {
      return 'Success';
    }
    if (status === 'failed') {
      return 'Failed';
    }
    if (status === 'running') {
      return 'Running';
    }
    return 'Idle';
  }, [status]);

  useEffect(() => {
    if (!fileEditor.hasEdits) {
      return;
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [fileEditor.hasEdits]);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (filePath) {
      url.searchParams.set(MG_LAB_FILE_QUERY_KEY, filePath);
    } else {
      url.searchParams.delete(MG_LAB_FILE_QUERY_KEY);
    }
    window.history.replaceState(null, '', url.toString());
  }, [filePath]);

  const browse = useCallback(async (path: string) => {
    setBrowserLoading(true);
    setBrowserError(null);
    try {
      setBrowserListing(await listLocalFiles(path, 'workspace'));
    } catch (error) {
      setBrowserListing(null);
      setBrowserError(error instanceof Error ? error.message : 'Could not browse workspace files.');
    } finally {
      setBrowserLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!pickerOpen) {
      return;
    }

    setSelectedPath(filePath);
    void browse(getDirectoryPath(filePath ?? '.'));
  }, [browse, filePath, pickerOpen]);

  const confirmDiscardDraft = useCallback(
    (nextPath: string) => {
      if (!fileEditor.hasEdits) {
        return true;
      }

      return window.confirm(
        `Opening ${nextPath} will discard unsaved edits for ${filePath ?? 'the current file'}.\n\nContinue?`
      );
    },
    [fileEditor.hasEdits, filePath]
  );

  const openFile = useCallback(
    (nextPath: string) => {
      if (!confirmDiscardDraft(nextPath)) {
        return false;
      }

      setFilePath(nextPath);
      motionGenesisRun.setError(null);
      setPickerOpen(false);
      return true;
    },
    [confirmDiscardDraft, motionGenesisRun]
  );

  const handleSave = useCallback(async () => {
    if (!fileEditor.filePath) {
      motionGenesisRun.setError('Open a Motion Genesis file before saving.');
      return false;
    }
    if (!fileEditor.hasEdits) {
      return true;
    }

    const didSave = await fileEditor.saveFile();
    if (!didSave) {
      motionGenesisRun.setError(fileEditor.error ?? `Could not save ${fileEditor.filePath}.`);
      return false;
    }
    return true;
  }, [fileEditor, motionGenesisRun]);

  const handleRun = useCallback(async () => {
    if (!fileEditor.filePath) {
      motionGenesisRun.setError('Open a Motion Genesis file before running it.');
      return;
    }
    if (!isMotionGenesisInputPath(fileEditor.filePath)) {
      motionGenesisRun.setError('Choose a Motion Genesis input file with a .al, .txt, or .in extension.');
      return;
    }
    if (fileEditor.saving) {
      return;
    }

    if (fileEditor.hasEdits) {
      const didSave = await handleSave();
      if (!didSave) {
        return;
      }
    }

    void motionGenesisRun.beginFileRun(fileEditor.filePath);
  }, [fileEditor.filePath, fileEditor.hasEdits, fileEditor.saving, handleSave, motionGenesisRun]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        void handleSave();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSave]);

  const statusIcon =
    status === 'success' ? (
      <CheckCircle2 className="h-3.5 w-3.5" />
    ) : status === 'failed' || status === 'waiting-input' ? (
      <TriangleAlert className="h-3.5 w-3.5" />
    ) : (
      <SquareTerminal className={cn('h-3.5 w-3.5', status === 'running' && 'animate-spin')} />
    );

  const outputSegments = useMemo(() => {
    return parseOutputSegments(run?.output ?? '');
  }, [run?.output]);

  useEffect(() => {
    setCollapsedOutputBlocks((current) => {
      let changed = false;
      const next = { ...current };

      for (const segment of outputSegments) {
        if (segment.type !== 'ode-block' || segment.key in next) {
          continue;
        }
        next[segment.key] = segment.collapsedByDefault;
        changed = true;
      }

      return changed ? next : current;
    });
  }, [outputSegments]);

  const toggleOutputBlock = useCallback((key: string) => {
    setCollapsedOutputBlocks((current) => ({
      ...current,
      [key]: !current[key],
    }));
  }, []);

  useEffect(() => {
    const outputElement = outputRef.current;
    if (!outputElement || !outputAutoFollowRef.current) {
      return;
    }

    outputElement.scrollTop = outputElement.scrollHeight;
  }, [run?.output]);

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
    const availableWidth = containerWidth - LAB_SPLITTER_FOOTPRINT;
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
    if (!isDesktopLayout) {
      return;
    }

    const updateClamp = () => {
      const container = contentSectionRef.current;
      if (!container) {
        return;
      }
      setContentSplit((current) => clampContentSplit(current, container.clientWidth));
    };

    updateClamp();
    window.addEventListener('resize', updateClamp);
    return () => window.removeEventListener('resize', updateClamp);
  }, [clampContentSplit, isDesktopLayout]);

  const startContentSplitDrag = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!isDesktopLayout) {
        return;
      }

      const container = contentSectionRef.current;
      if (!container) {
        return;
      }

      event.preventDefault();
      const bounds = container.getBoundingClientRect();
      const availableWidth = bounds.width - LAB_SPLITTER_FOOTPRINT;
      if (availableWidth <= 0) {
        return;
      }

      document.body.classList.add('workspace-splitter-dragging');

      const updateValue = (clientX: number) => {
        const rawValue = (clientX - bounds.left - LAB_SPLITTER_FOOTPRINT / 2) / availableWidth;
        setContentSplit(clampContentSplit(rawValue, bounds.width));
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
      };

      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', finishDrag);
      window.addEventListener('pointercancel', finishDrag);
    },
    [clampContentSplit, isDesktopLayout]
  );

  const contentSectionStyle = useMemo((): CSSProperties | undefined => {
    if (!isDesktopLayout) {
      return undefined;
    }

    return {
      gridTemplateColumns: `minmax(${MIN_EDITOR_PANEL_WIDTH}px, calc((100% - ${LAB_SPLITTER_FOOTPRINT}px) * ${contentSplit})) ${LAB_SPLITTER_WIDTH}px minmax(${MIN_OUTPUT_PANEL_WIDTH}px, calc((100% - ${LAB_SPLITTER_FOOTPRINT}px) * ${1 - contentSplit}))`,
    };
  }, [contentSplit, isDesktopLayout]);

  return (
    <main className="grid h-screen grid-rows-[auto_auto_minmax(0,1fr)_auto] gap-2 overflow-hidden bg-background p-2 text-foreground">
      <header className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3 shadow-sm">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/50 px-3 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              <Code2 className="size-3.5" aria-hidden />
              MG Lab
            </div>
            <Badge variant={getStatusVariant(status)} className="gap-1 rounded-md px-2 py-1 text-[0.72rem]">
              {statusIcon}
              {statusLabel}
            </Badge>
            {run?.canSendInput ? (
              <Badge variant="warning" className="rounded-md px-2 py-1 text-[0.72rem]">
                Interactive
              </Badge>
            ) : null}
          </div>
          <p className="text-sm text-muted-foreground">
            Open a Motion Genesis file directly, edit it, save it, and run it without loading a scene.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => setPickerOpen(true)}>
            <FolderOpen className="size-3.5" aria-hidden />
            Open File
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!fileEditor.hasEdits || fileEditor.saving || !fileEditor.filePath}
            onClick={() => {
              void handleSave();
            }}
          >
            <Save className="size-3.5" aria-hidden />
            {fileEditor.saving ? 'Saving…' : 'Save'}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!fileEditor.hasEdits || fileEditor.loading}
            onClick={() => {
              fileEditor.revertFile();
              motionGenesisRun.setError(null);
            }}
          >
            <RotateCcw className="size-3.5" aria-hidden />
            Revert
          </Button>
          <Button type="button" size="sm" disabled={!fileEditor.filePath || motionGenesisRun.starting || runActive} onClick={handleRun}>
            {motionGenesisRun.starting ? 'Running…' : 'Run'}
          </Button>
          <Button type="button" variant="outline" size="sm" disabled={!runActive || motionGenesisRun.stopping} onClick={motionGenesisRun.stopRun}>
            {motionGenesisRun.stopping ? 'Stopping…' : 'Stop'}
          </Button>
          <Button type="button" variant="outline" size="sm" asChild>
            <a href={getHomePath()} {...inAppLinkProps}>
              <ArrowLeft className="size-3.5" aria-hidden />
              Workspace
            </a>
          </Button>
        </div>
      </header>

      <section className="grid gap-2 rounded-xl border border-border bg-card px-4 py-3 shadow-sm lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div className="grid gap-1 text-sm">
          <div className="min-w-0">
            <span className="text-muted-foreground">File: </span>
            <code className="break-all text-foreground">{fileEditor.filePath ?? 'No file selected'}</code>
            {fileEditor.hasEdits ? <span className="ml-2 text-warning">Unsaved changes</span> : null}
          </div>
          <div className="min-w-0">
            <span className="text-muted-foreground">Command: </span>
            <code className="break-all text-foreground">{run?.command ?? '/Applications/MotionGenesis/MotionGenesis'}</code>
          </div>
          {motionGenesisRun.error ? <p className="text-xs text-destructive">{motionGenesisRun.error}</p> : null}
          {fileEditor.error ? <p className="text-xs text-destructive">{fileEditor.error}</p> : null}
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <label className="flex items-center gap-2">
            <Checkbox
              checked={motionGenesisRun.options.autoQuit}
              onCheckedChange={(checked) =>
                motionGenesisRun.setOptions({ ...motionGenesisRun.options, autoQuit: checked === true })
              }
            />
            <span className="text-foreground">Auto-quit</span>
          </label>
          <label className="flex items-center gap-2">
            <Checkbox
              checked={motionGenesisRun.options.autoDefaultValues}
              onCheckedChange={(checked) =>
                motionGenesisRun.setOptions({ ...motionGenesisRun.options, autoDefaultValues: checked === true })
              }
            />
            <span className="text-foreground">Auto defaults</span>
          </label>
          <label className="flex items-center gap-2">
            <Checkbox
              checked={motionGenesisRun.options.debug}
              onCheckedChange={(checked) =>
                motionGenesisRun.setOptions({ ...motionGenesisRun.options, debug: checked === true })
              }
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
              value={String(motionGenesisRun.options.scrollbackLimit)}
              onChange={(event) => {
                const nextValue = event.target.value.trim();
                const parsed = nextValue.length === 0 ? 0 : Number.parseInt(nextValue, 10);
                motionGenesisRun.setOptions({
                  ...motionGenesisRun.options,
                  scrollbackLimit: Number.isFinite(parsed) && parsed >= 0 ? parsed : 0,
                });
              }}
            />
            <span className="text-[11px]">lines, `0` = all</span>
          </label>
          <label className="flex items-center gap-2">
            <Checkbox
              checked={vimMode}
              disabled={fileEditor.loading || !fileEditor.filePath}
              onCheckedChange={(checked) => {
                const nextValue = checked === true;
                setVimMode(nextValue);
                try {
                  window.localStorage.setItem(VIM_MODE_STORAGE_KEY, String(nextValue));
                } catch {
                  // Ignore storage failures.
                }
              }}
            />
            <span className="text-foreground">Vim</span>
          </label>
        </div>
      </section>

      <section
        ref={contentSectionRef}
        className="grid min-h-0 gap-2"
        style={contentSectionStyle}
      >
        <div className="relative grid min-h-0 grid-rows-[minmax(0,1fr)] rounded-xl border border-border bg-card p-2 shadow-sm">
          {runActive ? (
            <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center p-6">
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
            </div>
          ) : null}
          {fileEditor.loading ? (
            <div className="flex min-h-0 items-center justify-center rounded-md border border-border bg-background text-sm text-muted-foreground">
              Loading Motion Genesis file…
            </div>
          ) : fileEditor.filePath ? (
            <div
              className={cn(
                'h-full min-h-0 transition-[filter,opacity] duration-150',
                runActive && 'pointer-events-none opacity-55 grayscale-[0.2]'
              )}
            >
              <CodeEditor
                className="h-full min-h-0"
                onChange={fileEditor.setDraftContent}
                onRun={handleRun}
                readOnly={runActive}
                value={fileEditor.draftContent}
                vimMode={vimMode}
              />
            </div>
          ) : (
            <div className="flex min-h-0 items-center justify-center rounded-md border border-dashed border-border bg-muted/10 px-6 text-center text-sm text-muted-foreground">
              Open a workspace `.al`, `.txt`, or `.in` file to start editing and running Motion Genesis directly.
            </div>
          )}
        </div>

        <div
          role="separator"
          aria-label="Resize editor and output"
          aria-orientation="vertical"
          className="relative hidden cursor-col-resize items-stretch justify-center lg:flex"
          onPointerDown={startContentSplitDrag}
        >
          <div className="absolute inset-y-0 left-1/2 w-4 -translate-x-1/2" />
          <div className="w-2 rounded-full bg-border/80 transition-colors hover:bg-primary/40" />
        </div>

        <div className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)_auto] gap-2 rounded-xl border border-border bg-card p-2 shadow-sm">
          <div className="flex items-center justify-between gap-2 px-1">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Run Output</div>
            <div className="flex gap-1">
              <Button
                type="button"
                size="icon"
                variant="outline"
                className="h-7 w-7"
                aria-label="Scroll to top"
                onClick={() => {
                  if (outputRef.current) {
                    outputRef.current.scrollTop = 0;
                  }
                }}
              >
                <ArrowUpToLine className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button"
                size="icon"
                variant="outline"
                className="h-7 w-7"
                aria-label="Scroll to bottom"
                onClick={() => {
                  if (outputRef.current) {
                    outputRef.current.scrollTop = outputRef.current.scrollHeight;
                  }
                }}
              >
                <ArrowDownToLine className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
          <div
            ref={outputRef}
            className="min-h-0 w-full overflow-auto rounded-md border border-border bg-background px-3 py-2 font-mono text-xs leading-5 text-foreground"
            onScroll={(event) => {
              const element = event.currentTarget;
              const distanceFromBottom = element.scrollHeight - element.scrollTop - element.clientHeight;
              outputAutoFollowRef.current = distanceFromBottom <= 12;
            }}
          >
            <div className="whitespace-pre-wrap break-words">
              {outputSegments.map((segment) => {
                if (segment.type === 'line') {
                  return (
                    <span key={segment.key} className={cn('block', getToneClassName(segment.tone))}>
                      {segment.line.length > 0 ? segment.line : ' '}
                    </span>
                  );
                }

                const collapsed = collapsedOutputBlocks[segment.key] ?? segment.collapsedByDefault;
                return (
                  <div key={segment.key} className="mb-1 rounded-md border border-border/70 bg-muted/10">
                    <button
                      type="button"
                      className="flex w-full items-center justify-between gap-3 px-2 py-1 text-left text-[11px] text-muted-foreground transition-colors hover:bg-muted/20"
                      onClick={() => toggleOutputBlock(segment.key)}
                    >
                      <span className={cn('min-w-0 flex-1 whitespace-pre-wrap break-words', getToneClassName('input'))}>
                        {segment.commandLine}
                      </span>
                      <span className="shrink-0 uppercase tracking-wide">
                        {collapsed ? `Show ${segment.lines.length} lines` : 'Hide ODE data'}
                      </span>
                    </button>
                    {!collapsed ? (
                      <div className="border-t border-border/60 px-2 py-1">
                        {segment.lines.map((line) => (
                          <span key={line.key} className={cn('block', getToneClassName(line.tone))}>
                            {line.line.length > 0 ? line.line : ' '}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
          <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 border-t border-border/70 pt-2">
            <Input
              type="text"
              className="font-mono"
              value={motionGenesisRun.input}
              onChange={(event) => motionGenesisRun.setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  void motionGenesisRun.submitInput();
                }
              }}
              placeholder="Send one line of input to the running Motion Genesis process"
              disabled={!run?.canSendInput || motionGenesisRun.sendingInput}
            />
            <Button
              type="button"
              variant="outline"
              disabled={!run?.canSendInput || motionGenesisRun.sendingInput}
              onClick={() => {
                void motionGenesisRun.submitInput();
              }}
            >
              {motionGenesisRun.sendingInput ? 'Sending…' : 'Send'}
            </Button>
          </div>
        </div>
      </section>

      {pickerOpen ? (
        <OverlayPanel
          title="Open Motion Genesis File"
          subtitle="Pick a workspace .al, .txt, or .in file to edit and run."
          size="narrow"
          onClose={() => setPickerOpen(false)}
        >
          <div className="grid gap-2">
            <div className="grid gap-1 text-xs text-muted-foreground">
              <div>
                Current: <code className="text-foreground">{fileEditor.filePath ?? 'No file selected'}</code>
              </div>
              <div>
                Selected: <code className="text-foreground">{selectedPath ?? 'Choose a file below'}</code>
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
              sceneInput={fileEditor.filePath ?? '.'}
              selectedPaths={selectedPath ? [selectedPath] : []}
              onBrowse={(path) => {
                void browse(path);
              }}
              onOpenFile={(path) => {
                setSelectedPath(path);
                openFile(path);
              }}
              onSelectFile={(path) => {
                setSelectedPath(path);
              }}
              getDirectoryPath={getDirectoryPath}
            />

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setPickerOpen(false)}>
                Cancel
              </Button>
              <Button type="button" disabled={!selectedPath} onClick={() => selectedPath && openFile(selectedPath)}>
                Open
              </Button>
            </div>
          </div>
        </OverlayPanel>
      ) : null}
    </main>
  );
}
