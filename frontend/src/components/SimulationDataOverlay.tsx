import { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import type { FileBrowserListing } from '../api/localFiles.ts';
import type { NormalizedSceneConfig, ParsedSimulationFile } from '../core/types.ts';
import { getBasePath, getRelativePath } from '../core/pathUtils.ts';
import { getDirectoryPath } from '../hooks/useSceneWorkspace.ts';
import LocalFileBrowser from './LocalFileBrowser.tsx';
import OverlayPanel from './OverlayPanel.tsx';
import { Button } from './ui/button.tsx';
import { Input } from './ui/input.tsx';
import { Badge } from './ui/badge.tsx';
import { Separator } from './ui/separator.tsx';
import { cn } from '../lib/utils.ts';

const POSITION_CHANNEL = /^P_[^_]+_[^\[]+\[[123]\]$/;
const MATRIX_CHANNEL = /^(?!P_)[^_]+_[^\[]+\[[123],[123]\]$/;

function splitFilePath(filePath: string): { directory: string; fileName: string } {
  const normalized = filePath.replace(/\\/g, '/');
  const slashIndex = normalized.lastIndexOf('/');
  if (slashIndex === -1) {
    return { directory: '', fileName: normalized };
  }
  return {
    directory: normalized.slice(0, slashIndex + 1),
    fileName: normalized.slice(slashIndex + 1),
  };
}

function isPositionMatrixBundle(channelNames: string[]): boolean {
  if (channelNames.length !== 12) return false;
  const positionChannels = channelNames.filter((channelName) => POSITION_CHANNEL.test(channelName));
  const matrixChannels = channelNames.filter((channelName) => MATRIX_CHANNEL.test(channelName));
  return positionChannels.length === 3 && matrixChannels.length === 9;
}

function renderChannelGroups(channelNames: string[]) {
  if (!isPositionMatrixBundle(channelNames)) return [channelNames];
  return [
    channelNames.filter((channelName) => POSITION_CHANNEL.test(channelName)),
    channelNames.filter((channelName) => MATRIX_CHANNEL.test(channelName)),
  ];
}

interface SimulationDataOverlayProps {
  activeScene: NormalizedSceneConfig;
  browserError: string | null;
  browserListing: FileBrowserListing | null;
  browserLoading: boolean;
  channelNames: string[];
  expandedFiles: string[];
  fileErrors: string[];
  onAddSimulationEntry: () => void;
  onAddSimulationEntries: (entries: string[]) => void;
  onBrowse: (path: string) => void;
  onClose: () => void;
  onRemoveSimulationEntry: (entry: string) => void;
  parsedSimulationFiles: ParsedSimulationFile[];
  scenePath: string;
  simulationEntries: string[];
  simulationEntryInput: string;
  simulationLoading: boolean;
  setSimulationEntryInput: (value: string) => void;
}

export default function SimulationDataOverlay({
  activeScene,
  browserError,
  browserListing,
  browserLoading,
  channelNames,
  expandedFiles,
  fileErrors,
  onAddSimulationEntry,
  onAddSimulationEntries,
  onBrowse,
  onClose,
  onRemoveSimulationEntry,
  parsedSimulationFiles,
  scenePath,
  simulationEntries,
  simulationEntryInput,
  simulationLoading,
  setSimulationEntryInput,
}: SimulationDataOverlayProps) {
  const [selectedBrowserPaths, setSelectedBrowserPaths] = useState<string[]>([]);
  const [selectionAnchorPath, setSelectionAnchorPath] = useState<string | null>(null);
  const [manualEntryExpanded, setManualEntryExpanded] = useState(false);
  const [expandedChannelFiles, setExpandedChannelFiles] = useState<string[]>([]);
  const sceneBasePath = useMemo(() => getBasePath(scenePath), [scenePath]);
  const selectableBrowserPaths = useMemo(
    () => browserListing?.entries.filter((entry) => entry.type === 'file').map((entry) => entry.path) ?? [],
    [browserListing]
  );
  const selectedRelativeEntries = useMemo(
    () => selectedBrowserPaths.map((path) => getRelativePath(sceneBasePath, path)),
    [sceneBasePath, selectedBrowserPaths]
  );
  const clearBrowserSelection = () => {
    setSelectedBrowserPaths([]);
    setSelectionAnchorPath(null);
  };
  const canonicalOrigin = activeScene.referenceContext.sceneOrigin.canonical;
  const canonicalFrame = activeScene.referenceContext.newtonianFrame.canonical;

  return (
    <OverlayPanel
      title="Simulation Data"
      size="narrow"
      actions={simulationLoading ? <Badge variant="outline">Refreshing…</Badge> : null}
      onClose={onClose}
    >
      <div className="grid gap-2">
        <div className="grid gap-1.5">
          <div className="flex flex-wrap gap-1.5">
            {simulationEntries.length > 0 ? (
              simulationEntries.map((entry) => (
                <span key={entry} className="inline-flex items-center gap-0.5 rounded-sm bg-secondary px-1.5 py-0.5 text-xs">
                  <code>{entry}</code>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5"
                    onClick={() => onRemoveSimulationEntry(entry)}
                    aria-label={`Remove ${entry}`}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </span>
              ))
            ) : (
              <span className="text-xs text-muted-foreground">No simulation entries.</span>
            )}
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-fit"
            onClick={() => setManualEntryExpanded((current) => !current)}
          >
            {manualEntryExpanded ? 'Hide path entry' : 'Enter path…'}
          </Button>

          {manualEntryExpanded ? (
            <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-1.5 border-t border-border pt-1.5">
              <Input
                type="text"
                value={simulationEntryInput}
                onChange={(event) => {
                  clearBrowserSelection();
                  setSimulationEntryInput(event.target.value);
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    onAddSimulationEntry();
                  }
                }}
                placeholder="relative/path/to/file.1 or run.1:20"
              />
              <Button type="button" size="sm" onClick={onAddSimulationEntry} disabled={simulationEntryInput.trim().length === 0}>
                Add
              </Button>
            </div>
          ) : null}

          {fileErrors.length > 0 ? (
            <div className="text-xs text-destructive">
              {fileErrors.map((message) => (
                <div key={message}>{message}</div>
              ))}
            </div>
          ) : null}
        </div>

        <Separator />

        <LocalFileBrowser
          browserListing={browserListing}
          browserError={browserError}
          browserLoading={browserLoading}
          compact
          flat
          emptyStateMessage="Select files to add as simulation entries."
          sceneInput={simulationEntryInput || scenePath}
          selectedPaths={selectedBrowserPaths}
          title="Browse"
          titleActions={
            <>
              <Button type="button" variant="outline" size="sm" disabled={selectedRelativeEntries.length === 0} onClick={clearBrowserSelection}>
                Clear
              </Button>
              <Button
                type="button"
                size="sm"
                variant={selectedRelativeEntries.length > 0 ? 'default' : 'outline'}
                disabled={selectedRelativeEntries.length === 0}
                onClick={() => {
                  onAddSimulationEntries(selectedRelativeEntries);
                  clearBrowserSelection();
                }}
              >
                {selectedRelativeEntries.length > 1 ? `Add (${selectedRelativeEntries.length})` : 'Add'}
              </Button>
            </>
          }
          onBrowse={(path) => {
            clearBrowserSelection();
            onBrowse(path);
          }}
          onSelectFile={(path, options) => {
            const range = options?.range ?? false;
            const toggle = options?.toggle ?? false;

            setSelectedBrowserPaths((current) => {
              if (range) {
                const anchorPath = selectionAnchorPath ?? current[0] ?? null;
                const anchorIndex = anchorPath ? selectableBrowserPaths.indexOf(anchorPath) : -1;
                const targetIndex = selectableBrowserPaths.indexOf(path);
                if (anchorIndex !== -1 && targetIndex !== -1) {
                  const [startIndex, endIndex] = anchorIndex < targetIndex ? [anchorIndex, targetIndex] : [targetIndex, anchorIndex];
                  return selectableBrowserPaths.slice(startIndex, endIndex + 1);
                }

                setSelectionAnchorPath(path);
                return current.length === 1 && current[0] === path ? current : [path];
              }

              if (!toggle) {
                setSelectionAnchorPath(path);
                return current.length === 1 && current[0] === path ? current : [path];
              }

              setSelectionAnchorPath(path);
              return current.includes(path) ? current.filter((entry) => entry !== path) : [...current, path];
            });
          }}
          getDirectoryPath={getDirectoryPath}
        />

        {expandedFiles.length > 0 ? (
          <>
            <Separator />
            <div className="grid gap-2">
              <h3 className="text-[0.72rem] font-semibold uppercase tracking-wide text-muted-foreground">Channels</h3>
              <div className="flex flex-wrap gap-x-3.5 gap-y-1 text-xs">
                <div className="inline-flex items-baseline gap-1">
                  <span className="text-[0.68rem] uppercase text-muted-foreground">Files:</span>
                  <strong>{expandedFiles.length}</strong>
                </div>
                <div className="inline-flex items-baseline gap-1">
                  <span className="text-[0.68rem] uppercase text-muted-foreground">Channels:</span>
                  <strong>{channelNames.length}</strong>
                </div>
                <div className="inline-flex items-baseline gap-1">
                  <span className="text-[0.68rem] uppercase text-muted-foreground">Origin:</span>
                  <strong>{canonicalOrigin ?? '—'}</strong>
                </div>
                <div className="inline-flex items-baseline gap-1">
                  <span className="text-[0.68rem] uppercase text-muted-foreground">Frame:</span>
                  <strong>{canonicalFrame ?? '—'}</strong>
                </div>
              </div>

              <div className="grid gap-1">
                {expandedFiles.map((filePath) => {
                  const parsedFile = parsedSimulationFiles.find((entry) => entry.filePath === filePath);
                  const { directory, fileName } = splitFilePath(filePath);
                  const channelGroups = renderChannelGroups(parsedFile?.channelNames ?? []);
                  const fileChannelNames = parsedFile?.channelNames ?? [];
                  const fileOrigin = parsedFile?.sceneOrigin.canonical ?? null;
                  const fileFrame = parsedFile?.newtonianFrame.canonical ?? null;
                  const originIgnored = canonicalOrigin && fileOrigin && fileOrigin !== canonicalOrigin;
                  const frameIgnored = canonicalFrame && fileFrame && fileFrame !== canonicalFrame;
                  const showAllChannels = expandedChannelFiles.includes(filePath);
                  const previewChannelNames = fileChannelNames.slice(0, 4);

                  return (
                    <div key={filePath} className="grid grid-cols-[minmax(140px,200px)_minmax(0,1fr)] gap-2 border-t border-border py-1.5 first:border-t-0 first:pt-0">
                      <div className="grid gap-0.5 break-all">
                        {directory ? <code className="text-muted-foreground">{directory}</code> : null}
                        <code className="font-semibold">{fileName}</code>
                      </div>
                      <div className="grid gap-1.5">
                        {parsedFile ? (
                          <div className="flex flex-wrap gap-1">
                            <Badge variant={originIgnored ? 'warning' : 'default'} className="font-mono font-normal">
                              origin {fileOrigin ?? 'n/a'}{originIgnored ? ' not used' : ''}
                            </Badge>
                            <Badge variant={frameIgnored ? 'warning' : 'default'} className="font-mono font-normal">
                              frame {fileFrame ?? 'n/a'}{frameIgnored ? ' not used' : ''}
                            </Badge>
                          </div>
                        ) : null}
                        {parsedFile && fileChannelNames.length > 0 ? (
                          showAllChannels ? (
                            <>
                              {channelGroups.map((channelGroup, groupIndex) => (
                                <div key={`${filePath}:group:${groupIndex}`} className="flex flex-wrap gap-1">
                                  {channelGroup.map((channelName) => (
                                    <Badge key={`${filePath}:${channelName}`} variant="outline" className="font-mono font-normal">
                                      {channelName}
                                    </Badge>
                                  ))}
                                </div>
                              ))}
                              {fileChannelNames.length > 4 ? (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="h-6"
                                  onClick={() => setExpandedChannelFiles((current) => current.filter((entry) => entry !== filePath))}
                                >
                                  Less
                                </Button>
                              ) : null}
                            </>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {previewChannelNames.map((channelName) => (
                                <Badge key={`${filePath}:${channelName}`} variant="outline" className="font-mono font-normal">
                                  {channelName}
                                </Badge>
                              ))}
                              {fileChannelNames.length > 4 ? (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="h-6"
                                  onClick={() =>
                                    setExpandedChannelFiles((current) =>
                                      current.includes(filePath) ? current : [...current, filePath]
                                    )
                                  }
                                >
                                  +{fileChannelNames.length - 4}
                                </Button>
                              ) : null}
                            </div>
                          )
                        ) : (
                          <span className="text-xs text-muted-foreground">No channels.</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        ) : null}
      </div>
    </OverlayPanel>
  );
}
