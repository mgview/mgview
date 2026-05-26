interface SavePreviewPanelProps {
  scenePath: string;
  hasLocalEdits: boolean;
  savePreview: string;
}

export default function SavePreviewPanel({
  scenePath,
  hasLocalEdits,
  savePreview,
}: SavePreviewPanelProps) {
  return (
    <section className="save-preview-panel">
      <div className="stacked-meta">
        <div className="meta-row">
          <label>Save Target</label>
          <code>{scenePath}</code>
        </div>
        <div className="meta-row">
          <label>Write Mode</label>
          <span>{hasLocalEdits ? 'Ready to save local edits in place.' : 'No unsaved changes.'}</span>
        </div>
      </div>
      <pre className="json-preview">{savePreview}</pre>
    </section>
  );
}
