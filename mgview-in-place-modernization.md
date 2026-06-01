# MGView In-Place Modernization

Current handoff for the modern React app that now sits alongside the legacy viewer.

## Current app status

- Active app: [`frontend/src/App.tsx`](/Users/adam/code/mgview_project/mgview/frontend/src/App.tsx). Legacy reference remains under [`legacy/`](/Users/adam/code/mgview_project/mgview/legacy/).
- Stack: React 18 + TypeScript + Vite, Tailwind CSS v4, shadcn/ui/Radix, Lucide, Three.js, uPlot.
- Runtime split is real and working:
  - Local server mode: read/write workspace scenes, browse files, change workspace root.
  - Static/GitHub Pages mode: bundled samples only, read-only.
- Core modernization work already landed:
  - scene source split (`?sample=` vs `?scene=`)
  - workspace picker and workspace-aware file browser
  - load, create, save, save as, reload, undo/redo
  - object editor, span editor, scene settings, JSON save preview
  - diagnostics overlay and simulation-data management overlay
  - plot panels embedded in the inspector
  - release/site build packaging

## Current UI model

The app is now a workspace shell with three main areas:

1. 3D renderer + playback strip
2. Objects/spans rail
3. Inspector drawer

The inspector currently exposes four tabs:

- `Editor`
- `Scene Settings`
- `JSON Editor`
- `Plots`

Important implication: plots are no longer a future placeholder. They are already a first-class inspector tab, with persisted panel config stored in scene JSON.

## Header and overlays

- Header includes scene path, unsaved indicator, undo/redo, `Samples...`, `Load...`, `Diagnostics`, `Save`, and theme toggle.
- `Load...` menu includes `Reload`, `New...`, and `Sim Files...`.
- Workspace switching exists, but it lives in the load/create flow via `Change Workspace...`, not as a persistent top-level header control.
- Overlays/panels in active use:
  - About
  - Load/Create/Save As
  - Samples
  - Diagnostics
  - Workspace picker
  - Simulation Data

## Runtime / path model

- Mount path is `/mgview/`.
- Local app URL: `http://localhost:8000/mgview/`
- Static preview URL: `http://localhost:8001/mgview/`
- GitHub Pages URL: `https://mgview.github.io/mgview/`
- Legacy reference URL: `/mgview/legacy/MGView.html`

Server/runtime behavior:

- Local server is [`bin/server.js`](/Users/adam/code/mgview_project/mgview/bin/server.js).
- App root holds bundled repo assets like `samples/` and `assets/`.
- Workspace root is configured via `~/.mgview/config.json`.
- File/list APIs use `root=workspace|sample|app`.
- Workspace config is re-read per request, so changing the workspace does not require a server restart.

## Code map

| Area | Location |
|------|----------|
| App shell / overall layout | [`frontend/src/App.tsx`](/Users/adam/code/mgview_project/mgview/frontend/src/App.tsx) |
| Header | [`frontend/src/components/SceneHeaderBar.tsx`](/Users/adam/code/mgview_project/mgview/frontend/src/components/SceneHeaderBar.tsx) |
| Renderer | [`frontend/src/components/RendererPanel.tsx`](/Users/adam/code/mgview_project/mgview/frontend/src/components/RendererPanel.tsx) |
| Object/span rail | [`frontend/src/components/ObjectList.tsx`](/Users/adam/code/mgview_project/mgview/frontend/src/components/ObjectList.tsx) |
| Inspector tabs | [`frontend/src/components/InspectorDrawer.tsx`](/Users/adam/code/mgview_project/mgview/frontend/src/components/InspectorDrawer.tsx) |
| Plot authoring | [`frontend/src/components/PlotsPanel.tsx`](/Users/adam/code/mgview_project/mgview/frontend/src/components/PlotsPanel.tsx), [`frontend/src/components/PlotPanel.tsx`](/Users/adam/code/mgview_project/mgview/frontend/src/components/PlotPanel.tsx) |
| Workspace/load-save flow | [`frontend/src/hooks/useSceneWorkspace.ts`](/Users/adam/code/mgview_project/mgview/frontend/src/hooks/useSceneWorkspace.ts), [`frontend/src/hooks/useWorkspaceShell.ts`](/Users/adam/code/mgview_project/mgview/frontend/src/hooks/useWorkspaceShell.ts), [`frontend/src/hooks/useServerWorkspace.ts`](/Users/adam/code/mgview_project/mgview/frontend/src/hooks/useServerWorkspace.ts) |
| Scene model / normalization | [`frontend/src/core/sceneDocument.ts`](/Users/adam/code/mgview_project/mgview/frontend/src/core/sceneDocument.ts), [`frontend/src/core/types.ts`](/Users/adam/code/mgview_project/mgview/frontend/src/core/types.ts) |
| Diagnostics / inspection | [`frontend/src/core/sceneInspector.ts`](/Users/adam/code/mgview_project/mgview/frontend/src/core/sceneInspector.ts) |
| File API split | [`frontend/src/api/localFiles.ts`](/Users/adam/code/mgview_project/mgview/frontend/src/api/localFiles.ts) |

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

- `npm run build` -> `frontend/dist/` for the local server build
- `npm run build:site` -> `build/gh-pages/` for GitHub Pages
- `npm run build:release` -> `build/release/mgview-*.zip`
- `npm run preview:site` for a local static preview that matches the `/mgview/` URL shape

Do not use `npm run preview` as a stand-in for the real app; it does not expose the MGView workspace/file API.

## Related docs

- [`BUILD.md`](/Users/adam/code/mgview_project/mgview/BUILD.md) - build and deployment details
- [`mgview-ui-stack.md`](/Users/adam/code/mgview_project/mgview/mgview-ui-stack.md) - UI stack and styling notes
- [`mgview-scene-sources-split.md`](/Users/adam/code/mgview_project/mgview/mgview-scene-sources-split.md) - scene URL and source model
- [`mgview-inferred-reference-context.md`](/Users/adam/code/mgview_project/mgview/mgview-inferred-reference-context.md) - inferred origin/frame behavior
- [`mgview-plotting-scope.md`](/Users/adam/code/mgview_project/mgview/mgview-plotting-scope.md) - plotting background and scope notes

## Remaining gaps

- `JSON Editor` is still a save preview, not a true editable structured/raw JSON editor.
- Keyboard/focus support is still partial. There is basic global handling (`Escape`, undo/redo, save, play/pause), but list navigation and deeper editing shortcuts are still thin.
- There are still no HTTP-level integration tests around the local server API routes; current automated coverage is mostly frontend/core tests plus [`bin/workspaceRoots.test.js`](/Users/adam/code/mgview_project/mgview/bin/workspaceRoots.test.js).
- Diagnostics warn about mixed inferred origins/frames, but there is no guided reconciliation or repair flow.
- Legacy parity is still incomplete on edge-case visuals/editing polish.

## Next priorities

1. Panel architecture overhaul.
   Treat the 3D view, plots view, and objects + editor sections as peer workspace elements that can each be independently shown/hidden, instead of keeping plots trapped inside the inspector tab model. See [`mgview-panel-architecture-overhaul-scope.md`](/Users/adam/code/mgview_project/mgview/mgview-panel-architecture-overhaul-scope.md).
2. Keyboard and focus pass.
   Improve object/span list navigation, selection shortcuts, create/delete flows, rename ergonomics, and empty states.
3. Better JSON editing story.
   Decide whether this becomes a real text editor, a structured form-backed editor, or both.
4. Server integration coverage.
   Add route-level tests for workspace switching plus file/list/load/save behavior.
5. Legacy parity audit.
   Re-check uncommon visuals, materials, and editing affordances against the legacy viewer and explicitly log any intentional differences.

## Workspace switch behavior

Current intended behavior when the workspace root changes:

- If a workspace scene is open and the same relative path exists in the new workspace, reload that scene from the new root.
- If that relative path does not exist, clear the current document and push the user back into scene selection for the new workspace.
- If a sample scene is open, keep the sample scene loaded and only update workspace browsing context.
- If nothing is loaded, switch workspace and open the normal load flow.
- If unsaved workspace edits exist, confirm before switching.
