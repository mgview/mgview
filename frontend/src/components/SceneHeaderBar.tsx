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
  onSave,
  onRevert,
}: SceneHeaderBarProps) {
  return (
    <section className="scene-header">
      <div className="scene-header-row">
        <div className="scene-header-main">
          <strong className="scene-header-title">{sceneName ?? 'MGView Workspace'}</strong>
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
              Channels
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
