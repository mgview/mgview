import { useState } from 'react';
import { isStaticHosting } from '../api/runtimeMode.ts';
import { Button } from './ui/button.tsx';

export default function DemoNotice() {
  const [visible, setVisible] = useState(true);

  if (!isStaticHosting || !visible) {
    return null;
  }

  return (
    <div
      className="fixed left-1/2 top-3 z-50 flex w-[min(720px,calc(100vw-24px))] -translate-x-1/2 items-start gap-3 rounded-lg border border-warning/30 bg-card px-3 py-2 shadow-lg"
      role="status"
    >
      <p className="m-0 flex-1 text-xs text-warning">
        Online demo — bundled samples only. Run MGView locally to edit scene files on disk. Copy JSON from the
        inspector when needed.
      </p>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="shrink-0 border-warning/30 text-warning hover:bg-warning/10"
        onClick={() => setVisible(false)}
      >
        Dismiss
      </Button>
    </div>
  );
}
