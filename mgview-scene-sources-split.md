# Scene sources split — implementation handoff

**Status: implemented** (May 2026). Parent context: [`mgview-in-place-modernization.md`](mgview-in-place-modernization.md).

Separates **bundled samples** from **user workspace** scenes in UI, URLs, and server list/file APIs. No legacy URL/path migration shims (`?scene=samples/…` is not supported).

---

## Goals (done)

1. **Samples** and **workspace** are separate in UI, URL, and server list/file APIs.
2. **Load…** modal = workspace only (browse starts at `.`).
3. **Samples…** header button = gallery only (server + static).
4. **`samples-manifest.json`** drives the gallery; optional `thumbnail` field reserved for later.
5. **Hidden samples** (not in manifest) load via `?sample=…` if the file exists under `samples/`.

---

## In-memory model

```ts
type SceneRef =
  | { source: 'sample'; path: string }    // relative to samples/, NO "samples/" prefix
  | { source: 'workspace'; path: string }; // relative to workspace root only
```

Module: [`frontend/src/core/sceneRef.ts`](frontend/src/core/sceneRef.ts) (+ [`sceneRef.test.ts`](frontend/src/core/sceneRef.test.ts))

| Function | Behavior |
|----------|----------|
| `parseSceneRefFromUrl(searchParams)` | `sample` → sample ref; `scene` → workspace ref; if both, `sample` wins; if neither → default sample from manifest |
| `buildSceneUrl` / `syncSceneRefToUrl` | `?sample=…` or `?scene=…` (mutually exclusive) |
| `resolveApiFilePath(ref)` | sample → `samples/${path}`; workspace → path as-is |
| `getSceneBasePath(ref)` | Sim file expansion base directory |
| `resolveApiFileRequest(filePath)` | Maps `samples/…` paths to `root=sample` for sim file loads |

**Default startup:** no query → [`getDefaultSampleSceneRef()`](frontend/src/core/samplesManifest.ts) (`particle_pendulum/particle_pendulum.json` when present in manifest).

**Removed:** `normalizeScenePath`, `bundledSamplePath`, `DEFAULT_SCENE_PATH` from [`workspacePaths.ts`](frontend/src/core/workspacePaths.ts) (only `APP_DIR` / `workspacePath` remain for static workspace-layout preview).

---

## URL contract

| Query | Meaning | Example |
|-------|---------|---------|
| `sample` | File under app `samples/` | `?sample=babyboot/chaotic/babyboot.json` |
| `scene` | File under workspace root | `?scene=ME328/run_01/scene.json` |

---

## UI

| Control | Behavior |
|---------|----------|
| **Load…** | [`LoadSceneOverlay.tsx`](frontend/src/components/LoadSceneOverlay.tsx) — workspace browser only (`root=workspace`, path `.`) |
| **Samples…** | [`SamplesOverlay.tsx`](frontend/src/components/SamplesOverlay.tsx) + [`SampleSceneGallery.tsx`](frontend/src/components/SampleSceneGallery.tsx) from manifest |
| **Create / Save As** | Stay in Load overlay (server only) |

[`SampleShortcutPanel.tsx`](frontend/src/components/SampleShortcutPanel.tsx) — **deleted** (was embedded in Load flow).

[`useWorkspaceShell.ts`](frontend/src/hooks/useWorkspaceShell.ts): **Load** always `handleBrowse('.', 'workspace')`; **Samples** uses `samplesOverlayOpen` + `handleOpenSamplePath`.

---

## Manifest

- File: [`samples-manifest.json`](samples-manifest.json) (repo root)
- Loader: [`frontend/src/core/samplesManifest.ts`](frontend/src/core/samplesManifest.ts) (build-time import)
- Copied to static site: [`frontend/scripts/assembleSite.mjs`](frontend/scripts/assembleSite.mjs)
- Emitted on static Vite build: [`frontend/vite.config.ts`](frontend/vite.config.ts) (`samples-manifest.json` asset)

---

## Server API

Explicit **`root`** on list/file ([`bin/workspaceRoots.js`](bin/workspaceRoots.js), [`bin/server.js`](bin/server.js)):

| `root` | `path=` resolved under |
|--------|-------------------------|
| `workspace` (default) | `WORKSPACE_ROOT` from config |
| `sample` | `APP_ROOT/samples/` |
| `app` | `APP_ROOT` |

Examples:

- `GET /mgview/api/list?root=workspace&path=.`
- `GET /mgview/api/list?root=sample&path=particle_pendulum`
- `GET /mgview/api/file?root=workspace&path=my_sim/scene.json`

Workspace `path=` must not start with `samples/`, `assets/`, etc.; `..` rejected.

**Static HTTP** (unchanged): `/mgview/samples/…`, `/mgview/assets/…` via [`resolveUrlAssetPath`](bin/workspaceRoots.js) in [`server.js`](bin/server.js).

**URL asset paths** still use prefix rules (`samples/`, `assets/`, …) — separate from API `root=`.

Frontend: [`frontend/src/api/localFilesServer.ts`](frontend/src/api/localFilesServer.ts) — all fetches use `cache: 'no-store'`.

---

## Workspace config & server lifecycle (important for agents)

Config: `~/.mgview/config.json` → `{ "workspaceRoot": "/absolute/path" }`.

| API | Behavior |
|-----|----------|
| `GET/POST /mgview/api/workspace` | Read/write config; POST validates path exists and is outside app install |
| Every `/mgview/api/*` request | [`syncWorkspaceRootsFromConfig_`](bin/server.js) reloads in-memory roots from disk |
| `POST` workspace | [`persistWorkspaceRoot_`](bin/server.js) writes config **and** sets `this.workspaceRoot` immediately |

**Do not** rely on `reloadWorkspaceRoots()` inside `fs.stat` callbacks without a captured `servlet` reference — async `this` was broken; fixed May 2026.

After changing workspace in the UI, list/file should update **without** restarting the server. If not, check `bin/server.js` has `syncWorkspaceRootsFromConfig_` + `persistWorkspaceRoot_`.

---

## Post-implementation fixes (May 2026)

| Issue | Fix |
|-------|-----|
| Bundled assets 403 at `/bundled/…` | Server build uses `VITE_MGVIEW_BASE=/mgview/`; redirect `/mgview` → `/mgview/` |
| Workspace POST looked saved but list unchanged until server restart | `persistWorkspaceRoot_` + per-request `syncWorkspaceRootsFromConfig_` |
| Stale file tree after workspace change | API `cache: 'no-store'`; clear listing on browse; await browse after Apply |
| Old tabs spamming `GET /api/workspace` | Pass `showSuccess`/`showError` separately to `useServerWorkspace`, not `{ showSuccess, showError }` object in deps |

---

## Checklist (completed)

### Core / API

- [x] `frontend/src/core/sceneRef.ts` + tests
- [x] `frontend/src/core/samplesManifest.ts` + tests
- [x] `frontend/src/hooks/useSceneWorkspace.ts` — `SceneRef`, URL sync, API paths
- [x] `frontend/src/api/localFilesServer.ts` — `root` query param, `cache: 'no-store'`
- [x] `bin/workspaceRoots.js` + `bin/server.js` — explicit roots; `bin/workspaceRoots.test.js`
- [x] `assembleSite.mjs` + Vite static build copy `samples-manifest.json`

### UI

- [x] `App.tsx` — manifest + Load / Samples overlays
- [x] `SceneHeaderBar.tsx` — Load / Samples buttons
- [x] `useWorkspaceShell.ts` — `samplesOverlayOpen`, browse `.` on load
- [x] `LoadSceneOverlay.tsx`, `SamplesOverlay.tsx`
- [x] `SampleShortcutPanel` removed

### Docs

- [x] `mgview-in-place-modernization.md`, `BUILD.md`

---

## Verification

```bash
cd frontend && npm test && npm run build
node --test bin/workspaceRoots.test.js
./RunMGViewMac   # http://localhost:8000/mgview/
```

Manual checks:

- Workspace list at `.` shows MotionGenesis siblings, not `samples/`.
- **Samples…** gallery loads; **Load…** is workspace-only.
- `?sample=` and `?scene=` deep links work.
- Change workspace in picker → Load tree updates without server restart.
- `?sample=hidden_folder/experiment.json` loads if file exists (gallery optional).

---

## Out of scope

- Thumbnail screenshots (manifest field only).
- Plotting panels.
- Legacy jQuery URL updates (legacy keeps `path=../samples/…`).
