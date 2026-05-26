import SavePreviewPanel from './SavePreviewPanel.tsx';

interface JsonEditorPanelProps {
  hasLocalEdits: boolean;
  savePreview: string;
  scenePath: string;
}

export default function JsonEditorPanel({
  hasLocalEdits,
  savePreview,
  scenePath,
}: JsonEditorPanelProps) {
  return (
    <>
      <h2>JSON Editor</h2>
      <SavePreviewPanel
        scenePath={scenePath}
        hasLocalEdits={hasLocalEdits}
        savePreview={savePreview}
      />
    </>
  );
}
