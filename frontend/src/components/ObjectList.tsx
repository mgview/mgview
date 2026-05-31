import { Plus } from 'lucide-react';
import type { SceneObjectInspection } from '../core/types.ts';
import { Button } from './ui/button.tsx';
import { Badge } from './ui/badge.tsx';
import { cn } from '../lib/utils.ts';

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
    <section className="rounded-md border border-border bg-card p-2">
      <h2 className="mb-1 text-[0.72rem] font-semibold uppercase tracking-wide text-muted-foreground">Scene</h2>
      <div className="grid gap-2">
        {[...groups.entries()].map(([groupName, groupEntries]) => (
          <div key={groupName} className="grid gap-1">
            <div className="text-[0.72rem] font-semibold uppercase tracking-wider text-primary">{groupName}</div>
            <div className="grid gap-0.5">
              {groupEntries.map((entry) => (
                <button
                  key={entry.name}
                  type="button"
                  className={cn(
                    'flex w-full items-center justify-between gap-1 rounded-sm border border-transparent px-1.5 py-1 text-left',
                    selectedObjectName === entry.name
                      ? 'border-primary/40 bg-primary text-primary-foreground'
                      : 'bg-muted/40 hover:bg-accent'
                  )}
                  title={entry.name}
                  onClick={() => onSelectObject(entry.name, entry.visuals[0]?.name ?? null)}
                >
                  <code className="min-w-0 truncate text-[0.72rem]">{entry.name}</code>
                  {entry.missingSimulationData ? (
                    <Badge variant="warning" className="h-4 min-w-4 justify-center px-1">!</Badge>
                  ) : null}
                </button>
              ))}
            </div>
          </div>
        ))}
        <div className="grid gap-1">
          <div className="flex items-center gap-1">
            <div className="min-w-0 flex-1 truncate text-[0.72rem] font-semibold uppercase tracking-wider text-primary">
              Spans
            </div>
            <Button type="button" variant="outline" size="icon" className="h-6 w-6" aria-label="Add span" title="Add span" onClick={onCreateSpan}>
              <Plus className="h-3 w-3" />
            </Button>
          </div>
          <div className="grid gap-0.5">
            {spans.length > 0 ? (
              spans.map((entry) => (
                <button
                  key={entry.name}
                  type="button"
                  className={cn(
                    'w-full rounded-sm border border-transparent px-1.5 py-1 text-left',
                    selectedSpanName === entry.name
                      ? 'border-primary/40 bg-primary text-primary-foreground'
                      : 'bg-muted/40 hover:bg-accent'
                  )}
                  title={entry.name}
                  onClick={() => onSelectSpan(entry.name, entry.visualNames[0] ?? null)}
                >
                  <code className="block truncate text-[0.72rem]">{entry.name}</code>
                </button>
              ))
            ) : (
              <p className="text-xs text-muted-foreground">No spans yet.</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
