# MGView In-Place Modernization

Short handoff for the current local-file React rewrite that lives beside the legacy app.

## Current state

- Modern app lives in [`frontend/src/App.tsx`](/Users/adam/code/mgview_project/mgview/frontend/src/App.tsx) and is the active surface for ongoing work.
- Legacy app remains in [`legacy/`](/Users/adam/code/mgview_project/mgview/legacy) as reference and still ships on GitHub Pages under `/mgview/legacy/`.
- Core scene/timeline/reference logic has been split out and is covered by Node-based tests in [`frontend/src/core/`](/Users/adam/code/mgview_project/mgview/frontend/src/core), [`frontend/src/rendering/`](/Users/adam/code/mgview_project/mgview/frontend/src/rendering), [`frontend/src/hooks/`](/Users/adam/code/mgview_project/mgview/frontend/src/hooks), and [`bin/workspaceRoots.test.js`](/Users/adam/code/mgview_project/mgview/bin/workspaceRoots.test.js).
- Recent work reflected in the codebase: scene source split, inferred reference context, server-backed workspace picker, editable object/span inspectors, save/load/create flows, release zip packaging, and in-app build metadata.

## What the modern app does today

- Loads bundled samples with `?sample=...` and workspace scenes with `?scene=...`.
- Renders the scene with current `three` and drives transforms from simulation data at time `t`.
- Supports local-server scene load, save, save-as, create, undo/redo, diagnostics, simulation file inspection, and URL sync.
- Includes object, visual, scene, and span editing UI.
- Includes an About panel showing app version, build date, timestamp, and commit.
- Supports static hosting for demo use, but static mode is sample-only and read-only.

## Runtime model

- Browser mount is always `/mgview/` regardless of the install folder name on disk.
- Local server is [`bin/server.js`](/Users/adam/code/mgview_project/mgview/bin/server.js).
- Two roots exist on the local server:
  - App root: this repo/install, used for bundled `samples/` and `assets/`
  - Workspace root: configured in `~/.mgview/config.json`, defaulting to the parent of the app install
- Workspace config is exposed at `GET`/`POST /mgview/api/workspace`.
- File APIs use `root=workspace|sample|app` plus a logical `path=...`.
- Server syncs workspace roots from config on every API request, so changing the workspace does not require a restart.

## URLs and surfaces

| Surface | URL shape | Notes |
|---|---|---|
| Local server | `http://localhost:8000/mgview/` | Full workspace API |
| Static preview | `http://localhost:8001/mgview/` | Mirrors GitHub Pages layout |
| GitHub Pages | `https://mgview.github.io/mgview/` | Sample-only, no workspace API |
| Legacy app | `/mgview/legacy/MGView.html` | Historical reference |

Related docs:

- [`mgview-scene-sources-split.md`](/Users/adam/code/mgview_project/mgview/mgview-scene-sources-split.md)
- [`mgview-inferred-reference-context.md`](/Users/adam/code/mgview_project/mgview/mgview-inferred-reference-context.md)
- [`BUILD.md`](/Users/adam/code/mgview_project/mgview/BUILD.md)

## Run/build commands

```bash
cd frontend
npm install
npm test
npm run build
cd ..
./RunMGViewMac
```

Useful variants:

- `cd frontend && npm run preview:site`
- `cd frontend && npm run build:site`
- `cd frontend && npm run build:release`

Important build outputs:

- `npm run build` -> `frontend/dist/` for the local Node server
- `npm run build:site` -> `build/gh-pages/` for GitHub Pages
- `npm run build:release` -> `build/release/mgview-*.zip`

Versioning:

- Canonical app version lives in [`frontend/package.json`](/Users/adam/code/mgview_project/mgview/frontend/package.json).
- `npm run build` regenerates `bin/VERSION` and the app's generated build metadata before bundling.

Do not use `npm run preview` as a substitute for the real app; it does not provide the MGView file API.

## Code map

- App shell: [`frontend/src/App.tsx`](/Users/adam/code/mgview_project/mgview/frontend/src/App.tsx)
- Workspace + load/save flow: [`frontend/src/hooks/useSceneWorkspace.ts`](/Users/adam/code/mgview_project/mgview/frontend/src/hooks/useSceneWorkspace.ts)
- Workspace picker state: [`frontend/src/hooks/useServerWorkspace.ts`](/Users/adam/code/mgview_project/mgview/frontend/src/hooks/useServerWorkspace.ts)
- URL/path model: [`frontend/src/core/sceneRef.ts`](/Users/adam/code/mgview_project/mgview/frontend/src/core/sceneRef.ts), [`frontend/src/core/workspacePaths.ts`](/Users/adam/code/mgview_project/mgview/frontend/src/core/workspacePaths.ts)
- Scene model + diagnostics: [`frontend/src/core/sceneDocument.ts`](/Users/adam/code/mgview_project/mgview/frontend/src/core/sceneDocument.ts), [`frontend/src/core/sceneInspector.ts`](/Users/adam/code/mgview_project/mgview/frontend/src/core/sceneInspector.ts)
- Rendering: [`frontend/src/rendering/sceneGraph.ts`](/Users/adam/code/mgview_project/mgview/frontend/src/rendering/sceneGraph.ts), [`frontend/src/rendering/meshFactory.ts`](/Users/adam/code/mgview_project/mgview/frontend/src/rendering/meshFactory.ts)
- Local file API client: [`frontend/src/api/localFilesServer.ts`](/Users/adam/code/mgview_project/mgview/frontend/src/api/localFilesServer.ts)
- Static-mode file client: [`frontend/src/api/localFilesStatic.ts`](/Users/adam/code/mgview_project/mgview/frontend/src/api/localFilesStatic.ts)

## Known gaps

- No plotting/chart panels yet.
- Static hosting cannot browse or save workspace files.
- JSON inspector is still a save preview, not a full editor.
- Mixed inferred reference systems still warn and continue rather than offering reconciliation tools.
- No HTTP-level integration tests for the workspace/file server routes.
- Some legacy feature parity work remains, especially around less-common visuals and polish.

## Practical next work

1. Add plotting panels for simulation channels.
2. Tighten workspace/editor UX and keyboard interactions.
3. Continue legacy parity audit against the modern inspector and sample set.
4. Add integration coverage for `/mgview/api/workspace` and file/list endpoints.
