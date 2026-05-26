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
    <section className="panel playback-strip">
      <div className="playback-primary">
        <button
          type="button"
          className="secondary-button playback-icon-button"
          onClick={onTogglePlay}
          aria-label={isPlaying ? 'Pause playback' : 'Start playback'}
        >
          {isPlaying ? '||' : '>'}
        </button>
        <button
          type="button"
          className="secondary-button playback-icon-button"
          onClick={onReset}
          aria-label="Reset playback to start"
        >
          {'<<'}
        </button>
        <div className="playback-readout">
          <code>{formatTime(currentTime)} / {formatTime(tFinal)}</code>
        </div>
        <div className="playback-scrubber">
          <input
            type="range"
            min={tInitial}
            max={tFinal}
            step={tStep || 0.001}
            value={currentTime}
            onChange={(event) => onChangeTime(Number(event.target.value))}
          />
        </div>
        <label className="playback-speed-inline">
          <span>Speed</span>
          <input
            type="number"
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
