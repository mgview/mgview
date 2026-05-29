import type { SceneObjectInspection } from '../core/types.ts';

interface SpanListEntry {
  name: string;
  point1: string;
  point2: string;
  type: string;
  visualCount: number;
  visualNames: string[];
}

interface ObjectListProps {
  entries: SceneObjectInspection[];
  selectedObjectName: string | null;
  selectedSpanName: string | null;
  spans: SpanListEntry[];
  onCreateSpan: () => void;
  onSelectObject: (objectName: string, firstVisualName: string | null) => void;
  onSelectSpan: (spanName: string, firstVisualName: string | null) => void;
}

export default function ObjectList({
  entries,
  selectedObjectName,
  selectedSpanName,
  spans,
  onCreateSpan,
  onSelectObject,
  onSelectSpan,
}: ObjectListProps) {
  const groups = new Map<string, SceneObjectInspection[]>();
  for (const entry of entries) {
    const groupName = entry.type === 'frame' ? 'Frames' : entry.type === 'point' ? 'Points' : 'Other';
    const group = groups.get(groupName) ?? [];
    group.push(entry);
    groups.set(groupName, group);
  }

  return (
    <section className="panel">
      <h2>Scene</h2>
      <div className="object-groups">
        {[...groups.entries()].map(([groupName, groupEntries]) => (
          <div key={groupName} className="object-group">
            <div className="object-group-title">{groupName}</div>
            <div className="inspector-list">
              {groupEntries.map((entry) => (
                <button
                  key={entry.name}
                  type="button"
                  className={`inspector-item ${selectedObjectName === entry.name ? 'inspector-item-active' : ''}`}
                  onClick={() => onSelectObject(entry.name, entry.visuals[0]?.name ?? null)}
                >
                  <span className="inspector-item-top">
                    <code>{entry.name}</code>
                    {entry.missingSimulationData ? (
                      <span className="object-list-meta">
                        <span className="tag tag-warning">!</span>
                      </span>
                    ) : null}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ))}
        <div className="object-group">
          <div className="section-label-with-actions object-group-title-row">
            <div className="object-group-title">Spans</div>
            <div className="visual-toolbar-actions">
              <button type="button" className="icon-button" aria-label="Add span" title="Add span" onClick={onCreateSpan}>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          </div>
          <div className="inspector-list">
            {spans.length > 0 ? (
              spans.map((entry) => (
                <button
                  key={entry.name}
                  type="button"
                  className={`inspector-item ${selectedSpanName === entry.name ? 'inspector-item-active' : ''}`}
                  onClick={() => onSelectSpan(entry.name, entry.visualNames[0] ?? null)}
                >
                  <span className="inspector-item-top">
                    <code>{entry.name}</code>
                  </span>
                </button>
              ))
            ) : (
              <div className="empty-state-inline">No spans yet.</div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
