import { useEffect, useState } from 'react';

interface SceneHeaderBarProps {
  scenePath: string | null;
  sceneName: string | null;
  hasLocalEdits: boolean;
  loading: boolean;
  saving: boolean;
  canUndo: boolean;
  canRedo: boolean;
  statusMessage: string | null;
  errorMessage: string | null;
  onOpenCreateOverlay: () => void;
  onOpenLoadOverlay: () => void;
  onOpenDiagnostics: () => void;
  onOpenChannels: () => void;
  onOpenSaveAsOverlay: () => void;
  onSceneNameChange: (nextName: string) => void;
  onRedo: () => void;
  onSave: () => void;
  onRevert: () => void;
  onUndo: () => void;
}

export default function SceneHeaderBar({
  scenePath,
  sceneName,
  hasLocalEdits,
  loading,
  saving,
  canUndo,
  canRedo,
  statusMessage,
  errorMessage,
  onOpenCreateOverlay,
  onOpenLoadOverlay,
  onOpenDiagnostics,
  onOpenChannels,
  onOpenSaveAsOverlay,
  onSceneNameChange,
  onRedo,
  onSave,
  onRevert,
  onUndo,
}: SceneHeaderBarProps) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(sceneName ?? '');
  const [loadMenuOpen, setLoadMenuOpen] = useState(false);
  const [saveMenuOpen, setSaveMenuOpen] = useState(false);

  useEffect(() => {
    if (!isEditingName) {
      setNameDraft(sceneName ?? '');
    }
  }, [isEditingName, sceneName]);

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

  const commitSceneName = () => {
    onSceneNameChange(nameDraft);
    setIsEditingName(false);
  };

  return (
    <section className="scene-header">
      <div className="scene-header-row">
        <div className="scene-header-main">
          {isEditingName ? (
            <input
              className="scene-header-title-input"
              type="text"
              autoFocus
              value={nameDraft}
              onChange={(event) => setNameDraft(event.target.value)}
              onBlur={commitSceneName}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  commitSceneName();
                }
                if (event.key === 'Escape') {
                  setNameDraft(sceneName ?? '');
                  setIsEditingName(false);
                }
              }}
            />
          ) : (
            <button
              type="button"
              className="scene-header-title-button"
              onClick={() => setIsEditingName(true)}
            >
              {sceneName ?? 'MGView Workspace'}
            </button>
          )}
          <code className="scene-header-code">{scenePath ?? '(none loaded)'}</code>
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
            <div
              className="split-button"
              onPointerDown={(event) => {
                event.stopPropagation();
              }}
            >
              <button type="button" onClick={onOpenLoadOverlay} disabled={loading}>
                Load…
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
                    onClick={() => {
                      setLoadMenuOpen(false);
                      onOpenCreateOverlay();
                    }}
                  >
                    New…
                  </button>
                </div>
              ) : null}
            </div>
            <button type="button" className="secondary-button" onClick={onOpenDiagnostics}>
              Diagnostics
            </button>
            <button type="button" className="secondary-button" onClick={onOpenChannels}>
              Sim Files
            </button>
            <div
              className="split-button"
              onPointerDown={(event) => {
                event.stopPropagation();
              }}
            >
              <button type="button" onClick={onSave} disabled={!hasLocalEdits || saving}>
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button
                type="button"
                className="split-button-toggle"
                aria-label="Open save menu"
                aria-haspopup="menu"
                aria-expanded={saveMenuOpen}
                disabled={saving}
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

          {statusMessage ? <div className={`status scene-header-status ${statusMessage.startsWith('Saved ') ? 'success' : ''}`}>{statusMessage}</div> : null}
          {errorMessage ? <div className="status error scene-header-status">{errorMessage}</div> : null}
          {!errorMessage && loading ? <div className="status scene-header-status">Loading scene, simulation files, and diagnostics…</div> : null}
        </div>
      </div>
    </section>
  );
}
