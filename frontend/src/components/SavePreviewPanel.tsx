import { useEffect, useState } from 'react';
import { Button } from './ui/button.tsx';

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
    <section className="grid min-h-0 h-full">
      <div className="relative min-h-0 h-full">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="absolute right-1 top-1 z-10 h-6 text-[0.68rem]"
          onClick={handleCopy}
          aria-label="Copy JSON to clipboard"
        >
          {copyLabel}
        </Button>
        <pre className="h-full overflow-auto rounded-md border border-border bg-muted/20 p-2 pt-7 font-mono text-[0.68rem] leading-relaxed">
          {savePreview}
        </pre>
      </div>
    </section>
  );
}
