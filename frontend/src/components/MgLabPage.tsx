import { ArrowLeft, Code2 } from 'lucide-react';
import { useState } from 'react';
import { getHomePath, inAppLinkProps } from '../core/appRoutes.ts';
import { MG_LAB_SAMPLE } from '../lab/mgLabSample.ts';
import CodeEditor from './CodeEditor.tsx';
import { Button } from './ui/button.tsx';

export default function MgLabPage() {
  const [content, setContent] = useState(MG_LAB_SAMPLE);
  const [vimMode, setVimMode] = useState(false);

  return (
    <main className="grid h-screen grid-rows-[auto_minmax(0,1fr)] overflow-hidden bg-background p-2 text-foreground">
      <header className="mb-2 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3 shadow-sm">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/50 px-3 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              <Code2 className="size-3.5" aria-hidden />
              MG Editor Lab
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Try Motion Genesis syntax highlighting, hovers, and autocomplete without loading a workspace scene.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant={vimMode ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setVimMode((current) => !current)}
          >
            Vim mode
          </Button>
          <Button type="button" variant="outline" size="sm" asChild>
            <a href={getHomePath()} {...inAppLinkProps}>
              <ArrowLeft className="size-3.5" aria-hidden />
              Workspace
            </a>
          </Button>
        </div>
      </header>

      <CodeEditor className="min-h-0 flex-1" value={content} onChange={setContent} vimMode={vimMode} />
    </main>
  );
}
