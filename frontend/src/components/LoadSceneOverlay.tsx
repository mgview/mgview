import type { FileBrowserListing } from '../api/localFiles.ts';
import { getDirectoryPath } from '../hooks/useSceneWorkspace.ts';
import LocalFileBrowser from './LocalFileBrowser.tsx';
import OverlayPanel from './OverlayPanel.tsx';
import LoadScenePathPanel from './LoadScenePathPanel.tsx';
import SampleShortcutPanel, { type SampleShortcut } from './SampleShortcutPanel.tsx';

interface LoadSceneOverlayProps {
  browserError: string | null;
  browserListing: FileBrowserListing | null;
  browserLoading: boolean;
  errorMessage: string | null;
  groupedSamples: Array<[string, SampleShortcut[]]>;
  loading: boolean;
  mode: 'load' | 'create';
  onBrowse: (path: string) => void;
  onClose: () => void;
  onCreateScenePath: (path: string) => void;
  onOpenScenePath: (path: string) => void;
  onOpenSelectedScene: () => void;
  sampleBrowserExpanded: boolean;
  sceneInput: string;
  setSampleBrowserExpanded: (updater: (current: boolean) => boolean) => void;
  setSceneInput: (value: string) => void;
}

function isJsonPath(filePath: string): boolean {
  return filePath.toLowerCase().endsWith('.json');
}

export default function LoadSceneOverlay({
  browserError,
  browserListing,
  browserLoading,
  errorMessage,
  groupedSamples,
  loading,
  mode,
  onBrowse,
  onClose,
  onCreateScenePath,
  onOpenScenePath,
  onOpenSelectedScene,
  sampleBrowserExpanded,
  sceneInput,
  setSampleBrowserExpanded,
  setSceneInput,
}: LoadSceneOverlayProps) {
  const isCreateMode = mode === 'create';

  return (
    <OverlayPanel
      title={isCreateMode ? 'Create Scene' : 'Load Scene'}
      subtitle={
        isCreateMode
          ? 'Choose a new JSON path, browse nearby files for context, and create a fresh scene from the default template.'
          : undefined
      }
      onClose={onClose}
    >
      <div className="overlay-layout">
        <LoadScenePathPanel
          actionLabel={isCreateMode ? 'Create' : 'Load'}
          helperText={
            isCreateMode
              ? 'Create a new scene JSON at the typed path. Existing files are not overwritten.'
              : 'Load an existing JSON scene file through the local API.'
          }
          loading={loading}
          onSubmit={() => {
            if (isCreateMode) {
              onCreateScenePath(sceneInput);
              return;
            }
            onOpenSelectedScene();
          }}
          onSceneInputChange={setSceneInput}
          sceneInput={sceneInput}
        />

        {errorMessage ? <div className="status error">{errorMessage}</div> : null}

        <LocalFileBrowser
          browserListing={browserListing}
          browserError={browserError}
          browserLoading={browserLoading}
          filterEntry={(entry) => entry.type === 'directory' || isJsonPath(entry.name)}
          sceneInput={sceneInput}
          title="Scene Browser"
          onBrowse={onBrowse}
          onOpenFile={
            isCreateMode
              ? undefined
              : (path) => {
                  setSceneInput(path);
                  onOpenScenePath(path);
                }
          }
          onSelectFile={setSceneInput}
          getDirectoryPath={getDirectoryPath}
        />

        <SampleShortcutPanel
          groupedSamples={groupedSamples}
          sampleBrowserExpanded={sampleBrowserExpanded}
          sceneInput={sceneInput}
          setSampleBrowserExpanded={setSampleBrowserExpanded}
          setSceneInput={setSceneInput}
        />
      </div>
    </OverlayPanel>
  );
}
