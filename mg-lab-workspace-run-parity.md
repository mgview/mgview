# MG Lab vs Workspace Run Sim — Plan of Record

Align **MG Lab** (`/mgview/lab/`, `MgLabPage.tsx`) with the workspace **Sim Editor** (`MotionGenesisRunPanel.tsx`). Both use the same backend runner and hook layer.

**Status:** Phase 1–3 are **done** except Lab→workspace scene creation. Scenarios policy and post-run import nudge are **done**.

**Direction:** Lab is the interaction reference; workspace is the data anchor. Converge the runner UI; keep scene-scoped run + post-run data reload in workspace. Lab remains the orphan-sim entry point (no scene required).

## Architecture

```
bin/motionGenesisRunner.js
        │ HTTP API
useMotionGenesisRun()          ← one instance per route; run options via shared localStorage
        │
MotionGenesisRunShell          ← shell layout/vim prefs via useMotionGenesisRunPreferences()
        │
   MgLabPage                    MotionGenesisRunPanel  → WorkspaceShell when rightRail === 'sim'
   beginFileRun()               beginRun() via useMotionGenesisWorkspace
```

| File | Role |
|------|------|
| `MotionGenesisRunShell.tsx` | Shared run UI (configure, sim file editor, output, stdin) |
| `useMotionGenesisRunPreferences.ts` | Shared `mgview-run-*` localStorage prefs |
| `MgLabPage.tsx` | Standalone lab: open/edit/run any workspace MG file |
| `MotionGenesisRunPanel.tsx` | Workspace sim runner wrapper (scene-scoped) |
| `WorkspaceShell.tsx` | Mounts scene editor rail or sim panel per `scene.layout.rightRail` |
| `MotionGenesisRunOutput.tsx` | Shared output renderer |
| `useMotionGenesisRun.ts` | Run lifecycle, polling, stdin, options |
| `useMotionGenesisWorkspace.ts` | Save-before-run, post-run sim data reload |

---

## Phase 1 — Shared run shell + preferences ✅

**Done.** `MotionGenesisRunShell` + `useMotionGenesisRunPreferences`; both routes are thin wrappers.

**Persist in localStorage** (`mgview-run-*`): run options (`autoQuit`, `autoDefaultValues`, `debug`, `scrollbackLimit`), vim mode, shell layout mode (`split` \| `editor` \| `output-only`), split ratio.

**Shell layout modes:** split (Lab default), editor-only (workspace sim rail default), output-only.

Key shell surface: status badge (clickable for details), Configure, sim file `CodeEditor`, `MotionGenesisRunOutput`, **stdin** (`renderStdin` — input + Send under output in split/output-only), Run/Stop.

Already shared: `MotionGenesisRunOutput`, `parseMotionGenesisOutput`, `MotionGenesisExecutableOverlay`.

### Route wrappers (outside shell)

| Concern | Lab | Workspace |
|---------|-----|-----------|
| **Context** | Open File picker, `?file=` URL | `simulationSettings` picker, scene path, `runDisabledReason` |
| **Save / revert** | Save, Revert, Cmd/Ctrl+S, beforeunload | Save-before-run; sim revert in scene header |
| **Run** | `beginFileRun`, save if dirty | `beginRun`, save if dirty, post-run sim data reload |
| **Chrome** | Full-page header, Back to Workspace | Top-level **Sim Editor** pane (Layout menu); no page nav |
| **File picker** | Any `.al` / `.txt` | Sim file relative to scene directory |

Regression checklist: save-before-run, `.al`/`.txt` only, auto-quit/defaults/debug unchanged, ODE block collapse, workspace post-run reload, Lab orphan-sim.

---

## Phase 2 — Workspace layout: Scene Editor / Sim Editor ✅

**Done.** Sim running is no longer a tab inside the scene editor rail.

**Layout menu** (`SceneHeaderBar`): independent toggles for **3D View** (Alt+1), **Plots** (Alt+2); mutually exclusive **Scene Editor** (Alt+3) / **Sim Editor** (Alt+4) as a radio group (separator above).

**Persisted in scene JSON** (`scene.layout.rightRail`):

- `'scene'` — object list + Editor / Scene Settings / JSON Editor tabs (`WorkspaceEditorRail`)
- `'sim'` — full right rail is `MotionGenesisRunPanel`
- `'none'` — right rail hidden

Legacy `showEditorRail: false` migrates to `rightRail: 'none'` on load; `true`/absent → `'scene'`.

3D selection opens **Scene Editor** (`openSceneEditorRailIfClosed`), not Sim Editor.

---

## Phase 3 — New sim / project bootstrap ✅

**Done.** Sim file creation, scene linking, New Sim Project, post-run import nudge, and scenarios. Lab create-only; Lab→workspace scene creation still later.

### Sim project model

```
my_project/
  my_scene.json     ← scene anchor
  my_sim.txt        ← MG input; scene.simulationSettings
  my_sim.1, .2, …   ← ODE/animate output
```

States: **orphan sim** (Lab), **linked sim** (scene + `simulationSettings`), **visualized sim** (+ `simulationData`).

### Creation flows

- **New Sim Project:** File menu → **New Sim Project…** → folder + colocated `name.json` + `name.txt` → opens with Sim Editor rail.
- **Add sim to scene:** Configure picker → **New Sim File** → template scaffold → auto-save `simulationSettings` on scene JSON.
- **Lab:** Open File picker → **New Sim File** → create and open (no scene linking).
- **Lab: Create scene from sim** after successful run: not built.

### MGView sim template

In-repo template: `frontend/src/templates/mgviewSimTemplate.txt` — simple pendulum scaffold with `Input` defaults, `animate` + `ODE()`, no MG `Plot`/`Output` commands. Created via `createTextFile` API (POST, workspace `.al`/`.txt` only).

### Post-run import nudge ✅

After successful run, if the scene has no `simulationData` / scenarios: prompt to import detected ODE outputs (parses completed `ODE()` blocks, discovers `.N` files on disk). Single output → import as `simulationData`; multiple → **Import as scenarios** or import selected entries. No auto geometry.

---

## One sim file, many ODE outputs — scenarios ✅

**Default:** one scene per sim file; switch **scenarios** in the header and Sim Editor Configure panel.

```json
{
  "simulationSettings": "../babyboot.txt",
  "scenarios": [
    { "id": "stable",  "label": "Stable ICs",  "simulationData": ["stable/Data.2:3"] },
    { "id": "chaotic", "label": "Chaotic ICs", "simulationData": ["chaotic/Data.2:3"] }
  ],
  "activeScenario": "stable"
}
```

Opt-in (`scenarios[]` absent → top-level `simulationData` as today). Legacy multi-JSON layouts unchanged.

---

## Intentional differences (keep)

| Topic | Lab | Workspace |
|-------|-----|-----------|
| Run API | `beginFileRun(filePath)` | `beginRun(scenePath, simulationSettings)` |
| Scene / plots | None | Full editor + plot reload on success |
| Save scope | MG file only | Sim file + scene JSON |
| URL state | `?file=` query | Scene path from routing |

## Related docs

- `mgview-pty-output-normalization.md` — PTY output stripping
- `mgview-panel-architecture-overhaul-scope.md` — workspace pane model (update `rightRail` there when touched)
