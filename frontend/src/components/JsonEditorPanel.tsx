import SavePreviewPanel from './SavePreviewPanel.tsx';

interface JsonEditorPanelProps {
  savePreview: string;
}

export default function JsonEditorPanel({ savePreview }: JsonEditorPanelProps) {
  return <SavePreviewPanel savePreview={savePreview} />;
}
