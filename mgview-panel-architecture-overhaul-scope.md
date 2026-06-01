# MGView Panel Architecture Overhaul Scope

Detailed scope for the next P1 UI architecture pass. This is intended to be the handoff doc for implementation work.

## Problem statement

The current React shell still treats the workspace as one fixed composition:

- 3D renderer in the main column
- timeline/playback fixed under the renderer
- objects list + editor in a right rail
- plots trapped inside the inspector tabs

That model is now too rigid. We want scenes to be able to open as 3D-first, plots-first, or editor-light workspaces, with scene JSON preserving that intent.

## Goals

- Treat these three areas as peer workspace panels:
  - `3D View`
  - `Plots`
  - `Objects + Editor`
- Allow each of those areas to be shown or hidden independently.
- Persist that visibility state in scene JSON.
- Make the timeline/playback strip belong to whichever visual workspace is active:
  - under `3D View` if present
  - otherwise under `Plots` if present
  - otherwise hidden
- Leave a clean path for:
  - full-screening the 3D view
  - full-screening a single plot
  - exporting a plot to an image file

## Non-goals

Not in phase 1:

- a general-purpose tiling window manager
- drag-and-drop panel rearrangement
- persisted splitter sizes or arbitrary geometry
- multi-window or detached panels
- plot image export implementation
- browser/native full-screen behavior

This should be a constrained workspace layout system, not a docking framework.

## User-facing outcomes

After phase 1, a user should be able to:

- save a scene with the 3D view hidden and have it reopen that way
- hide the plots column entirely
- hide the whole objects + editor rail entirely
- work in a plots-only layout
- work in a 3D-only layout
- see timeline controls below the active visual area

After later phases, a user should also be able to:

- focus the 3D view
- focus a single plot
- export a plot to an image

## Current constraints

The existing app shell is still structurally biased toward the legacy three-region layout.

- [`frontend/src/App.tsx`](/Users/adam/code/mgview_project/mgview/frontend/src/App.tsx:377) hard-codes renderer + playback in the main area and objects + inspector in the side rail.
- [`frontend/src/components/InspectorDrawer.tsx`](/Users/adam/code/mgview_project/mgview/frontend/src/components/InspectorDrawer.tsx:18) still models plots as an inspector tab through `InspectorEditorMode = 'visual' | 'scene' | 'json' | 'plots'`.
- [`frontend/src/app.css`](/Users/adam/code/mgview_project/mgview/frontend/src/app.css:3) assumes exactly one main workspace column and one right rail.
- [`frontend/src/core/types.ts`](/Users/adam/code/mgview_project/mgview/frontend/src/core/types.ts:116) persists plot definitions but has no scene-level layout model.
- [`frontend/src/hooks/useSceneWorkspace.ts`](/Users/adam/code/mgview_project/mgview/frontend/src/hooks/useSceneWorkspace.ts:115) only saves scene content currently known to the schema, so layout cannot persist yet.

## Recommended product model

Use a scene-persisted `layout` object for coarse workspace intent.

Suggested shape:

```ts
interface SceneLayoutConfig {
  showRenderer?: boolean;
  showPlots?: boolean;
  showEditorRail?: boolean;
  focusTarget?: 'renderer' | 'plots' | null;
}
```

Suggested persisted scene snippet:

```json
{
  "layout": {
    "showRenderer": true,
    "showPlots": true,
    "showEditorRail": true
  }
}
```

Why a `layout` object:

- it groups related workspace concerns in one stable namespace
- it avoids top-level boolean sprawl
- it gives room for later additions without cluttering the base scene model

## Default behavior

Scenes without a `layout` block should preserve current behavior.

Recommended defaults:

- `showRenderer = true`
- `showPlots = false`
- `showEditorRail = true`
- `focusTarget = null`

That means legacy and already-saved scenes continue to load as they do today.

## Meaning of each toggle

`showRenderer`

- Controls visibility of the whole 3D rendering workspace panel.
- Hiding it should not delete camera state or clear scene selection.

`showPlots`

- Controls visibility of the whole scrollable plots workspace panel.
- Hiding it should not delete any persisted plot configuration.

`showEditorRail`

- Controls visibility of the combined objects list + editor region.
- This is intentionally one toggle, not separate object-list and inspector toggles.

`focusTarget`

- Reserved for phase 2.
- Can exist in the schema now even if phase 1 ignores it.

## Recommended UI placement for toggles

Put these controls in one header-level `Layout` menu or popover.

Contents:

- toggle `3D View`
- toggle `Plots`
- toggle `Objects + Editor`
- optional quick actions:
  - `Show all`
  - `Plots only`
  - `3D only`
  - `Reset layout`

Why this is the best fit:

- the toggles are scene-level, not panel-local
- users need one place to understand overall workspace state
- it scales naturally when phase 2 adds focus/full-screen actions

This is preferable to hiding the controls in scene settings, because layout is an active workspace concern rather than deep metadata.

## Layout policy

Phase 1 should be opinionated.

When all three sections are visible:

- `3D View` occupies the primary main area
- `Plots` occupy a dedicated peer column
- `Objects + Editor` occupy the editor rail

When renderer and plots are both visible but editor rail is hidden:

- renderer remains primary
- plots remain a secondary visual column

When only renderer is visible:

- renderer takes the main workspace area

When only plots are visible:

- plots take the main workspace area

When only editor rail is visible:

- editor rail occupies the workspace
- timeline is hidden

When renderer and plots are both hidden:

- only editor rail remains if enabled
- timeline is hidden

This gives the feel of a poor-man’s tiling system while keeping behavior deterministic.

## Timeline policy

Timeline ownership should be derived from visible visual panels, not hard-coded under the renderer.

Rule:

- If renderer is visible, show timeline under renderer.
- Else if plots are visible, show timeline under plots.
- Else hide timeline.

This matters because the timeline is really tied to the active simulation visualization surface, not specifically to Three.js.

## Interaction and state rules

Hiding a panel should not destroy unrelated state.

Examples:

- Hiding `Objects + Editor` should not clear selected object/span.
- Hiding `3D View` should not reset camera state.
- Hiding `Plots` should not clear axis zoom state that is already persisted per plot.

Reasonable phase 1 behavior:

- preserve selection in memory
- preserve transient plot UI state for the current session when feasible
- persist only the coarse layout toggles in scene JSON

## Plot-specific planning

Plots need two architecture upgrades even if phase 1 does not expose all future features.

### 1. Plots become a workspace region

`PlotsPanel` should stop being inspector-tab content and become standalone workspace content.

That means:

- plot editing controls remain with the plots
- plot list remains vertically scrollable
- no dependency on the inspector tab model for basic plot usage

### 2. Plot panels need stable identities

Today, plot panels are effectively index-addressed. That is tolerable for simple add/remove, but it becomes fragile once we want:

- focus one plot
- export one plot
- preserve transient per-panel UI state robustly

Recommended addition:

```ts
interface PlotPanelConfig {
  id?: string;
  title?: string;
  channels: string[];
  xMode?: 'time' | 'channel';
  xChannel?: string;
  autoScale?: boolean;
  xMin?: number;
  xMax?: number;
  yMin?: number;
  yMax?: number;
}
```

Phase 1 can generate IDs for older scenes during normalization and preserve them on save.

## Full-screen / focus planning

Phase 2 should be "focus within the app workspace," not OS/browser full-screen.

Recommended model:

- `focusTarget = 'renderer'`
  - renderer occupies the full visual workspace
  - plots are suppressed in that mode
- `focusTarget = 'plots'`
  - plots occupy the full visual workspace

For a single focused plot, use ephemeral UI state rather than forcing it into scene JSON immediately.

Recommended transient state:

```ts
type WorkspaceFocusState =
  | { kind: 'none' }
  | { kind: 'renderer' }
  | { kind: 'plots' }
  | { kind: 'plot'; plotId: string };
```

This keeps phase 1 persistence simple while leaving a clean expansion path.

## Plot export planning

Plot export is likely a separate phase, but phase 1 should not make it awkward.

Prepare now by ensuring:

- each plot card has a header action area
- each plot has a stable ID
- each plot rendering surface is individually addressable
- export behavior can be attached to one plot without redesigning the whole plots panel

Likely future behavior:

- `Export image` action per plot
- PNG as the first supported format
- local/server mode can offer save-to-file
- static mode can trigger browser download

## Recommended implementation phases

### Phase 1: workspace visibility overhaul

Scope:

- add scene `layout` persistence
- move plots out of inspector tabs
- render renderer, plots, and editor rail as peer workspace regions
- place timeline according to the visibility rule
- add header `Layout` controls

Success criteria:

- scenes can reopen with renderer hidden
- scenes can reopen with plots hidden
- scenes can reopen with editor rail hidden
- timeline relocates correctly
- old scenes load without behavioral regression

### Phase 1.5: plot identity hardening

Scope:

- add stable plot IDs
- migrate old scenes by generating IDs on normalization/save
- expose header action slots on plot cards

Success criteria:

- plot operations do not depend solely on array index
- future focus/export actions have a stable target

### Phase 2: focus modes

Scope:

- focus renderer
- focus plots
- focus single plot

Success criteria:

- focus feels like an intentional workspace mode, not a hacked hide/show combination

### Phase 3: plot export

Scope:

- export plot image from a single plot panel
- support local/server and static behaviors sensibly

Success criteria:

- user can save one plot as an image without screenshot hacks

## Acceptance criteria for the overhaul handoff

- There is one documented scene-level layout model.
- There is one documented place in the UI for the toggles.
- Timeline behavior is explicitly defined.
- Full-screen/focus work has a planned state model.
- Plot export has a planned integration point.
- The scope avoids promising a full tiling/docking system.

## Risks and design traps

### Turning this into a generic docking system

That adds a lot of surface area and complexity without being necessary for the requested workflows.

### Keeping plots inside the inspector while also pretending they are peer panels

That would create an awkward hybrid model and likely produce brittle state handling.

### Persisting too much ephemeral UI state in the scene

The scene should capture layout intent, not every temporary focus state or panel interaction.

### Deferring plot IDs too long

If focused-plot or export work lands first, index-based targeting will get annoying quickly.

## Recommendation

Treat this as a small workspace panel system with explicit rules:

- scene-persisted visibility toggles
- fixed placement policy
- timeline attached to the active visual surface
- future focus state planned cleanly
- future plot export planned cleanly

That should deliver the workflow flexibility you want without disappearing into a docking-framework project.
