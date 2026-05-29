import { useState } from 'react';
import { isStaticHosting } from '../api/runtimeMode.ts';

export default function DemoNotice() {
  const [visible, setVisible] = useState(true);

  if (!isStaticHosting || !visible) {
    return null;
  }

  return (
    <div className="demo-notice" role="status">
      <p>
        Online demo — bundled samples only. Run MGView locally to edit scene files on disk. Copy JSON from the
        inspector when needed.
      </p>
      <button
        type="button"
        className="demo-notice-dismiss"
        onClick={() => setVisible(false)}
      >
        Dismiss
      </button>
    </div>
  );
}
