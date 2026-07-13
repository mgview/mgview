# MGView In-Place Modernization

Current status of the React app that now serves as the main MGView UI.

## Status

Most of the modernization is done.

- Main app: [`frontend/src/App.tsx`](/Users/adam/code/mgview_project/mgview/frontend/src/App.tsx)
- Legacy reference: [`legacy/`](/Users/adam/code/mgview_project/mgview/legacy/)
- Stack: React 18, TypeScript, Vite, Tailwind v4, shadcn/ui, Three.js, uPlot
- Runtime split is in place:
  - local server mode supports workspace browsing and scene read/write
  - static/site mode supports bundled samples in read-only mode

## Landed

- Scene source split for samples vs workspace scenes
- Workspace-aware load/create/save flows
- Undo/redo, save, save as, reload, unsaved-change handling
- Object and span editing
- Scene settings and JSON save preview
- Diagnostics and simulation-data management overlays
- Plot authoring and viewing
- Release/site packaging
- Panel architecture overhaul:
  - renderer, plots, and objects/editor are peer workspace regions
  - scene JSON persists layout visibility via `scene.layout`
  - header `Layout` menu controls `3D View`, `Plots`, and `Objects + Editor`
  - timeline attaches to the active visual surface

## Current UI model

The app is now a workspace shell with up to three peer panel regions:

- `3D View`
- `Plots`
- `Objects + Editor`

Important current behavior:

- `Plots` are no longer part of the inspector tabs.
- The inspector now contains only `Editor`, `Scene Settings`, and `JSON Editor`.
- Scene layout is normalized through [`frontend/src/core/workspaceLayout.ts`](/Users/adam/code/mgview_project/mgview/frontend/src/core/workspaceLayout.ts).
- Scenes without a `layout` block fall back to:
  - `showRenderer: true`
  - `showPlots: false`
  - `showEditorRail: true`

## Code map

| Area | Location |
|------|----------|
| App shell / layout policy | [`frontend/src/App.tsx`](/Users/adam/code/mgview_project/mgview/frontend/src/App.tsx) |
| Header / layout menu | [`frontend/src/components/SceneHeaderBar.tsx`](/Users/adam/code/mgview_project/mgview/frontend/src/components/SceneHeaderBar.tsx) |
| Renderer | [`frontend/src/components/RendererPanel.tsx`](/Users/adam/code/mgview_project/mgview/frontend/src/components/RendererPanel.tsx) |
| Plots workspace | [`frontend/src/components/PlotsPanel.tsx`](/Users/adam/code/mgview_project/mgview/frontend/src/components/PlotsPanel.tsx), [`frontend/src/components/PlotPanel.tsx`](/Users/adam/code/mgview_project/mgview/frontend/src/components/PlotPanel.tsx) |
| Objects list | [`frontend/src/components/ObjectList.tsx`](/Users/adam/code/mgview_project/mgview/frontend/src/components/ObjectList.tsx) |
| Inspector/editor rail | [`frontend/src/components/InspectorDrawer.tsx`](/Users/adam/code/mgview_project/mgview/frontend/src/components/InspectorDrawer.tsx) |
| Scene normalization | [`frontend/src/core/sceneDocument.ts`](/Users/adam/code/mgview_project/mgview/frontend/src/core/sceneDocument.ts) |
| Layout schema/defaults | [`frontend/src/core/types.ts`](/Users/adam/code/mgview_project/mgview/frontend/src/core/types.ts), [`frontend/src/core/workspaceLayout.ts`](/Users/adam/code/mgview_project/mgview/frontend/src/core/workspaceLayout.ts) |
| Plot config normalization | [`frontend/src/core/plotsConfig.ts`](/Users/adam/code/mgview_project/mgview/frontend/src/core/plotsConfig.ts) |
| Workspace/load-save flow | [`frontend/src/hooks/useSceneWorkspace.ts`](/Users/adam/code/mgview_project/mgview/frontend/src/hooks/useSceneWorkspace.ts), [`frontend/src/hooks/useWorkspaceShell.ts`](/Users/adam/code/mgview_project/mgview/frontend/src/hooks/useWorkspaceShell.ts), [`frontend/src/hooks/useServerWorkspace.ts`](/Users/adam/code/mgview_project/mgview/frontend/src/hooks/useServerWorkspace.ts) |

## Build / run

```bash
cd frontend
npm install
npm test
npm run build
cd ..
./RunMGViewMac
```

Useful outputs:

- `npm run build` -> `frontend/dist/`
- `npm run build:site` -> `build/gh-pages/`
- `npm run build:release` -> `build/release/mgview-*.zip`
- `npm run preview:site` -> local static preview with the real `/mgview/` path shape

## Remaining work

- `JSON Editor` is still a save preview, not a true editable JSON editor.
- Keyboard and focus behavior still needs a dedicated pass, especially deeper list navigation and editing shortcuts.
- Plot follow-ons are still open:
  - `focusTarget` exists in schema but is not yet used for a true focus/full-screen mode
  - plot export is not implemented
- HTTP-level coverage around the local file/workspace API is still thin.
- Legacy parity still needs occasional targeted audits for edge-case visuals and editor polish.

## Related docs

- [`mgview-panel-architecture-overhaul-scope.md`](/Users/adam/code/mgview_project/mgview/mgview-panel-architecture-overhaul-scope.md)
- [`mgview-plotting-scope.md`](/Users/adam/code/mgview_project/mgview/mgview-plotting-scope.md)
- [`mgview-scene-sources-split.md`](/Users/adam/code/mgview_project/mgview/mgview-scene-sources-split.md)
- [`mgview-inferred-reference-context.md`](/Users/adam/code/mgview_project/mgview/mgview-inferred-reference-context.md)
- [`BUILD.md`](/Users/adam/code/mgview_project/mgview/BUILD.md)
