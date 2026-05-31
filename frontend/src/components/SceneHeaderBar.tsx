import { useEffect, useState } from 'react';
import { canPersistScenesToServer } from '../api/runtimeMode.ts';

interface SceneHeaderBarProps {
  scenePath: string | null;
  onOpenWorkspace?: () => void;
  onOpenAbout: () => void;
  hasLocalEdits: boolean;
  loading: boolean;
  saving: boolean;
  canUndo: boolean;
  canRedo: boolean;
  diagnosticsWarningCount: number;
  onOpenCreateOverlay: () => void;
  onOpenLoadOverlay: () => void;
  onOpenSamplesOverlay: () => void;
  onOpenDiagnostics: () => void;
  onOpenChannels: () => void;
  onOpenSaveAsOverlay: () => void;
  onRedo: () => void;
  onSave: () => void;
  onRevert: () => void;
  onUndo: () => void;
}

export default function SceneHeaderBar({
  scenePath,
  onOpenWorkspace,
  onOpenAbout,
  hasLocalEdits,
  loading,
  saving,
  canUndo,
  canRedo,
  diagnosticsWarningCount,
  onOpenCreateOverlay,
  onOpenLoadOverlay,
  onOpenSamplesOverlay,
  onOpenDiagnostics,
  onOpenChannels,
  onOpenSaveAsOverlay,
  onRedo,
  onSave,
  onRevert,
  onUndo,
}: SceneHeaderBarProps) {
  const [loadMenuOpen, setLoadMenuOpen] = useState(false);
  const [saveMenuOpen, setSaveMenuOpen] = useState(false);
  const saveDisabled = !canPersistScenesToServer || !hasLocalEdits || saving;
  const saveTitle = !canPersistScenesToServer
    ? 'Save is not available in the online demo'
    : !hasLocalEdits
      ? 'No unsaved changes'
      : 'Save';

  useEffect(() => {
    if (!loadMenuOpen && !saveMenuOpen) {
      return;
    }

    const handleWindowPointerDown = () => {
      setLoadMenuOpen(false);
      setSaveMenuOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setLoadMenuOpen(false);
        setSaveMenuOpen(false);
      }
    };

    window.addEventListener('pointerdown', handleWindowPointerDown);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('pointerdown', handleWindowPointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [loadMenuOpen, saveMenuOpen]);

  return (
    <section className="scene-header">
      <div className="scene-header-row">
        <div className="scene-header-main">
          <div className="scene-header-brand-row">
            <span className="scene-header-brand">MGView</span>
            <button
              type="button"
              className="scene-header-about-button"
              onClick={onOpenAbout}
              aria-label="About MGView"
              title="About MGView"
            >
              ?
            </button>
            <code
              className="scene-header-code"
              title={scenePath ?? 'No scene loaded'}
            >
              {scenePath ?? '(none loaded)'}
            </code>
            {hasLocalEdits ? (
              <span className="scene-header-unsaved" title="Unsaved changes" aria-label="Unsaved changes">
                •
              </span>
            ) : null}
          </div>
        </div>

        <div className="scene-header-side">
          <div className="scene-header-actions">
            <button
              type="button"
              className="icon-button"
              onClick={onUndo}
              disabled={!canUndo || loading}
              aria-label="Undo"
              title="Undo"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M9 7H5v4M5 11a8 8 0 1 1 2.3 5.7"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <button
              type="button"
              className="icon-button"
              onClick={onRedo}
              disabled={!canRedo || loading}
              aria-label="Redo"
              title="Redo"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M15 7h4v4M19 11a8 8 0 1 0-2.3 5.7"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <button type="button" className="secondary-button" onClick={onOpenSamplesOverlay} disabled={loading}>
              Samples…
            </button>
            <div
              className="split-button"
              onPointerDown={(event) => {
                event.stopPropagation();
              }}
            >
              <button type="button" onClick={onOpenLoadOverlay} disabled={loading}>
                {loading ? 'Loading…' : 'Load…'}
              </button>
              <button
                type="button"
                className="split-button-toggle"
                aria-label="Open load menu"
                aria-haspopup="menu"
                aria-expanded={loadMenuOpen}
                disabled={loading}
                onClick={() => {
                  setSaveMenuOpen(false);
                  setLoadMenuOpen((current) => !current);
                }}
              >
                <svg viewBox="0 0 12 12" aria-hidden="true">
                  <path
                    d="M2.25 4.5 6 7.5l3.75-3"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              {loadMenuOpen ? (
                <div className="split-button-menu" role="menu">
                  <button
                    type="button"
                    className="split-button-menu-item"
                    role="menuitem"
                    disabled={!hasLocalEdits || saving}
                    onClick={() => {
                      setLoadMenuOpen(false);
                      onRevert();
                    }}
                  >
                    Reload
                  </button>
                  <button
                    type="button"
                    className="split-button-menu-item"
                    role="menuitem"
                    disabled={!canPersistScenesToServer}
                    title={!canPersistScenesToServer ? 'Not available in the online demo' : undefined}
                    onClick={() => {
                      setLoadMenuOpen(false);
                      onOpenCreateOverlay();
                    }}
                  >
                    New…
                  </button>
                  <button
                    type="button"
                    className="split-button-menu-item"
                    role="menuitem"
                    onClick={() => {
                      setLoadMenuOpen(false);
                      onOpenChannels();
                    }}
                  >
                    Sim Files…
                  </button>
                </div>
              ) : null}
            </div>
            <button
              type="button"
              className="secondary-button scene-header-diagnostics-button"
              onClick={onOpenDiagnostics}
            >
              Diagnostics
              {diagnosticsWarningCount > 0 ? (
                <span className="scene-header-badge" aria-label={`${diagnosticsWarningCount} warnings`}>
                  {diagnosticsWarningCount}
                </span>
              ) : null}
            </button>
            <div
              className="split-button"
              onPointerDown={(event) => {
                event.stopPropagation();
              }}
            >
              <button
                type="button"
                onClick={onSave}
                disabled={saveDisabled}
                title={saveTitle}
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button
                type="button"
                className="split-button-toggle"
                aria-label="Open save menu"
                aria-haspopup="menu"
                aria-expanded={saveMenuOpen}
                disabled={saving || !canPersistScenesToServer}
                title={!canPersistScenesToServer ? 'Save is not available in the online demo' : undefined}
                onClick={() => {
                  setLoadMenuOpen(false);
                  setSaveMenuOpen((current) => !current);
                }}
              >
                <svg viewBox="0 0 12 12" aria-hidden="true">
                  <path
                    d="M2.25 4.5 6 7.5l3.75-3"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              {saveMenuOpen ? (
                <div className="split-button-menu" role="menu">
                  <button
                    type="button"
                    className="split-button-menu-item"
                    role="menuitem"
                    onClick={() => {
                      setSaveMenuOpen(false);
                      onOpenSaveAsOverlay();
                    }}
                  >
                    Save As…
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
