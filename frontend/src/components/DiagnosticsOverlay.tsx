import type { SceneDiagnostic } from '../core/types.ts';
import OverlayPanel from './OverlayPanel.tsx';
import { Badge } from './ui/badge.tsx';
import { cn } from '../lib/utils.ts';

interface DiagnosticsOverlayProps {
  diagnostics: SceneDiagnostic[];
  onClose: () => void;
}

export default function DiagnosticsOverlay({ diagnostics, onClose }: DiagnosticsOverlayProps) {
  return (
    <OverlayPanel title="Diagnostics" size="narrow" onClose={onClose}>
      <div className="grid gap-1.5">
        {diagnostics.length === 0 ? (
          <div className="rounded-sm bg-primary/10 px-2 py-1.5 text-xs text-foreground">
            No scene warnings. Core extraction matched this sample cleanly.
          </div>
        ) : (
          diagnostics.map((diagnostic, index) => (
            <div
              key={`${diagnostic.severity}-${index}`}
              className={cn(
                'flex gap-2 rounded-sm px-2 py-1.5 text-xs',
                diagnostic.severity === 'warning'
                  ? 'bg-warning/15 text-warning-foreground'
                  : 'bg-primary/10 text-foreground'
              )}
            >
              <Badge variant={diagnostic.severity === 'warning' ? 'warning' : 'primary'} className="shrink-0 uppercase">
                {diagnostic.severity}
              </Badge>
              <span>{diagnostic.message}</span>
            </div>
          ))
        )}
      </div>
    </OverlayPanel>
  );
}
