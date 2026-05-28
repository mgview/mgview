import { useEffect, useState } from 'react';

interface SceneHeaderBarProps {
  scenePath: string | null;
  sceneName: string | null;
  hasLocalEdits: boolean;
  loading: boolean;
  saving: boolean;
  statusMessage: string | null;
  errorMessage: string | null;
  onOpenCreateOverlay: () => void;
  onOpenLoadOverlay: () => void;
  onOpenDiagnostics: () => void;
  onOpenChannels: () => void;
  onOpenSaveAsOverlay: () => void;
  onSceneNameChange: (nextName: string) => void;
  onSave: () => void;
  onRevert: () => void;
}

export default function SceneHeaderBar({
  scenePath,
  sceneName,
  hasLocalEdits,
  loading,
  saving,
  statusMessage,
  errorMessage,
  onOpenCreateOverlay,
  onOpenLoadOverlay,
  onOpenDiagnostics,
  onOpenChannels,
  onOpenSaveAsOverlay,
  onSceneNameChange,
  onSave,
  onRevert,
}: SceneHeaderBarProps) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(sceneName ?? '');
  const [saveMenuOpen, setSaveMenuOpen] = useState(false);

  useEffect(() => {
    if (!isEditingName) {
      setNameDraft(sceneName ?? '');
    }
  }, [isEditingName, sceneName]);

  useEffect(() => {
    if (!saveMenuOpen) {
      return;
    }

    const handleWindowPointerDown = () => {
      setSaveMenuOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSaveMenuOpen(false);
      }
    };

    window.addEventListener('pointerdown', handleWindowPointerDown);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('pointerdown', handleWindowPointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [saveMenuOpen]);

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
            <button type="button" className="secondary-button" onClick={onOpenCreateOverlay} disabled={loading}>
              New…
            </button>
            <button type="button" className="secondary-button" onClick={onOpenLoadOverlay} disabled={loading}>
              Load…
            </button>
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
                onClick={() => setSaveMenuOpen((current) => !current)}
              >
                v
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
            <button type="button" className="secondary-button" onClick={onRevert} disabled={!hasLocalEdits || saving}>
              Revert
            </button>
          </div>

          {statusMessage ? <div className={`status scene-header-status ${statusMessage.startsWith('Saved ') ? 'success' : ''}`}>{statusMessage}</div> : null}
          {errorMessage ? <div className="status error scene-header-status">{errorMessage}</div> : null}
          {!errorMessage && loading ? <div className="status scene-header-status">Loading scene, simulation files, and diagnostics…</div> : null}
        </div>
      </div>
    </section>
  );
}
