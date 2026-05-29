# MGView In-Place Modernization

## Purpose

This document tracks the near-term in-place modernization of the existing local-file `MGView` app.

It is intentionally separate from the longer-term hosted/cloud product direction in
[`docs/mgview-modernization-plan.md`](../docs/mgview-modernization-plan.md).

This file should be enough context to resume work in a new chat without rereading the whole codebase.

## Current Direction

Modernize `MGView` in place, keep the legacy jQuery app working, and build a new React-based replacement beside it.

Current strategy:

- preserve the legacy app as a working reference
- extract reusable typed core logic first
- build a modern React UI against that core
- keep moving load/save/playback/editor coordination out of the top-level app component and into focused hooks/components
- keep the local-file workflow intact
- evolve [`frontend/src/App.tsx`](frontend/src/App.tsx) as the main long-term local app route at `/MGView/` (local) and `/` (GH Pages)
- keep [`frontend/src/SimpleApp.tsx`](frontend/src/SimpleApp.tsx) as the preserved low-risk baseline at `/MGView/simple` (local) and `/simple` (GH Pages)
- keep tightening the modern app toward a denser, more tool-like workspace rather than a dashboard-style page

Short version:

- the modern app is now a compact local workspace, not a long inspector page
- the renderer is the primary surface
- scene loading/creation, simulation-file management, and diagnostics live in overlays
- the object list and editor now live together in one collapsible right-side rail
- the next work should focus more on editor capability than on broad shell rearrangement

Renderer note:

- use current stable `three` in the modern app, not the older version from `../frame_viz`
- `../frame_viz` is still useful as structural inspiration for scene/camera/render-loop ownership
- preserve MGView's simulation-driven playback model for now: transforms come from evaluated simulation channels at time `t`, not from directly authored pose/quaternion state
- future scene-authoring work may need a different transform model closer to `../frame_viz`, where frame relationships and poses are explicitly authored; treat that as a separate future mode/view, not a near-term requirement

## Repo State

### Legacy app

The original app still lives in:

- [`legacy/MGView.html`](legacy/MGView.html)
- [`legacy/app/js/mgview`](legacy/app/js/mgview)

This is still the jQuery / old `three.js` app and should continue to work while modernization proceeds.

### Modern app

The new in-place frontend lives in:

- [`frontend`](frontend)

Important files:

- main app: [`frontend/src/App.tsx`](frontend/src/App.tsx)
- preserved simple app: [`frontend/src/SimpleApp.tsx`](frontend/src/SimpleApp.tsx)
- workspace state hook: [`frontend/src/hooks/useSceneWorkspace.ts`](frontend/src/hooks/useSceneWorkspace.ts)
- workspace shell hook: [`frontend/src/hooks/useWorkspaceShell.ts`](frontend/src/hooks/useWorkspaceShell.ts)
- playback hook: [`frontend/src/hooks/usePlaybackController.ts`](frontend/src/hooks/usePlaybackController.ts)
- inspector selection hook: [`frontend/src/hooks/useInspectorSelectionState.ts`](frontend/src/hooks/useInspectorSelectionState.ts)
- extracted UI components: [`frontend/src/components`](frontend/src/components)
- extracted core: [`frontend/src/core`](frontend/src/core)
- renderer helpers: [`frontend/src/rendering`](frontend/src/rendering)
- shared styling: [`frontend/src/styles.css`](frontend/src/styles.css)

Key current workspace components:

- header strip: [`SceneHeaderBar.tsx`](frontend/src/components/SceneHeaderBar.tsx)
- renderer: [`RendererPanel.tsx`](frontend/src/components/RendererPanel.tsx)
- playback transport: [`PlaybackStrip.tsx`](frontend/src/components/PlaybackStrip.tsx)
- right-side inspector shell: [`InspectorDrawer.tsx`](frontend/src/components/InspectorDrawer.tsx)
- scene editor pane: [`SceneSettingsPanel.tsx`](frontend/src/components/SceneSettingsPanel.tsx)
- visual editor pane: [`VisualEditorPanel.tsx`](frontend/src/components/VisualEditorPanel.tsx)
- JSON preview/editor pane: [`JsonEditorPanel.tsx`](frontend/src/components/JsonEditorPanel.tsx)
- overlay shell: [`OverlayPanel.tsx`](frontend/src/components/OverlayPanel.tsx)
- load-scene overlay: [`LoadSceneOverlay.tsx`](frontend/src/components/LoadSceneOverlay.tsx)
- static sample gallery: [`SampleSceneGallery.tsx`](frontend/src/components/SampleSceneGallery.tsx)
- toasts / demo notice: [`ToastStack.tsx`](frontend/src/components/ToastStack.tsx), [`DemoNotice.tsx`](frontend/src/components/DemoNotice.tsx)
- notifications hook: [`useToasts.ts`](frontend/src/hooks/useToasts.ts)
- diagnostics overlay: [`DiagnosticsOverlay.tsx`](frontend/src/components/DiagnosticsOverlay.tsx)
- simulation-data overlay: [`SimulationDataOverlay.tsx`](frontend/src/components/SimulationDataOverlay.tsx)
- object list: [`ObjectList.tsx`](frontend/src/components/ObjectList.tsx)
- local browser: [`LocalFileBrowser.tsx`](frontend/src/components/LocalFileBrowser.tsx)
- material picker: [`MaterialPicker.tsx`](frontend/src/components/MaterialPicker.tsx)
- color picker: [`ColorPicker.tsx`](frontend/src/components/ColorPicker.tsx)
- save preview content: [`SavePreviewPanel.tsx`](frontend/src/components/SavePreviewPanel.tsx)

### Local server

The app now uses one unified local Node server:

- [`bin/server.js`](bin/server.js)

Launchers:

- macOS: [`RunMGViewMac`](RunMGViewMac)
- Linux: [`RunMGViewLinux`](RunMGViewLinux)
- Unix launcher script: [`bin/run_mg_unix.sh`](bin/run_mg_unix.sh)
- Windows launcher: [`bin/RunVisualizer.bat`](bin/RunVisualizer.bat)

The old bundled [`bin/node.exe`](bin/node.exe) was removed.

## Runtime and Distribution Assumptions

Current assumption:

- users install the official Node.js LTS runtime themselves
- launchers fail clearly if `node` is not available

Docs updated:

- [`README.md`](README.md)
- [`legacy/Documentation.html`](legacy/Documentation.html)

Why:

- the old bundled Windows `node.exe` was ancient (`v0.10.13`, 32-bit)
- relying on Python on macOS/Linux was no longer a clean story
- a single Node-based server is a better foundation for future local file APIs

## Filesystem / Path Model (updated May 2026)

### Unified workspace-relative paths (modern app)

The modern app now uses **one coordinate system**: paths relative to the **workspace root** (parent of the `MGView` repo directory).

Examples:

- bundled sample: `MGView/samples/particle_pendulum/particle_pendulum.json`
- bundled texture: `MGView/assets/textures/checkerboard.jpg`
- user sim folder beside repo: `my_sim_folder/run.1`

Key files:

- [`frontend/src/core/workspacePaths.ts`](frontend/src/core/workspacePaths.ts) — `APP_DIR` (default `MGView`), `bundledSamplePath()`, `DEFAULT_SCENE_PATH`
- [`bin/server.js`](bin/server.js) — always resolves under `PROJECT_ROOT` (no dual MGView/workspace rebase)
- [`frontend/src/api/assetPaths.ts`](frontend/src/api/assetPaths.ts) — `getPublicBaseUrl()` returns `/` (workspace root on origin)

Legacy app is different: query `path=samples/...` is **relative to `/MGView/`** (page directory), not workspace root. Do not change legacy links to `MGView/samples/...`.

### Intended local layout (current default)

```text
MotionGenesis/          ← PROJECT_ROOT / workspace root
  MGView/               ← repo / APP_DIR
  my_sim_folder/
  another_sim_folder/
```

The Node server serves from `MotionGenesis/` (parent of repo). Sibling sim folders are browsable on the server build.

### Planned: configurable workspace (not implemented)

"In-app Open workspace…" is the preferred next step: user picks/pastes a folder, server sets `PROJECT_ROOT`, persist in `~/.mgview/config.json`. MotionGenesis-in-parent becomes a default, not a requirement. See discussion in chat — server path switch is easy; native folder picker is a progressive enhancement (File System Access API or path paste).

### Repo layout cleanup (May 2026)

Legacy jQuery app moved into [`legacy/`](legacy/). Modern app promoted to repo root URLs:

- **Local server:** `http://localhost:8000/MGView/` (modern), `http://localhost:8000/MGView/legacy/` (legacy)
- **GH Pages:** `https://mgview.github.io/mgview/` (modern), `https://mgview.github.io/mgview/legacy/` (legacy)

Old top-level legacy URLs (`/MGView/Examples.html`, `/MGView/modern/`, etc.) redirect via `bin/server.js`.

`samples/` remains at repo root and is shared by both apps. Legacy scene links use `../samples/...` paths relative to `legacy/MGView.html`.

## Static Hosting (GH Pages / local static preview)

Modern app can run without the Node API via a **build-time static shim** (`VITE_MGVIEW_STATIC=true`).

Key files:

- [`frontend/src/api/localFilesStatic.ts`](frontend/src/api/localFilesStatic.ts) — direct `fetch` + manifest
- [`frontend/src/api/localFilesServer.ts`](frontend/src/api/localFilesServer.ts) — `/MGView/api/*`
- [`frontend/src/api/localFiles.ts`](frontend/src/api/localFiles.ts) — picks static vs server at build time
- [`frontend/src/api/runtimeMode.ts`](frontend/src/api/runtimeMode.ts) — `isStaticHosting`, `canPersistScenesToServer`
- [`frontend/scripts/generateStaticManifest.mjs`](frontend/scripts/generateStaticManifest.mjs) — precomputes `samples/` tree; uses `VITE_MGVIEW_APP_DIR` (must match the Vite build, not `MGVIEW_APP_DIR` alone)
- [`frontend/scripts/assembleSite.mjs`](frontend/scripts/assembleSite.mjs), [`previewSite.mjs`](frontend/scripts/previewSite.mjs) — GH Pages bundle + local preview server
- Full build/deploy reference: [`BUILD.md`](BUILD.md)

### Build outputs (important — do not mix)

| Script | Output | Mode | Used by |
|--------|--------|------|---------|
| `npm run build` | `frontend/dist/` | Server/API | `RunMGViewMac` → port **8000** |
| `npm run build:site` | `build/gh-pages/` | Static (GH Pages layout) | CI, `preview:site` |
| `npm run build:site:workspace` | `build/gh-pages-workspace/MGView/` | Static (workspace layout) | `preview:site:workspace` |
| `npm run build:release` | `build/release/mgview-*.zip` | Server + dist + samples | downloads |

Intermediate Vite output: `frontend/dist-pages/` (gitignored). Never commit `frontend/dist/` or `build/` unless project convention changes.

### Run commands

| Command | Port | URL (typical) |
|---------|------|----------------|
| `(cd frontend && npm run build) && ./RunMGViewMac` | 8000 | `http://localhost:8000/MGView/` |
| `npm run preview:site` | 8001 (`MGVIEW_STATIC_PORT`) | `http://localhost:8001/mgview/` |
| `npm run preview:site:workspace` | 8001 | `http://localhost:8001/MGView/` |
| `npm run preview` | 4173 (vite default) | **Not** a substitute for server — no API |

`RunMGViewMac` auto-opens the modern app (not `Examples.html`).

### GH Pages URL shape

- Site home (modern): [`https://mgview.github.io/mgview/`](https://mgview.github.io/mgview/)
- Legacy app: `https://mgview.github.io/mgview/legacy/`
- **Not** `/mgview/MGView/` — deployed site root is the app; `/MGView/` prefix is only for local parent-folder serving

GH Pages build: `VITE_MGVIEW_APP_DIR=` → scene paths `samples/...`. Workspace static preview: `VITE_MGVIEW_APP_DIR=MGView` → `MGView/samples/...`.

### Static demo UX (May 2026)

- **Dismissible demo notice** ([`DemoNotice.tsx`](frontend/src/components/DemoNotice.tsx)) — fixed overlay; `localStorage` key `mgview-demo-notice-dismissed`
- **Save / Save As / New… disabled** when `canPersistScenesToServer` is false; copy JSON from inspector if needed
- **Toasts** ([`ToastStack.tsx`](frontend/src/components/ToastStack.tsx)) — success auto-dismiss; errors until dismissed; no persistent “Loaded …” header line
- **Load overlay on static** — [`SampleSceneGallery.tsx`](frontend/src/components/SampleSceneGallery.tsx) (grouped tiles); **no** workspace `LocalFileBrowser` on static load (deployed tree ≠ dev workspace). Direct path field still works.
- **Manifest fix** — `generateStaticManifest.mjs` reads `VITE_MGVIEW_APP_DIR` and uses synthetic site root (`samples/`, `assets/`) for GH Pages so `samples/...` browse works in Sim Files overlay
- **Optional follow-up:** real sample thumbnails via build-time captures → `assets/sample-thumbs/`

## What Works Today

### Legacy app

Verified to work through the unified Node server on macOS:

- [`http://localhost:8000/MGView/legacy/Examples.html`](http://localhost:8000/MGView/legacy/Examples.html) (redirects from old `/MGView/Examples.html`)
- [`http://localhost:8000/MGView/legacy/MGView.html`](http://localhost:8000/MGView/legacy/MGView.html)

The legacy jQuery app is not blocked by the new frontend work.

### Modern app routes

Served through the same Node server:

- main app: [`http://localhost:8000/MGView/`](http://localhost:8000/MGView/)
- simple preserved app: [`http://localhost:8000/MGView/simple`](http://localhost:8000/MGView/simple)

### Modern frontend capabilities

The modern app currently supports:

- loading real MGView scene JSON files
- creating a new local scene JSON from the modern app without overwriting an existing file
- saving a loaded scene in place or through `Save As...` from the modern header
- loading real simulation text files
- browsing local folders through the Node file API
- double-click scene loading from the local scene browser
- typed normalization of scene data
- frame/object inference from simulation channels
- span evaluation and editing for non-rigid connectors between points
- diagnostics about inferred/defaulted scene structure
- live simulation-file editing through the modern app, with channel reparse and inferred-object updates driven from draft `simulationData`
- browser-first simulation-file selection with normal single-select plus modifier-key multi-select, explicit clear-selection, and batch add
- per-file simulation-channel inspection, including grouped display for common 12-channel position/matrix files
- object and visual inspection
- span creation, selection, rename, deletion, endpoint editing, endpoint reversal, visual add/delete/rename, and per-visual editing
- local draft editing of:
  - scene name
  - renderer `backgroundColor`
  - workspace size
  - showAxes
  - cameraParentFrame
  - cameraUp
  - cameraEye
  - cameraFocus
  - speedFactor
  - visual visibility
  - visual material/color through a richer picker
  - visual position/rotation
  - rotation frame
  - geometry type
  - visual add/delete/rename
  - common visual scalar properties like `text`, `path`, `scale`, `radius`, `length`, `thickness`, `capped`
- local draft editing of span visuals including:
  - `line`, `cylinder`, and simple `spring`
  - line color and solid/dashed style
  - cylinder width
  - spring `naturalLength`, `coilWidth`, `stretchWidth`
  - separate coil and stretch colors
  - per-visual visibility through an eye toggle
- type-specific geometry properties such as:
  - `size` for boxes
  - segment counts
  - grid `cell_size`, `count_x`, and `count_y`
- undo/redo for modern-editor scene changes
  - header undo/redo buttons
  - `Cmd/Ctrl+Z`, `Cmd/Ctrl+Shift+Z`, and `Cmd/Ctrl+Y`
  - numeric-box dragging grouped into a single undoable action
- save scene JSON back in place through the local server
- guard against accidentally discarding unsaved local edits when opening another scene
- preserve the selected scene in the URL query string
- a modern `three` renderer slice for:
  - `basis`
  - `text`
  - `sphere`
  - `box`
  - `cylinder`
  - `cone`
  - `torus`
  - `grid`
  - `mesh`
- a modern span renderer slice for:
  - `line`
  - `cylinder`
  - simple stretched `spring`
- texture-backed legacy material presets like:
  - `CHECKERBOARD`
  - `METAL`
  - `DIRT`
  - `FOIL`
  - `WATER`
  - `GRASS`
  - `LAVA`
  - `MOON`
  - `EARTH`
- timeline playback with scrubber, play/pause, reset, and editable speed
- keyboard spacebar play/pause outside text-entry contexts
- scene-relative OBJ/STL asset loading for mesh visuals
- save/load of scene-level renderer background color through JSON
- non-render warning behavior for authored objects that have no usable simulation anchor, while still keeping the newtonian/base frame renderable without explicit sim channels
- brighter modern renderer lighting closer to the legacy MGView presentation
- default point marker creation when a point has no authored visuals, using a sphere visual named `point`
- default basis creation for frames only when they have no authored visuals at all
- honoring legacy-style `showBasis` / `showLabel` flags only in the default-visual fallback path, not as a separate active rendering system

### Modern workspace UI

The main route now behaves like a compact editor workspace.

Current `/MGView/` layout:

- a compact scene header strip
  - scene name on the upper left
  - scene path tucked underneath
  - undo/redo icon buttons on the right
  - split `Load…` with dropdown actions for `Reload` and `New…` (`New…` disabled on static demo)
  - `Diagnostics` (warning count badge), `Sim Files`, and split `Save` on the right (Save disabled on static demo)
  - unsaved `•` on scene title; transient toasts bottom-right (no permanent status line under buttons)
- a center workspace with:
  - renderer as the primary visual area on the left
  - playback bar directly under the renderer
- a single right-side rail:
  - grouped object list in a narrower objects column
  - `Visual Editor`, `Scene Settings`, and `JSON Editor` beside it
  - a single collapse handle between the renderer and the combined right rail
  - independent scrolling for the rail panes
- overlays for:
  - file loading / sample selection (static: tile gallery; local: breadcrumb browser + collapsible sample list)
  - file creation from a default local scene template
  - diagnostics
  - simulation files / channel inspection

Other current UI notes:

- the top collapse toolbar was removed
- diagnostics and simulation-file/channel inspection no longer live in the main workspace
- the renderer panel title/copy was removed so the 3D surface starts immediately
- orbit-control damping/inertia was removed
- `Escape` now acts as a general return-to-neutral key:
  - closes overlays/modal panels
  - blurs focused controls such as buttons, number fields, text inputs, dropdowns, and the playback scrubber
  - clears current object/span selection when appropriate so spacebar can play again
- the app now mounts a stable loading shell so the workspace footprint appears immediately on initial load
- the scene load/create/save-as flow lives in a dedicated overlay composed from path entry, a breadcrumb local browser, and sample shortcuts
- the scene loader local browser filters to directories plus `.json` files
- the create/load overlays are narrower and denser now, with single-column scrollable folder contents rather than wide multi-column cards
- create/save-as use filename-only entry within the currently browsed folder instead of editing the full path
- the sim-files overlay combines expanded files and parsed channels into one grouped view
- the sim-files overlay is also narrower now, with compact single-column file browsing and collapsible channel previews
- sim-file picking is now browser-first; manual path entry still exists, but is tucked behind an advanced toggle
- plain click in the sim-files browser replaces selection; modifier-key click extends/toggles selection; `Add Selected` becomes the primary action when files are queued
- the visual editor now behaves more like a compact geometry/material tool than a read-only inspector echo
- the JSON tab remains preview-only, but now includes a `Copy JSON` action for quick clipboard export
- `Ctrl+S` / `Cmd+S` trigger the in-app save action instead of the browser default

### Preserved simple route

`/simple` still exists as the stable baseline UI while `/` continues to evolve.

Right now:

- [`frontend/src/SimpleApp.tsx`](frontend/src/SimpleApp.tsx) is the preserved simple app
- [`frontend/src/App.tsx`](frontend/src/App.tsx) is the main evolving app, not a temporary fork

## Extracted Core So Far

Current extracted modules:

- [`pathUtils.ts`](frontend/src/core/pathUtils.ts)
- [`expandSimulationFiles.ts`](frontend/src/core/expandSimulationFiles.ts)
- [`parseSimulationText.ts`](frontend/src/core/parseSimulationText.ts)
- [`simulationChannels.ts`](frontend/src/core/simulationChannels.ts)
- [`timeline.ts`](frontend/src/core/timeline.ts)
- [`inferObjects.ts`](frontend/src/core/inferObjects.ts)
- [`sceneDocument.ts`](frontend/src/core/sceneDocument.ts)
- [`sceneEvaluation.ts`](frontend/src/core/sceneEvaluation.ts)
- [`sceneInspector.ts`](frontend/src/core/sceneInspector.ts)
- [`types.ts`](frontend/src/core/types.ts)

Current extracted hooks/controllers:

- [`useSceneWorkspace.ts`](frontend/src/hooks/useSceneWorkspace.ts)
  - owns scene loading, local browsing, save/revert, draft state, unsaved-change confirmation, URL sync, and object/visual selection seed state
- [`useWorkspaceShell.ts`](frontend/src/hooks/useWorkspaceShell.ts)
  - owns shell-level overlay state, load/create/save-as actions, rail collapse state, camera preview/commit plumbing, and simulation-entry add/remove behavior
- [`usePlaybackController.ts`](frontend/src/hooks/usePlaybackController.ts)
  - owns current time, play/pause, reset, and animation-frame playback advancement
- [`useSceneSelectionEditor.ts`](frontend/src/hooks/useSceneSelectionEditor.ts)
  - owns object/visual selection derivation plus visual CRUD and visual-type changes
- [`useSceneSpanEditor.ts`](frontend/src/hooks/useSceneSpanEditor.ts)
  - owns span selection derivation plus span/span-visual CRUD and rename behavior
- [`useInspectorSelectionState.ts`](frontend/src/hooks/useInspectorSelectionState.ts)
  - owns editor-tab mode plus object/span cross-selection coordination, neutral-state clearing, and selection handoff helpers for the list/editor shell

Current tests:

- [`sceneDocument.test.ts`](frontend/src/core/sceneDocument.test.ts)
- [`parseSimulationText.test.ts`](frontend/src/core/parseSimulationText.test.ts)
- [`sceneEvaluation.test.ts`](frontend/src/core/sceneEvaluation.test.ts)
- [`sceneGraph.test.ts`](frontend/src/rendering/sceneGraph.test.ts)
- [`useSceneWorkspace.test.ts`](frontend/src/hooks/useSceneWorkspace.test.ts)

Current renderer structure:

- renderer component: [`RendererPanel.tsx`](frontend/src/components/RendererPanel.tsx)
- axis helpers: [`axisHelpers.ts`](frontend/src/rendering/axisHelpers.ts)
- coordinate/viewer conventions: [`coordinateConvention.ts`](frontend/src/rendering/coordinateConvention.ts)
- mesh creation: [`meshFactory.ts`](frontend/src/rendering/meshFactory.ts)
- scene-graph assembly: [`sceneGraph.ts`](frontend/src/rendering/sceneGraph.ts)

Important architectural split:

- `core/` holds MGView semantics:
  - scene normalization
  - timeline lookup
  - inferred/evaluated object transforms
  - evaluated camera-parent semantics in scene coordinates
  - span evaluation for authored line/cylinder/spring connector semantics
- `rendering/` holds viewer-specific behavior:
  - scene-up canonicalization for human viewing / mouse semantics
  - Three.js helper glyphs, material creation, mesh/text creation, and asset loading
  - render-scene assembly for objects and spans

This split is intentional and should be preserved.

Current top-level app role:

- [`App.tsx`](frontend/src/App.tsx) is still the main composition root for `/MGView/`
- it now primarily wires together:
  - workspace hook state
  - shell hook state/actions
  - playback hook state
  - object/visual selection derivation
  - span selection derivation
  - inspector selection coordination
  - renderer/playback/layout composition
  - overlay rendering
- it is materially smaller again after the shell/selection extraction pass and is now closer to a real composition root than a monolithic shell controller
- as of this pass, [`App.tsx`](frontend/src/App.tsx) is about 505 lines, with shell behavior moved into [`useWorkspaceShell.ts`](frontend/src/hooks/useWorkspaceShell.ts) and cross-selection behavior moved into [`useInspectorSelectionState.ts`](frontend/src/hooks/useInspectorSelectionState.ts)

This is no longer the highest-priority shell cleanup target it was before.

## Known Current Issues

These are the main things a new agent should know are still unresolved or only partially resolved:

- **Two path conventions coexist**: modern uses `MGView/samples/...` (local) or `samples/...` (GH Pages); legacy uses `../samples/...` relative to `legacy/MGView.html`. Intentional — samples stay shared at repo root.
- **Static load UI** does not use the workspace file tree; use sample gallery or typed `samples/...` paths. Sim-file browse under `samples/` uses manifest (paths must match `VITE_MGVIEW_APP_DIR` at build time).
- **Curated samples** in [`App.tsx`](frontend/src/App.tsx) `SAMPLE_SCENES` are a subset of `samples/`; expand or generate from manifest.
- **`npm run preview`** (vite) is not a server substitute — missing `/MGView/api/*`.
- [`App.tsx`](frontend/src/App.tsx) is healthier now, but keyboard shortcuts plus final shell composition still live there and could eventually move into a thinner app-shell controller if needed
- the simulation-data overlay is much more useful than before, but it still contains MGView-specific presentation logic that could eventually be factored or tested more explicitly if it grows further
- object rendering currently assumes authored objects without a usable simulation anchor should be hidden; that is deliberate for now, but it is also a product decision rather than a purely technical necessity
- the JSON tab is still a preview surface, not a true editable text editor
- span rendering is now useful enough for authoring, but line width still is not visually meaningful when rendered as a browser/WebGL line; only cylinder/spring widths are truly geometric
- the simple spring renderer is intentionally basic and only communicates stretch clearly today; richer compression/coil rendering is still future work

## Next Refactor Priority

### Git / branch status (May 2026)

**Branch:** `modern_app`

**Recent commits (handoff):**

| Commit | Summary |
|--------|---------|
| `7b533ab` | Build/deploy (`BUILD.md`, CI), textures → `assets/`, static UX (toasts, demo notice, sample gallery), manifest fix |
| `81271e1` | Legacy → `legacy/`, modern dist routing |
| `9664e52` | Workspace paths + static hosting shim |

**Working tree:** clean except optional untracked sample JSON (`samples/**/ball_in_tube2.json`, `fourbar2.json`, `robot_arm/**/new_scene*.json`, etc.) — add only if meant to ship.

**Always run after pull:** `cd frontend && npm install && npm test && npm run build` (`frontend/dist/` is not in git).

### Immediate (next agent)

1. ~~**Commit in-flight path + static work**~~ — done on `modern_app`.
2. ~~**Legacy → `legacy/` migration**~~ — done May 2026.
3. ~~**Static demo UX + manifest path alignment**~~ — done May 2026 (see Static demo UX above).
4. **Merge `modern_app` → `master`** when ready; confirm `.github/workflows/pages.yml` deploy.
5. **In-app "Open workspace…"** — `POST /MGView/api/workspace`, persist config, default MotionGenesis layout as suggestion.
6. **Legacy feature audit** vs modern inspector; expand `SAMPLE_SCENES` or manifest-driven catalog.
7. Keep tightening workspace density / plotting panels (P1 below).

Immediate focus for the next agent (product):

- keep tightening the workspace density and interaction polish toward a more professional tool feel
- add docked plotting panels in the modern workspace as the next major capability after undo, likely as a right-side alternative to the combined object/editor rail
- decide whether the first plotting pass should live in a dedicated overlay or directly in the main right-side workspace rail
- decide whether keyboard-shortcut handling should remain in [`App.tsx`](frontend/src/App.tsx) or move into a thin app-shell hook now that overlays/layout/selection coordination are already extracted
- preserve the current `core/` and `rendering/` split while making the editor shell more modular

P1:

- add docked plotting panels in the modern workspace, likely as a right-side alternative to the combined object/editor rail, so users can graph arbitrary simulation channel data from loaded files either as one-or-more channels versus time or as two-channel parametric plots
- decide the first plotting UX:
  - whether channel picking starts from loaded simulation files or from a plot-first panel
  - whether multiple plot tabs/panels are needed immediately or can wait until after a single-panel first pass

P2:

- continue evolving the span system beyond the current first pass so the editor/renderer model can handle additional constructs cleanly
- add arrow-style span visuals/caps as a follow-on span-editor feature
- add damper-style span visuals as a follow-on span-editor feature
- allow user-controlled lighting in the modern renderer so local users can tune scene illumination without code changes
- add a `Record` action that captures playback to a `.webm` video from the modern renderer
- add the ability to save and recall named camera poses from a list in the modern workspace

P3:

- replace the JSON preview-only pane with a real text editor so users can make manual scene edits directly in the app
- add central scene/visual normalization and validation in `core/` so constraints such as nonnegative geometry sizes and integer segment counts are enforced on load/save/render paths too, not only in the editor UI
- consider a future authoring mode for objects with missing simulation data so their geometry can still be manually placed/edited instead of being hidden when no backing frame data exists
- add a rendered spring span visualization once span-type parameterization has settled, likely starting from a simple stretch/compressable canonical spring model rather than frame-by-frame bespoke geometry authoring

Current span-parameterization direction:

- keep span endpoints at the top level with `point1` and `point2`
- keep initial span visuals focused on:
  - `line`
  - `cylinder`
  - simple `spring`
- defer arrow-specific visuals and damper visuals to later follow-on work
- for `line`, support solid and dashed styling, with color-only material controls in the editor
- for `cylinder`, use a user-facing `width` parameter rather than radius; default internal tessellation should start at `segments_length = 2` and `segments_radius = 8` without exposing those controls yet
- for the simple `spring`, start with:
  - `naturalLength`
  - `coilWidth` for the middle section
  - `stretchWidth` for the stretch sections rendered from additional cylinders near the ends
  - separate coil and stretch materials/colors
  - default internal `segments_radius = 12`, not user-configurable initially
- a later `coil spring` mode/visual can add richer geometric spring parameters and fancier rendered helix behavior after the simpler spring model is proven useful

## Verification

Current verification commands:

- `cd frontend && npm test`
- `cd frontend && npm run build`

These should be run after any frontend or renderer change before wrapping up work.

After updating this doc, they should be rerun so the recorded status stays current.

## Local Runtime Workflow

For manual browser/runtime verification:

**Server (modern, full API):**

```bash
(cd frontend && npm run build) && ./RunMGViewMac
# http://localhost:8000/MGView/?scene=MGView/samples/particle_pendulum/particle_pendulum.json
```

**Static preview (compare with server):**

```bash
cd frontend && MGVIEW_STATIC_PORT=8765 npm run preview:site
# http://localhost:8765/mgview/
```

Implications:

- do not assume the assistant should start or stop the server by default
- always run `npm test` and `npm run build` after frontend changes
- `preview:site` rebuilds static output under `build/gh-pages/`; server mode still uses `frontend/dist/` from `npm run build`
