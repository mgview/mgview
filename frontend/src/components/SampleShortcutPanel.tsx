export interface SampleShortcut {
  group: string;
  label: string;
  path: string;
}

interface SampleShortcutPanelProps {
  groupedSamples: Array<[string, SampleShortcut[]]>;
  sampleBrowserExpanded: boolean;
  sceneInput: string;
  setSampleBrowserExpanded: (updater: (current: boolean) => boolean) => void;
  setSceneInput: (value: string) => void;
}

export default function SampleShortcutPanel({
  groupedSamples,
  sampleBrowserExpanded,
  sceneInput,
  setSampleBrowserExpanded,
  setSceneInput,
}: SampleShortcutPanelProps) {
  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h2>Built-in Sample Shortcuts</h2>
          <p className="panel-subtitle">Choose a bundled sample and then open it.</p>
        </div>
        <button
          type="button"
          className="secondary-button"
          onClick={() => setSampleBrowserExpanded((current) => !current)}
        >
          {sampleBrowserExpanded ? 'Hide Samples' : 'Show Samples'}
        </button>
      </div>

      {sampleBrowserExpanded ? (
        <div className="sample-groups">
          {groupedSamples.map(([groupName, samples]) => (
            <div key={groupName} className="sample-group">
              <div className="sample-group-title">{groupName}</div>
              <div className="sample-list">
                {samples.map((sample) => (
                  <button
                    key={sample.path}
                    type="button"
                    className={`sample-button ${sceneInput === sample.path ? 'sample-button-active' : ''}`}
                    onClick={() => {
                      setSceneInput(sample.path);
                    }}
                  >
                    <span>{sample.label}</span>
                    <code>{sample.path}</code>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">Sample shortcuts are hidden.</div>
      )}
    </section>
  );
}
