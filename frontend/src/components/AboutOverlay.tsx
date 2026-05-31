import buildInfo from '../generated/buildInfo.ts';
import OverlayPanel from './OverlayPanel.tsx';

interface AboutOverlayProps {
  onClose: () => void;
}

export default function AboutOverlay({ onClose }: AboutOverlayProps) {
  return (
    <OverlayPanel title="About MGView" size="narrow" onClose={onClose}>
      <dl className="divide-y divide-border overflow-hidden rounded-md border border-border">
        <div className="flex items-center justify-between gap-3 bg-muted/30 px-2.5 py-1.5">
          <dt className="text-[0.72rem] text-muted-foreground">Version</dt>
          <dd><code>{buildInfo.version}</code></dd>
        </div>
        <div className="flex items-center justify-between gap-3 bg-muted/30 px-2.5 py-1.5">
          <dt className="text-[0.72rem] text-muted-foreground">Build date</dt>
          <dd><code>{buildInfo.buildDate}</code></dd>
        </div>
        <div className="flex items-center justify-between gap-3 bg-muted/30 px-2.5 py-1.5">
          <dt className="text-[0.72rem] text-muted-foreground">Built at</dt>
          <dd><code>{buildInfo.buildTimestamp}</code></dd>
        </div>
        {buildInfo.commit ? (
          <div className="flex items-center justify-between gap-3 bg-muted/30 px-2.5 py-1.5">
            <dt className="text-[0.72rem] text-muted-foreground">Commit</dt>
            <dd><code className="break-all text-right">{buildInfo.commit}</code></dd>
          </div>
        ) : null}
      </dl>
    </OverlayPanel>
  );
}
