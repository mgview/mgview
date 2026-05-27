import type { FileBrowserListing } from '../api/localFiles.ts';

interface LocalFileBrowserProps {
  browserListing: FileBrowserListing | null;
  browserError: string | null;
  browserLoading: boolean;
  emptyStateMessage?: string;
  sceneInput: string;
  title?: string;
  onBrowse: (path: string) => void;
  onSelectFile: (path: string) => void;
  getDirectoryPath: (filePath: string) => string;
}

export default function LocalFileBrowser({
  browserListing,
  browserError,
  browserLoading,
  emptyStateMessage = 'Browse a scene folder to load JSON files through the local API.',
  sceneInput,
  title = 'Local File Browser',
  onBrowse,
  onSelectFile,
  getDirectoryPath,
}: LocalFileBrowserProps) {
  const currentFolderLabel = browserListing?.path || '(workspace root)';

  return (
    <section className="panel">
      <h2>{title}</h2>
      <div className="stacked-meta">
        <div className="meta-row">
          <label>Current Folder</label>
          <div className="inline-tags">
            <code>{browserListing ? currentFolderLabel : getDirectoryPath(sceneInput)}</code>
            {browserListing?.parentPath ? (
              <button
                type="button"
                className="secondary-button"
                onClick={() => onBrowse(browserListing.parentPath!)}
              >
                Up One Level
              </button>
            ) : null}
            <button type="button" className="secondary-button" onClick={() => onBrowse('..')}>
              Workspace Root
            </button>
          </div>
        </div>
      </div>

      {browserError ? <div className="status error">{browserError}</div> : null}
      {!browserError && browserLoading ? <div className="status">Browsing local files…</div> : null}

      {browserListing ? (
        <div className="sample-list file-browser-list">
          {browserListing.entries.map((entry) => {
            return (
              <button
                key={`${entry.type}:${entry.path}`}
                type="button"
                className={`sample-button ${sceneInput === entry.path ? 'sample-button-active' : ''}`}
                onClick={() => {
                  if (entry.type === 'directory') {
                    onBrowse(entry.path);
                    return;
                  }

                  onSelectFile(entry.path);
                }}
              >
                <span>{entry.name}</span>
                <code>{entry.type === 'directory' ? `${entry.path}/` : entry.path}</code>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="empty-state">{emptyStateMessage}</div>
      )}
    </section>
  );
}
