# TODO Tracker

Use this file instead of JIRA or similar task trackers.

Each item should start as a level-3 heading, for example `### Task Name`.
Within each item, add any description, notes, or bullets as needed.

### TSC type cleanup

Clean up the existing TypeScript type errors reported by `tsc`.

Notes:
- There is already a sizable backlog of strict typing issues unrelated to the recent splitter work.
- Use the project TypeScript configuration and reduce the error count incrementally.

### 3D object transform widgets

Add 3D UI widgets for dragging and rotating objects directly in the scene instead of relying on the draggable numeric input boxes.


### Handle Plot commands in MG files

We have to either ignore Plot commands, or turn them into auto-configured plots in the MGView UI. Otherwise when the UI runs the MG backend, it will launch the plotting program mid-sim and hang the process.

### Need a listing of allowed units names and prefixes

### Need a small reticule showing the center of camera orbit when moving camera.

### Show scene settings when creating a new scene.
