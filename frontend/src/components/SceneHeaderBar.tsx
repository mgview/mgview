import { Undo2, Redo2, ChevronDown, Sun, Moon } from 'lucide-react';
import { canPersistScenesToServer } from '../api/runtimeMode.ts';
import type { SceneLayoutConfig } from '../core/types.ts';
import { useTheme } from './ThemeProvider.tsx';
import { Button } from './ui/button.tsx';
import { Badge } from './ui/badge.tsx';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu.tsx';
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
  onApplyLayoutPreset: (preset: 'showAll' | 'plotsOnly' | 'rendererOnly' | 'reset') => void;
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
  onApplyLayoutPreset,
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

        <Button type="button" variant="outline" size="sm" onClick={onOpenSamplesOverlay} disabled={loading}>
          Samples…
        </Button>

        <div className="inline-flex">
          <Button
            type="button"
            size="sm"
            className="rounded-r-none"
            onClick={onOpenLoadOverlay}
            disabled={loading}
          >
            {loading ? 'Loading…' : 'Load…'}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" size="sm" variant="default" className="rounded-l-none border-l border-primary-foreground/20 px-1.5" disabled={loading} aria-label="Load menu">
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem disabled={!hasLocalEdits || saving} onSelect={onRevert}>
                Reload
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={!canPersistScenesToServer}
                onSelect={onOpenCreateOverlay}
              >
                New…
              </DropdownMenuItem>
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
          <DropdownMenuContent align="end">
            <DropdownMenuCheckboxItem
              checked={layout?.showRenderer ?? false}
              onCheckedChange={(checked) => onSetLayoutVisibility('showRenderer', checked === true)}
            >
              3D View
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={layout?.showPlots ?? false}
              onCheckedChange={(checked) => onSetLayoutVisibility('showPlots', checked === true)}
            >
              Plots
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={layout?.showEditorRail ?? false}
              onCheckedChange={(checked) => onSetLayoutVisibility('showEditorRail', checked === true)}
            >
              Objects + Editor
            </DropdownMenuCheckboxItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => onApplyLayoutPreset('showAll')}>Show all</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onApplyLayoutPreset('plotsOnly')}>Plots only</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onApplyLayoutPreset('rendererOnly')}>3D only</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onApplyLayoutPreset('reset')}>Reset layout</DropdownMenuItem>
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
