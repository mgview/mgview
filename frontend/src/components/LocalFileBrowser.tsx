import type { ReactNode } from 'react';
import type { FileBrowserListing } from '../api/localFiles.ts';

interface LocalFileBrowserProps {
  browserListing: FileBrowserListing | null;
  browserError: string | null;
  browserLoading: boolean;
  emptyStateMessage?: string;
  filterEntry?: (entry: FileBrowserListing['entries'][number]) => boolean;
  sceneInput: string;
  selectedPaths?: string[];
  title?: string;
  titleActions?: ReactNode;
  onBrowse: (path: string) => void;
  onOpenFile?: (path: string) => void;
  onSelectFile: (path: string, options?: { additive: boolean }) => void;
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
  selectedPaths,
  title = 'Local File Browser',
  titleActions,
  onBrowse,
  onOpenFile,
  onSelectFile,
  getDirectoryPath,
}: LocalFileBrowserProps) {
  const currentFolderLabel = browserListing?.path || '(workspace root)';
  const breadcrumbs = buildBreadcrumbs(browserListing?.path || getDirectoryPath(sceneInput));
  const activePaths = selectedPaths ?? [sceneInput];

  return (
    <section className="panel">
      <div className="section-label-with-actions">
        <h2>{title}</h2>
        {titleActions ? <div className="visual-toolbar-actions">{titleActions}</div> : null}
      </div>
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
                className={`sample-button ${activePaths.includes(entry.path) ? 'sample-button-active' : ''}`}
                onClick={(event) => {
                  if (entry.type === 'directory') {
                    onBrowse(entry.path);
                    return;
                  }

                  onSelectFile(entry.path, {
                    additive: event.metaKey || event.ctrlKey || event.shiftKey,
                  });
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
