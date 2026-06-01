import type { SampleSceneEntry } from '../core/samplesManifest.ts';
import { cn } from '../lib/utils.ts';

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
    <div className="grid gap-4">
      {groupedSamples.map(([groupName, samples]) => (
        <div key={groupName} className="grid gap-2">
          <div className="text-[0.72rem] font-semibold uppercase tracking-wide text-muted-foreground">{groupName}</div>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-2">
            {samples.map((sample) => {
              const isActive = sceneInput === sample.path;
              const accent = GROUP_ACCENTS[groupName] ?? 'linear-gradient(135deg, #334155, #1e293b)';

              return (
                <button
                  key={sample.path}
                  type="button"
                  className={cn(
                    'flex items-stretch gap-2 rounded-md border border-border bg-card p-1.5 text-left transition-colors hover:bg-accent',
                    isActive && 'border-primary ring-1 ring-primary/30'
                  )}
                  disabled={loading}
                  onClick={() => {
                    onSelectScene(sample.path);
                    onOpenScene(sample.path);
                  }}
                >
                  <span
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm text-sm font-bold text-white"
                    style={{ background: accent }}
                    aria-hidden="true"
                  >
                    {sample.label.charAt(0)}
                  </span>
                  <span className="grid min-w-0 content-center gap-0.5">
                    <span className="truncate text-xs font-medium">{sample.label}</span>
                    <code className="truncate text-[0.65rem] text-muted-foreground">{sample.path}</code>
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
