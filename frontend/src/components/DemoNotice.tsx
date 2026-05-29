import { useState } from 'react';
import { isStaticHosting } from '../api/runtimeMode.ts';

const DEMO_NOTICE_STORAGE_KEY = 'mgview-demo-notice-dismissed';

export default function DemoNotice() {
  const [visible, setVisible] = useState(
    () => isStaticHosting && window.localStorage.getItem(DEMO_NOTICE_STORAGE_KEY) !== '1'
  );

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
        onClick={() => {
          window.localStorage.setItem(DEMO_NOTICE_STORAGE_KEY, '1');
          setVisible(false);
        }}
      >
        Dismiss
      </button>
    </div>
  );
}
