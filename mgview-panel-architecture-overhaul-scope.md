# MGView Panel Architecture Overhaul

Status note: this overhaul has been implemented.

## What landed

The React workspace no longer hard-codes a single renderer-plus-inspector layout.

Implemented behavior:

- `3D View`, `Plots`, and `Objects + Editor` are peer workspace regions
- each region can be shown or hidden independently
- scene JSON persists layout visibility in `scene.layout`
- the header includes a `Layout` popover with checkboxes for:
  - `3D View`
  - `Plots`
  - `Objects + Editor`
  - stays open while toggling; dismiss with Escape or an outside click
- the playback strip is attached to the active visual workspace:
  - under `3D View` when visible
  - otherwise under `Plots`
  - otherwise hidden
- plots are no longer modeled as an inspector tab

## Persisted model

Scene layout is represented by [`SceneLayoutConfig`](/Users/adam/code/mgview_project/mgview/frontend/src/core/types.ts) and normalized in [`frontend/src/core/workspaceLayout.ts`](/Users/adam/code/mgview_project/mgview/frontend/src/core/workspaceLayout.ts):

```ts
interface SceneLayoutConfig {
  showRenderer?: boolean;
  showPlots?: boolean;
  showEditorRail?: boolean;
  focusTarget?: 'renderer' | 'plots' | null;
}
```

Current defaults for scenes without a `layout` block:

- `showRenderer: true`
- `showPlots: false`
- `showEditorRail: true`
- `focusTarget: null`

## Implementation map

- Layout policy and timeline ownership:
  [`frontend/src/App.tsx`](/Users/adam/code/mgview_project/mgview/frontend/src/App.tsx)
- Header layout controls:
  [`frontend/src/components/SceneHeaderBar.tsx`](/Users/adam/code/mgview_project/mgview/frontend/src/components/SceneHeaderBar.tsx)
- Inspector tabs after the split:
  [`frontend/src/components/InspectorDrawer.tsx`](/Users/adam/code/mgview_project/mgview/frontend/src/components/InspectorDrawer.tsx)
- Layout normalization:
  [`frontend/src/core/workspaceLayout.ts`](/Users/adam/code/mgview_project/mgview/frontend/src/core/workspaceLayout.ts)
- Scene normalization:
  [`frontend/src/core/sceneDocument.ts`](/Users/adam/code/mgview_project/mgview/frontend/src/core/sceneDocument.ts)

## Follow-on work still open

The core overhaul is done, but a few adjacent items remain separate work:

- `focusTarget` is persisted/normalized but not yet used for a true focus mode
- plot export is not implemented
- there is still no docking/drag-rearrangement system, by design

## Notes

- Plot panels now get stable IDs during normalization via [`frontend/src/core/plotsConfig.ts`](/Users/adam/code/mgview_project/mgview/frontend/src/core/plotsConfig.ts), which keeps future plot-targeted actions viable.
- This remains an opinionated workspace layout system, not a general docking framework.
