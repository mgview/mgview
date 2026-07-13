# Scene Header Redesign — Design & Implementation Plan

Handoff doc for implementing the `/mgview/` workspace header refactor.

## Goals

1. Replace top-level Load/Save split buttons with **Scenario** + **Scene** menus.
2. Remove **Sim Project** concept entirely.
3. Normalize scenes to **always have scenarios** (minimum: one `Default`).
4. Keep MG Lab (`/mgview/lab/`) unchanged.

---

## Mental Model

| Concept | Description |
|---------|-------------|
| **Scene** | One JSON document: visualization, layout, file lifecycle. |
| **Scenario** | A variant within a scene: label + `simulationData[]` (playback/ODE output paths). |
| **Default scenario** | Always present. First scenario is `Default` when none specified. |
| **MG input** (`simulationSettings`) | Scene-level today. Per-scenario sim files deferred (future: Python, multiple executables). |
| **MG output** (`simulationData`) | Per-scenario. Active scenario drives playback. |

**Removed:** “New Sim Project” (folder + scene.json + `.al` bootstrap). **New** creates scene JSON only; users create/link MG input files via the Sim Editor pane.

---

## Header UI

```
[mode] [?]  <scene path>  •     Scenario: <label> ▾  [⚙]  …  Scene ▾
```

### Scenario control

- **Always a dropdown**, even with one scenario (single item: `Default`).
- Lists all scenarios; selecting one calls `onSetActiveScenario`.
- **No** “Add scenario” in dropdown — scenario management only via gear overlay.
- **Gear** opens existing `SimulationDataOverlay` (`onOpenChannels` / `shell.openSimulationOverlay`).
- Gear **disabled/greyed** when no scene is loaded.

### Scene menu

| Item | Shortcut | Behavior |
|------|----------|----------|
| Open… | ⌘O / Ctrl+O | Workspace load overlay (`shell.openLoadOverlay`). **Add shortcut** — does not exist today. |
| Revert changes | — | `onRevert` — discard unsaved scene + sim-settings edits. Keep for now. |
| Save all | ⌘S / Ctrl+S | `handleSaveAll` — scene JSON + dirty sim-settings file. Already wired. |
| Save scene as… | — | `shell.openSaveAsOverlay` |
| New… | — | `shell.openCreateOverlay` — scene only, no auto `.al` |
| Examples… | — | `shell.openSamplesOverlay` |

**Unchanged in header:** undo/redo, layout menu, diagnostics, left-side scene path + unsaved dot.

### Demo / static hosting

- Disable **Save all**, **Save scene as**, **New** with existing tooltips (read-only demo messaging).
- Static mode: **Examples** remains primary open path; **Open** may appear as secondary (match current Load/Samples inversion in `SceneHeaderBar`).

---

## Data Model: Always Scenarios

### New pattern

Every scene has:

```json
{
  "scenarios": [{ "id": "default", "label": "Default", "simulationData": [] }],
  "activeScenario": "default"
}
```

### Legacy compatibility

On load, if `scenarios` is missing or empty:
- Synthesize `Default` from scene-level `simulationData` (if any).
- Set `activeScenario` to `default`.
- Scene-level `simulationData` kept for read compat; **active scenario is source of truth** for playback.
- Optionally write normalized form back on save (prefer normalizing in `sceneDocument` / load path).

### Implementation touchpoints

- `frontend/src/core/sceneDocument.ts` — normalize on parse
- `frontend/src/core/sceneScenarios.ts` — `normalizeScenarios`, `hasScenarioMode`, helpers
- New-scene template in `useSceneWorkspace` — include Default scenario
- Audit all `scenarios.length === 0` branches (overlay, hooks, run panel, tests)
- `ScenarioSelector` — always render; remove early-return when empty

---

## Code Changes

### Modify

| File | Change |
|------|--------|
| `SceneHeaderBar.tsx` | Replace Load/Save splits + old scenario placement with Scenario dropdown, gear, Scene menu |
| `ScenarioSelector.tsx` | Always show dropdown; static label when single scenario still expands to show Default |
| `useWorkspaceKeyboardShortcuts.ts` | Add Ctrl/⌘+O → open load overlay |
| `SimulationDataOverlay.tsx` | Update copy/branches for always-scenario mode; remove `inScenarioMode` false UI path where obsolete |
| `sceneScenarios.test.ts`, `sceneDocument.test.ts`, `sceneScenarios.test.ts` | Update/add normalization tests |
| `mgHelpIndex.data.json` | Update help text if it references old menu items |

### Remove

| File / symbol | Notes |
|---------------|-------|
| `NewSimProjectOverlay.tsx` | Delete component |
| `useWorkspaceShell` | `simProjectDialog*` state, `openCreateSimProjectOverlay`, `handleCreateSimProjectFolder` |
| `useSceneWorkspace` | `handleCreateSimProject` |
| `WorkspaceOverlays.tsx` | NewSimProject overlay wiring |
| `App.tsx` | `onOpenCreateSimProjectOverlay`, `handleCreateSimProject` props |
| `SceneHeaderBar.tsx` | `onOpenCreateSimProjectOverlay` |

### Do not change

- `MgLabPage.tsx` / MG Lab route
- Per-scenario `simulationSettings` (future work)
- “Load sim data first, create scene from it” (future; gear disabled without scene for now)

---

## Implement Order

1. **Data normalization** — always-scenarios on load + new-scene template + tests
2. **Scene menu** — file actions parity, Ctrl+O, demo/static guards
3. **Scenario control + gear** — header refactor, remove old Load/Save buttons
4. **Remove Sim Project** — delete dead code and menu references
5. **Sweep** — overlay copy, tests, help index, manual check on server + static builds

---

## Acceptance Checklist

- [ ] Header shows Scenario dropdown + gear + Scene menu; no Load/Save buttons
- [ ] Single-scenario scene shows `Scenario: Default ▾` with one menu item
- [ ] Gear opens Simulation Data overlay; greyed when no scene
- [ ] Scene menu: Open, Revert, Save all, Save scene as, New, Examples — all work
- [ ] Ctrl+O opens load; Ctrl+S still saves all (when dirty)
- [ ] Legacy scenes without `scenarios` load with synthesized Default
- [ ] New scenes created with Default scenario
- [ ] No Sim Project UI or code paths remain
- [ ] Demo mode disables save/new appropriately
