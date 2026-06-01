# Inferred reference context

**Status: implemented** (May 2026). Parent context: [`mgview-in-place-modernization.md`](mgview-in-place-modernization.md).

This pass removed scene-level authored `newtonianFrame` / `sceneOrigin` from the normal authoring flow and replaced them with a shared inferred reference context derived from simulation channels.

## Shipped behavior

### Canonical inference

- Scene origin is inferred from position channels like `P_No_Ao[1]` -> `No`.
- Newtonian frame is inferred from rotation channels like `N_A[1,1]` -> `N`.
- Canonical values are the first discovered values in the loaded channel set.
- All discovered values are retained for diagnostics and per-file reporting.

### Normalized scene model

- [`frontend/src/core/sceneDocument.ts`](frontend/src/core/sceneDocument.ts) stores a `referenceContext` on `NormalizedSceneConfig`.
- The normalized scene still exposes `scene.newtonianFrame` and `scene.sceneOrigin`, but they are now derived from inferred context, not treated as authored truth.
- The inferred Newtonian frame is materialized as a `frame` object if it was missing.
- The inferred scene origin is materialized as a `point` object if it was missing.

### Evaluation semantics

- Object positions now resolve only from the canonical inferred origin.
- Span endpoints use the same canonical-origin lookup path as objects.
- The inferred scene origin is treated as `(0,0,0)` in its own frame without requiring `P_<origin>_<origin>`.
- Camera parent fallback still defaults to the normalized Newtonian frame when `cameraParentFrame` is unset.

### Save/load migration policy

- Load: legacy authored `newtonianFrame` / `sceneOrigin` are tolerated.
- Evaluation: inferred values win over authored legacy values.
- Save: newly saved scenes omit `newtonianFrame` and `sceneOrigin`.
- Diagnostics: disagreements between authored legacy values and inferred values produce warnings.

### UI and diagnostics

- Scene settings no longer exposes editable `Newtonian Frame` or `Scene Origin` controls.
- Simulation Data shows canonical origin/frame and per-file inferred origin/frame.
- Conflicting per-file origin/frame values are labeled as not used.
- Diagnostics warn when:
  - no origin can be inferred
  - no Newtonian frame can be inferred
  - multiple origins are present
  - multiple Newtonian frames are present
  - legacy authored values disagree with inferred values

## Files changed by this pass

- [`frontend/src/core/types.ts`](frontend/src/core/types.ts)
- [`frontend/src/core/simulationChannels.ts`](frontend/src/core/simulationChannels.ts)
- [`frontend/src/core/sceneDocument.ts`](frontend/src/core/sceneDocument.ts)
- [`frontend/src/core/sceneEvaluation.ts`](frontend/src/core/sceneEvaluation.ts)
- [`frontend/src/core/sceneInspector.ts`](frontend/src/core/sceneInspector.ts)
- [`frontend/src/hooks/useSceneWorkspace.ts`](frontend/src/hooks/useSceneWorkspace.ts)
- [`frontend/src/components/SceneSettingsPanel.tsx`](frontend/src/components/SceneSettingsPanel.tsx)
- [`frontend/src/components/SimulationDataOverlay.tsx`](frontend/src/components/SimulationDataOverlay.tsx)

## Test coverage added

- Reference-context inference and normalization in [`frontend/src/core/sceneDocument.test.ts`](frontend/src/core/sceneDocument.test.ts)
- Strict canonical-origin evaluation in [`frontend/src/core/sceneEvaluation.test.ts`](frontend/src/core/sceneEvaluation.test.ts)
- Save-path omission of legacy scene-level fields in [`frontend/src/hooks/useSceneWorkspace.test.ts`](frontend/src/hooks/useSceneWorkspace.test.ts)

## Remaining gaps

These are the meaningful leftovers after the implementation:

1. Mixed reference systems still warn-and-continue.
The app uses the first inferred origin/frame and surfaces the rest as ignored, but it does not suppress all affected content or provide a reconciliation workflow.

2. There is still no transform-tree / connection model.
If multiple unrelated sim datasets are loaded together, the app does not relate them manually or mathematically.

3. Rotation handling is still intentionally simple.
The app distinguishes the inferred Newtonian frame in normalization and diagnostics, but rotation lookup itself still reads any matching `<baseFrame>_<frame>[i,j]` matrix for the target frame name.

## Acceptance snapshot

- Normal MG datasets infer `No` / `N` correctly.
- Inferred origin/frame objects are usable scene objects.
- Object and span placement share one canonical-origin lookup path.
- Scenes keep loading when legacy fields are removed from JSON.
- New saves no longer depend on scene-level `newtonianFrame` / `sceneOrigin`.

## Verification

```bash
cd frontend && npm test && npm run build
```
