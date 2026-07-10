# MG Lab vs Workspace Run Sim — Plan of Record

Align **MG Lab** (`/mgview/lab/`, `MgLabPage.tsx`) with the workspace **Run Sim** panel (`MotionGenesisRunPanel.tsx`). Both use the same backend runner and hook layer; **Phase 1 runner UI is complete** — shared shell + prefs. Remaining work is Phase 3 (bootstrap) and scenarios policy.

**Direction:** Lab is the interaction reference; workspace is the data anchor. Converge the runner UI; keep scene-scoped run + post-run data reload in workspace. Lab remains the orphan-sim entry point (no scene required).

## Architecture (unchanged)

```
bin/motionGenesisRunner.js
        │ HTTP API
useMotionGenesisRun()          ← one instance per route; run options via shared localStorage
        │
MotionGenesisRunShell          ← layout/vim prefs via useMotionGenesisRunPreferences()
        │
   MgLabPage                    MotionGenesisRunPanel
   beginFileRun()               beginRun() via useMotionGenesisWorkspace
```

| File | Role |
|------|------|
| `MotionGenesisRunShell.tsx` | Shared run UI (layout, configure, editor, output, stdin) |
| `useMotionGenesisRunPreferences.ts` | Shared `mgview-run-*` localStorage prefs |
| `MgLabPage.tsx` | Standalone lab: open/edit/run any workspace MG file |
| `MotionGenesisRunPanel.tsx` | Workspace panel: run sim tied to loaded scene |
| `MotionGenesisRunOutput.tsx` | Shared output renderer |
| `useMotionGenesisRun.ts` | Run lifecycle, polling, stdin, options |
| `useMotionGenesisWorkspace.ts` | Save-before-run, post-run sim data reload |

---

## Phase 1 — Shared run shell + preferences ✅

**Done.** `MotionGenesisRunShell` + `useMotionGenesisRunPreferences`; both routes are thin wrappers.

**Persist in localStorage** (`mgview-run-*`):

- Run options: `autoQuit`, `autoDefaultValues`, `debug`, `scrollbackLimit`
- Vim mode (replace `mgview-lab-editor-vim-mode` + `mgview-sim-editor-vim-mode`)
- Layout mode: `split` | `editor` | `output-only` (legacy stored `tabs` → `editor`)
- Split ratio (when in split mode)

**Layout modes:**

- **Split** — resizable editor \| output (Lab default; min panel width 320px; lg+ breakpoint for horizontal split, stacked on narrow).
- **Editor** — editor only (workspace default on narrow rails).
- **Output-only** — optional.

### Shell surface (union of both routes)

| Area | Include | Source / note |
|------|---------|---------------|
| **Status** | Badge (idle/running/waiting/success/failed), Interactive badge | both |
| **Actions** | Run, Stop | both; label prop: `"Run"` vs `"Run Sim"` |
| **Configure** | auto-quit, auto-defaults, debug, scrollback | both |
| **Configure** | Vim toggle | both |
| **Configure** | Motion Genesis executable path (click → picker) | both; `canOpenExecutablePicker` prop (Lab always true; workspace gated by `canPersistScenesToServer`) |
| **Configure** | PTY setup error | both |
| **Status panel** | Exit code, PID, exact command line, command, CWD, workspace root, started/ended, command source | both |
| **Status panel** | Scene path, scene file path | workspace only; pass when scene-scoped run |
| **Editor** | `CodeEditor`, loading/empty states, dirty indicator | both |
| **Editor** | `readOnly` + dim + centered overlay while running/waiting-input | both |
| **Editor** | Cmd/Ctrl+Enter or editor `onRun` shortcut | both |
| **Output** | `MotionGenesisRunOutput`, scroll top/bottom | both; unify on header buttons (Lab style) |
| **Stdin** | Input + Send, Enter to submit | split + output-only layouts; hidden in editor-only mode |
| **Errors** | Run error line | both |

Already shared (do not duplicate): `MotionGenesisRunOutput`, `parseMotionGenesisOutput`, `MotionGenesisExecutableOverlay`.

### What stays outside the shell (route wrappers)

| Concern | Lab (`MgLabPage`) | Workspace (`MotionGenesisRunPanel` + hooks) |
|---------|-------------------|-----------------------------------------------|
| **File/scene context** | Open File picker, `?file=` URL, file path display | `simulationSettings` picker (updates scene draft), scene path, `runDisabledReason` |
| **Save / revert** | Save, Revert, Cmd/Ctrl+S, beforeunload guard | Save-before-run via `useMotionGenesisWorkspace`; sim revert stays in scene header (optional: add Revert to shell) |
| **Run orchestration** | `beginFileRun`, save MG file if dirty | `beginRun(scenePath, simPath)`, save sim if dirty, **`onRunSucceeded` → reload sim data** |
| **Page chrome** | Full-page header, "Back to Workspace" | Panel inside editor rail; no page nav |
| **File picker overlay** | Open any `.al` or `.txt` | Select sim file relative to scene directory |
| **Hook instance** | Own `useMotionGenesisRun()` | Own `useMotionGenesisRun(handleMotionGenesisSuccess)` |

Shell accepts props/callbacks for editor content (`value`, `onChange`, `readOnly`, `filePath`, `loading`, `error`) and run control (`run`, `options`, `onRun`, `onStop`, `onSendInput`, …). Wrappers own persistence and which API to call.

### Behaviors to preserve (regression checklist)

- Save-before-run when editor is dirty
- Extension validation (`.al`, `.txt` only — not `.in`; some legacy scene JSONs reference `.in` settings files, but MG sim input is `.al` or `.txt`)
- Auto-quit / auto-defaults / debug passed to API unchanged
- ODE block collapse in output (already shared)
- Workspace post-run simulation data reload (wrapper hook, not shell)
- Lab orphan-sim: no scene required to run

### Removed / replaced

- Workspace **Edit flyout that replaces output** → shell layout toggles (split / editor / output-only)
- Workspace **stdin in edit flyout** → dropped; stdin lives with output panel
- Duplicate configure UI → one Configure surface in shell

---

## Phase 3 — New sim / project bootstrap (later)

### Sim project model

On disk, a typical project folder:

```
my_project/
  my_scene.json     ← scene anchor (camera, objects, simulationData[])
  my_sim.txt        ← MG input; scene.simulationSettings points here
  my_sim.1, .2, …   ← produced by ODE/animate after run
```

Three states:

1. **Orphan sim** — just `foo.txt` (Lab). Runnable via `beginFileRun`.
2. **Linked sim** — scene JSON with `simulationSettings`. Runnable in workspace; post-run reload works.
3. **Visualized sim** — scene also has `simulationData` + objects/geometries.

### Creation flows

- **New Sim Project (workspace):** pick folder + name → create `scene.json` + sibling sim file + set `simulationSettings` → open Run Sim with sim loaded. One action, runnable immediately.
- **Add sim to existing scene:** Configure picker + **Create new sim file…** (same template, writes next to scene).
- **Lab orphan sim:** unchanged; optional later **Create scene from this sim** after successful run.

### MGView sim template

Vendor an in-repo template (e.g. `frontend/src/templates/mgviewSimTemplate.txt`), derived from MG basics / `MGTemplateBasic.txt` but opinionated for MGView:

- Minimal frame/point scaffold
- Integration `Input` defaults
- `animate(N, No)` + `ODE() <basename>` (basename = sim file stem)
- No plot/`Output` commands — MGView owns plotting via scene channels

Do not read external `MGTemplateBasic.txt` at runtime.

### Post-run import nudge

After successful workspace run, if `simulationData` is empty but ODE completed: prompt to import detected output files. Do not auto-build full scene geometry.

---

## One sim file, many ODE outputs — policy

Example: `samples/babyboot/babyboot.txt` runs `ODE() stable/Data` then `ODE() chaotic/Data`. Today, `stable/babyboot.json` and `chaotic/babyboot.json` are near-identical copies; both list `"Data.2:3"` but resolve to different folders because each scene lives beside its output. **Load → pick a different `.json`** is the current scenario switcher — works, but duplicates layout and drifts.

**Default rule: one scene per sim file; switch scenarios in UI, not by loading another JSON.**

### Scenarios (replaces duplicate scene files)

A **scenario** is a named view binding: which output file group is active for playback/plots. Shared geometry, camera, and plots; only the data binding (and optional per-scene overrides) changes.

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

- **`simulationData` at scene root** remains the fallback for legacy scenes (implicit single scenario).
- **UI:** scenario picker in scene header or Scene Settings — e.g. dropdown "Stable ICs | Chaotic ICs". Switching reloads animation/plot data only; no full scene load.
- **Post-run import:** each detected ODE output group becomes a scenario (or is offered as one). User names it ("Stable ICs", "Chaotic ICs").
- **Optional overrides per scenario:** `cameraEye`, `cameraFocus`, `speedFactor` — only when a case truly needs a different view. Default: shared layout.

This preserves today's babyboot workflow without maintaining two JSON files.

### Backward compatibility (no migration required)

Existing multi-JSON layouts keep working unchanged:

- N scene JSONs with the same `simulationSettings` (e.g. `ball_in_tube.json` + `ball_in_tube2.json` → `ball_in_tube.al`) — Load picks the view.
- Folder-relative data without `simulationSettings` (babyboot `stable/` vs `chaotic/`) — each JSON resolves its own `simulationData`.
- Scenarios are opt-in (`scenarios[]` absent → top-level `simulationData` as today). Old and new patterns coexist in the same workspace.

### When separate scene files still make sense (rare, explicit)

- Genuinely different visualization (different objects/geometries), not just different ICs on the same mechanism.
- User chooses **Duplicate scene…** with a drift warning — same as today, but not the default for multi-`ODE()` sims.

**Avoid:** auto-creating N scenes for N ODE calls; shared-layout-by-reference machinery (too much coupling).

**Lab / orphan sim:** **Create scene from sim** → one scene, one scenario per detected ODE group from the last run.

---

## Intentional differences (keep)

| Topic | Lab | Workspace |
|-------|-----|-----------|
| Run API | `beginFileRun(filePath)` | `beginRun(scenePath, simulationSettings)` |
| Scene / plots | None | Full editor + plot reload on success |
| Save scope | MG file only | Sim file + scene JSON |
| URL state | `?file=` query | Scene path from routing |

---

## Phase 1 parity — closed

All Phase 1 gaps resolved. Still intentional: revert in scene header (workspace), post-run data reload (wrapper only), `canOpenExecutablePicker` gating.

Shared output behavior (ODE block collapse, PTY normalization): `parseMotionGenesisOutput.ts`, `MotionGenesisRunOutput.tsx`. Tests: `parseMotionGenesisOutput.test.ts`, `motionGenesisRunner.test.js`.

## Related docs

- `mgview-pty-output-normalization.md` — PTY output stripping and platform banner differences.
