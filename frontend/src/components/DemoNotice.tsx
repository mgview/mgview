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
      className="fixed left-1/2 top-1/2 z-50 flex w-[min(720px,calc(100vw-24px))] -translate-x-1/2 -translate-y-1/2 items-start gap-3 rounded-lg border border-warning/30 bg-card px-3 py-2 shadow-lg"
      role="status"
    >
      <div className="flex flex-1 items-center">
        <div className="flex flex-col flex-1">
          <span className="text-xl text-warning leading-tight">Online Demo</span>
          <span className="text-base text-warning leading-tight">Bundled samples only. Run MGView locally to edit scene files on disk.</span>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="ml-4 shrink-0 border-warning/30 text-warning hover:bg-warning/10"
          onClick={() => setVisible(false)}
        >
          Dismiss
        </Button>
      </div>
 
    </div>
  );
}
