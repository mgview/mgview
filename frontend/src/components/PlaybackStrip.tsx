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
          className="icon-button"
          onClick={onTogglePlay}
          aria-label={isPlaying ? 'Pause playback' : 'Start playback'}
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? (
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M8 7v10M16 7v10"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M9 7l9 5-9 5V7z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </button>
        <button
          type="button"
          className="icon-button"
          onClick={onReset}
          aria-label="Reset playback to start"
          title="Reset to start"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M6 6v12M15 7l-9 5 9 5V7z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
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
