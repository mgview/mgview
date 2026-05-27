import type { FileBrowserListing } from '../api/localFiles.ts';

interface LocalFileBrowserProps {
  browserListing: FileBrowserListing | null;
  browserError: string | null;
  browserLoading: boolean;
  emptyStateMessage?: string;
  filterEntry?: (entry: FileBrowserListing['entries'][number]) => boolean;
  sceneInput: string;
  title?: string;
  onBrowse: (path: string) => void;
  onOpenFile?: (path: string) => void;
  onSelectFile: (path: string) => void;
  getDirectoryPath: (filePath: string) => string;
}

interface BreadcrumbSegment {
  label: string;
  path: string;
}

function buildBreadcrumbs(currentPath: string): BreadcrumbSegment[] {
  const normalizedPath = currentPath === '.' ? '' : currentPath.replace(/\/+$/g, '');
  const pieces = normalizedPath.length > 0 ? normalizedPath.split('/') : [];
  const breadcrumbs: BreadcrumbSegment[] = [{ label: 'root', path: '.' }];

  let runningPath = '';
  for (const piece of pieces) {
    runningPath = runningPath ? `${runningPath}/${piece}` : piece;
    breadcrumbs.push({ label: piece, path: runningPath });
  }

  return breadcrumbs;
}

export default function LocalFileBrowser({
  browserListing,
  browserError,
  browserLoading,
  emptyStateMessage = 'Browse a scene folder to load JSON files through the local API.',
  filterEntry,
  sceneInput,
  title = 'Local File Browser',
  onBrowse,
  onOpenFile,
  onSelectFile,
  getDirectoryPath,
}: LocalFileBrowserProps) {
  const currentFolderLabel = browserListing?.path || '(workspace root)';
  const breadcrumbs = buildBreadcrumbs(browserListing?.path || getDirectoryPath(sceneInput));

  return (
    <section className="panel">
      <h2>{title}</h2>
      <div className="stacked-meta">
        <div className="meta-row">
          <label>Current Folder</label>
          <div className="file-browser-breadcrumbs" aria-label={`Current folder ${currentFolderLabel}`}>
            {breadcrumbs.map((segment, index) => (
              <span key={segment.path} className="file-browser-breadcrumb-segment">
                {index > 0 ? <span className="file-browser-breadcrumb-separator">/</span> : null}
                <button
                  type="button"
                  className="file-browser-breadcrumb-button"
                  onClick={() => onBrowse(segment.path)}
                >
                  {segment.label}
                </button>
              </span>
            ))}
            <span className="file-browser-breadcrumb-trailing">/</span>
          </div>
        </div>
      </div>

      {browserError ? <div className="status error">{browserError}</div> : null}
      {!browserError && browserLoading ? <div className="status">Browsing local files…</div> : null}

      {browserListing ? (
        <div className="sample-list file-browser-list">
          {browserListing.entries.filter((entry) => (filterEntry ? filterEntry(entry) : true)).map((entry) => {
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
                onDoubleClick={() => {
                  if (entry.type === 'file' && onOpenFile) {
                    onOpenFile(entry.path);
                  }
                }}
              >
                <span>{entry.type === 'directory' ? `${entry.name}/` : entry.name}</span>
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
