import type { ReactNode } from 'react';
import { ChevronRight, Folder, File } from 'lucide-react';
import type { FileBrowserListing } from '../api/localFiles.ts';
import { Button } from './ui/button.tsx';
import { cn } from '../lib/utils.ts';

interface LocalFileBrowserProps {
  browserListing: FileBrowserListing | null;
  browserError: string | null;
  browserLoading: boolean;
  compact?: boolean;
  emptyStateMessage?: string;
  filterEntry?: (entry: FileBrowserListing['entries'][number]) => boolean;
  flat?: boolean;
  hideTitle?: boolean;
  hideTitleWhenNoActions?: boolean;
  sceneInput: string;
  selectedPaths?: string[];
  title?: string;
  titleActions?: ReactNode;
  onBrowse: (path: string) => void;
  onOpenFile?: (path: string) => void;
  onSelectFile: (path: string, options?: { range?: boolean; toggle?: boolean }) => void;
  getDirectoryPath: (filePath: string) => string;
}

interface BreadcrumbSegment {
  label: string;
  path: string;
}

function isAppBundlePath(filePath: string): boolean {
  return /^(samples|assets|bundled|legacy)(\/|$)/.test(filePath);
}

function rootBreadcrumbLabel(filePath: string): string {
  return isAppBundlePath(filePath) ? 'app' : 'workspace';
}

function buildBreadcrumbs(currentPath: string): BreadcrumbSegment[] {
  const normalizedPath = currentPath === '.' ? '' : currentPath.replace(/\/+$/g, '');
  const pieces = normalizedPath.length > 0 ? normalizedPath.split('/') : [];
  const breadcrumbs: BreadcrumbSegment[] = [
    { label: rootBreadcrumbLabel(normalizedPath), path: '.' },
  ];

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
  compact = false,
  emptyStateMessage = 'Browse a scene folder to load JSON files through the local API.',
  filterEntry,
  flat = false,
  hideTitle = false,
  hideTitleWhenNoActions = false,
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
  const visibleEntries = browserListing?.entries.filter((entry) => (filterEntry ? filterEntry(entry) : true)) ?? [];
  const showHeader = !hideTitle && !(hideTitleWhenNoActions && !titleActions);

  return (
    <section className={cn('grid gap-1.5', !flat && 'rounded-md border border-border bg-card p-2')}>
      {showHeader ? (
        <div className="flex items-center gap-2">
          <h3 className={cn('min-w-0 flex-1 truncate text-[0.72rem] font-semibold uppercase tracking-wide text-muted-foreground')}>
            {title}
          </h3>
          {titleActions ? <div className="flex gap-1">{titleActions}</div> : null}
        </div>
      ) : titleActions ? (
        <div className="flex justify-end gap-1">{titleActions}</div>
      ) : null}

      <nav className="flex flex-wrap items-center gap-1 text-xs" aria-label={`Current folder ${currentFolderLabel}`}>
        {breadcrumbs.map((segment, index) => (
          <span key={segment.path} className="inline-flex items-center gap-1">
            {index > 0 ? <ChevronRight className="h-3 w-3 text-muted-foreground" /> : null}
            <button
              type="button"
              className="text-foreground underline decoration-border underline-offset-2 hover:text-primary"
              onClick={() => onBrowse(segment.path)}
            >
              {segment.label}
            </button>
          </span>
        ))}
        <span className="text-muted-foreground">/</span>
      </nav>

      {browserError ? <p className="text-xs text-destructive">{browserError}</p> : null}
      {!browserError && browserLoading ? <p className="text-xs text-warning">Browsing local files…</p> : null}

      {browserListing ? (
        <div className={cn('grid gap-0.5', compact && 'gap-px')}>
          {visibleEntries.length > 0 ? visibleEntries.map((entry) => {
            const isActive = activePaths.includes(entry.path);
            return (
              <button
                key={`${entry.type}:${entry.path}`}
                type="button"
                className={cn(
                  'flex w-full items-center gap-1.5 rounded-sm border border-transparent px-2 py-1 text-left text-xs',
                  compact ? 'py-0.5' : 'py-1',
                  isActive
                    ? 'border-primary/40 bg-primary text-primary-foreground'
                    : 'bg-muted/40 hover:bg-accent'
                )}
                onClick={(event) => {
                  if (entry.type === 'directory') {
                    onBrowse(entry.path);
                    return;
                  }

                  onSelectFile(entry.path, {
                    range: event.shiftKey,
                    toggle: !event.shiftKey && (event.metaKey || event.ctrlKey),
                  });
                }}
                onDoubleClick={() => {
                  if (entry.type === 'file' && onOpenFile) {
                    onOpenFile(entry.path);
                  }
                }}
              >
                {entry.type === 'directory' ? (
                  <Folder className="h-3 w-3 shrink-0 opacity-70" />
                ) : (
                  <File className="h-3 w-3 shrink-0 opacity-70" />
                )}
                <span className="min-w-0 truncate">{entry.type === 'directory' ? `${entry.name}/` : entry.name}</span>
              </button>
            );
          }) : <p className="text-xs text-muted-foreground">No matching files in this folder.</p>}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">{emptyStateMessage}</p>
      )}
    </section>
  );
}
