import type { SampleSceneEntry } from '../core/samplesManifest.ts';

const GROUP_ACCENTS: Record<string, string> = {
  Basics: 'linear-gradient(135deg, #2a4f7a, #1a3558)',
  Mechanisms: 'linear-gradient(135deg, #3f5f46, #274231)',
  Vehicles: 'linear-gradient(135deg, #6a4d2d, #4a331f)',
  Cameras: 'linear-gradient(135deg, #4f3f6d, #32274d)',
  Robots: 'linear-gradient(135deg, #6d3f4a, #4a2731)',
  Meshes: 'linear-gradient(135deg, #3f636d, #27444a)',
};

interface SampleSceneGalleryProps {
  groupedSamples: Array<[string, SampleSceneEntry[]]>;
  sceneInput: string;
  loading?: boolean;
  onOpenScene: (path: string) => void;
  onSelectScene: (path: string) => void;
}

export default function SampleSceneGallery({
  groupedSamples,
  sceneInput,
  loading = false,
  onOpenScene,
  onSelectScene,
}: SampleSceneGalleryProps) {
  return (
    <div className="sample-gallery-groups">
        {groupedSamples.map(([groupName, samples]) => (
          <div key={groupName} className="sample-gallery-group">
            <div className="sample-gallery-group-title">{groupName}</div>
            <div className="sample-gallery-grid">
              {samples.map((sample) => {
                const isActive = sceneInput === sample.path;
                const accent = GROUP_ACCENTS[groupName] ?? 'linear-gradient(135deg, #334155, #1e293b)';

                return (
                  <button
                    key={sample.path}
                    type="button"
                    className={`sample-tile ${isActive ? 'sample-tile-active' : ''}`}
                    disabled={loading}
                    onClick={() => {
                      onSelectScene(sample.path);
                      onOpenScene(sample.path);
                    }}
                  >
                    <span className="sample-tile-thumb" style={{ background: accent }} aria-hidden="true">
                      <span className="sample-tile-initial">{sample.label.charAt(0)}</span>
                    </span>
                    <span className="sample-tile-copy">
                      <span className="sample-tile-label">{sample.label}</span>
                      <code className="sample-tile-path">{sample.path}</code>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
    </div>
  );
}
