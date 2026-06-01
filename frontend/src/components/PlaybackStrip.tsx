import { Play, Pause, SkipBack } from 'lucide-react';
import { Button } from './ui/button.tsx';
import { Input } from './ui/input.tsx';
import { Label } from './ui/label.tsx';
import { cn } from '../lib/utils.ts';

interface PlaybackStripProps {
  isPlaying: boolean;
  currentTime: number;
  tInitial: number;
  tFinal: number;
  tStep: number;
  playbackSpeed: number;
  onTogglePlay: () => void;
  onReset: () => void;
  onChangeTime: (time: number) => void;
  onChangeSpeed: (speed: number) => void;
}

function formatTime(value: number): string {
  if (!Number.isFinite(value)) {
    return 'n/a';
  }

  if (Math.abs(value) >= 1000 || (Math.abs(value) > 0 && Math.abs(value) < 0.001)) {
    return value.toExponential(2);
  }

  return value.toFixed(1);
}

export default function PlaybackStrip({
  isPlaying,
  currentTime,
  tInitial,
  tFinal,
  tStep,
  playbackSpeed,
  onTogglePlay,
  onReset,
  onChangeTime,
  onChangeSpeed,
}: PlaybackStripProps) {
  return (
    <section className="rounded-md border border-border bg-card px-2 py-1.5">
      <div className="grid w-full min-w-0 grid-cols-[auto_auto_auto_minmax(0,1fr)_auto] items-center gap-1.5">
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={onTogglePlay}
          aria-label={isPlaying ? 'Pause playback' : 'Start playback'}
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={onReset}
          aria-label="Reset playback to start"
          title="Reset to start"
        >
          <SkipBack className="h-3.5 w-3.5" />
        </Button>
        <code className="whitespace-nowrap font-mono text-[0.72rem] text-muted-foreground">
          {formatTime(currentTime)} / {formatTime(tFinal)}
        </code>
        <input
          type="range"
          className="w-full accent-primary"
          min={tInitial}
          max={tFinal}
          step={tStep || 0.001}
          value={currentTime}
          onChange={(event) => onChangeTime(Number(event.target.value))}
          onPointerUp={(event) => {
            event.currentTarget.blur();
          }}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.preventDefault();
              event.currentTarget.blur();
            }
          }}
        />
        <label className="flex items-center gap-1.5 whitespace-nowrap">
          <Label className="mb-0 normal-case">Speed</Label>
          <Input
            type="number"
            className="h-6 w-14 px-1 text-center font-mono"
            min={0.1}
            max={10}
            step={0.1}
            value={playbackSpeed}
            onChange={(event) => onChangeSpeed(Number(event.target.value))}
          />
        </label>
      </div>
    </section>
  );
}
