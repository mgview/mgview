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
  return (
    <section className="panel span-4">
      <h2>Objects</h2>
      <div className="inspector-list">
        {entries.map((entry) => (
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
            <span className="inspector-item-bottom">
              <span>
                {entry.visualCount} visual{entry.visualCount === 1 ? '' : 's'}
              </span>
              {entry.inferred ? <span className="tag tag-accent">inferred</span> : null}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
