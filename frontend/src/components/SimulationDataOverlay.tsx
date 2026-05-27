import { useMemo, useState } from 'react';
import type { FileBrowserListing } from '../api/localFiles.ts';
import type { ParsedSimulationFile } from '../core/types.ts';
import { getBasePath, getRelativePath } from '../core/pathUtils.ts';
import { getDirectoryPath } from '../hooks/useSceneWorkspace.ts';
import LocalFileBrowser from './LocalFileBrowser.tsx';
import OverlayPanel from './OverlayPanel.tsx';

const POSITION_CHANNEL = /^P_[^_]+_[^\[]+\[[123]\]$/;
const MATRIX_CHANNEL = /^(?!P_)[^_]+_[^\[]+\[[123],[123]\]$/;

function splitFilePath(filePath: string): { directory: string; fileName: string } {
  const normalized = filePath.replace(/\\/g, '/');
  const slashIndex = normalized.lastIndexOf('/');
  if (slashIndex === -1) {
    return {
      directory: '',
      fileName: normalized,
    };
  }

  return {
    directory: normalized.slice(0, slashIndex + 1),
    fileName: normalized.slice(slashIndex + 1),
  };
}

function isPositionMatrixBundle(channelNames: string[]): boolean {
  if (channelNames.length !== 12) {
    return false;
  }

  const positionChannels = channelNames.filter((channelName) => POSITION_CHANNEL.test(channelName));
  const matrixChannels = channelNames.filter((channelName) => MATRIX_CHANNEL.test(channelName));
  return positionChannels.length === 3 && matrixChannels.length === 9;
}

function renderChannelGroups(channelNames: string[]) {
  if (!isPositionMatrixBundle(channelNames)) {
    return [channelNames];
  }

  return [
    channelNames.filter((channelName) => POSITION_CHANNEL.test(channelName)),
    channelNames.filter((channelName) => MATRIX_CHANNEL.test(channelName)),
  ];
}

interface SimulationDataOverlayProps {
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
  const [manualEntryExpanded, setManualEntryExpanded] = useState(false);
  const sceneBasePath = useMemo(() => getBasePath(scenePath), [scenePath]);
  const selectedRelativeEntries = useMemo(
    () => selectedBrowserPaths.map((path) => getRelativePath(sceneBasePath, path)),
    [sceneBasePath, selectedBrowserPaths]
  );
  const clearBrowserSelection = () => {
    setSelectedBrowserPaths([]);
  };

  return (
    <OverlayPanel
      title="Simulation Data"
      subtitle="Manage simulation file entries and inspect the parsed channels driving inference."
      actions={
        simulationLoading ? (
          <span className="tag tag-soft">Refreshing…</span>
        ) : (
          <span className="tag tag-soft">Auto-refresh on</span>
        )
      }
      onClose={onClose}
    >
      <div className="overlay-layout">
        <section className="panel">
          <h2>Simulation Entries</h2>
          <div className="stacked-meta">
            <div className="meta-row">
              <label>Current Entries</label>
              <div className="sim-entry-list">
                {simulationEntries.length > 0 ? (
                  simulationEntries.map((entry) => (
                    <span key={entry} className="sim-entry-chip">
                      <code>{entry}</code>
                      <button type="button" className="icon-button subtle-icon-button" onClick={() => onRemoveSimulationEntry(entry)}>
                        x
                      </button>
                    </span>
                  ))
                ) : (
                  <span className="empty-state-inline">No simulationData entries yet.</span>
                )}
              </div>
            </div>
          </div>

          <div className="sim-entry-manual-toggle">
            <button
              type="button"
              className="secondary-button"
              onClick={() => setManualEntryExpanded((current) => !current)}
            >
              {manualEntryExpanded ? 'Hide Manual Path Entry' : 'Advanced Path Entry…'}
            </button>
          </div>

          {manualEntryExpanded ? (
            <div className="meta-row sim-entry-manual-panel">
              <label>Add Entry By Path</label>
              <div className="sim-entry-controls">
                <input
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
                <button type="button" onClick={onAddSimulationEntry} disabled={simulationEntryInput.trim().length === 0}>
                  Add
                </button>
              </div>
              <p className="panel-subtitle">Use this for manual ranges or paths the browser view does not already expose.</p>
            </div>
          ) : null}

          {fileErrors.length > 0 ? (
            <div className="status error">
              {fileErrors.map((message) => (
                <div key={message}>{message}</div>
              ))}
            </div>
          ) : null}
        </section>

        <LocalFileBrowser
          browserListing={browserListing}
          browserError={browserError}
          browserLoading={browserLoading}
          emptyStateMessage="Browse the workspace and click a file to add it as a simulation entry."
          sceneInput={simulationEntryInput || scenePath}
          selectedPaths={selectedBrowserPaths}
          title="Simulation File Browser"
          titleActions={
            <>
              <button
                type="button"
                className="secondary-button"
                disabled={selectedRelativeEntries.length === 0}
                onClick={clearBrowserSelection}
                aria-label="Clear selected simulation files"
              >
                x
              </button>
              <button
                type="button"
                className={selectedRelativeEntries.length > 0 ? '' : 'secondary-button'}
                disabled={selectedRelativeEntries.length === 0}
                onClick={() => {
                  onAddSimulationEntries(selectedRelativeEntries);
                  clearBrowserSelection();
                }}
              >
                {selectedRelativeEntries.length > 1 ? `Add Selected (${selectedRelativeEntries.length})` : 'Add Selected'}
              </button>
            </>
          }
          onBrowse={(path) => {
            clearBrowserSelection();
            onBrowse(path);
          }}
          onSelectFile={(path, options) => {
            setSelectedBrowserPaths((current) => {
              const additive = options?.additive ?? false;
              if (!additive) {
                return current.length === 1 && current[0] === path ? current : [path];
              }
              return current.includes(path) ? current.filter((entry) => entry !== path) : [...current, path];
            });
          }}
          getDirectoryPath={getDirectoryPath}
        />

        <section className="panel">
          <h2>Channel Inspector</h2>
          <div className="meta-list">
            <div>
              <label>Expanded Files</label>
              <strong>{expandedFiles.length}</strong>
            </div>
            <div>
              <label>Channels</label>
              <strong>{channelNames.length}</strong>
            </div>
          </div>

          <div className="stacked-meta">
            <div className="meta-row">
              <label>Files And Channels</label>
              <div className="sim-file-channel-list">
                {expandedFiles.map((filePath) => {
                  const parsedFile = parsedSimulationFiles.find((entry) => entry.filePath === filePath);
                  const { directory, fileName } = splitFilePath(filePath);
                  const channelGroups = renderChannelGroups(parsedFile?.channelNames ?? []);
                  return (
                    <div key={filePath} className="sim-file-channel-row">
                      <div className="sim-file-channel-file">
                        {directory ? <code className="sim-file-channel-dir">{directory}</code> : null}
                        <code className="sim-file-channel-name">{fileName}</code>
                      </div>
                      <div className="sim-file-channel-pills">
                        {parsedFile && parsedFile.channelNames.length > 0 ? (
                          channelGroups.map((channelGroup, groupIndex) => (
                            <div key={`${filePath}:group:${groupIndex}`} className="sim-file-channel-group">
                              {channelGroup.map((channelName) => (
                                <span key={`${filePath}:${channelName}`} className="pill">
                                  <code>{channelName}</code>
                                </span>
                              ))}
                            </div>
                          ))
                        ) : (
                          <span className="empty-state-inline">No parsed channels.</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      </div>
    </OverlayPanel>
  );
}
