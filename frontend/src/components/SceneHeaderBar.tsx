import { Undo2, Redo2, ChevronDown, Sun, Moon } from 'lucide-react';
import { canPersistScenesToServer, isStaticHosting } from '../api/runtimeMode.ts';
import type { SceneLayoutConfig } from '../core/types.ts';
import { useTheme } from './ThemeProvider.tsx';
import { Button } from './ui/button.tsx';
import { Badge } from './ui/badge.tsx';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu.tsx';
import { Checkbox } from './ui/checkbox.tsx';
import { Label } from './ui/label.tsx';
import { cn } from '../lib/utils.ts';
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
  onOpenSaveAsOverlay,
  onRedo,
  onSave,
  onRevert,
  onUndo,
}: SceneHeaderBarProps) {
  const { theme, toggleTheme } = useTheme();
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

        <Button type="button" variant="outline" size="sm" onClick={onOpenDiagnostics} className="relative">
          Diagnostics
          {diagnosticsWarningCount > 0 ? (
            <Badge variant="destructive" className="ml-1 min-w-[1.1rem] justify-center px-1 py-0">
              {diagnosticsWarningCount}
            </Badge>
          ) : null}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="outline" size="sm" disabled={!layout}>
              Layout
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52 p-1.5" onCloseAutoFocus={(event) => event.preventDefault()}>
            {(
              [
                { key: 'showRenderer' as const, label: '3D View', checked: layout?.showRenderer ?? false },
                { key: 'showPlots' as const, label: 'Plots', checked: layout?.showPlots ?? false },
                {
                  key: 'showEditorRail' as const,
                  label: 'Objects + Editor',
                  checked: layout?.showEditorRail ?? false,
                },
              ] as const
            ).map(({ key, label, checked }) => {
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
                  {label}
                </Label>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>

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

        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
        >
          {theme === 'dark' ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
        </Button>
      </div>
    </header>
  );
}
