# MG Lab vs Workspace Sim Runner

**MG Lab** (`/mgview/lab/`, `MgLabPage.tsx`) and the workspace **Sim Editor** (`MotionGenesisRunPanel.tsx`) share one run UI and backend. Lab is for orphan sim files; workspace ties runs to a scene and reloads visualization data.

**Not built:** Lab → create/link a workspace scene after a successful run.

## Architecture

```
bin/motionGenesisRunner.js
        │ HTTP API (server only)
useMotionGenesisRun()
        │
MotionGenesisRunShell          ← useMotionGenesisRunPreferences() (`mgview-run-*`)
        │
   MgLabPage                    MotionGenesisRunPanel  (WorkspaceShell, rightRail === 'sim')
   beginFileRun()               beginRun() via useMotionGenesisWorkspace
```

| File | Role |
|------|------|
| `MotionGenesisRunShell.tsx` | Configure, editor, output, stdin, Run/Stop |
| `useMotionGenesisRunPreferences.ts` | Run options, vim mode, layout mode (`split` \| `editor` \| `output-only`) |
| `MgLabPage.tsx` | Open/edit/run any workspace `.al`/`.txt`; `?file=` URL |
| `MotionGenesisRunPanel.tsx` | Link sim file to scene; scene-scoped run |
| `useMotionGenesisRun.ts` | Run lifecycle, polling, stdin |
| `useMotionGenesisWorkspace.ts` | Save-before-run, post-run import + sim data reload |

## Workspace vs Lab

| Concern | Lab | Workspace |
|---------|-----|-----------|
| Entry | App mode switcher or `/mgview/lab/` | Layout → Sim Editor (`Alt+4`) |
| Sim file | Open File picker | Configure → link `simulationSettings` |
| Run | `beginFileRun`, save if dirty | `beginRun`, save if dirty |
| After run | — | Import ODE outputs; reload plots/playback |
| Save scope | MG file only | Scene JSON + sim file |
| Default shell layout | `split` | `editor` |

## Project layout

```
my_project/
  my_scene.json       ← scene + layout + simulationSettings
  my_sim.txt          ← MG input
  my_sim.1, .2, …     ← ODE/animate output
```

**New Sim File** (template: `frontend/src/templates/mgviewSimTemplate.txt`) via Configure picker or Lab Open File dialog. **New scene** (`Scene` menu) creates JSON only — link the sim file in Sim Editor.

**Scenarios:** each scene has at least one (`Default` if unspecified). Multiple `ODE()` blocks can import as separate scenarios (header **Sim Data** dropdown). Per-scenario `simulationData[]`; `activeScenario` drives playback.

## Related

- [dev/mgview-in-place-modernization.md](dev/mgview-in-place-modernization.md) — agent handoff
- [dev/mgview-pty-output-normalization.md](dev/mgview-pty-output-normalization.md) — PTY runner, `MGVIEW_MOTION_GENESIS_BIN`
