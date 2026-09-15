# TODO Tracker

Use this file instead of JIRA or similar task trackers.

Each item should start as a level-3 heading, for example `### Task Name`.
Within each item, add any description, notes, or bullets as needed.

### UI editing for torus and other "hard" types.

### Make the scene editor collapsible separate from the plots, etc.

### Handle Plot commands in MG files

We have to either ignore Plot commands, or turn them into auto-configured plots in the MGView UI. Otherwise when the UI runs the MG backend, it will launch the plotting program mid-sim and hang the process.

### Y vs X square plot aspect

**Square** control for Y vs X panels is disabled (`SQUARE_ASPECT_UI_ENABLED = false` in `PlotPanel.tsx`). Goal: equal width/height for uPlot's drawable `bbox` so circular parametric paths look circular.

### Need a listing of allowed units names and prefixes

### Need a small reticule showing the center of camera orbit when moving camera.

### Show scene settings when creating a new scene.
