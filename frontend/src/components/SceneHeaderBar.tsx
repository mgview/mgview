import { useEffect, useState } from 'react';
import { Undo2, Redo2, ChevronDown, Sun, Moon, PanelsTopLeft, TriangleAlert } from 'lucide-react';
import { canPersistScenesToServer, isStaticHosting } from '../api/runtimeMode.ts';
import type { SceneLayoutConfig } from '../core/types.ts';
import { DEFAULT_SCENE_LAYOUT } from '../core/workspaceLayout.ts';
import { useTheme } from './ThemeProvider.tsx';
import { Button } from './ui/button.tsx';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu.tsx';
import { Checkbox } from './ui/checkbox.tsx';
import { Label } from './ui/label.tsx';
import { cn } from '../lib/utils.ts';

type LayoutPaneKey = 'showRenderer' | 'showPlots' | 'showEditorRail';

const LAYOUT_PANES: ReadonlyArray<{ key: LayoutPaneKey; label: string; shortcut: string }> = [
  { key: 'showRenderer', label: '3D View', shortcut: '1' },
  { key: 'showPlots', label: 'Plots', shortcut: '2' },
  { key: 'showEditorRail', label: 'Editor', shortcut: '3' },
];

const LAYOUT_PANE_BY_CODE: Record<string, LayoutPaneKey> = {
  Digit1: 'showRenderer',
  Numpad1: 'showRenderer',
  Digit2: 'showPlots',
  Numpad2: 'showPlots',
  Digit3: 'showEditorRail',
  Numpad3: 'showEditorRail',
};

function isTextEditingTarget(target: EventTarget | null) {
  if (target instanceof HTMLTextAreaElement) {
    return true;
  }

  if (target instanceof HTMLInputElement) {
    return !['checkbox', 'radio', 'button', 'submit', 'reset', 'range', 'color'].includes(target.type);
  }

  return target instanceof HTMLElement && target.isContentEditable;
}

function getLayoutPaneValue(layout: Required<SceneLayoutConfig> | null, key: LayoutPaneKey) {
  return layout?.[key] ?? DEFAULT_SCENE_LAYOUT[key];
}

interface SceneHeaderBarProps {
  scenePath: string | null;
  layout: Required<SceneLayoutConfig> | null;
  onOpenWorkspace?: () => void;
  onOpenAbout: () => void;
  hasLocalEdits: boolean;
  loading: boolean;
  saving: boolean;
  canUndo: boolean;
  canRedo: boolean;
  diagnosticsWarningCount: number;
  onOpenCreateOverlay: () => void;
  onOpenLoadOverlay: () => void;
  onOpenSamplesOverlay: () => void;
  onOpenDiagnostics: () => void;
  onOpenChannels: () => void;
  onSetLayoutVisibility: (key: 'showRenderer' | 'showPlots' | 'showEditorRail', value: boolean) => void;
  performanceOverlayOpen: boolean;
  onSetPerformanceOverlayOpen: (open: boolean) => void;
  onOpenSaveAsOverlay: () => void;
  onRedo: () => void;
  onSave: () => void;
  onRevert: () => void;
  onUndo: () => void;
}

export default function SceneHeaderBar({
  scenePath,
  layout,
  onOpenAbout,
  hasLocalEdits,
  loading,
  saving,
  canUndo,
  canRedo,
  diagnosticsWarningCount,
  onOpenCreateOverlay,
  onOpenLoadOverlay,
  onOpenSamplesOverlay,
  onOpenDiagnostics,
  onOpenChannels,
  onSetLayoutVisibility,
  performanceOverlayOpen,
  onSetPerformanceOverlayOpen,
  onOpenSaveAsOverlay,
  onRedo,
  onSave,
  onRevert,
  onUndo,
}: SceneHeaderBarProps) {
  const { theme, toggleTheme } = useTheme();
  const [layoutMenuOpen, setLayoutMenuOpen] = useState(false);
  const saveDisabled = !canPersistScenesToServer || !hasLocalEdits || saving;
  const saveTitle = !canPersistScenesToServer
    ? 'Save is not available in the online demo'
    : !hasLocalEdits
      ? 'No unsaved changes'
      : 'Save';
  const openMenuAriaLabel = isStaticHosting ? 'Samples menu' : 'Load menu';
  const primaryOpenLabel = loading
    ? 'Loading…'
    : isStaticHosting
      ? 'Samples…'
      : 'Load…';
  const onPrimaryOpen = isStaticHosting ? onOpenSamplesOverlay : onOpenLoadOverlay;
  const hasDiagnosticsWarnings = diagnosticsWarningCount > 0;
  const diagnosticsLabel = hasDiagnosticsWarnings
    ? `Diagnostics, ${diagnosticsWarningCount} warning${diagnosticsWarningCount === 1 ? '' : 's'}`
    : 'Diagnostics';

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.repeat || isTextEditingTarget(event.target)) {
        return;
      }

      const altOnly = event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey;
      if (!altOnly) {
        return;
      }

      if (event.code === 'KeyL') {
        event.preventDefault();
        setLayoutMenuOpen((open) => !open);
        return;
      }

      const paneKey = LAYOUT_PANE_BY_CODE[event.code];
      if (!paneKey) {
        return;
      }

      event.preventDefault();
      onSetLayoutVisibility(paneKey, !getLayoutPaneValue(layout, paneKey));
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [layout, onSetLayoutVisibility]);

  return (
    <header className="mb-1.5 flex items-center justify-between gap-3 rounded-md border border-border bg-card px-2 py-1.5">
      <div className="flex min-w-0 flex-1 items-center gap-2.5">
        <span className="shrink-0 text-base font-bold tracking-tight">MGView</span>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-6 w-6 shrink-0 rounded-full text-[0.7rem] font-bold"
          onClick={onOpenAbout}
          aria-label="About MGView"
          title="About MGView"
        >
          ?
        </Button>
        <code
          className="min-w-0 flex-1 truncate font-mono text-[0.72rem] text-muted-foreground"
          title={scenePath ?? 'No scene loaded'}
        >
          {scenePath ?? '(none loaded)'}
        </code>
        {hasLocalEdits ? (
          <span
            className="shrink-0 text-lg leading-none text-warning"
            title="Unsaved changes"
            aria-label="Unsaved changes"
          >
            •
          </span>
        ) : null}
      </div>

      <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onUndo}
          disabled={!canUndo || loading}
          aria-label="Undo"
          title="Undo"
        >
          <Undo2 className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onRedo}
          disabled={!canRedo || loading}
          aria-label="Redo"
          title="Redo"
        >
          <Redo2 className="h-3.5 w-3.5" />
        </Button>

        <div className="mx-0.5 h-5 w-px shrink-0 bg-border" aria-hidden />

        <DropdownMenu open={layoutMenuOpen} onOpenChange={setLayoutMenuOpen}>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={!layout}
              aria-label="Layout"
              title="Layout (Alt+L)"
            >
              <PanelsTopLeft className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52 p-1.5" onCloseAutoFocus={(event) => event.preventDefault()}>
            {LAYOUT_PANES.map(({ key, label, shortcut }) => {
              const checked = layout?.[key] ?? false;
              const inputId = `layout-${key}`;

              return (
                <Label
                  key={key}
                  htmlFor={inputId}
                  className={cn(
                    'flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent',
                    checked && 'bg-accent/60'
                  )}
                  onPointerDown={(event) => event.preventDefault()}
                >
                  <Checkbox
                    id={inputId}
                    checked={checked}
                    onCheckedChange={(nextChecked) => onSetLayoutVisibility(key, nextChecked === true)}
                  />
                  <span className="flex-1">{label}</span>
                  <span className="text-[0.65rem] text-muted-foreground">Alt+{shortcut}</span>
                </Label>
              );
            })}
            <DropdownMenuSeparator />
            <Label
              htmlFor="layout-renderer-stats"
              className={cn(
                'flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent',
                performanceOverlayOpen && 'bg-accent/60'
              )}
              onPointerDown={(event) => event.preventDefault()}
            >
              <Checkbox
                id="layout-renderer-stats"
                checked={performanceOverlayOpen}
                onCheckedChange={(checked) => onSetPerformanceOverlayOpen(checked === true)}
              />
              <span className="flex-1">Renderer stats</span>
            </Label>
            <button
              type="button"
              className="flex w-full cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
              onPointerDown={(event) => event.preventDefault()}
              onClick={toggleTheme}
            >
              {theme === 'dark' ? (
                <Sun className="h-4 w-4 shrink-0" aria-hidden />
              ) : (
                <Moon className="h-4 w-4 shrink-0" aria-hidden />
              )}
              <span className="flex-1 text-left">{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
            </button>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onOpenDiagnostics}
          className={cn('relative', hasDiagnosticsWarnings && 'text-warning')}
          aria-label={diagnosticsLabel}
          title={diagnosticsLabel}
        >
          <TriangleAlert className="h-3.5 w-3.5" />
          {hasDiagnosticsWarnings ? (
            <span
              className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-warning"
              aria-hidden
            />
          ) : null}
        </Button>

        <div className="mx-0.5 h-5 w-px shrink-0 bg-border" aria-hidden />

        <div className="inline-flex">
          <Button
            type="button"
            size="sm"
            className="rounded-r-none"
            onClick={onPrimaryOpen}
            disabled={loading}
          >
            {primaryOpenLabel}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                size="sm"
                variant="default"
                className="rounded-l-none border-l border-primary-foreground/20 px-1.5"
                disabled={loading}
                aria-label={openMenuAriaLabel}
              >
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {isStaticHosting ? (
                <DropdownMenuItem onSelect={onOpenLoadOverlay}>Load…</DropdownMenuItem>
              ) : (
                <DropdownMenuItem onSelect={onOpenSamplesOverlay}>Samples…</DropdownMenuItem>
              )}
              <DropdownMenuItem disabled={!hasLocalEdits || saving} onSelect={onRevert}>
                Reload
              </DropdownMenuItem>
              {canPersistScenesToServer ? (
                <DropdownMenuItem onSelect={onOpenCreateOverlay}>New…</DropdownMenuItem>
              ) : null}
              <DropdownMenuItem onSelect={onOpenChannels}>Sim Files…</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="inline-flex">
          <Button
            type="button"
            size="sm"
            className="rounded-r-none"
            onClick={onSave}
            disabled={saveDisabled}
            title={saveTitle}
          >
            {saving ? 'Saving…' : 'Save'}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                size="sm"
                variant="default"
                className="rounded-l-none border-l border-primary-foreground/20 px-1.5"
                disabled={saving || !canPersistScenesToServer}
                title={!canPersistScenesToServer ? 'Save is not available in the online demo' : undefined}
                aria-label="Save menu"
              >
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                disabled={!scenePath}
                title={!scenePath ? 'Load a scene before using Save As' : undefined}
                onSelect={onOpenSaveAsOverlay}
              >
                Save As…
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
