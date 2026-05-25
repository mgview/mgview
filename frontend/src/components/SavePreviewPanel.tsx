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
    <section className="panel span-6">
      <h2>Save Preview</h2>
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
