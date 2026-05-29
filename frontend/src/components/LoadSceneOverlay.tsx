import type { FileBrowserListing } from '../api/localFiles.ts';
import { isStaticHosting } from '../api/runtimeMode.ts';
import { getDirectoryPath } from '../hooks/useSceneWorkspace.ts';
import LocalFileBrowser from './LocalFileBrowser.tsx';
import OverlayPanel from './OverlayPanel.tsx';
import LoadScenePathPanel from './LoadScenePathPanel.tsx';
import SampleSceneGallery from './SampleSceneGallery.tsx';
import SampleShortcutPanel, { type SampleShortcut } from './SampleShortcutPanel.tsx';

interface LoadSceneOverlayProps {
  canPersistScenes: boolean;
  browserError: string | null;
  browserListing: FileBrowserListing | null;
  browserLoading: boolean;
  errorMessage: string | null;
  groupedSamples: Array<[string, SampleShortcut[]]>;
  loading: boolean;
  mode: 'load' | 'create' | 'saveAs';
  onBrowse: (path: string) => void;
  onClose: () => void;
  onCreateScenePath: (path: string) => void;
  onOpenScenePath: (path: string) => void;
  onOpenSelectedScene: () => void;
  onSaveScenePath: (path: string) => void;
  sampleBrowserExpanded: boolean;
  sceneInput: string;
  setSampleBrowserExpanded: (updater: (current: boolean) => boolean) => void;
  setSceneInput: (value: string) => void;
}

function isJsonPath(filePath: string): boolean {
  return filePath.toLowerCase().endsWith('.json');
}

export default function LoadSceneOverlay({
  canPersistScenes,
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
  onSaveScenePath,
  sampleBrowserExpanded,
  sceneInput,
  setSampleBrowserExpanded,
  setSceneInput,
}: LoadSceneOverlayProps) {
  const isCreateMode = mode === 'create';
  const isSaveAsMode = mode === 'saveAs';
  const persistActionDisabled = (isCreateMode || isSaveAsMode) && !canPersistScenes;

  const handleSelectSceneEntry = (path: string) => {
    if (isCreateMode || isSaveAsMode) {
      const pathParts = path.replace(/\\/g, '/').split('/');
      setSceneInput(pathParts[pathParts.length - 1] ?? path);
      return;
    }

    setSceneInput(path);
  };

  return (
    <OverlayPanel
      title={isCreateMode ? 'Create Scene' : isSaveAsMode ? 'Save Scene As' : 'Load Scene'}
      size={isStaticHosting && !isCreateMode && !isSaveAsMode ? 'medium' : 'narrow'}
      onClose={onClose}
    >
      <div className="overlay-layout">
        <LoadScenePathPanel
          actionLabel={isCreateMode ? 'Create' : isSaveAsMode ? 'Save As' : 'Load'}
          hideSectionTitle
          inputLabel={isCreateMode || isSaveAsMode ? 'Filename' : undefined}
          loading={loading}
          submitDisabled={persistActionDisabled}
          onSubmit={() => {
            if (isCreateMode) {
              onCreateScenePath(sceneInput);
              return;
            }
            if (isSaveAsMode) {
              onSaveScenePath(sceneInput);
              return;
            }
            onOpenSelectedScene();
          }}
          onSceneInputChange={setSceneInput}
          placeholder={isCreateMode || isSaveAsMode ? 'new_scene.json' : 'path/to/scene.json'}
          sceneInput={sceneInput}
        />

        {errorMessage ? <div className="status error">{errorMessage}</div> : null}

        {isStaticHosting && !isCreateMode && !isSaveAsMode ? (
          <SampleSceneGallery
            groupedSamples={groupedSamples}
            sceneInput={sceneInput}
            onOpenScene={onOpenScenePath}
            onSelectScene={setSceneInput}
          />
        ) : (
          <>
            <LocalFileBrowser
              browserListing={browserListing}
              browserError={browserError}
              browserLoading={browserLoading}
              compact
              emptyStateMessage={
                isStaticHosting
                  ? 'Use the example scenes below, or enter a bundled sample path above.'
                  : undefined
              }
              filterEntry={(entry) => entry.type === 'directory' || isJsonPath(entry.name)}
              hideTitle
              sceneInput={sceneInput}
              title="Scene Browser"
              unlabeledBreadcrumbs
              onBrowse={onBrowse}
              onOpenFile={
                isCreateMode || isSaveAsMode
                  ? undefined
                  : (path) => {
                      setSceneInput(path);
                      onOpenScenePath(path);
                    }
              }
              onSelectFile={handleSelectSceneEntry}
              getDirectoryPath={getDirectoryPath}
            />

            {!isSaveAsMode ? (
              <SampleShortcutPanel
                groupedSamples={groupedSamples}
                sampleBrowserExpanded={sampleBrowserExpanded}
                sceneInput={sceneInput}
                setSampleBrowserExpanded={setSampleBrowserExpanded}
                setSceneInput={setSceneInput}
              />
            ) : null}
          </>
        )}
      </div>
    </OverlayPanel>
  );
}
