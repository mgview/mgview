import { useEffect, useState } from 'react';

interface SavePreviewPanelProps {
  savePreview: string;
}

export default function SavePreviewPanel({ savePreview }: SavePreviewPanelProps) {
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'error'>('idle');

  useEffect(() => {
    if (copyState !== 'copied') {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => setCopyState('idle'), 1600);
    return () => window.clearTimeout(timeoutId);
  }, [copyState]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(savePreview);
      setCopyState('copied');
    } catch {
      setCopyState('error');
    }
  };

  return (
    <section className="save-preview-panel">
      <div className="save-preview-toolbar">
        <button
          type="button"
          className="secondary-button"
          onClick={handleCopy}
        >
          {copyState === 'copied' ? 'Copied' : copyState === 'error' ? 'Copy Failed' : 'Copy JSON'}
        </button>
      </div>
      <pre className="json-preview">{savePreview}</pre>
    </section>
  );
}
