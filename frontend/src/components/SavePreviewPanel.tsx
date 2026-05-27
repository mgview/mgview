interface SavePreviewPanelProps {
  savePreview: string;
}

export default function SavePreviewPanel({ savePreview }: SavePreviewPanelProps) {
  return (
    <section className="save-preview-panel">
      <pre className="json-preview">{savePreview}</pre>
    </section>
  );
}
