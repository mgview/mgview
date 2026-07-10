import { useCallback, useEffect, useMemo, useState } from 'react';
import { listLocalFiles, type FileBrowserListing, type MotionGenesisRunOptions, type MotionGenesisRunState } from '../api/localFiles.ts';
import { canPersistScenesToServer } from '../api/runtimeMode.ts';
import { getBasePath, getRelativePath } from '../core/pathUtils.ts';
import {
  defaultSimFileNameForScene,
  getSceneDirectoryPath,
  isMotionGenesisInputPath,
  resolveSimulationFilePath,
} from '../core/simulationFilePath.ts';
import { getDirectoryPath } from '../hooks/useSceneWorkspace.ts';
import LocalFileBrowser from './LocalFileBrowser.tsx';
import MotionGenesisRunShell from './MotionGenesisRunShell.tsx';
import NewSimFileDialog from './NewSimFileDialog.tsx';
import ScenarioSelector from './ScenarioSelector.tsx';
import OverlayPanel from './OverlayPanel.tsx';
import { Button } from './ui/button.tsx';
import { Separator } from './ui/separator.tsx';
import type { SceneScenario } from '../core/types.ts';

interface MotionGenesisRunPanelProps {
  activeScenario: string | null;
  canRun: boolean;
  error: string | null;
  input: string;
  loadedScenePath: string | null;
  options: MotionGenesisRunOptions;
  onCreateSimulationFile: (directoryPath: string, fileName: string) => Promise<boolean>;
  onInputChange: (value: string) => void;
  onOptionsChange: (nextOptions: MotionGenesisRunOptions) => void;
  onLinkSimulationSettings: (relativePath: string) => Promise<boolean>;
  onRun: () => void | Promise<void>;
  onSetActiveScenario: (scenarioId: string) => void | Promise<void>;
  onSimFileChange: (value: string) => void;
  onStop: () => void;
  onSendInput: () => void;
  run: MotionGenesisRunState | null;
  simFileContent: string;
  simFileDirty: boolean;
  simFileError: string | null;
  simFileLoading: boolean;
  simFileReadOnly: boolean;
  simulationSettings: string | null | undefined;
  scenarios: SceneScenario[];
  starting: boolean;
  stopping: boolean;
  sendingInput: boolean;
}

export default function MotionGenesisRunPanel({
  activeScenario,
  canRun,
  error,
  input,
  loadedScenePath,
  options,
  onCreateSimulationFile,
  onInputChange,
  onOptionsChange,
  onLinkSimulationSettings,
  onRun,
  onSetActiveScenario,
  onSimFileChange,
  onStop,
  onSendInput,
  run,
  simFileContent,
  simFileDirty,
  simFileError,
  simFileLoading,
  simFileReadOnly,
  simulationSettings,
  scenarios,
  starting,
  stopping,
  sendingInput,
}: MotionGenesisRunPanelProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [browserListing, setBrowserListing] = useState<FileBrowserListing | null>(null);
  const [browserError, setBrowserError] = useState<string | null>(null);
  const [browserLoading, setBrowserLoading] = useState(false);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [pickerActionLoading, setPickerActionLoading] = useState(false);
  const [newSimDialogOpen, setNewSimDialogOpen] = useState(false);
  const [newSimDialogError, setNewSimDialogError] = useState<string | null>(null);
  const [newSimDialogLoading, setNewSimDialogLoading] = useState(false);

  const runDisabledReason = !loadedScenePath
    ? 'Load a workspace scene to run Motion Genesis.'
    : !simulationSettings
      ? 'This scene does not define simulationSettings.'
      : null;
  const sceneDirectoryPath = useMemo(() => getSceneDirectoryPath(loadedScenePath), [loadedScenePath]);
  const simulationFilePath = useMemo(
    () => resolveSimulationFilePath(loadedScenePath, simulationSettings),
    [loadedScenePath, simulationSettings]
  );
  const selectedRelativePath = useMemo(() => {
    if (!selectedPath || !loadedScenePath) {
      return null;
    }

    return getRelativePath(getBasePath(loadedScenePath), selectedPath);
  }, [loadedScenePath, selectedPath]);
  const currentBrowserPath = browserListing?.path ?? sceneDirectoryPath;
  const currentBrowserLabel =
    currentBrowserPath === '.' ? 'workspace/' : `workspace/${currentBrowserPath}/`;
  const defaultSimFileName = loadedScenePath ? defaultSimFileNameForScene(loadedScenePath) : 'my_sim.txt';
  const canCreateSimulationFile = canPersistScenesToServer && loadedScenePath !== null;

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
    if (pickerActionLoading || newSimDialogLoading) {
      return;
    }
    setPickerOpen(false);
    setNewSimDialogOpen(false);
    setNewSimDialogError(null);
  };

  const applySelectedSimulationPath = async (relativePath: string | null) => {
    if (!relativePath || pickerActionLoading) {
      return;
    }

    setPickerActionLoading(true);
    const didLink = await onLinkSimulationSettings(relativePath);
    setPickerActionLoading(false);
    if (didLink) {
      closeSimulationFilePicker();
    }
  };

  useEffect(() => {
    if (!pickerOpen) {
      return;
    }

    setSelectedPath(simulationFilePath);
    void browse(sceneDirectoryPath);
  }, [pickerOpen, sceneDirectoryPath, simulationFilePath, simulationSettings]);

  const handleRunShortcut = useCallback(async () => {
    if (!canRun || starting) {
      return;
    }
    await onRun();
  }, [canRun, onRun, starting]);

  const handleCreateSimulationFile = async (fileName: string) => {
    setNewSimDialogLoading(true);
    setNewSimDialogError(null);
    const didCreate = await onCreateSimulationFile(currentBrowserPath, fileName);
    if (didCreate) {
      setNewSimDialogOpen(false);
      setNewSimDialogLoading(false);
      closeSimulationFilePicker();
      return;
    }
    setNewSimDialogLoading(false);
    setNewSimDialogError(error ?? 'Could not create simulation file.');
  };

  const configureExtras = (
    <div className="grid gap-1.5 text-xs">
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
          {simFileDirty ? <span className="text-warning"> • unsaved</span> : null}
        </button>
      </div>
      {scenarios.length > 0 ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <span>Scenario:</span>
          <ScenarioSelector
            activeScenario={activeScenario}
            disabled={pickerActionLoading || starting}
            onSetActiveScenario={onSetActiveScenario}
            scenarios={scenarios}
          />
        </div>
      ) : null}
    </div>
  );

  return (
    <div className="relative h-full min-h-0">
      <MotionGenesisRunShell
        className="h-full"
        run={run}
        error={error}
        input={input}
        options={options}
        starting={starting}
        stopping={stopping}
        sendingInput={sendingInput}
        canRun={canRun}
        runDisabledReason={runDisabledReason}
        runButtonLabel="Run Sim"
        onInputChange={onInputChange}
        onOptionsChange={onOptionsChange}
        onRun={onRun}
        onStop={onStop}
        onSendInput={onSendInput}
        editorValue={simFileContent}
        onEditorChange={onSimFileChange}
        editorLoading={simFileLoading}
        editorError={simFileError}
        editorFilePath={simulationFilePath}
        editorEmptyMessage="Select a simulation file in Configure to edit it here."
        editorReadOnly={simFileReadOnly}
        onEditorRun={handleRunShortcut}
        canOpenExecutablePicker={canPersistScenesToServer}
        defaultLayoutMode="editor"
        scenePath={loadedScenePath}
        simulationFilePath={simulationFilePath}
        configureExtras={configureExtras}
      />

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
              titleActions={
                canCreateSimulationFile ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={pickerActionLoading}
                    onClick={() => {
                      setNewSimDialogError(null);
                      setNewSimDialogOpen(true);
                    }}
                  >
                    New Sim File
                  </Button>
                ) : undefined
              }
              onBrowse={(path) => {
                void browse(path);
              }}
              onOpenFile={(path) => {
                setSelectedPath(path);
                void applySelectedSimulationPath(
                  getRelativePath(getBasePath(loadedScenePath ?? ''), path)
                );
              }}
              onSelectFile={(path) => {
                setSelectedPath(path);
              }}
              getDirectoryPath={getDirectoryPath}
            />

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={closeSimulationFilePicker}
                disabled={pickerActionLoading}
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={!selectedRelativePath || pickerActionLoading}
                onClick={() => {
                  void applySelectedSimulationPath(selectedRelativePath);
                }}
              >
                {pickerActionLoading ? 'Linking…' : 'Select'}
              </Button>
            </div>
          </div>
        </OverlayPanel>
      ) : null}

      {newSimDialogOpen ? (
        <NewSimFileDialog
          currentPath={currentBrowserLabel}
          defaultName={defaultSimFileName}
          errorMessage={newSimDialogError}
          loading={newSimDialogLoading}
          onClose={() => {
            if (!newSimDialogLoading) {
              setNewSimDialogOpen(false);
              setNewSimDialogError(null);
            }
          }}
          onCreate={(name) => {
            void handleCreateSimulationFile(name);
          }}
        />
      ) : null}
    </div>
  );
}
