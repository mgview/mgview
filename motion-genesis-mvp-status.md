# Motion Genesis MVP Status

## Done

- Added `simulationSettings` scene support so a workspace scene can point at one Motion Genesis input file.
- Added a `Sim Run` tab in the editor rail with:
  - `Run Sim`
  - live output log
  - one-line `Send` input
  - run metadata such as command, cwd, PID, and status
- Added run options:
  - `Auto-quit at end of file`
  - `Auto-send default value prompts`
  - `Verbose / debug output`
- Added server APIs to:
  - start a run
  - poll run state
  - send stdin to the running process
- Added scene refresh after a successful run so MGView reloads existing sim outputs from disk.
- Added macOS PTY bridging so Motion Genesis behaves like a real terminal session:
  - live streaming output works
  - interactive prompts work
  - sending input from the UI works
- Added hardcoded binary fallbacks:
  - macOS: `/Applications/MotionGenesis/MotionGenesis`
  - Windows: `C:\\MotionGenesis\\MotionGenesis`
  - `MGVIEW_MOTION_GENESIS_BIN` still overrides both

## Current Behavior

- `Auto-quit` appends `QUIT` to a temporary sibling input file for the run, then removes it afterward.
- `Auto-send default value prompts` sends a blank line when MG is waiting at an `Enter INPUT value...` prompt.
- Pressing `Enter` in the send box now submits immediately, including a blank line.
- MGView debug lines in the output pane are hidden unless `Verbose / debug output` is enabled.

## Next Steps

### P1

- Add an in-app editor for the linked Motion Genesis input file so running and editing happen in one place.
- Make prompt handling smarter for repeated/multi-step MG input flows and surface clearer UI when MG is waiting.

### P2

- Add stop/cancel support for active runs.
- Persist run options per session or per project so users do not have to re-toggle them.
- Tighten the run panel UX around status, auto-actions, and error presentation.

### P3

- Add binary selection in settings instead of relying only on hardcoded defaults and env override.
- Broaden test coverage with more real MG-style prompt/output fixtures.
- Revisit backend abstractions after more Motion Genesis functionality is proven in-app.
