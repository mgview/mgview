# MGView — Agent Handoff

**Start here** for product context. Build/deploy: [BUILD.md](../BUILD.md). User docs: `/mgview/docs/`. UI conventions: [frontend/DESIGN-NOTE.md](../frontend/DESIGN-NOTE.md).

## What this is

React app replacing `legacy/`. Routes: `/mgview/` (workspace), `/mgview/lab/` (MGLab), `/mgview/docs/`.

**Runtime split:** local Node server = workspace R/W, MG runs, file APIs. Static GH Pages (`VITE_MGVIEW_STATIC=true`) = bundled samples, read-only.

Stack: React 18, TypeScript, Vite, Tailwind v4, shadcn/ui, Three.js, uPlot.

## Workspace layout

Header **Layout** menu (`Alt+L`, `Alt+1`–`4`): **3D View** / **Plots** (independent); **Scene Editor** / **Sim Editor** (mutually exclusive right rail).

`scene.layout` (`workspaceLayout.ts`): `showRenderer`, `showPlots`, `rightRail` (`scene` | `sim` | `none`). Legacy `showEditorRail: false` → `rightRail: 'none'`.

Scene Editor rail: object list + **Editor** / **Scene Settings** / **JSON Editor** (preview only). Timeline under 3D View if visible, else Plots.

## Scenes, samples, URLs

`SceneRef` (`core/sceneRef.ts`): `sample` (under `samples/`) or `workspace` (user folder). URL: `?sample=…` or `?scene=…` (mutually exclusive). Default startup loads first manifest sample.

| UI | Scope |
|----|--------|
| **Examples…** | Gallery from `samples-manifest.json` |
| **Open…** / **New…** / **Save as…** | Workspace only (`root=workspace`) |

List/file APIs: `root=workspace|sample|app`, `path=` relative to that root (`bin/workspaceRoots.js`).

**Scenarios:** every scene has ≥1 (`Default` if unspecified). Each owns `simulationData[]`; `activeScenario` drives playback. **Sim Data** dropdown + gear overlay. Origin/Newtonian frame inferred from channels (`referenceContext` in `sceneDocument.ts`) — not authored in Scene Settings.

## Motion Genesis runner

Server-only (`bin/motionGenesisRunner.js`):

```
HTTP API → useMotionGenesisRun() → MotionGenesisRunShell
                                      ├─ MgLabPage (beginFileRun)
                                      └─ MotionGenesisRunPanel (beginRun)
```

Details: [mg-lab-workspace-run-parity.md](../mg-lab-workspace-run-parity.md). PTY output: [mgview-pty-output-normalization.md](mgview-pty-output-normalization.md).

## Code map

| Area | Location |
|------|----------|
| Routes | `App.tsx`, `core/appRoutes.ts` |
| Workspace shell | `WorkspaceShell.tsx`, `SceneHeaderBar.tsx` |
| Scene editor | `WorkspaceEditorRail.tsx` |
| Sim runner | `MotionGenesisRunShell.tsx`, `MotionGenesisRunPanel.tsx`, `MgLabPage.tsx` |
| Scenes | `useSceneWorkspace.ts`, `sceneDocument.ts`, `sceneScenarios.ts` |
| Renderer / plots | `RendererPanel.tsx`, `PlotPanel.tsx`, `PlotsPanel.tsx` |

## Build / run

```bash
cd frontend && npm install && npm test && npm run build
cd .. && ./RunMGViewMac   # http://localhost:8000/mgview/
```

## Open work

Tracked in [todo_tracker.md](../todo_tracker.md).

## Related

- [BUILD.md](../BUILD.md)
- [mg-lab-workspace-run-parity.md](../mg-lab-workspace-run-parity.md)
- [mgview-pty-output-normalization.md](mgview-pty-output-normalization.md)
