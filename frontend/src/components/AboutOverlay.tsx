import { Code2, ExternalLink, Globe } from 'lucide-react';
import buildInfo from '../generated/buildInfo.ts';
import { cn } from '../lib/utils.ts';
import OverlayPanel from './OverlayPanel.tsx';

const MGVIEW_HOMEPAGE_URL = 'https://mgview.github.io/mgview/';
const MGVIEW_SOURCE_URL = 'https://github.com/mgview/mgview';

const ABOUT_LINKS = [
  {
    href: MGVIEW_HOMEPAGE_URL,
    label: 'Homepage',
    description: 'mgview.github.io/mgview',
    icon: Globe,
  },
  {
    href: MGVIEW_SOURCE_URL,
    label: 'Source',
    description: 'github.com/mgview/mgview',
    icon: Code2,
  },
] as const;

interface AboutOverlayProps {
  onClose: () => void;
}

export default function AboutOverlay({ onClose }: AboutOverlayProps) {
  return (
    <OverlayPanel title="About MGView" size="compact" onClose={onClose}>
      <nav className="grid gap-1.5" aria-label="MGView links">
        {ABOUT_LINKS.map(({ href, label, description, icon: Icon }) => (
          <a
            key={href}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              'group flex items-center gap-2.5 rounded-md border border-border bg-muted/30 px-2.5 py-2',
              'transition-colors hover:border-primary/40 hover:bg-accent'
            )}
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border bg-background text-muted-foreground group-hover:text-foreground">
              <Icon className="h-4 w-4" aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-xs font-medium text-foreground">{label}</span>
              <span className="block truncate font-mono text-[0.68rem] text-muted-foreground">{description}</span>
            </span>
            <ExternalLink
              className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-60 group-hover:opacity-100"
              aria-hidden
            />
          </a>
        ))}
      </nav>

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
