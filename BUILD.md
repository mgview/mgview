# Build and deploy

This repo is **source-only**. Built output lives under `build/` (gitignored) and is produced on demand.

Handoff docs:

- [mgview-in-place-modernization.md](mgview-in-place-modernization.md) — product status, run commands, gaps, **start here for new agents**
- [mgview-scene-sources-split.md](mgview-scene-sources-split.md) — scene URLs (`?sample=` / `?scene=`), API `root=`, Samples vs Load (implemented)

## Three outputs

| Output | Command | Used for |
|--------|---------|----------|
| **Server app** | `cd frontend && npm run build` | Local Node server (`./RunMGViewMac`) — full API, read/write scenes |
| **GitHub Pages site** | `cd frontend && npm run build:site` | https://mgview.github.io/mgview/ — static demo, bundled samples |
| **Release zip** | `cd frontend && npm run build:release` | User download — server + compiled app + samples (no legacy) |

All assembly logic is in `frontend/scripts/`. Shared constants: `deployConfig.mjs`.

### What gets shipped where

**GitHub Pages** (`build/gh-pages/`):

- Modern static app (`index.html`, `bundled/` — Vite JS/CSS)
- `samples/`
- `assets/` (textures and other bundled runtime media)
- `legacy/` (optional, copied if present — historical reference only)

### URL namespaces (local server and static site)

| Path | Contents |
|------|----------|
| `bundled/` | Vite hashed JS/CSS (`build.assetsDir` in `vite.config.ts`) |
| `assets/` | Repo runtime media (textures, future fonts/meshes) |

These must not share a directory — the Node server routes `/mgview/bundled/` to `frontend/dist/bundled/` and serves `/mgview/assets/` from the repo via normal workspace paths.

**Release zip** (`build/release/mgview-<version>.zip`):

- `mgview/bin/` — Node server
- `mgview/frontend/dist/` — compiled modern app (server mode)
- `mgview/samples/`
- `mgview/assets/`
- Launchers + README + LICENSE
- **No** `legacy/`, **no** frontend source, **no** `node_modules`

## Local development

```bash
cd frontend
npm install
npm test
npm run build          # → frontend/dist/ (required before RunMGViewMac)
cd ..
./RunMGViewMac         # http://localhost:8000/mgview/
```

`frontend/dist/` is gitignored. Always run `npm run build` after pulling frontend changes.

## Preview static site locally

Simulates GitHub Pages URL shape (`/mgview/` prefix):

```bash
cd frontend
npm run preview:site   # http://localhost:8001/mgview/
```

Workspace layout preview (parent-folder serving):

```bash
npm run preview:site:workspace   # http://localhost:8001/mgview/
```

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
# → build/release/mgview-0.2.10.zip
```

Version is read from `bin/VERSION`. Override with `MGVIEW_RELEASE_VERSION=0.3.0 npm run build:release`.

### Attach to a GitHub Release

Push a tag — `.github/workflows/release.yml` builds the zip and attaches it:

```bash
git tag v0.3.0
git push origin v0.3.0
```

Or run **Actions → Release zip → Run workflow** manually.

## Build env vars (Vite)

| Variable | Server build | GH Pages | Workspace static |
|----------|--------------|----------|------------------|
| `VITE_MGVIEW_STATIC` | — | `true` | `true` |
| `VITE_MGVIEW_APP_DIR` | `` (empty) | `` (empty) | `mgview` |
| `VITE_MGVIEW_BASE` | `/mgview/` | `/mgview/` | `/mgview/` |
| `VITE_MGVIEW_PUBLIC_BASE` | `/` | `/mgview/` | `/` |

Scene URLs: `?sample=particle_pendulum/particle_pendulum.json` (bundled samples) or `?scene=my_sim/foo.json` (workspace). List/file APIs take `root=workspace|sample|app` and `path=` relative to that root (e.g. `GET /mgview/api/list?root=workspace&path=.`). Workspace API: `GET`/`POST` `/mgview/api/workspace` (config `~/.mgview/config.json`; in-memory roots sync on every API request after POST). Static HTTP: `/mgview/samples/…`, `/mgview/assets/…`. Local app URL: `http://localhost:8000/mgview/` (server redirects `/mgview` → `/mgview/`).

## One-time cleanup (source-only repo)

If `frontend/dist/` was previously committed:

```bash
git rm -r --cached frontend/dist
```

Then commit. The `.gitignore` already excludes `frontend/dist/`, `frontend/dist-pages/`, and `build/`.
