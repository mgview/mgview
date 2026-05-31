import type { SceneDiagnostic } from '../core/types.ts';
import OverlayPanel from './OverlayPanel.tsx';

interface DiagnosticsOverlayProps {
  diagnostics: SceneDiagnostic[];
  onClose: () => void;
}

export default function DiagnosticsOverlay({
  diagnostics,
  onClose,
}: DiagnosticsOverlayProps) {
  return (
    <OverlayPanel title="Diagnostics" size="narrow" onClose={onClose}>
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
    </OverlayPanel>
  );
}
