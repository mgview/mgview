import { useMemo, useState, type ReactNode } from 'react';
import { Search } from 'lucide-react';
import { Checkbox } from './ui/checkbox.tsx';
import { Input } from './ui/input.tsx';
import { Label } from './ui/label.tsx';
import { ScrollArea } from './ui/scroll-area.tsx';
import { cn } from '../lib/utils.ts';

interface PlotChannelPickerProps {
  channelNames: string[];
  selectedChannels: string[];
  onChange: (channels: string[]) => void;
  toolbarRight?: ReactNode;
}

export default function PlotChannelPicker({
  channelNames,
  selectedChannels,
  onChange,
  toolbarRight,
}: PlotChannelPickerProps) {
  const [filter, setFilter] = useState('');
  const selected = useMemo(() => new Set(selectedChannels), [selectedChannels]);
  const filteredChannels = useMemo(() => {
    const query = filter.trim().toLowerCase();
    if (!query) {
      return channelNames;
    }

    return channelNames.filter((channelName) => channelName.toLowerCase().includes(query));
  }, [channelNames, filter]);

  const toggleChannel = (channelName: string, checked: boolean) => {
    if (checked) {
      onChange([...selectedChannels, channelName]);
      return;
    }

    onChange(selectedChannels.filter((channel) => channel !== channelName));
  };

  if (channelNames.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        No simulation channels loaded. Add simulation data to configure plots.
      </p>
    );
  }

  return (
    <div className="grid gap-2">
      <div className="flex items-end gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            placeholder="Filter channels…"
            className="h-8 pl-8 font-mono text-xs"
          />
        </div>
        {toolbarRight}
      </div>

      <ScrollArea className="h-36 rounded-md border border-border">
        <div className="grid gap-0.5 p-1.5">
          {filteredChannels.length === 0 ? (
            <p className="px-1 py-2 text-xs text-muted-foreground">No channels match the filter.</p>
          ) : (
            filteredChannels.map((channelName) => {
              const checked = selected.has(channelName);
              const inputId = `plot-channel-${channelName}`;

              return (
                <Label
                  key={channelName}
                  htmlFor={inputId}
                  className={cn(
                    'flex cursor-pointer items-center gap-2 rounded-sm px-1.5 py-1 text-xs hover:bg-accent',
                    checked && 'bg-accent/60'
                  )}
                >
                  <Checkbox
                    id={inputId}
                    checked={checked}
                    onCheckedChange={(nextChecked) => toggleChannel(channelName, nextChecked === true)}
                  />
                  <code className="truncate font-mono">{channelName}</code>
                </Label>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
