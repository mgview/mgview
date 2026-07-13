import { ChevronDown } from 'lucide-react';
import { type AppMode, navigateToAppMode } from '../core/appRoutes.ts';
import { cn } from '../lib/utils.ts';
import { Button } from './ui/button.tsx';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu.tsx';

const APP_MODES: ReadonlyArray<{ mode: AppMode; label: string; description: string }> = [
  { mode: 'app', label: 'MGView', description: '3D viewer and scene editor' },
  { mode: 'lab', label: 'MGLab', description: 'Motion Genesis input editor' },
];

interface AppModeSwitcherProps {
  mode: AppMode;
  onBeforeNavigate?: () => boolean;
  className?: string;
}

export default function AppModeSwitcher({ mode, onBeforeNavigate, className }: AppModeSwitcherProps) {
  const currentLabel = APP_MODES.find((entry) => entry.mode === mode)?.label ?? 'MGView';

  const handleSelect = (nextMode: AppMode) => {
    if (nextMode === mode) {
      return;
    }

    if (onBeforeNavigate && !onBeforeNavigate()) {
      return;
    }

    navigateToAppMode(nextMode);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          className={cn(
            'h-auto shrink-0 gap-1 px-1 py-0.5 text-base font-bold tracking-tight hover:bg-accent/60',
            className
          )}
          aria-label={`Current mode: ${currentLabel}. Choose MGView or MGLab.`}
        >
          {currentLabel}
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuRadioGroup value={mode} onValueChange={(value) => handleSelect(value as AppMode)}>
          {APP_MODES.map(({ mode: entryMode, label, description }) => (
            <DropdownMenuRadioItem key={entryMode} value={entryMode} className="items-start py-2">
              <div className="grid gap-0.5">
                <span className="font-medium">{label}</span>
                <span className="text-[0.65rem] font-normal text-muted-foreground">{description}</span>
              </div>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
