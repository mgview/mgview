# MGView In-Place Modernization

Handoff doc for the local-file MGView rewrite. Longer-term cloud direction lives in
[`docs/mgview-modernization-plan.md`](../docs/mgview-modernization-plan.md).

## Resume here (May 2026)

**You are about to rename the clone folder** from `MGView` → `mgview` and open a fresh Cursor window. After rename, paths below apply; until then, macOS may still resolve `MGView/...` in query strings while URL browsing requires `/mgview/` (see [Path model](#path-model)).

| Item | State |
|------|--------|
| **Upstream** | PR [#5](https://github.com/mgview/mgview/pull/5) merged to `master` (May 2026) |
| **Branch** | `more_modern_work` off `master` |
| **Live demo** | https://mgview.github.io/mgview/ (modern), https://mgview.github.io/mgview/legacy/ (legacy) |
| **CI** | `.github/workflows/pages.yml` — PRs run build+test; deploy only on push to `master` |
| **Pages settings** | Source = GitHub Actions; `github-pages` environment allows `master` only |

**Uncommitted on `more_modern_work` (commit before or after rename):**

- Lowercase URL/app-dir cleanup (`mgview` everywhere; release zip top-level `mgview/`)
- Legacy texture paths → `../assets/textures/...` (shared with modern app; `legacy/app/textures/` not in git)
- Removed obsolete `/mgview/modern/` and top-level legacy redirects from `server.js`

**Optional untracked samples** (add only if meant to ship): `samples/**/ball_in_tube2.json`, `fourbar2.json`, `robot_arm/**/new_scene*.json`, etc.

**After pull / new session:**

```bash
cd frontend && npm install && npm test && npm run build
```

(`frontend/dist/` is gitignored.)

**Immediate next step for you:** rename repo directory to `mgview` under the workspace parent, then reopen Cursor there.

```text
workspace/              ← PROJECT_ROOT (parent of repo)
  mgview/               ← repo (rename from MGView)
  my_sim_folder/        ← sibling sim data
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

One lowercase **web prefix**: **`/mgview/`** (product name in UI can still say "MGView"). That prefix is a fixed app mount in the browser — it is **not** required to equal the install folder name on disk.

### Today (until workspace selection)

The server maps URL paths onto `PROJECT_ROOT` + pathname, so the install folder must currently be named **`mgview`** (rename pending). Scene paths in the modern app use an **`APP_DIR` prefix** (`mgview/samples/...`) on local server builds; GH Pages already uses app-relative paths.

| Context | App URL | Scene path in JSON / `?scene=` |
|---------|---------|--------------------------------|
| Local Node server | `http://localhost:8000/mgview/` | `mgview/samples/particle_pendulum/particle_pendulum.json` |
| Static preview | `http://localhost:8001/mgview/` | GH layout: `samples/...`; workspace build: `mgview/samples/...` |
| GitHub Pages | `https://mgview.github.io/mgview/` | `samples/...` |
| API | `/mgview/api/*` | paths in `path` query param (today: under `PROJECT_ROOT`) |

**Bundled samples today (local):** HTTP URL  
`http://localhost:8000/mgview/samples/...`  
→ filesystem `PROJECT_ROOT/mgview/samples/...` (same tree as the repo).

**Legacy app** ([`legacy/MGView.html`](legacy/MGView.html)): scene query `path=samples/...` is relative to the legacy page dir (`../samples/...` on disk). Textures: **`../assets/textures/...`** ([`assets/`](assets/) at repo root).

**macOS quirk:** APFS is often case-insensitive, so `?scene=MGView/samples/...` may work before rename while `http://localhost:8000/MGView/` fails (routes use exact `/mgview/` string match).

Key files today: [`workspacePaths.ts`](frontend/src/core/workspacePaths.ts), [`deployConfig.mjs`](frontend/scripts/deployConfig.mjs), [`bin/server.js`](bin/server.js), [`localFilesServer.ts`](frontend/src/api/localFilesServer.ts), [`BUILD.md`](BUILD.md).

### Target: configurable workspace (not implemented)

Workspace selection should **not** reintroduce two path conventions. It should **drop the `APP_DIR` prefix** locally and match GH Pages: scene files use **app-relative** paths (`samples/...`, `assets/...`), while user sim data uses **workspace-relative** paths (`my_sim_folder/run.1`).

**Two filesystem roots** (decoupled from folder names like `mgview-v0.2`):

| Root | Example on disk | Contents |
|------|-----------------|----------|
| **App root** | `.../mgview-v0.3/` (any install folder name) | shipped `samples/`, `assets/`, `frontend/dist/`, `legacy/` |
| **Workspace root** | `.../MotionGenesis/` (user-selected) | sibling sim folders; may contain **multiple** app installs |

```text
MotionGenesis/                 ← workspace root (user picks)
  mgview-v0.2/                 ← app root A
  mgview-v0.3/                 ← app root B
  my_sim_folder/
  another_sim/
```

**One path language, server picks the root:**

| Logical path | Resolved under | Example |
|--------------|----------------|---------|
| `samples/...`, `assets/...`, `bundled/...` | **app root** | shipped demo scenes |
| anything else (e.g. `my_sim_folder/run.1`) | **workspace root** | user data beside the app |

Scene JSON and `?scene=` should **not** embed the install folder name (`mgview-v0.3/samples/...`). Each install uses `samples/...` relative to itself. Trying two versions side by side = two app roots under one workspace (or two server instances), not two different path schemes.

**URLs for shipped samples (local, future):** still under the app mount, **not** under the user workspace:

`http://localhost:8000/mgview/samples/particle_pendulum/particle_pendulum.json`

- `/mgview/` → configured **app root** for this running instance
- `samples/...` → `APP_ROOT/samples/...` even though that directory is **not** inside the workspace folder the user selected
- Same logical path as GH Pages; only the server’s root mapping changes

**GH Pages (unchanged):** the deployed site *is* the app bundle, so shipped samples stay  
`https://mgview.github.io/mgview/samples/...` with no workspace concept.

**Implementation sketch:** `POST /mgview/api/workspace` + persist `~/.mgview/config.json`; server holds `WORKSPACE_ROOT` and `APP_ROOT`; route `/mgview/*` static/API from `APP_ROOT`; resolve API `path=` by prefix (`samples/`, `assets/` → app, else → workspace). Drop default `VITE_MGVIEW_APP_DIR=mgview` for local builds when this lands.

---

## Run commands

| Goal | Command | URL |
|------|---------|-----|
| Local server (full API) | `(cd frontend && npm run build) && ./RunMGViewMac` | `http://localhost:8000/mgview/` |
| Static preview (GH layout) | `cd frontend && npm run preview:site` | `http://localhost:8001/mgview/` |
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

Static shim: `VITE_MGVIEW_STATIC=true`. GH Pages build uses empty `VITE_MGVIEW_APP_DIR`; server/workspace builds use `mgview`.

---

## Repo layout

```text
mgview/                 ← repo (APP_DIR)
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

Tests: `cd frontend && npm test` (core, rendering, hooks).

---

## Static / GH Pages

- Deploy: push to `master` → Actions workflow deploys `build/gh-pages/`
- Static demo: bundled samples only; sample gallery in load overlay; no server file browser
- [`DemoNotice.tsx`](frontend/src/components/DemoNotice.tsx), [`SampleSceneGallery.tsx`](frontend/src/components/SampleSceneGallery.tsx)
- Manifest: [`frontend/scripts/generateStaticManifest.mjs`](frontend/scripts/generateStaticManifest.mjs)

---

## Known issues / gaps

- **Rename pending:** clone folder must be `mgview` for local URL browsing to match today’s disk layout (see [Target: configurable workspace](#target-configurable-workspace-not-implemented)).
- **Two scene path shapes (temporary):** `mgview/samples/...` (local) vs `samples/...` (GH Pages) — converges to app-relative `samples/...` everywhere when workspace selection ships.
- **Static load UI:** no workspace tree; gallery or typed paths only.
- **`SAMPLE_SCENES` in App.tsx:** curated subset; could be manifest-driven.
- **JSON tab:** preview + copy only, not a real editor.
- **Span line width:** not geometric in WebGL lines; cylinders/springs are.
- **Objects without sim anchors:** hidden by design for now.

---

## Next work (product)

1. **In-app "Open workspace…"** — two-root model above (`APP_ROOT` + `WORKSPACE_ROOT`); `POST /mgview/api/workspace`, persist config.
2. **Plotting panels** — docked charts for sim channels (time series / parametric).
3. Legacy feature audit vs modern inspector; expand sample catalog.
4. Continue workspace density / editor polish (keyboard shortcuts could move out of `App.tsx`).

**P2+ (later):** arrow/damper spans, user lighting, video record, named camera poses, real JSON editor, validation in `core/`, richer spring rendering.

Span direction (unchanged): endpoints `point1`/`point2`; visuals `line` | `cylinder` | simple `spring` with documented width/color params; arrows/dampers deferred.

---

## Verification

```bash
cd frontend && npm test && npm run build
```

Rerun after frontend/renderer changes. For static parity: `npm run preview:site` and compare with server build.
