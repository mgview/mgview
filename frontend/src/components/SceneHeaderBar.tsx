import { useEffect, useState } from 'react';

interface SceneHeaderBarProps {
  scenePath: string | null;
  sceneName: string | null;
  hasLocalEdits: boolean;
  loading: boolean;
  saving: boolean;
  statusMessage: string | null;
  errorMessage: string | null;
  onOpenLoadOverlay: () => void;
  onOpenDiagnostics: () => void;
  onOpenChannels: () => void;
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
  onOpenLoadOverlay,
  onOpenDiagnostics,
  onOpenChannels,
  onSceneNameChange,
  onSave,
  onRevert,
}: SceneHeaderBarProps) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(sceneName ?? '');

  useEffect(() => {
    if (!isEditingName) {
      setNameDraft(sceneName ?? '');
    }
  }, [isEditingName, sceneName]);

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
            <span className={`tag ${hasLocalEdits ? 'tag-accent' : 'tag-soft'}`}>
              {hasLocalEdits ? 'Unsaved edits' : 'Saved state'}
            </span>
            <button type="button" className="secondary-button" onClick={onOpenLoadOverlay} disabled={loading}>
              Load…
            </button>
            <button type="button" className="secondary-button" onClick={onOpenDiagnostics}>
              Diagnostics
            </button>
            <button type="button" className="secondary-button" onClick={onOpenChannels}>
              Sim Files
            </button>
            <button type="button" onClick={onSave} disabled={!hasLocalEdits || saving}>
              {saving ? 'Saving…' : 'Save'}
            </button>
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
