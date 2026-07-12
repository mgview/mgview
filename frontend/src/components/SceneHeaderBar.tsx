import { useEffect, useState } from 'react';
import { Undo2, Redo2, ChevronDown, Sun, Moon, PanelsTopLeft, TriangleAlert } from 'lucide-react';
import { canPersistScenesToServer, isStaticHosting } from '../api/runtimeMode.ts';
import type { NormalizedSceneLayout, SceneScenario } from '../core/types.ts';
import { DEFAULT_SCENE_LAYOUT } from '../core/workspaceLayout.ts';
import AppModeSwitcher from './AppModeSwitcher.tsx';
import ScenarioSelector from './ScenarioSelector.tsx';
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

type LayoutToggleKey = 'showRenderer' | 'showPlots';
type RightRailTarget = 'scene' | 'sim';

const LAYOUT_TOGGLE_PANES: ReadonlyArray<{ key: LayoutToggleKey; label: string; shortcut: string }> = [
  { key: 'showRenderer', label: '3D View', shortcut: '1' },
  { key: 'showPlots', label: 'Plots', shortcut: '2' },
];

const RIGHT_RAIL_PANES: ReadonlyArray<{ target: RightRailTarget; label: string; shortcut: string }> = [
  { target: 'scene', label: 'Scene Editor', shortcut: '3' },
  { target: 'sim', label: 'Sim Editor', shortcut: '4' },
];

const LAYOUT_TOGGLE_BY_CODE: Record<string, LayoutToggleKey> = {
  Digit1: 'showRenderer',
  Numpad1: 'showRenderer',
  Digit2: 'showPlots',
  Numpad2: 'showPlots',
};

const RIGHT_RAIL_BY_CODE: Record<string, RightRailTarget> = {
  Digit3: 'scene',
  Numpad3: 'scene',
  Digit4: 'sim',
  Numpad4: 'sim',
};

const MODIFIER_SHORTCUT_PREFIX = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)
  ? '⌘'
  : 'Ctrl+';

function isTextEditingTarget(target: EventTarget | null) {
  if (target instanceof HTMLTextAreaElement) {
    return true;
  }

  if (target instanceof HTMLInputElement) {
    return !['checkbox', 'radio', 'button', 'submit', 'reset', 'range', 'color'].includes(target.type);
  }

  return target instanceof HTMLElement && target.isContentEditable;
}

function getLayoutToggleValue(layout: NormalizedSceneLayout | null, key: LayoutToggleKey) {
  return layout?.[key] ?? DEFAULT_SCENE_LAYOUT[key];
}

function getRightRailValue(layout: NormalizedSceneLayout | null) {
  return layout?.rightRail ?? DEFAULT_SCENE_LAYOUT.rightRail;
}

interface SceneHeaderBarProps {
  scenePath: string | null;
  layout: NormalizedSceneLayout | null;
  onOpenWorkspace?: () => void;
  onOpenAbout: () => void;
  hasLocalEdits: boolean;
  canSaveScene: boolean;
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
  onSetLayoutVisibility: (key: LayoutToggleKey, value: boolean) => void;
  onToggleRightRail: (target: RightRailTarget) => void;
  performanceOverlayOpen: boolean;
  onSetPerformanceOverlayOpen: (open: boolean) => void;
  onOpenSaveAsOverlay: () => void;
  onRedo: () => void;
  onSave: () => void;
  onRevert: () => void;
  onSetActiveScenario?: (scenarioId: string) => void | Promise<void>;
  onUndo: () => void;
  scenarios?: SceneScenario[];
  activeScenario?: string | null;
}

export default function SceneHeaderBar({
  scenePath,
  layout,
  onOpenAbout,
  hasLocalEdits,
  canSaveScene,
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
  onToggleRightRail,
  performanceOverlayOpen,
  onSetPerformanceOverlayOpen,
  onOpenSaveAsOverlay,
  onRedo,
  onSave,
  onRevert,
  onSetActiveScenario,
  onUndo,
  scenarios = [],
  activeScenario = null,
}: SceneHeaderBarProps) {
  const { theme, toggleTheme } = useTheme();
  const [layoutMenuOpen, setLayoutMenuOpen] = useState(false);
  const demoDisabledTitle = 'This action is not available in the online demo';
  const saveDisabled = !canSaveScene || !hasLocalEdits || saving;
  const hasDiagnosticsWarnings = diagnosticsWarningCount > 0;
  const diagnosticsLabel = hasDiagnosticsWarnings
    ? `Diagnostics, ${diagnosticsWarningCount} warning${diagnosticsWarningCount === 1 ? '' : 's'}`
    : 'Diagnostics';
  const hasSceneLoaded = scenePath !== null;

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

      const toggleKey = LAYOUT_TOGGLE_BY_CODE[event.code];
      if (toggleKey) {
        event.preventDefault();
        onSetLayoutVisibility(toggleKey, !getLayoutToggleValue(layout, toggleKey));
        return;
      }

      const rightRailTarget = RIGHT_RAIL_BY_CODE[event.code];
      if (rightRailTarget) {
        event.preventDefault();
        onToggleRightRail(rightRailTarget);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [layout, onSetLayoutVisibility, onToggleRightRail]);

  return (
    <header className="mb-1.5 flex items-center justify-between gap-3 rounded-md border border-border bg-card px-2 py-1.5">
      <div className="flex min-w-0 flex-1 items-center gap-2.5">
        <AppModeSwitcher
          mode="app"
          onBeforeNavigate={() => {
            if (!hasLocalEdits) {
              return true;
            }

            return window.confirm('Switching modes will discard unsaved edits. Continue?');
          }}
        />
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
        {onSetActiveScenario ? (
          <ScenarioSelector
            activeScenario={activeScenario}
            disabled={loading || saving}
            editSimDataDisabled={!hasSceneLoaded || loading}
            onEditSimData={onOpenChannels}
            onSetActiveScenario={onSetActiveScenario}
            scenarios={scenarios}
          />
        ) : null}

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
            {LAYOUT_TOGGLE_PANES.map(({ key, label, shortcut }) => {
              const checked = getLayoutToggleValue(layout, key);
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
            <div role="radiogroup" aria-label="Editor pane" className="grid">
              {RIGHT_RAIL_PANES.map(({ target, label, shortcut }) => {
                const checked = getRightRailValue(layout) === target;

                return (
                  <button
                    key={target}
                    type="button"
                    role="radio"
                    aria-checked={checked}
                    className={cn(
                      'flex w-full cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent',
                      checked && 'bg-accent/60'
                    )}
                    onPointerDown={(event) => event.preventDefault()}
                    onClick={() => onToggleRightRail(target)}
                  >
                    <span
                      className={cn(
                        'flex h-4 w-4 shrink-0 items-center justify-center rounded-full border',
                        checked ? 'border-primary' : 'border-muted-foreground/50'
                      )}
                      aria-hidden
                    >
                      {checked ? <span className="h-2 w-2 rounded-full bg-primary" /> : null}
                    </span>
                    <span className="flex-1">{label}</span>
                    <span className="text-[0.65rem] text-muted-foreground">Alt+{shortcut}</span>
                  </button>
                );
              })}
            </div>
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

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" size="sm" variant="default" disabled={loading} className="gap-1">
              Scene
              <ChevronDown className="h-3 w-3 opacity-80" aria-hidden />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {isStaticHosting ? (
              <>
                <DropdownMenuItem onSelect={onOpenSamplesOverlay}>Examples…</DropdownMenuItem>
                <DropdownMenuItem onSelect={onOpenLoadOverlay}>Open…</DropdownMenuItem>
              </>
            ) : (
              <DropdownMenuItem onSelect={onOpenLoadOverlay}>
                <span className="flex-1">Open…</span>
                <span className="ml-4 text-[0.65rem] text-muted-foreground">{MODIFIER_SHORTCUT_PREFIX}O</span>
              </DropdownMenuItem>
            )}
            <DropdownMenuItem disabled={!hasLocalEdits || saving} onSelect={onRevert}>
              Revert changes
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {canPersistScenesToServer ? (
              <DropdownMenuItem disabled={saveDisabled} onSelect={onSave}>
                <span className="flex-1">Save all</span>
                <span className="ml-4 text-[0.65rem] text-muted-foreground">{MODIFIER_SHORTCUT_PREFIX}S</span>
              </DropdownMenuItem>
            ) : (
              <div
                className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-xs opacity-50"
                title={demoDisabledTitle}
                aria-disabled="true"
              >
                <span className="flex-1">Save all</span>
                <span className="ml-4 text-[0.65rem] text-muted-foreground">{MODIFIER_SHORTCUT_PREFIX}S</span>
              </div>
            )}
            {canPersistScenesToServer ? (
              <DropdownMenuItem
                disabled={!scenePath}
                title={!scenePath ? 'Load a scene before using Save As' : undefined}
                onSelect={onOpenSaveAsOverlay}
              >
                Save scene as…
              </DropdownMenuItem>
            ) : (
              <div
                className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-xs opacity-50"
                title={demoDisabledTitle}
                aria-disabled="true"
              >
                Save scene as…
              </div>
            )}
            {canPersistScenesToServer ? (
              <DropdownMenuItem onSelect={onOpenCreateOverlay}>New…</DropdownMenuItem>
            ) : (
              <div
                className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-xs opacity-50"
                title={demoDisabledTitle}
                aria-disabled="true"
              >
                New…
              </div>
            )}
            {!isStaticHosting ? (
              <DropdownMenuItem onSelect={onOpenSamplesOverlay}>Examples…</DropdownMenuItem>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
