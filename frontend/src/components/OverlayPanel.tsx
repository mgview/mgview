import type { ReactNode } from 'react';

interface OverlayPanelProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  onClose: () => void;
}

export default function OverlayPanel({
  title,
  subtitle,
  actions,
  children,
  onClose,
}: OverlayPanelProps) {
  return (
    <div className="overlay-backdrop" role="dialog" aria-modal="true">
      <div className="overlay-card">
        <div className="overlay-header">
          <div>
            <h2>{title}</h2>
            {subtitle ? <p className="panel-subtitle">{subtitle}</p> : null}
          </div>
          <div className="inline-tags">
            {actions}
            <button type="button" className="secondary-button" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
        <div className="overlay-body">{children}</div>
      </div>
    </div>
  );
}
