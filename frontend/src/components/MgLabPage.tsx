import { ArrowLeft, Code2, FolderOpen, RotateCcw, Save } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { listLocalFiles } from '../api/localFiles.ts';
import { getHomePath, inAppLinkProps } from '../core/appRoutes.ts';
import { getDirectoryPath } from '../hooks/useSceneWorkspace.ts';
import { useMotionGenesisRun } from '../hooks/useMotionGenesisRun.ts';
import { useWorkspaceTextFileEditor } from '../hooks/useWorkspaceTextFileEditor.ts';
import LocalFileBrowser from './LocalFileBrowser.tsx';
import MotionGenesisRunShell from './MotionGenesisRunShell.tsx';
import OverlayPanel from './OverlayPanel.tsx';
import { Button } from './ui/button.tsx';
import { Separator } from './ui/separator.tsx';

const MG_LAB_FILE_QUERY_KEY = 'file';

function isMotionGenesisInputPath(filePath: string): boolean {
  return /\.(al|txt)$/i.test(filePath);
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

  const fileEditor = useWorkspaceTextFileEditor({ filePath });
  const motionGenesisRun = useMotionGenesisRun();

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
      motionGenesisRun.setError('Choose a Motion Genesis input file with a .al or .txt extension.');
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

  return (
    <main className="grid h-screen grid-rows-[auto_minmax(0,1fr)] gap-2 overflow-hidden bg-background p-2 text-foreground">
      <header className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3 shadow-sm">
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <div className="inline-flex shrink-0 items-center gap-2 rounded-full border border-border bg-muted/50 px-3 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            <Code2 className="size-3.5" aria-hidden />
            MG Lab
          </div>
          <code
            className="min-w-0 flex-1 truncate font-mono text-[0.72rem] text-muted-foreground"
            title={fileEditor.filePath ?? 'No file selected'}
          >
            {fileEditor.filePath ?? '(no file selected)'}
          </code>
          {fileEditor.hasEdits ? (
            <span
              className="shrink-0 text-lg leading-none text-warning"
              title="Unsaved changes"
              aria-label="Unsaved changes"
            >
              •
            </span>
          ) : null}
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
          <Button type="button" variant="outline" size="sm" asChild>
            <a href={getHomePath()} {...inAppLinkProps}>
              <ArrowLeft className="size-3.5" aria-hidden />
              Workspace
            </a>
          </Button>
        </div>
      </header>

      <MotionGenesisRunShell
        className="h-full min-h-0"
        run={motionGenesisRun.run}
        error={motionGenesisRun.error}
        input={motionGenesisRun.input}
        options={motionGenesisRun.options}
        starting={motionGenesisRun.starting}
        stopping={motionGenesisRun.stopping}
        sendingInput={motionGenesisRun.sendingInput}
        canRun={Boolean(fileEditor.filePath)}
        runButtonLabel="Run"
        onInputChange={motionGenesisRun.setInput}
        onOptionsChange={motionGenesisRun.setOptions}
        onRun={handleRun}
        onStop={() => {
          void motionGenesisRun.stopRun();
        }}
        onSendInput={() => {
          void motionGenesisRun.submitInput();
        }}
        editorValue={fileEditor.draftContent}
        onEditorChange={fileEditor.setDraftContent}
        editorLoading={fileEditor.loading}
        editorError={fileEditor.error}
        editorFilePath={fileEditor.filePath}
        editorEmptyMessage="Open a workspace `.al` or `.txt` file to start editing and running Motion Genesis directly."
        onEditorRun={handleRun}
        canOpenExecutablePicker
        defaultLayoutMode="split"
      />

      {pickerOpen ? (
        <OverlayPanel
          title="Open Motion Genesis File"
          subtitle="Pick a workspace .al or .txt file to edit and run."
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
