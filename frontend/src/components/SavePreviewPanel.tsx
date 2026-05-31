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

  const copyLabel =
    copyState === 'copied' ? 'Copied' : copyState === 'error' ? 'Copy failed' : 'Copy';

  return (
    <section className="save-preview-panel">
      <div className="json-preview-shell">
        <button
          type="button"
          className="secondary-button json-preview-copy"
          onClick={handleCopy}
          aria-label="Copy JSON to clipboard"
        >
          {copyLabel}
        </button>
        <pre className="json-preview">{savePreview}</pre>
      </div>
    </section>
  );
}
