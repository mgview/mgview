# MGView In-Place Modernization

Handoff for the modern React app beside the legacy viewer.

## Current state

- Active app: [`frontend/src/App.tsx`](frontend/src/App.tsx). Legacy reference: [`legacy/`](legacy/) (GitHub Pages: `/mgview/legacy/`).
- **UI:** Tailwind CSS v4 + shadcn/ui (Radix) + Lucide; light/dark themes with header toggle. See [`frontend/DESIGN-NOTE.md`](frontend/DESIGN-NOTE.md) and [`mgview-ui-stack.md`](mgview-ui-stack.md).
- **Logic:** Scene/timeline/reference code in [`frontend/src/core/`](frontend/src/core), [`frontend/src/rendering/`](frontend/src/rendering), [`frontend/src/hooks/`](frontend/src/hooks); server paths in [`bin/workspaceRoots.test.js`](bin/workspaceRoots.test.js).
- **Product:** Scene source split, inferred reference context, workspace picker, object/span/scene editors, load/save/create, undo/redo, diagnostics, sim-file overlay, release packaging, About/build metadata.

## What the app does

- Loads samples (`?sample=...`) and workspace scenes (`?scene=...`); renders with Three.js at simulation time `t`.
- Local server: full read/write, workspace API, URL sync. Static/GitHub Pages: bundled samples only, read-only.
- Inspector: objects, visuals, spans, scene settings, JSON save preview.

## Shell / header

- Brand `MGView`, `?` About, scene path + unsaved dot, undo/redo, **Samples…**, **Load…** / **Save** (Radix dropdowns for Reload, New…, Sim Files…, Save As…), **Diagnostics**, theme toggle (sun/moon).
- **Change Workspace…** is inside Load/New modals, not the persistent header.
- Workspace root is not shown in the header; scene path is the primary document identity.

## Runtime model

- Mount path: `/mgview/` (install folder name on disk does not matter).
- Server: [`bin/server.js`](bin/server.js) on port 8000.
- **App root** — bundled `samples/`, `assets/`. **Workspace root** — `~/.mgview/config.json`, default parent of install.
- Workspace API: `GET`/`POST /mgview/api/workspace`. Files: `root=workspace|sample|app` + `path=...`. Config reloads per request (no server restart on workspace change).

## URLs

| Surface | URL | Notes |
|---------|-----|-------|
| Local server | `http://localhost:8000/mgview/` | Full API |
| Static preview | `http://localhost:8001/mgview/` | GitHub Pages layout |
| GitHub Pages | `https://mgview.github.io/mgview/` | Sample-only |
| Legacy | `/mgview/legacy/MGView.html` | Reference only |

## Run / build

```bash
cd frontend && npm install && npm test && npm run build
cd .. && ./RunMGViewMac
```

| Command | Output |
|---------|--------|
| `npm run build` | `frontend/dist/` — local server |
| `npm run build:site` | `build/gh-pages/` — GitHub Pages |
| `npm run build:release` | `build/release/mgview-*.zip` |

Also: `npm run preview:site`, `npm run build:release`. Version in [`frontend/package.json`](frontend/package.json); `npm run build` refreshes `bin/VERSION` and generated build metadata.

Do not use `npm run preview` as the real app — no MGView file API.

## Code map

| Area | Location |
|------|----------|
| App shell | [`App.tsx`](frontend/src/App.tsx), [`SceneHeaderBar.tsx`](frontend/src/components/SceneHeaderBar.tsx) |
| Theme | [`ThemeProvider.tsx`](frontend/src/components/ThemeProvider.tsx), [`index.css`](frontend/src/index.css) |
| UI primitives | [`components/ui/`](frontend/src/components/ui/), [`lib/utils.ts`](frontend/src/lib/utils.ts) |
| Editor layout tokens | [`editorLayout.ts`](frontend/src/components/editorLayout.ts) |
| Residual CSS | [`app.css`](frontend/src/app.css) — canvas, workspace grid, scrubbers, swatch popovers |
| Workspace / load-save | [`useSceneWorkspace.ts`](frontend/src/hooks/useSceneWorkspace.ts), [`useServerWorkspace.ts`](frontend/src/hooks/useServerWorkspace.ts) |
| URLs / paths | [`sceneRef.ts`](frontend/src/core/sceneRef.ts), [`workspacePaths.ts`](frontend/src/core/workspacePaths.ts) |
| Scene model | [`sceneDocument.ts`](frontend/src/core/sceneDocument.ts), [`sceneInspector.ts`](frontend/src/core/sceneInspector.ts) |
| Rendering | [`sceneGraph.ts`](frontend/src/rendering/sceneGraph.ts), [`meshFactory.ts`](frontend/src/rendering/meshFactory.ts) |
| File API | [`localFilesServer.ts`](frontend/src/api/localFilesServer.ts), [`localFilesStatic.ts`](frontend/src/api/localFilesStatic.ts) |

## Related docs

- [`BUILD.md`](BUILD.md) — deploy outputs
- [`mgview-ui-stack.md`](mgview-ui-stack.md) — UI stack reference
- [`mgview-scene-sources-split.md`](mgview-scene-sources-split.md) — `?sample=` / `?scene=`, Samples vs Load
- [`mgview-inferred-reference-context.md`](mgview-inferred-reference-context.md) — origin/frame inference
- [`mgview-plotting-scope.md`](mgview-plotting-scope.md) — plotting panels (draft)

## Known gaps

- No plotting panels.
- JSON tab is save preview only, not a full editor.
- Mixed inferred reference systems warn but do not offer reconciliation.
- No HTTP integration tests for workspace/file routes.
- Legacy parity gaps on uncommon visuals and polish.

### Workspace switch

Global context, separate from the open document. Does not auto-load a scene.

- Same relative path in new workspace → keep scene loaded.
- Path missing in new workspace → clear document, open load flow at new root.
- Sample loaded → sample stays; browsing context updates.
- No scene → open load flow.
- Unsaved workspace edits → confirm before switching.

## Next work

1. **Plotting** — simulation channel charts.
2. **Keyboard / focus** — richer shortcuts (selection, create/delete, open overlays); arrow keys in object/span lists; clearer rename and empty states.
3. **Legacy parity audit** — bundled samples vs legacy for mesh/text/basis/torus/span variants, materials, editing affordances; file explicit gaps.
4. **Server integration tests** — `/mgview/api/workspace` and file/list routes.
