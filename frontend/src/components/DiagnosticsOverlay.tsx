import type { SceneDiagnostic } from '../core/types.ts';
import OverlayPanel from './OverlayPanel.tsx';
import { Checkbox } from './ui/checkbox.tsx';
import { Label } from './ui/label.tsx';
import { Badge } from './ui/badge.tsx';
import { cn } from '../lib/utils.ts';

interface DiagnosticsOverlayProps {
  diagnostics: SceneDiagnostic[];
  performanceOverlayOpen: boolean;
  setPerformanceOverlayOpen: (open: boolean) => void;
  onClose: () => void;
}

export default function DiagnosticsOverlay({
  diagnostics,
  performanceOverlayOpen,
  setPerformanceOverlayOpen,
  onClose,
}: DiagnosticsOverlayProps) {
  return (
    <OverlayPanel title="Diagnostics" size="narrow" onClose={onClose}>
      <div className="grid gap-3">
        <div className="grid gap-1.5">
          <h3 className="text-[0.72rem] font-semibold uppercase tracking-wide text-muted-foreground">Performance</h3>
          <div className="flex items-center gap-2">
            <Checkbox
              id="perf-overlay-toggle"
              checked={performanceOverlayOpen}
              onCheckedChange={(checked) => setPerformanceOverlayOpen(checked === true)}
            />
            <Label htmlFor="perf-overlay-toggle" className="normal-case tracking-normal">
              Show renderer stats overlay in the viewport
            </Label>
          </div>
          <p className="text-xs text-muted-foreground">
            Shows FPS, frame time, draw calls, triangle count, GPU resources, and renderer pixel ratio.
          </p>
        </div>

        <div className="grid gap-1.5">
          <h3 className="text-[0.72rem] font-semibold uppercase tracking-wide text-muted-foreground">Scene Checks</h3>
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
        </div>
      </div>
    </OverlayPanel>
  );
}
