import AboutOverlay from './AboutOverlay.tsx';
import DiagnosticsOverlay from './DiagnosticsOverlay.tsx';
import LoadSceneOverlay from './LoadSceneOverlay.tsx';
import SamplesOverlay from './SamplesOverlay.tsx';
import SimulationDataOverlay from './SimulationDataOverlay.tsx';
import WorkspacePickerOverlay from './WorkspacePickerOverlay.tsx';
import { canPersistScenesToServer } from '../api/runtimeMode.ts';
import type { FileBrowserListing } from '../api/localFiles.ts';
import type { groupSampleScenes } from '../core/samplesManifest.ts';
import type { NormalizedSceneConfig, SceneDiagnostic } from '../core/types.ts';
import type { LoadedSceneData } from '../hooks/useSceneWorkspace.ts';
import type { useServerWorkspace } from '../hooks/useServerWorkspace.ts';
import type { useWorkspaceShell } from '../hooks/useWorkspaceShell.ts';

interface WorkspaceOverlaysProps {
  aboutOpen: boolean;
  browserError: string | null;
  browserListing: FileBrowserListing | null;
  browserLoading: boolean;
  channelNames: string[];
  confirmWorkspaceChange: () => boolean | Promise<boolean>;
  diagnostics: SceneDiagnostic[];
  draftScene: NormalizedSceneConfig | null;
  error: string | null;
  fileErrors: Record<string, string>;
  groupedSamples: ReturnType<typeof groupSampleScenes>;
  handleBrowse: (path: string, root?: 'workspace' | 'sample') => Promise<void>;
  handleWorkspaceChange: (onComplete: () => void | Promise<void>) => Promise<void>;
  loaded: LoadedSceneData | null;
  loading: boolean;
  onCloseAbout: () => void;
  parsedSimulationFiles: LoadedSceneData['parsedSimulationFiles'] | undefined;
  sceneInput: string;
  serverWorkspace: ReturnType<typeof useServerWorkspace>;
  setSceneInput: (value: string) => void;
  shell: ReturnType<typeof useWorkspaceShell>;
  simulationFiles: Record<string, string>;
  simulationLoading: boolean;
}

export default function WorkspaceOverlays({
  aboutOpen,
  browserError,
  browserListing,
  browserLoading,
  channelNames,
  confirmWorkspaceChange,
  diagnostics,
  draftScene,
  error,
  fileErrors,
  groupedSamples,
  handleBrowse,
  handleWorkspaceChange,
  loaded,
  loading,
  onCloseAbout,
  parsedSimulationFiles,
  sceneInput,
  serverWorkspace,
  setSceneInput,
  shell,
  simulationFiles,
  simulationLoading,
}: WorkspaceOverlaysProps) {
  return (
    <>
      {shell.loadOverlayOpen ? (
        <LoadSceneOverlay
          canPersistScenes={canPersistScenesToServer}
          browserError={browserError}
          browserListing={browserListing}
          browserLoading={browserLoading}
          errorMessage={error}
          loading={loading}
          mode={shell.sceneOverlayMode}
          onBrowse={(path) => {
            void handleBrowse(path, 'workspace');
          }}
          onClose={shell.closeLoadOverlay}
          onCreateFolder={shell.handleCreateFolder}
          onCreateScenePath={(path) => {
            void shell.handleCreateScenePath(path);
          }}
          onOpenScenePath={(path) => {
            void shell.handleOpenScenePath(path);
          }}
          onOpenSelectedScene={() => {
            void shell.handleOpenSelectedScene();
          }}
          onOpenWorkspace={canPersistScenesToServer ? serverWorkspace.openPicker : undefined}
          onSaveScenePath={(path) => {
            void shell.handleSaveScenePath(path);
          }}
          sceneInput={sceneInput}
          setSceneInput={setSceneInput}
        />
      ) : null}

      {shell.samplesOverlayOpen ? (
        <SamplesOverlay
          groupedSamples={groupedSamples}
          loading={loading}
          onClose={shell.closeSamplesOverlay}
          onOpenSample={(path) => {
            void shell.handleOpenSamplePath(path);
          }}
        />
      ) : null}

      {shell.diagnosticsOpen && loaded ? (
        <DiagnosticsOverlay diagnostics={diagnostics} onClose={shell.closeDiagnostics} />
      ) : null}

      {serverWorkspace.pickerOpen ? (
        <WorkspacePickerOverlay
          appRoot={serverWorkspace.workspaceInfo?.appRoot ?? null}
          defaultWorkspaceRoot={serverWorkspace.workspaceInfo?.defaultWorkspaceRoot ?? null}
          draftWorkspaceRoot={serverWorkspace.draftWorkspaceRoot}
          errorMessage={serverWorkspace.error}
          saving={serverWorkspace.saving}
          workspaceInfo={serverWorkspace.workspaceInfo}
          onApply={() => {
            void serverWorkspace.applyWorkspaceRoot(confirmWorkspaceChange, async () => {
              await handleWorkspaceChange(() => {
                shell.openLoadOverlay();
              });
            });
          }}
          onClose={serverWorkspace.closePicker}
          onDraftChange={serverWorkspace.setDraftWorkspaceRoot}
          onUseDefault={serverWorkspace.useDefaultWorkspaceRoot}
        />
      ) : null}

      {shell.simulationOverlayOpen && loaded && draftScene ? (
        <SimulationDataOverlay
          activeScene={draftScene}
          browserError={browserError}
          browserListing={browserListing}
          browserLoading={browserLoading}
          channelNames={channelNames}
          expandedFiles={simulationFiles}
          fileErrors={fileErrors}
          onAddSimulationEntry={shell.addSimulationEntry}
          onAddSimulationEntries={shell.addSimulationEntries}
          onBrowse={(path) => {
            if (loaded) {
              void handleBrowse(path, loaded.sceneRef.source === 'sample' ? 'sample' : 'workspace');
            }
          }}
          onClose={shell.closeSimulationOverlay}
          onRemoveSimulationEntry={shell.removeSimulationEntry}
          parsedSimulationFiles={parsedSimulationFiles}
          scenePath={loaded.scenePath}
          simulationEntries={draftScene.simulationData}
          simulationEntryInput={shell.simulationEntryInput}
          simulationLoading={simulationLoading}
          setSimulationEntryInput={shell.setSimulationEntryInput}
        />
      ) : null}

      {aboutOpen ? <AboutOverlay onClose={onCloseAbout} /> : null}
    </>
  );
}
