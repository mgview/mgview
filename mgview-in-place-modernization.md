# MGView In-Place Modernization

Handoff doc for the local-file MGView rewrite. Longer-term cloud direction lives in
[`docs/mgview-modernization-plan.md`](../docs/mgview-modernization-plan.md).

## Resume here (May 2026)

| Item | State |
|------|--------|
| **Next implementation** | Plotting panels; manifest thumbnails; workspace/editor polish (see [Next work](#next-work-product)) |
| **Recently shipped** | [Scene sources split](mgview-scene-sources-split.md) — `?sample=` / `?scene=`, API `root=`, Samples/Load UX, `samples-manifest.json` |
| **Branch** | `master` — workspace picker, scene-sources split, server workspace sync fixes |
| **Prior** | lowercase URL/app-dir cleanup merged in PR [#6](https://github.com/mgview/mgview/pull/6) |
| **Live demo** | https://mgview.github.io/mgview/ (modern), https://mgview.github.io/mgview/legacy/ (legacy) |
| **CI** | [`.github/workflows/ci.yml`](.github/workflows/ci.yml) — PRs: test + static build only |
| **Pages deploy** | [`.github/workflows/pages.yml`](.github/workflows/pages.yml) — push to `master` or `workflow_dispatch` only |
| **Pages settings** | Source = GitHub Actions; `github-pages` environment allows `master` only |

**After pull / new session:**

```bash
cd frontend && npm install && npm test && npm run build
```

(`frontend/dist/` is gitignored.)

**Workspace layout** (default workspace root = parent of app install; set via picker or `~/.mgview/config.json`):

```text
~/projects/             ← example WORKSPACE_ROOT
  mgview/               ← repo clone (folder name arbitrary; browser mount stays /mgview/)
  my_sim_folder/        ← sibling sim data — list with Load… at `.`
```

---

## Direction

Modernize in place: keep legacy jQuery app working, build React replacement beside it.

- [`frontend/src/App.tsx`](frontend/src/App.tsx) — main app (local `/mgview/`, GH Pages site root)
- [`frontend/src/SimpleApp.tsx`](frontend/src/SimpleApp.tsx) — preserved baseline at `/mgview/simple` (local) and `/simple` (GH Pages)
- [`legacy/`](legacy/) — reference jQuery app; not the active product surface

Renderer: current stable `three`; simulation-driven transforms at time `t` (not free-form pose authoring yet). `../frame_viz` is inspiration only for future authoring modes.

---

## Path model

One lowercase **web prefix**: **`/mgview/`** (product name in UI can still say "MGView"). That prefix is a fixed app mount in the browser — it is **not** required to equal the install folder name on disk (future workspace work will decouple them further).

### Path & scene model (current)

**Two filesystem roots** on the local Node server:

| Root | On disk | API access |
|------|---------|------------|
| **App root** | MGView install (`bin/../`) | `root=sample` or `root=app`; static URLs `/mgview/samples/…`, `/mgview/assets/…` |
| **Workspace root** | `~/.mgview/config.json` (default: parent of app) | `root=workspace` (default) |

Config: `~/.mgview/config.json`. API: `GET`/`POST` `/mgview/api/workspace`. UI: header **Workspace:** → picker ([`useServerWorkspace.ts`](frontend/src/hooks/useServerWorkspace.ts)). Workspace must be **outside** the app install (invalid paths auto-reset on server start).

**Server keeps roots in sync:** every `/mgview/api/*` call runs `syncWorkspaceRootsFromConfig_`; workspace POST uses `persistWorkspaceRoot_` ([`bin/server.js`](bin/server.js)). No server restart needed after changing workspace.

**Scene URLs** ([`sceneRef.ts`](frontend/src/core/sceneRef.ts)) — no legacy `?scene=samples/…`:

| Query | Meaning |
|-------|---------|
| `?sample=particle_pendulum/particle_pendulum.json` | bundled sample (path without `samples/` prefix) |
| `?scene=my_sim_folder/scene.json` | workspace-relative scene |

Gallery: [`samples-manifest.json`](samples-manifest.json) via [`samplesManifest.ts`](frontend/src/core/samplesManifest.ts). Hidden samples: omit from manifest; load via `?sample=…` if file exists.

**UI:** **Load…** = workspace browser at `.` only; **Samples…** = manifest gallery ([`SamplesOverlay.tsx`](frontend/src/components/SamplesOverlay.tsx)). Details: [`mgview-scene-sources-split.md`](mgview-scene-sources-split.md).

| Context | App URL | Deep link |
|---------|---------|-----------|
| Local Node server | `http://localhost:8000/mgview/` (use trailing slash; server redirects `/mgview` → `/mgview/`) | `?sample=…` or `?scene=…` |
| GitHub Pages | `https://mgview.github.io/mgview/` | `?sample=…` only (no workspace API) |

**List/file API:** `GET /mgview/api/list?root=workspace|sample&path=…` (see [`BUILD.md`](BUILD.md)).

**Legacy app** ([`legacy/MGView.html`](legacy/MGView.html)): `path=samples/...` relative to legacy page dir. Textures: `../assets/textures/...`.

**Key files:** [`sceneRef.ts`](frontend/src/core/sceneRef.ts), [`samplesManifest.ts`](frontend/src/core/samplesManifest.ts), [`workspacePaths.ts`](frontend/src/core/workspacePaths.ts), [`bin/workspaceRoots.js`](bin/workspaceRoots.js), [`bin/server.js`](bin/server.js), [`localFilesServer.ts`](frontend/src/api/localFilesServer.ts), [`useSceneWorkspace.ts`](frontend/src/hooks/useSceneWorkspace.ts), [`useServerWorkspace.ts`](frontend/src/hooks/useServerWorkspace.ts), [`assetPaths.ts`](frontend/src/api/assetPaths.ts).

**Windows launch:** [`bin/RunVisualizer.bat`](bin/RunVisualizer.bat) (shortcut `RunMGViewWindows.lnk`) — opens `http://localhost:8000/mgview/`, runs `node bin/server.js`. Requires `cd frontend && npm run build` after pulls.

**Legacy URLs:** `/mgview/legacy/…` works; `/MGView/…` and `/legacy/…` 301 to `/mgview/…`.

### Workspace layout note

The install folder name no longer has to be `mgview`; only the browser mount stays `/mgview/`. Multiple app installs can live under one workspace root; the running server always uses its own **app root** for `samples/` and `assets/`.

---

## Run commands

| Goal | Command | URL |
|------|---------|-----|
| Local server (full API) | `(cd frontend && npm run build) && ./RunMGViewMac` | `http://localhost:8000/mgview/` |
| Static preview (GH layout) | `cd frontend && npm run preview:site` | `http://localhost:8001/mgview/` |
| Static preview (custom port) | `MGVIEW_STATIC_PORT=8765 npm run preview:site` | `http://localhost:8765/mgview/` |
| Static preview (workspace layout) | `npm run preview:site:workspace` | `http://localhost:8001/mgview/` |
| Legacy examples | (server or static) | `.../mgview/legacy/Examples.html` |
| Legacy viewer | | `.../mgview/legacy/MGView.html` |

Do **not** use `npm run preview` (vite alone) as a stand-in — no file API.

### Build outputs (do not mix)

| Script | Output | Use |
|--------|--------|-----|
| `npm run build` | `frontend/dist/` | Local server |
| `npm run build:site` | `build/gh-pages/` | GH Pages CI + `preview:site` |
| `npm run build:site:workspace` | `build/gh-pages-workspace/mgview/` | `preview:site:workspace` |
| `npm run build:release` | `build/release/mgview-*.zip` | Downloads (`mgview/` top-level) |

Static shim: `VITE_MGVIEW_STATIC=true`. GH Pages + local server builds use empty `VITE_MGVIEW_APP_DIR`; only `build:static:workspace` sets `mgview` for parent-folder static preview.

After moving the repo clone or seeing stale static behavior, clear generated output and Vite cache:

```bash
cd frontend
rm -rf node_modules/.vite dist dist-pages ../build/gh-pages ../build/gh-pages-workspace
npm run build:site
```

---

## Repo layout

```text
mgview/                 ← repo (APP_DIR for local server builds)
  frontend/             ← React + Vite
  legacy/               ← jQuery app (GH Pages optional)
  samples/              ← shared sample scenes
  assets/textures/      ← shared textures (modern + legacy)
  bin/server.js
  RunMGViewMac
```

---

## Modern app — structure

| Area | Location |
|------|----------|
| Main UI | [`frontend/src/App.tsx`](frontend/src/App.tsx) (~505 lines, composition root) |
| Hooks | [`useSceneWorkspace`](frontend/src/hooks/useSceneWorkspace.ts), [`useWorkspaceShell`](frontend/src/hooks/useWorkspaceShell.ts), [`usePlaybackController`](frontend/src/hooks/usePlaybackController.ts), selection/span editors, [`useInspectorSelectionState`](frontend/src/hooks/useInspectorSelectionState.ts) |
| Core semantics | [`frontend/src/core/`](frontend/src/core/) — scene, timeline, inference, spans |
| Rendering | [`frontend/src/rendering/`](frontend/src/rendering/) — Three.js, meshes, scene graph |
| Components | [`frontend/src/components/`](frontend/src/components/) — workspace shell, overlays, editor panes |

**Workspace UX (summary):** compact header + renderer + playback strip + collapsible right rail (object list + visual/scene/JSON panes). Overlays for load/create, diagnostics, sim files. Undo/redo, toasts, static demo notice. Save disabled on static hosting.

**Capabilities:** load/save/create scenes via API; sim file browse/edit; span editing (line/cylinder/spring); material presets with textures; modern geometry types; URL scene sync; unsaved guards.

Tests: `cd frontend && npm test` (core, rendering, hooks). Tests run in Node directly — use `import.meta.env?.…` when reading Vite env vars (see [`runtimeMode.ts`](frontend/src/api/runtimeMode.ts), [`workspacePaths.ts`](frontend/src/core/workspacePaths.ts), [`assetPaths.ts`](frontend/src/api/assetPaths.ts)).

---

## Static / GH Pages

- **Deploy:** push to `master` → [`pages.yml`](.github/workflows/pages.yml) builds, uploads artifact, deploys `build/gh-pages/`
- **PR checks:** [`ci.yml`](.github/workflows/ci.yml) runs the same test + `build:site` without touching Pages
- **Static demo:** bundled samples only; **Samples…** gallery (not Load browser); no workspace file API
- **Demo banner:** [`DemoNotice.tsx`](frontend/src/components/DemoNotice.tsx) — shown on every page load on static hosting; Dismiss hides it until reload (not persisted)
- **Static file API:** [`localFilesStatic.ts`](frontend/src/api/localFilesStatic.ts) + manifest from [`generateStaticManifest.mjs`](frontend/scripts/generateStaticManifest.mjs)
- **Build-time static flag:** [`staticHostingFlagPlugin`](frontend/vite.config.ts) folds `isStaticHosting` in [`runtimeMode.ts`](frontend/src/api/runtimeMode.ts) to `true`/`false` for static vs server bundles (Vite env inlining alone was unreliable for that module)

---

## Known issues / gaps

- **Static hosting:** no workspace tree; samples via **Samples…** / `?sample=` only.
- **JSON tab:** preview + copy only, not a real editor.
- **Span line width:** not geometric in WebGL lines; cylinders/springs are.
- **Objects without sim anchors:** hidden by design for now.
- **No integration tests** for workspace POST + list/file API (unit tests only in `workspaceRoots.test.js`).

---

## Next work (product)

1. **Plotting panels** — docked charts for sim channels (time series / parametric).
2. Legacy feature audit vs modern inspector; expand [`samples-manifest.json`](samples-manifest.json).
3. Workspace / editor polish (keyboard shortcuts out of `App.tsx`; manifest thumbnails when ready).
4. Optional: integration tests for `/mgview/api/workspace` and `root=` list/file.

**P2+ (later):** arrow/damper spans, user lighting, video record, named camera poses, real JSON editor, validation in `core/`, richer spring rendering.

Span direction (unchanged): endpoints `point1`/`point2`; visuals `line` | `cylinder` | simple `spring` with documented width/color params; arrows/dampers deferred.

---

## Test coverage gaps (living list)

While the app is still changing quickly, we are **not** aiming for full coverage yet. Use this section to note gaps worth closing later; add rows as you find them.

**What runs today:** `cd frontend && npm test` — `core/`, `rendering/`, `hooks/`, `api/assetPaths.test.ts`, plus `bin/workspaceRoots.test.js` (path resolution only).

| Area | Has tests? | Gap / notes |
|------|------------|-------------|
| **Asset URLs / textures** | Partial — [`assetPaths.test.ts`](frontend/src/api/assetPaths.test.ts) checks `/mgview/` mount + one texture path | No build-time `VITE_MGVIEW_PUBLIC_BASE`; no HTTP 200 against `bin/server.js`; GH Pages / `preview:site:workspace` bases |
| **Workspace two-root paths** | Partial — [`workspaceRoots.test.js`](bin/workspaceRoots.test.js) | No HTTP integration tests; config must stay **outside** app install |
| **SceneRef / dual URL** | Yes — [`sceneRef.ts`](frontend/src/core/sceneRef.ts), tests | |
| **samples-manifest.json** | Yes — [`samplesManifest.ts`](frontend/src/core/samplesManifest.ts), gallery, GH Pages copy | Thumbnail field reserved |
| **Workspace UI** | Manual only | [`useServerWorkspace.ts`](frontend/src/hooks/useServerWorkspace.ts), picker; server `persistWorkspaceRoot_` / `syncWorkspaceRootsFromConfig_` |
| **Static hosting** | No | [`localFilesStatic.ts`](frontend/src/api/localFilesStatic.ts), manifest generation, demo-only load flows |
| **Server static routes** | No | `/mgview/samples/`, `/mgview/assets/`, `/mgview/bundled/` mapping in [`bin/server.js`](bin/server.js) |
| **App shell / overlays** | No | Load/create/save overlays, keyboard shortcuts in [`App.tsx`](frontend/src/App.tsx), playback + inspector integration |
| **Rendering / Three.js** | Partial — unit tests on scene graph / meshes | No visual/regression tests; texture load failures in [`meshFactory.ts`](frontend/src/rendering/meshFactory.ts) |

*Remove or shrink rows here once a gap is covered; link new test files in the “Has tests?” column when you add them.*

---

## Verification

```bash
cd frontend && npm test && npm run build
node --test bin/workspaceRoots.test.js
./RunMGViewMac   # http://localhost:8000/mgview/
```

**Scene sources:** `?sample=particle_pendulum/particle_pendulum.json`, `?scene=<workspace-relative>.json`; **Samples…** vs **Load…**; workspace list at `.` shows siblings of repo, not `samples/`.

**Workspace:** change path in picker → Load tree updates without restarting Node. Config at `~/.mgview/config.json`.

Rerun after frontend/renderer changes. Static parity: `npm run preview:site`.

---

## Handoff notes for a new agent

1. Read this file + [`mgview-scene-sources-split.md`](mgview-scene-sources-split.md) (implemented; checklist is done).
2. Uncommitted work may span scene-sources split, workspace server fixes, and `VITE_MGVIEW_BASE=/mgview/` — run `git status` / `git diff`.
3. **Do not** pass `{ showSuccess, showError }` as one object into hooks whose `useCallback` deps include it — causes infinite `GET /api/workspace` (see scene-sources-split post-fixes table).
4. Local server serves built app from `frontend/dist/` — run `npm run build` after frontend changes; open **`/mgview/`** (trailing slash).
5. Windows: [`bin/RunVisualizer.bat`](bin/RunVisualizer.bat) after `npm run build`.
