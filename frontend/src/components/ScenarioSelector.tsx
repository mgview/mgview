import { Button } from './ui/button.tsx';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu.tsx';
import type { SceneScenario } from '../core/types.ts';

interface ScenarioSelectorProps {
  activeScenario: string | null;
  disabled?: boolean;
  onSetActiveScenario: (scenarioId: string) => void | Promise<void>;
  scenarios: SceneScenario[];
}

export default function ScenarioSelector({
  activeScenario,
  disabled = false,
  onSetActiveScenario,
  scenarios,
}: ScenarioSelectorProps) {
  if (scenarios.length === 0) {
    return null;
  }

  const active =
    scenarios.find((scenario) => scenario.id === activeScenario) ?? scenarios[0] ?? null;
  if (!active) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" size="sm" variant="outline" className="h-7 max-w-[12rem] text-xs" disabled={disabled}>
          <span className="truncate">Scenario: {active.label}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {scenarios.map((scenario) => (
          <DropdownMenuItem
            key={scenario.id}
            disabled={scenario.id === active.id}
            onSelect={() => {
              void onSetActiveScenario(scenario.id);
            }}
          >
            {scenario.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
