import type { FileBrowserListing } from '../api/localFiles.ts';
import { getDirectoryPath } from '../hooks/useSceneWorkspace.ts';
import LocalFileBrowser from './LocalFileBrowser.tsx';
import OverlayPanel from './OverlayPanel.tsx';
import LoadScenePathPanel from './LoadScenePathPanel.tsx';
import SampleShortcutPanel, { type SampleShortcut } from './SampleShortcutPanel.tsx';

interface LoadSceneOverlayProps {
  browserError: string | null;
  browserListing: FileBrowserListing | null;
  browserLoading: boolean;
  groupedSamples: Array<[string, SampleShortcut[]]>;
  loading: boolean;
  onBrowse: (path: string) => void;
  onClose: () => void;
  onOpenScenePath: (path: string) => void;
  onOpenSelectedScene: () => void;
  sampleBrowserExpanded: boolean;
  sceneInput: string;
  setSampleBrowserExpanded: (updater: (current: boolean) => boolean) => void;
  setSceneInput: (value: string) => void;
}

function isJsonPath(filePath: string): boolean {
  return filePath.toLowerCase().endsWith('.json');
}

export default function LoadSceneOverlay({
  browserError,
  browserListing,
  browserLoading,
  groupedSamples,
  loading,
  onBrowse,
  onClose,
  onOpenScenePath,
  onOpenSelectedScene,
  sampleBrowserExpanded,
  sceneInput,
  setSampleBrowserExpanded,
  setSceneInput,
}: LoadSceneOverlayProps) {
  return (
    <OverlayPanel
      title="Load Scene"
      onClose={onClose}
    >
      <div className="overlay-layout">
        <LoadScenePathPanel
          loading={loading}
          onOpen={onOpenSelectedScene}
          onSceneInputChange={setSceneInput}
          sceneInput={sceneInput}
        />

        <LocalFileBrowser
          browserListing={browserListing}
          browserError={browserError}
          browserLoading={browserLoading}
          filterEntry={(entry) => entry.type === 'directory' || isJsonPath(entry.name)}
          sceneInput={sceneInput}
          title="Scene Browser"
          onBrowse={onBrowse}
          onOpenFile={(path) => {
            setSceneInput(path);
            onOpenScenePath(path);
          }}
          onSelectFile={setSceneInput}
          getDirectoryPath={getDirectoryPath}
        />

        <SampleShortcutPanel
          groupedSamples={groupedSamples}
          sampleBrowserExpanded={sampleBrowserExpanded}
          sceneInput={sceneInput}
          setSampleBrowserExpanded={setSampleBrowserExpanded}
          setSceneInput={setSceneInput}
        />
      </div>
    </OverlayPanel>
  );
}
