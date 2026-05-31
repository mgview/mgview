import type { FileBrowserListing } from '../api/localFiles.ts';
import { getDirectoryPath } from '../hooks/useSceneWorkspace.ts';
import LocalFileBrowser from './LocalFileBrowser.tsx';
import OverlayPanel from './OverlayPanel.tsx';
import LoadScenePathPanel from './LoadScenePathPanel.tsx';

interface LoadSceneOverlayProps {
  canPersistScenes: boolean;
  browserError: string | null;
  browserListing: FileBrowserListing | null;
  browserLoading: boolean;
  errorMessage: string | null;
  loading: boolean;
  mode: 'load' | 'create' | 'saveAs';
  onBrowse: (path: string) => void;
  onClose: () => void;
  onCreateScenePath: (path: string) => void;
  onOpenScenePath: (path: string) => void;
  onOpenSelectedScene: () => void;
  onOpenWorkspace?: () => void;
  onSaveScenePath: (path: string) => void;
  sceneInput: string;
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
  loading,
  mode,
  onBrowse,
  onClose,
  onCreateScenePath,
  onOpenScenePath,
  onOpenSelectedScene,
  onOpenWorkspace,
  onSaveScenePath,
  sceneInput,
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
      size="narrow"
      onClose={onClose}
    >
      <div className="overlay-layout">
        {canPersistScenes && !isSaveAsMode && onOpenWorkspace ? (
          <section className="panel">
            <div className="visual-toolbar-actions">
              <button type="button" className="secondary-button" onClick={onOpenWorkspace}>
                Change Workspace…
              </button>
            </div>
          </section>
        ) : null}

        <LoadScenePathPanel
          actionLabel={isCreateMode ? 'Create' : isSaveAsMode ? 'Save As' : 'Load'}
          hideSectionTitle
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

        <hr className="overlay-section-divider" />

        <LocalFileBrowser
          browserListing={browserListing}
          browserError={browserError}
          browserLoading={browserLoading}
          compact
          flat
          filterEntry={(entry) => entry.type === 'directory' || isJsonPath(entry.name)}
          hideTitle
          sceneInput={sceneInput}
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
      </div>
    </OverlayPanel>
  );
}
