import { useMemo, useState, type KeyboardEvent } from 'react';
import { Pencil, Trash2, X } from 'lucide-react';
import type { FileBrowserListing } from '../api/localFiles.ts';
import type { NormalizedSceneConfig, ParsedSimulationFile } from '../core/types.ts';
import { getBasePath, getRelativePath } from '../core/pathUtils.ts';
import { getDirectoryPath } from '../hooks/useSceneWorkspace.ts';
import LocalFileBrowser from './LocalFileBrowser.tsx';
import InlineHelp from './InlineHelp.tsx';
import OverlayPanel from './OverlayPanel.tsx';
import ScenarioSelector from './ScenarioSelector.tsx';
import { Button } from './ui/button.tsx';
import { Input } from './ui/input.tsx';
import { Badge } from './ui/badge.tsx';
import { Separator } from './ui/separator.tsx';

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

const PREVIEW_CHANNEL_COUNT = 5;

function ScenarioLabelEditor({
  disabled,
  label,
  onSave,
}: {
  disabled?: boolean;
  label: string;
  onSave: (label: string) => void | Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [draftLabel, setDraftLabel] = useState(label);

  const commit = () => {
    const trimmed = draftLabel.trim();
    if (trimmed.length === 0) {
      setDraftLabel(label);
      setEditing(false);
      return;
    }
    if (trimmed !== label) {
      void onSave(trimmed);
    }
    setEditing(false);
  };

  if (editing) {
    return (
      <Input
        autoFocus
        value={draftLabel}
        disabled={disabled}
        className="h-6 text-xs"
        onChange={(event) => setDraftLabel(event.target.value)}
        onBlur={commit}
        onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
          if (event.key === 'Enter') {
            commit();
          }
          if (event.key === 'Escape') {
            setDraftLabel(label);
            setEditing(false);
          }
        }}
      />
    );
  }

  return (
    <div className="flex min-w-0 items-center gap-1">
      <div className="truncate text-xs font-medium text-foreground">{label}</div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-5 w-5 shrink-0"
        disabled={disabled}
        aria-label={`Rename ${label}`}
        onClick={() => {
          setDraftLabel(label);
          setEditing(true);
        }}
      >
        <Pencil className="h-3 w-3" />
      </Button>
    </div>
  );
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
  onSetActiveScenario?: (scenarioId: string) => void | Promise<void>;
  onUpdateScenarioLabel?: (scenarioId: string, label: string) => void | Promise<void>;
  onAddScenario?: () => void | Promise<void>;
  onRemoveScenario?: (scenarioId: string) => void | Promise<void>;
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
  onSetActiveScenario,
  onUpdateScenarioLabel,
  onAddScenario,
  onRemoveScenario,
  parsedSimulationFiles,
  scenePath,
  simulationEntries: _simulationEntries,
  simulationEntryInput,
  simulationLoading,
  setSimulationEntryInput,
}: SimulationDataOverlayProps) {
  const [selectedBrowserPaths, setSelectedBrowserPaths] = useState<string[]>([]);
  const [selectionAnchorPath, setSelectionAnchorPath] = useState<string | null>(null);
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
  const activeScenario =
    activeScene.scenarios.find((scenario) => scenario.id === activeScene.activeScenario) ??
    activeScene.scenarios[0] ??
    null;

  return (
    <OverlayPanel
      title="Simulation Data"
      size="narrow"
      actions={simulationLoading ? <Badge variant="outline">Refreshing…</Badge> : null}
      onClose={onClose}
    >
      <div className="grid gap-2">
        {onSetActiveScenario ? (
          <div className="flex items-center gap-1.5">
            <ScenarioSelector
              activeScenario={activeScene.activeScenario}
              disabled={simulationLoading}
              onSetActiveScenario={onSetActiveScenario}
              scenarios={activeScene.scenarios}
              {...(onAddScenario
                ? {
                    onAddNew: () => {
                      void onAddScenario();
                    },
                  }
                : {})}
            />
            <InlineHelp label="About scenarios">
              Each scenario represents a different simulation of the same scene, for example different
              initial conditions or other variations.
            </InlineHelp>
          </div>
        ) : null}

        {activeScenario ? (
          <div className="rounded-sm border border-border bg-muted/30 px-2 py-1.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                {onUpdateScenarioLabel ? (
                  <ScenarioLabelEditor
                    disabled={simulationLoading}
                    label={activeScenario.label}
                    onSave={(nextLabel) => onUpdateScenarioLabel(activeScenario.id, nextLabel)}
                  />
                ) : (
                  <div className="text-xs font-medium text-foreground">{activeScenario.label}</div>
                )}
              </div>
              {onRemoveScenario && activeScene.scenarios.length > 1 ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 shrink-0 text-muted-foreground"
                  disabled={simulationLoading}
                  aria-label={`Remove ${activeScenario.label}`}
                  onClick={() => {
                    void onRemoveScenario(activeScenario.id);
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              ) : null}
            </div>
            <div className="mt-1.5 flex flex-wrap gap-1">
              {activeScenario.simulationData.length > 0 ? (
                activeScenario.simulationData.map((entry) => (
                  <span
                    key={`${activeScenario.id}:${entry}`}
                    className="inline-flex items-center gap-0.5 rounded-sm bg-secondary px-1.5 py-0.5 text-[0.68rem]"
                  >
                    <code>{entry}</code>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-4 w-4"
                      disabled={simulationLoading}
                      onClick={() => onRemoveSimulationEntry(entry)}
                      aria-label={`Remove ${entry}`}
                    >
                      <X className="h-2.5 w-2.5" />
                    </Button>
                  </span>
                ))
              ) : (
                <span className="text-xs text-muted-foreground">
                  No simulation entries — browse or enter a path below.
                </span>
              )}
            </div>
          </div>
        ) : null}

        <div className="grid gap-1.5">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-1.5">
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
            <Button
              type="button"
              size="sm"
              onClick={onAddSimulationEntry}
              disabled={simulationEntryInput.trim().length === 0 || simulationLoading}
            >
              Add
            </Button>
          </div>

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
              <h3 className="text-[0.72rem] font-semibold uppercase tracking-wide text-muted-foreground">
                Channels{activeScenario ? ` · ${activeScenario.label}` : ''}
              </h3>
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
                  const fileChannelNames = parsedFile?.channelNames ?? [];
                  const fileOrigin = parsedFile?.sceneOrigin.canonical ?? null;
                  const fileFrame = parsedFile?.newtonianFrame.canonical ?? null;
                  const originIgnored = canonicalOrigin && fileOrigin && fileOrigin !== canonicalOrigin;
                  const frameIgnored = canonicalFrame && fileFrame && fileFrame !== canonicalFrame;
                  const showAllChannels = expandedChannelFiles.includes(filePath);
                  const previewChannelNames = fileChannelNames.slice(0, PREVIEW_CHANNEL_COUNT);

                  return (
                    <div key={filePath} className="grid grid-cols-[minmax(140px,240px)_minmax(0,1fr)] items-start gap-2 border-t border-border py-1.5 first:border-t-0 first:pt-0">
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
                              <div className="flex flex-wrap gap-1">
                                {fileChannelNames.map((channelName) => (
                                  <Badge key={`${filePath}:${channelName}`} variant="outline" className="font-mono font-normal">
                                    {channelName}
                                  </Badge>
                                ))}
                              </div>
                              {fileChannelNames.length > PREVIEW_CHANNEL_COUNT ? (
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
                              {fileChannelNames.length > PREVIEW_CHANNEL_COUNT ? (
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
                                  +{fileChannelNames.length - PREVIEW_CHANNEL_COUNT}
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
