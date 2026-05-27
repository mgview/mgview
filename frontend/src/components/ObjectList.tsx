import type { SceneObjectInspection } from '../core/types.ts';

interface ObjectListProps {
  entries: SceneObjectInspection[];
  selectedObjectName: string | null;
  onSelectObject: (objectName: string, firstVisualName: string | null) => void;
}

export default function ObjectList({
  entries,
  selectedObjectName,
  onSelectObject,
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
      <h2>Objects</h2>
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
                    <strong>{entry.type}</strong>
                  </span>
                  {entry.inferred ? (
                    <span className="inspector-item-bottom">
                      <span className="tag tag-accent">inferred</span>
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
