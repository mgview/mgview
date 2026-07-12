import { Check, ChevronDown } from 'lucide-react';
import { Button } from './ui/button.tsx';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu.tsx';
import type { SceneScenario } from '../core/types.ts';
import { cn } from '../lib/utils.ts';

interface ScenarioSelectorProps {
  activeScenario: string | null;
  disabled?: boolean;
  editSimDataDisabled?: boolean;
  onAddNew?: () => void | Promise<void>;
  onEditSimData?: () => void;
  onSetActiveScenario: (scenarioId: string) => void | Promise<void>;
  scenarios: SceneScenario[];
}

export default function ScenarioSelector({
  activeScenario,
  disabled = false,
  editSimDataDisabled = false,
  onAddNew,
  onEditSimData,
  onSetActiveScenario,
  scenarios,
}: ScenarioSelectorProps) {
  const active =
    scenarios.find((scenario) => scenario.id === activeScenario) ?? scenarios[0] ?? null;
  if (!active) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" size="sm" variant="outline" className="h-7 max-w-[12rem] gap-1 text-xs" disabled={disabled}>
          <span className="truncate">Scenario: {active.label}</span>
          <ChevronDown className="h-3 w-3 shrink-0 opacity-60" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {scenarios.map((scenario) => {
          const isActive = scenario.id === active.id;
          return (
            <DropdownMenuItem
              key={scenario.id}
              className="gap-2"
              onSelect={() => {
                void onSetActiveScenario(scenario.id);
              }}
            >
              <Check
                className={cn('h-3.5 w-3.5 shrink-0', isActive ? 'opacity-100' : 'opacity-0')}
                aria-hidden
              />
              <span className="truncate">{scenario.label}</span>
            </DropdownMenuItem>
          );
        })}
        {onEditSimData ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled={editSimDataDisabled} onSelect={onEditSimData}>
              Edit Sim Data
            </DropdownMenuItem>
          </>
        ) : null}
        {onAddNew ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              disabled={disabled}
              onSelect={() => {
                void onAddNew();
              }}
            >
              Add new
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
