import type { SceneDiagnostic } from '../core/types.ts';
import OverlayPanel from './OverlayPanel.tsx';

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
      <div className="overlay-layout">
        <div className="overlay-section">
          <h3 className="overlay-section-title">Performance</h3>
          <label className="toggle-row">
            <input
              type="checkbox"
              checked={performanceOverlayOpen}
              onChange={(event) => {
                setPerformanceOverlayOpen(event.target.checked);
              }}
            />
            <span>Show renderer stats overlay in the viewport</span>
          </label>
          <div className="overlay-help">
            Shows FPS, frame time, draw calls, triangle count, GPU resources, and renderer pixel ratio.
          </div>
        </div>

        <div className="overlay-section">
          <h3 className="overlay-section-title">Scene Checks</h3>
          <div className="diagnostic-list">
            {diagnostics.length === 0 ? (
              <div className="diagnostic diagnostic-info">
                No scene warnings. Core extraction matched this sample cleanly.
              </div>
            ) : (
              diagnostics.map((diagnostic, index) => (
                <div
                  key={`${diagnostic.severity}-${index}`}
                  className={`diagnostic ${diagnostic.severity === 'warning' ? 'diagnostic-warning' : 'diagnostic-info'}`}
                >
                  <strong>{diagnostic.severity}</strong>
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
