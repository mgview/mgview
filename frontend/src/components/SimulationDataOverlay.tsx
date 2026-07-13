import { useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { Check, Pencil, Trash2, X } from 'lucide-react';
import type { FileBrowserListing } from '../api/localFiles.ts';
import type { NormalizedSceneConfig, ParsedSimulationFile } from '../core/types.ts';
import { findSimulationEntryForExpandedFile } from '../core/expandSimulationFiles.ts';
import { getRelativePath } from '../core/pathUtils.ts';
import {
  getSceneBasePath,
  relativeSimulationPathFromBrowser,
  type SceneRef,
} from '../core/sceneRef.ts';
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

function ChannelBadge({ channelName }: { channelName: string }) {
  return (
    <Badge variant="outline" className="shrink-0 font-mono text-[0.68rem] font-normal" data-channel-badge>
      {channelName}
    </Badge>
  );
}

function OverflowChannelBadges({
  channelNames,
  expanded,
  filePath,
  onToggleExpand,
}: {
  channelNames: string[];
  expanded: boolean;
  filePath: string;
  onToggleExpand: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const moreButtonRef = useRef<HTMLButtonElement>(null);
  const [visibleCount, setVisibleCount] = useState(0);

  const hiddenCount = Math.max(0, channelNames.length - visibleCount);

  useLayoutEffect(() => {
    if (expanded) {
      return;
    }

    const recalculate = () => {
      const container = containerRef.current;
      const measure = measureRef.current;
      const moreButton = moreButtonRef.current;
      if (!container || !measure) {
        return;
      }

      const containerWidth = container.getBoundingClientRect().width;
      if (containerWidth <= 0) {
        return;
      }

      const badgeElements = measure.querySelectorAll('[data-channel-badge]');
      const gap = 4;
      const moreButtonWidth = moreButton?.offsetWidth ?? 48;

      let used = 0;
      let count = 0;

      for (let index = 0; index < badgeElements.length; index++) {
        const badgeWidth = (badgeElements[index] as HTMLElement).offsetWidth;
        const gapBefore = count > 0 ? gap : 0;
        const remaining = badgeElements.length - (index + 1);
        const reserveMore = remaining > 0 ? gap + moreButtonWidth : 0;

        if (used + gapBefore + badgeWidth + reserveMore > containerWidth) {
          break;
        }

        used += gapBefore + badgeWidth;
        count++;
      }

      setVisibleCount(count);
    };

    recalculate();
    const container = containerRef.current;
    if (!container) {
      return;
    }
    const observer = new ResizeObserver(recalculate);
    observer.observe(container);
    return () => observer.disconnect();
  }, [channelNames, expanded]);

  if (expanded) {
    return (
      <div className="min-w-0">
        <div className="flex flex-wrap gap-1">
          {channelNames.map((channelName) => (
            <ChannelBadge key={`${filePath}:${channelName}`} channelName={channelName} />
          ))}
        </div>
        <Button type="button" variant="outline" size="sm" className="mt-1 h-6" onClick={onToggleExpand}>
          Less
        </Button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative min-w-0 w-full max-w-full overflow-hidden">
      <div ref={measureRef} className="pointer-events-none absolute left-0 top-0 -z-10 flex gap-1 opacity-0" aria-hidden>
        {channelNames.map((channelName) => (
          <ChannelBadge key={`measure:${filePath}:${channelName}`} channelName={channelName} />
        ))}
        {channelNames.length > 1 ? (
          <Button ref={moreButtonRef} type="button" variant="outline" size="sm" className="h-6 shrink-0" tabIndex={-1}>
            +{channelNames.length}
          </Button>
        ) : null}
      </div>
      <div className="flex min-w-0 max-w-full flex-nowrap gap-1 overflow-hidden">
        {channelNames.slice(0, visibleCount).map((channelName) => (
          <ChannelBadge key={`${filePath}:${channelName}`} channelName={channelName} />
        ))}
        {hiddenCount > 0 ? (
          <Button type="button" variant="outline" size="sm" className="h-6 shrink-0" onClick={onToggleExpand}>
            +{hiddenCount}
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function ScenarioHeaderControls({
  activeScenario,
  activeScenarioId,
  disabled,
  onAddScenario,
  onRemoveScenario,
  onSetActiveScenario,
  onUpdateScenarioLabel,
  scenarioCount,
  scenarios,
}: {
  activeScenario: { id: string; label: string };
  activeScenarioId: string | null;
  disabled?: boolean;
  onAddScenario?: () => void | Promise<void>;
  onRemoveScenario?: (scenarioId: string) => void | Promise<void>;
  onSetActiveScenario: (scenarioId: string) => void | Promise<void>;
  onUpdateScenarioLabel?: (scenarioId: string, label: string) => void | Promise<void>;
  scenarioCount: number;
  scenarios: NormalizedSceneConfig['scenarios'];
}) {
  const [renaming, setRenaming] = useState(false);
  const [draftLabel, setDraftLabel] = useState(activeScenario.label);

  useEffect(() => {
    setRenaming(false);
    setDraftLabel(activeScenario.label);
  }, [activeScenario.id, activeScenario.label]);

  const cancelRename = () => {
    setDraftLabel(activeScenario.label);
    setRenaming(false);
  };

  const commitRename = () => {
    const trimmed = draftLabel.trim();
    if (trimmed.length === 0) {
      cancelRename();
      return;
    }
    if (trimmed !== activeScenario.label && onUpdateScenarioLabel) {
      void onUpdateScenarioLabel(activeScenario.id, trimmed);
    }
    setRenaming(false);
  };

  if (renaming && onUpdateScenarioLabel) {
    return (
      <>
        <Input
          autoFocus
          focusVariant="soft"
          value={draftLabel}
          disabled={disabled}
          className="h-7 min-w-0 max-w-[12rem] flex-1 text-xs"
          aria-label="Sim data set name"
          data-overlay-escape-lock
          onChange={(event) => setDraftLabel(event.target.value)}
          onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              commitRename();
            }
            if (event.key === 'Escape') {
              event.preventDefault();
              event.stopPropagation();
              cancelRename();
            }
          }}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0"
          disabled={disabled}
          aria-label="Save name"
          onClick={commitRename}
        >
          <Check className="h-3 w-3" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0"
          disabled={disabled}
          aria-label="Cancel rename"
          onClick={cancelRename}
        >
          <X className="h-3 w-3" />
        </Button>
        <InlineHelp label="About sim data sets">
          Each sim data set is a different simulation of the same scene, for example different initial
          conditions or other variations.
        </InlineHelp>
      </>
    );
  }

  return (
    <>
      <ScenarioSelector
        activeScenario={activeScenarioId}
        disabled={disabled ?? false}
        triggerMode="name-only"
        onSetActiveScenario={onSetActiveScenario}
        scenarios={scenarios}
        {...(onAddScenario
          ? {
              onAddNew: () => {
                void onAddScenario();
              },
            }
          : {})}
      />
      {onUpdateScenarioLabel ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0"
          disabled={disabled}
          aria-label={`Rename ${activeScenario.label}`}
          onClick={() => {
            setDraftLabel(activeScenario.label);
            setRenaming(true);
          }}
        >
          <Pencil className="h-3 w-3" />
        </Button>
      ) : null}
      {onRemoveScenario && scenarioCount > 1 ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0 text-muted-foreground"
          disabled={disabled}
          aria-label={`Remove ${activeScenario.label}`}
          onClick={() => {
            void onRemoveScenario(activeScenario.id);
          }}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      ) : null}
      <InlineHelp label="About sim data sets">
        Each sim data set is a different simulation of the same scene, for example different initial
        conditions or other variations.
      </InlineHelp>
    </>
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
  onClearSimulationEntries?: () => void;
  onSetActiveScenario?: (scenarioId: string) => void | Promise<void>;
  onUpdateScenarioLabel?: (scenarioId: string, label: string) => void | Promise<void>;
  onAddScenario?: () => void | Promise<void>;
  onRemoveScenario?: (scenarioId: string) => void | Promise<void>;
  parsedSimulationFiles: ParsedSimulationFile[];
  sceneRef: SceneRef;
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
  onClearSimulationEntries,
  onSetActiveScenario,
  onUpdateScenarioLabel,
  onAddScenario,
  onRemoveScenario,
  parsedSimulationFiles,
  sceneRef,
  scenePath,
  simulationEntries: _simulationEntries,
  simulationEntryInput,
  simulationLoading,
  setSimulationEntryInput,
}: SimulationDataOverlayProps) {
  const [selectedBrowserPaths, setSelectedBrowserPaths] = useState<string[]>([]);
  const [selectionAnchorPath, setSelectionAnchorPath] = useState<string | null>(null);
  const [expandedChannelFiles, setExpandedChannelFiles] = useState<string[]>([]);
  const sceneBasePath = useMemo(() => getSceneBasePath(sceneRef), [sceneRef]);
  const browseRoot = sceneRef.source === 'sample' ? 'sample' : 'workspace';
  const toRelativeSimulationPath = (path: string) => relativeSimulationPathFromBrowser(sceneRef, path);
  const selectableBrowserPaths = useMemo(
    () => browserListing?.entries.filter((entry) => entry.type === 'file').map((entry) => entry.path) ?? [],
    [browserListing]
  );
  const selectedRelativeEntries = useMemo(
    () => selectedBrowserPaths.map((path) => toRelativeSimulationPath(path)),
    [sceneRef, selectedBrowserPaths]
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

  const simulationEntries = activeScenario?.simulationData ?? [];
  const hasSimulationFiles = expandedFiles.length > 0;
  const scenarioHeaderAddon =
    onSetActiveScenario && activeScenario ? (
      <ScenarioHeaderControls
        activeScenario={activeScenario}
        activeScenarioId={activeScene.activeScenario}
        disabled={simulationLoading}
        scenarioCount={activeScene.scenarios.length}
        scenarios={activeScene.scenarios}
        onSetActiveScenario={onSetActiveScenario}
        {...(onAddScenario ? { onAddScenario } : {})}
        {...(onRemoveScenario ? { onRemoveScenario } : {})}
        {...(onUpdateScenarioLabel ? { onUpdateScenarioLabel } : {})}
      />
    ) : null;

  return (
    <OverlayPanel
      title="Simulation Data"
      size="medium"
      headerAddon={scenarioHeaderAddon}
      actions={simulationLoading ? <Badge variant="outline">Refreshing…</Badge> : null}
      contentClassName="!overflow-hidden grid-rows-[auto_minmax(0,1fr)]"
      bodyClassName="grid min-h-0 overflow-hidden h-[min(68vh,640px)] grid-rows-[minmax(0,1fr)] !gap-0"
      onClose={onClose}
    >
      <div className="grid h-full min-h-0 grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-4">
        <div className="flex min-h-0 h-full flex-col gap-2">
          <div className="shrink-0 grid gap-1.5">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-1.5">
              <Input
                type="text"
                focusVariant="soft"
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

          <Separator className="shrink-0" />

          <LocalFileBrowser
            browserListing={browserListing}
            browserError={browserError}
            browserLoading={browserLoading}
            browseRoot={browseRoot}
            className="min-h-0 flex-1 basis-0"
            compact
            flat
            scrollable
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
            onOpenFile={(path) => {
              onAddSimulationEntries([toRelativeSimulationPath(path)]);
              clearBrowserSelection();
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
        </div>

        <div className="min-h-0 min-w-0 overflow-x-hidden overflow-y-auto border-l border-border pl-4">
          <div className="grid min-w-0 gap-2">
            <div className="flex items-center gap-2">
              <div className="flex min-w-0 flex-1 items-center gap-1.5">
                <h3 className="text-[0.72rem] font-semibold uppercase tracking-wide text-muted-foreground">
                  Simulation files
                </h3>
                <InlineHelp label="Simulation file paths" panelClassName="w-72">
                  Simulation file paths are stored relative to the scene JSON file located at:
                  <code className="mt-1 block break-all font-mono text-[0.68rem] text-foreground">{scenePath}</code>
                </InlineHelp>
              </div>
              {simulationEntries.length > 0 ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={simulationLoading || !onClearSimulationEntries}
                  onClick={() => onClearSimulationEntries?.()}
                >
                  Clear all
                </Button>
              ) : null}
            </div>
            {hasSimulationFiles ? (
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 text-[0.68rem]">
                <span className="text-muted-foreground">
                  <strong className="text-foreground">{expandedFiles.length}</strong> files
                </span>
                <span className="text-muted-foreground">
                  <strong className="text-foreground">{channelNames.length}</strong> channels
                </span>
                <span className="min-w-0 text-muted-foreground">
                  origin: <strong className="text-foreground">{canonicalOrigin ?? '—'}</strong>
                </span>
                <span className="min-w-0 text-muted-foreground">
                  frame: <strong className="text-foreground">{canonicalFrame ?? '—'}</strong>
                </span>
              </div>
            ) : null}

            {hasSimulationFiles ? <Separator /> : null}

            {hasSimulationFiles ? (
              <div className="grid min-w-0 gap-2">
                {expandedFiles.map((filePath) => {
                  const parsedFile = parsedSimulationFiles.find((entry) => entry.filePath === filePath);
                  const relativePath = getRelativePath(sceneBasePath, filePath);
                  const { directory, fileName } = splitFilePath(relativePath);
                  const fileChannelNames = parsedFile?.channelNames ?? [];
                  const fileOrigin = parsedFile?.sceneOrigin.canonical ?? null;
                  const fileFrame = parsedFile?.newtonianFrame.canonical ?? null;
                  const originIgnored = canonicalOrigin && fileOrigin && fileOrigin !== canonicalOrigin;
                  const frameIgnored = canonicalFrame && fileFrame && fileFrame !== canonicalFrame;
                  const showAllChannels = expandedChannelFiles.includes(filePath);
                  const simulationEntry = findSimulationEntryForExpandedFile(
                    filePath,
                    simulationEntries,
                    sceneBasePath
                  );

                  return (
                    <div key={filePath} className="grid min-w-0 gap-0 border-t border-border py-1 first:border-t-0 first:pt-0">
                      <div className="flex items-start gap-1">
                        <code className="block min-w-0 flex-1 break-all text-[0.68rem] leading-snug">
                          {directory ? <span className="text-muted-foreground">{directory}</span> : null}
                          <span className="font-semibold text-foreground">{fileName}</span>
                        </code>
                        {simulationEntry ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 shrink-0 text-muted-foreground"
                            disabled={simulationLoading}
                            aria-label={`Remove ${simulationEntry}`}
                            onClick={() => onRemoveSimulationEntry(simulationEntry)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        ) : null}
                      </div>
                      <div className="grid min-w-0 gap-1.5">
                        {parsedFile ? (
                          <div className="flex flex-wrap gap-1">
                            <Badge variant={originIgnored ? 'warning' : 'default'} className="font-mono text-[0.68rem] font-normal">
                              origin: {fileOrigin ?? 'n/a'}{originIgnored ? ' not used' : ''}
                            </Badge>
                            <Badge variant={frameIgnored ? 'warning' : 'default'} className="font-mono text-[0.68rem] font-normal">
                              frame: {fileFrame ?? 'n/a'}{frameIgnored ? ' not used' : ''}
                            </Badge>
                          </div>
                        ) : null}
                        {parsedFile && fileChannelNames.length > 0 ? (
                          <OverflowChannelBadges
                            channelNames={fileChannelNames}
                            expanded={showAllChannels}
                            filePath={filePath}
                            onToggleExpand={() =>
                              setExpandedChannelFiles((current) =>
                                showAllChannels
                                  ? current.filter((entry) => entry !== filePath)
                                  : current.includes(filePath)
                                    ? current
                                    : [...current, filePath]
                              )
                            }
                          />
                        ) : parsedFile ? (
                          <span className="text-xs text-muted-foreground">No channels.</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">Loading…</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                No simulation files — browse or enter a path on the left.
              </p>
            )}
          </div>
        </div>
      </div>
    </OverlayPanel>
  );
}
