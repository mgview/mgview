# Build and deploy

This repo is **source-only**. Built output lives under `build/` (gitignored) and is produced on demand.

Handoff docs:

- [dev/mgview-in-place-modernization.md](dev/mgview-in-place-modernization.md) — product status, code map, gaps, **start here for new agents**
- [frontend/DESIGN-NOTE.md](frontend/DESIGN-NOTE.md) — UI stack, Tailwind/shadcn conventions
- [dev/mg-lab-workspace-run-parity.md](dev/mg-lab-workspace-run-parity.md) — Sim Editor, MGLab, shared run shell
- [dev/mgview-pty-output-normalization.md](dev/mgview-pty-output-normalization.md) — Motion Genesis PTY runner, `MGVIEW_MOTION_GENESIS_BIN`
- [dev/todo_tracker.md](dev/todo_tracker.md) — open tasks

## Three outputs

| Output | Command | Used for |
|--------|---------|----------|
| **Server app** | `cd frontend && npm run build` | Local Node server (launchers below) — full API, workspace read/write, Motion Genesis runs |
| **GitHub Pages site** | `cd frontend && npm run build:site` | https://mgview.github.io/mgview/ — static demo, bundled samples (read-only) |
| **Release zip** | `cd frontend && npm run build:release` | User download — server + compiled app + samples (no legacy) |

All assembly logic is in `frontend/scripts/`. Shared constants: `deployConfig.mjs`.

Every `build*` script runs `build:info` first, which writes `frontend/src/generated/buildInfo.ts` and `bin/VERSION` from [frontend/package.json](frontend/package.json).

### What gets shipped where

**GitHub Pages** (`build/gh-pages/`):

- Modern static app (`index.html`, `bundled/` — Vite JS/CSS)
- `samples/` and `samples-manifest.json`
- `assets/` (textures and other bundled runtime media)
- `docs/index.html` — in-app documentation (`/mgview/docs/`)
- `lab/index.html` — MGLab route (`/mgview/lab/`; UI loads, but sim runs need the local server)
- `.nojekyll` (so GitHub Pages serves `_`-prefixed paths)
- `legacy/` (optional, copied if present — historical reference only)

### URL namespaces (local server and static site)

| Path | Contents |
|------|----------|
| `bundled/` | Vite hashed JS/CSS (`build.assetsDir` in `vite.config.ts`) |
| `assets/` | Repo runtime media (textures, future fonts/meshes) |

These must not share a directory — the Node server routes `/mgview/bundled/` to `frontend/dist/bundled/` and serves `/mgview/assets/` from the repo via normal workspace paths.

**Release zip** (`build/release/mgview-<version>.zip`):

- Top-level folder: `mgview-<version>/` (same as the zip basename)
- `mgview-<version>/bin/` — Node server
- `mgview-<version>/bin/node_modules/node-pty/` — N-API PTY binaries (macOS/Windows prebuilds + Linux `build/Release`; `.pdb` stripped). Linux `spawn-helper` is compiled during assemble (node-pty only builds it on macOS).
- `mgview-<version>/frontend/dist/` — compiled modern app (server mode)
- `mgview-<version>/samples/`
- `mgview-<version>/assets/`
- `RunMGViewMac`, `RunMGViewLinux`, `RunMGViewWindows.bat`, README, LICENSE
- **No** `legacy/`, **no** frontend source
- Local download requires **Node.js 20+** on PATH

## Local development

Git stores source text as LF (see `.gitattributes`). On Windows and macOS, use:

```bash
git config core.autocrlf false
```

```bash
cd frontend
npm install
npm test
npm run dev            # Vite dev server with hot reload
npm run build          # → frontend/dist/ (for the production UI served by launchers)
cd ..
./RunMGViewMac         # http://localhost:8000/mgview/
./RunMGViewLinux       # same flags as Mac
./RunMGViewMac --port 9000 --no-open   # custom port, skip browser launch
./RunMGViewMac --workspace ~/simulations   # workspace folder (saved in ~/.mgview/config.json)
./RunMGViewMac --verbose   # log each HTTP request (quiet by default)
```

### Full-stack development with hot reload

Run the Node backend and Vite dev server in separate terminals:

```bash
# Terminal 1, from the repository root: API, workspace files, and Motion Genesis runs
./RunMGViewMac --verbose --no-open

# Terminal 2: live frontend with hot module replacement
cd frontend
npm run dev
```

Open the Vite URL, normally <http://localhost:5173/mgview/>. Do not use the backend URL at
`http://localhost:8000/mgview/` for hot-reload testing. During development, Vite serves the
frontend source and proxies `/mgview/api`, `/mgview/assets`, and `/mgview/samples` to the backend.
You do **not** need to run `npm run build` before starting `RunMGViewMac` in this two-terminal
workflow. The launcher is being used for its backend APIs; Vite supplies the frontend.

The proxy defaults to `http://127.0.0.1:8000`. If the backend uses another port, set the matching
target before starting Vite. For example:

```bash
./RunMGViewMac --port 9000 --verbose --no-open
cd frontend
MGVIEW_DEV_BACKEND=http://127.0.0.1:9000 npm run dev
```

### When to rebuild or restart

| Change | What to do |
|--------|------------|
| Frontend source under `frontend/src/` | Nothing; Vite hot-reloads it. |
| Frontend CSS | Nothing; Vite updates it in the open page. |
| `frontend/vite.config.ts` or frontend environment variables | In the Vite terminal press Ctrl+C, then run `npm run dev` again. |
| Frontend dependencies | In the Vite terminal press Ctrl+C, run `npm install`, then run `npm run dev`. |
| Backend JavaScript under `bin/` or a launcher script | In the backend terminal press Ctrl+C, then run `./RunMGViewMac --verbose --no-open` again. No build step is required. |
| Backend workspace or Motion Genesis configuration | Usually nothing; the backend reads current configuration. Restart if startup flags changed. |
| Testing the production launcher UI | Run `cd frontend && npm run build`, then start or refresh the launcher-served app. |
| Creating a distributable release | Run `cd frontend && npm run build:release`. |

The backend is plain Node.js and has no normal compilation step. `npm run build` builds only the
frontend assets consumed by the launcher; it is unnecessary while using the Vite URL. Starting
the Vite dev server refreshes frontend build metadata without rewriting `bin/VERSION`.

On Windows, double-click `RunMGViewWindows.bat` or run it from Command Prompt (same flags; `bin\RunVisualizer.bat` is the underlying script):

```bat
RunMGViewWindows.bat --port 9000 --no-open
RunMGViewWindows.bat --workspace C:\simulations
```

`frontend/dist/` and `frontend/dist-pages/` are gitignored. Run `npm run build` after pulling
frontend changes before using the production UI at the launcher URL. The full-stack hot-reload
workflow above does not require this build.

## Preview static site locally

Simulates GitHub Pages URL shape (`/mgview/` prefix):

```bash
cd frontend
npm run preview:site   # build if needed, serve http://localhost:8001/mgview/
```

Workspace layout preview (parent-folder serving):

```bash
npm run preview:site:workspace   # http://localhost:8001/mgview/
npm run build:site:workspace     # assemble only → build/gh-pages-workspace/mgview/
```

## CI

Pull requests run `.github/workflows/ci.yml`: `npm ci`, `npm test`, `npm run typecheck`, and `npm run build:site` in `frontend/`.

## Deploy to GitHub Pages

### Option A — GitHub Actions (recommended)

1. In the repo on GitHub: **Settings → Pages → Build and deployment → Source: GitHub Actions**
2. Push to `master` — `.github/workflows/pages.yml` builds and deploys automatically
3. Or trigger manually: **Actions → Deploy GitHub Pages → Run workflow**

### Option B — Manual CLI

```bash
cd frontend
npm run deploy:pages   # build:site + push to gh-pages branch via npx gh-pages
```

If Pages is still configured to use the **gh-pages branch** (legacy setting), Option B works immediately. Option A uses the modern artifact deploy and does not require the gh-pages branch.

After switching to Actions, you can delete the old `gh-pages` branch once the first Action deploy succeeds.

## Release zip

```bash
cd frontend
npm test
npm run build:release
# → build/release/mgview-0.4.1.zip  (version from package.json)
```

Version is read from [frontend/package.json](frontend/package.json). Override with `MGVIEW_RELEASE_VERSION=0.4.1 npm run build:release`.

When `HEAD` is on an exact tag `vX.Y.Z`, `build:release` checks that `X.Y.Z` matches `package.json` (same check as the release workflow). Set `MGVIEW_SKIP_VERSION_CHECK=1` to bypass.

### Attach to a GitHub Release

Bump `frontend/package.json`, then tag and push — `.github/workflows/release.yml` builds the zip and attaches it:

```bash
git tag v0.4.1
git push origin v0.4.1
```

Or run **Actions → Release zip → Run workflow** manually (no tag required for the workflow artifact; GitHub Release attachment needs a `v*` tag push).

## Build env vars (Vite)

| Variable | Server build | GH Pages | Workspace static |
|----------|--------------|----------|------------------|
| `VITE_MGVIEW_STATIC` | — | `true` | `true` |
| `VITE_MGVIEW_APP_DIR` | `` (empty) | `` (empty) | `mgview` |
| `VITE_MGVIEW_BASE` | `/mgview/` | `/mgview/` | `/mgview/` |
| `VITE_MGVIEW_PUBLIC_BASE` | `/` | `/mgview/` | `/` |

Scene URLs: `?sample=particle_pendulum/particle_pendulum.json` (bundled samples) or `?scene=my_sim/foo.json` (workspace). List/file APIs take `root=workspace|sample|app` and `path=` relative to that root (e.g. `GET /mgview/api/list?root=workspace&path=.`). Workspace API: `GET`/`POST` `/mgview/api/workspace` (config `~/.mgview/config.json`; in-memory roots sync on every API request after POST). Motion Genesis run API (`bin/motionGenesisRunner.js`): start/poll/stop runs and send stdin — **server mode only** (`VITE_MGVIEW_STATIC` unset). Static HTTP: `/mgview/samples/…`, `/mgview/assets/…`. SPA routes: `/mgview/docs/`, `/mgview/lab/`. Local app URL: `http://localhost:8000/mgview/` (server redirects `/mgview` → `/mgview/`).
