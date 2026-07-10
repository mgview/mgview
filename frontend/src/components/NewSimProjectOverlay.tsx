import { useEffect, useState } from 'react';
import type { FileBrowserListing } from '../api/localFiles.ts';
import { getDirectoryPath } from '../hooks/useSceneWorkspace.ts';
import LocalFileBrowser from './LocalFileBrowser.tsx';
import NewFolderDialog from './NewFolderDialog.tsx';
import OverlayPanel from './OverlayPanel.tsx';
import { Button } from './ui/button.tsx';
import { Input } from './ui/input.tsx';
import { Separator } from './ui/separator.tsx';

interface NewSimProjectOverlayProps {
  browserError: string | null;
  browserListing: FileBrowserListing | null;
  browserLoading: boolean;
  errorMessage: string | null;
  loading: boolean;
  onBrowse: (path: string) => void;
  onClose: () => void;
  onCreate: (folderName: string) => void;
  onCreateFolder?: (name: string) => Promise<boolean>;
  onOpenWorkspace?: () => void;
}

export default function NewSimProjectOverlay({
  browserError,
  browserListing,
  browserLoading,
  errorMessage,
  loading,
  onBrowse,
  onClose,
  onCreate,
  onCreateFolder,
  onOpenWorkspace,
}: NewSimProjectOverlayProps) {
  const [folderName, setFolderName] = useState('my_project');
  const [newFolderDialogOpen, setNewFolderDialogOpen] = useState(false);
  const [newFolderDialogError, setNewFolderDialogError] = useState<string | null>(null);
  const [newFolderDialogLoading, setNewFolderDialogLoading] = useState(false);

  const currentBrowserPath = browserListing?.path ?? '.';
  const currentBrowserLabel =
    currentBrowserPath === '.' ? 'workspace/' : `workspace/${currentBrowserPath}/`;
  const trimmedFolderName = folderName.trim() || 'my_project';

  useEffect(() => {
    if (newFolderDialogOpen && !newFolderDialogLoading) {
      setNewFolderDialogError(errorMessage);
    }
  }, [errorMessage, newFolderDialogLoading, newFolderDialogOpen]);

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
      <OverlayPanel title="New Sim Project" size="narrow" onClose={onClose}>
        <div className="grid gap-2">
          {onOpenWorkspace ? (
            <div className="flex justify-end">
              <Button type="button" variant="outline" size="sm" onClick={onOpenWorkspace}>
                Change Workspace…
              </Button>
            </div>
          ) : null}

          <div className="grid gap-1.5">
            <label className="text-xs font-medium text-foreground" htmlFor="sim-project-folder-name">
              Project folder name
            </label>
            <Input
              id="sim-project-folder-name"
              autoFocus
              type="text"
              value={folderName}
              onChange={(event) => setFolderName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !loading) {
                  event.preventDefault();
                  onCreate(folderName);
                }
              }}
              placeholder="my_project"
            />
            <p className="text-xs text-muted-foreground">
              Creates <code>{currentBrowserLabel}{trimmedFolderName}/{trimmedFolderName}.json</code> and{' '}
              <code>{trimmedFolderName}.txt</code>.
            </p>
          </div>

          {errorMessage ? <p className="text-xs text-destructive">{errorMessage}</p> : null}

          <Separator />

          <LocalFileBrowser
            browserListing={browserListing}
            browserError={browserError}
            browserLoading={browserLoading}
            compact
            flat
            emptyStateMessage="Browse to the parent folder for the new project."
            filterEntry={(entry) => entry.type === 'directory'}
            hideTitle
            sceneInput={currentBrowserPath}
            titleActions={
              onCreateFolder ? (
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
            onSelectFile={() => {
              // Directory-only browser; selection is via breadcrumbs and folder clicks.
            }}
            getDirectoryPath={getDirectoryPath}
          />

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="button" onClick={() => onCreate(folderName)} disabled={loading}>
              {loading ? 'Creating…' : 'Create Project'}
            </Button>
          </div>
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
