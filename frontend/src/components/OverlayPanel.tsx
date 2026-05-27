import { useEffect } from 'react';
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
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

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
