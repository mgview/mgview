import type { FileBrowserListing } from '../api/localFiles.ts';

interface LocalFileBrowserProps {
  browserListing: FileBrowserListing | null;
  browserError: string | null;
  browserLoading: boolean;
  sceneInput: string;
  onBrowse: (path: string) => void;
  onSelectFile: (path: string, isSceneFile: boolean) => void;
  getDirectoryPath: (filePath: string) => string;
}

export default function LocalFileBrowser({
  browserListing,
  browserError,
  browserLoading,
  sceneInput,
  onBrowse,
  onSelectFile,
  getDirectoryPath,
}: LocalFileBrowserProps) {
  return (
    <section className="panel span-8">
      <h2>Local File Browser</h2>
      <div className="stacked-meta">
        <div className="meta-row">
          <label>Current Folder</label>
          <div className="inline-tags">
            <code>{browserListing?.path ?? getDirectoryPath(sceneInput)}</code>
            {browserListing?.parentPath ? (
              <button
                type="button"
                className="secondary-button"
                onClick={() => onBrowse(browserListing.parentPath!)}
              >
                Up One Level
              </button>
            ) : null}
            <button type="button" className="secondary-button" onClick={() => onBrowse('.')}>
              Root
            </button>
          </div>
        </div>
      </div>

      {browserError ? <div className="status error">{browserError}</div> : null}
      {!browserError && browserLoading ? <div className="status">Browsing local files…</div> : null}

      {browserListing ? (
        <div className="sample-list file-browser-list">
          {browserListing.entries.map((entry) => {
            const isSceneFile = entry.type === 'file' && entry.path.toLowerCase().endsWith('.json');
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

                  onSelectFile(entry.path, isSceneFile);
                }}
              >
                <span>{entry.name}</span>
                <code>{entry.type === 'directory' ? `${entry.path}/` : entry.path}</code>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="empty-state">Browse a scene folder to load JSON files through the local API.</div>
      )}
    </section>
  );
}
