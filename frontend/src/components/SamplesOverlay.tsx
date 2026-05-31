import type { SampleSceneEntry } from '../core/samplesManifest.ts';
import OverlayPanel from './OverlayPanel.tsx';
import SampleSceneGallery from './SampleSceneGallery.tsx';

interface SamplesOverlayProps {
  groupedSamples: Array<[string, SampleSceneEntry[]]>;
  loading: boolean;
  onClose: () => void;
  onOpenSample: (path: string) => void;
}

export default function SamplesOverlay({
  groupedSamples,
  loading,
  onClose,
  onOpenSample,
}: SamplesOverlayProps) {
  return (
    <OverlayPanel title="Sample Scenes" size="medium" onClose={onClose}>
      <SampleSceneGallery
        groupedSamples={groupedSamples}
        sceneInput=""
        onOpenScene={onOpenSample}
        onSelectScene={() => undefined}
        loading={loading}
      />
    </OverlayPanel>
  );
}
