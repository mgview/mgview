import { useEffect, useState } from 'react';
import type { FileBrowserListing } from '../api/localFiles.ts';
import { getDirectoryPath } from '../hooks/useSceneWorkspace.ts';
import LocalFileBrowser from './LocalFileBrowser.tsx';
import NewFolderDialog from './NewFolderDialog.tsx';
import OverlayPanel from './OverlayPanel.tsx';
import LoadScenePathPanel from './LoadScenePathPanel.tsx';
import { Button } from './ui/button.tsx';
import { Separator } from './ui/separator.tsx';

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
  onCreateFolder?: (name: string) => Promise<boolean>;
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
  onCreateFolder,
  onCreateScenePath,
  onOpenScenePath,
  onOpenSelectedScene,
  onOpenWorkspace,
  onSaveScenePath,
  sceneInput,
  setSceneInput,
}: LoadSceneOverlayProps) {
  const [newFolderDialogOpen, setNewFolderDialogOpen] = useState(false);
  const [newFolderDialogError, setNewFolderDialogError] = useState<string | null>(null);
  const [newFolderDialogLoading, setNewFolderDialogLoading] = useState(false);
  const isCreateMode = mode === 'create';
  const isSaveAsMode = mode === 'saveAs';
  const persistActionDisabled = (isCreateMode || isSaveAsMode) && !canPersistScenes;
  const canCreateFolder = canPersistScenes && Boolean(onCreateFolder) && (isCreateMode || isSaveAsMode);
  const currentBrowserPath = browserListing?.path ?? '.';
  const currentBrowserLabel = currentBrowserPath === '.' ? 'workspace/' : `workspace/${currentBrowserPath}/`;

  useEffect(() => {
    if (newFolderDialogOpen && !newFolderDialogLoading) {
      setNewFolderDialogError(errorMessage);
    }
  }, [errorMessage, newFolderDialogLoading, newFolderDialogOpen]);

  const handleSelectSceneEntry = (path: string) => {
    if (isCreateMode || isSaveAsMode) {
      const pathParts = path.replace(/\\/g, '/').split('/');
      setSceneInput(pathParts[pathParts.length - 1] ?? path);
      return;
    }

    setSceneInput(path);
  };

  const handleCreateFolder = async (name: string) => {
    if (!onCreateFolder) {
      return;
    }

    setNewFolderDialogLoading(true);
    setNewFolderDialogError(null);
    const didCreate = await onCreateFolder(name);
    if (didCreate) {
      setNewFolderDialogOpen(false);
      setNewFolderDialogLoading(false);
      return;
    }
    setNewFolderDialogLoading(false);
  };

  return (
    <>
      <OverlayPanel
        title={isCreateMode ? 'Create Scene' : isSaveAsMode ? 'Save Scene As' : 'Load Scene'}
        size="narrow"
        onClose={onClose}
      >
        <div className="grid gap-2">
          {canPersistScenes && !isSaveAsMode && onOpenWorkspace ? (
            <div className="flex justify-end">
              <Button type="button" variant="outline" size="sm" onClick={onOpenWorkspace}>
                Change Workspace…
              </Button>
            </div>
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

          {errorMessage ? <p className="text-xs text-destructive">{errorMessage}</p> : null}

          <Separator />

          <LocalFileBrowser
            browserListing={browserListing}
            browserError={browserError}
            browserLoading={browserLoading}
            compact
            flat
            filterEntry={(entry) => entry.type === 'directory' || isJsonPath(entry.name)}
            hideTitle
            sceneInput={sceneInput}
            titleActions={
              canCreateFolder ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setNewFolderDialogError(null);
                    setNewFolderDialogOpen(true);
                  }}
                >
                  New Folder
                </Button>
              ) : undefined
            }
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

      {newFolderDialogOpen ? (
        <NewFolderDialog
          currentPath={currentBrowserLabel}
          errorMessage={newFolderDialogError}
          loading={newFolderDialogLoading}
          onClose={() => {
            if (!newFolderDialogLoading) {
              setNewFolderDialogOpen(false);
              setNewFolderDialogError(null);
            }
          }}
          onCreate={(name) => {
            void handleCreateFolder(name);
          }}
        />
      ) : null}
    </>
  );
}
