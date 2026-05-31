# Renderer interaction modernization — implementation handoff

**Status: scoped, not implemented** (May 2026). Parent context: [`mgview-in-place-modernization.md`](mgview-in-place-modernization.md).

Scopes the renderer work needed to move the modern React app from a **per-frame rebuilt Three.js subtree** to a **persistent interactive scene graph** suitable for selection, picking, gizmos, and direct manipulation.

---

## Why this exists

Current playback works, but the render layer is still using a simple stateless model:

- Evaluate the scene at time `t`
- Build a fresh render subtree from that snapshot
- Remove the previous subtree

That approach was good for early modernization because it was easy to reason about, but it becomes the wrong foundation for richer interaction.

Practical pressures pushing this work:

- Clicking rendered geometry to select objects/visuals
- Hover highlighting and hit-testing
- Transform/drag widgets
- Stable per-object interaction state
- Lower churn in geometries/materials/textures during playback

Recent leak fix addressed disposal, but it did **not** change the underlying architecture.

---

## Current state

### Render flow today

The active renderer lives in [`frontend/src/components/RendererPanel.tsx`](frontend/src/components/RendererPanel.tsx).

Per-frame render tree replacement currently happens here:

- [`RendererPanel.tsx`](frontend/src/components/RendererPanel.tsx): `useEffect(... [frame, scene, scenePath, selectedObjectName])`
- Calls `buildRenderableScene(evaluateScene(scene, frame), selectedObjectName, scenePath)`
- Replaces the contents of `sceneRoot`

Scene graph creation lives in:

- [`frontend/src/rendering/sceneGraph.ts`](frontend/src/rendering/sceneGraph.ts)
- [`frontend/src/rendering/meshFactory.ts`](frontend/src/rendering/meshFactory.ts)

Evaluation is already separated cleanly:

- [`frontend/src/core/sceneEvaluation.ts`](frontend/src/core/sceneEvaluation.ts)

This split is useful and should be preserved:

- **Evaluation** computes object/span state from the authored scene + timeline
- **Rendering** should project that evaluated state into persistent Three nodes

### What is good about the current setup

- Clear separation between scene evaluation and rendering
- Easy to compare against legacy behavior
- Simple render correctness model
- Rendering tests already exist around scene graph construction

### What is limiting

- Rendered nodes do not have stable identity across frames
- Picking/raycast results would point at short-lived meshes
- Interaction state would be fragile because targets keep getting replaced
- Every frame allocates new Three objects for visuals/spans/text
- Async mesh loads are more awkward because they race with tree replacement

---

## Goal

Move to a renderer that:

1. Creates persistent Three nodes for objects, visuals, and spans.
2. Updates transforms, visibility, and lightweight appearance **in place** each frame.
3. Rebuilds only when the scene structure changes.
4. Keeps stable metadata on render nodes so picking can map back to scene entities.
5. Supports future interaction tools without fighting renderer churn.

Non-goal for the first pass:

- Full editor gizmo system
- Full material/geometry diff optimization for every visual type
- A perfect retained-mode renderer for all future needs

The first pass only needs to establish a stable, maintainable base.

---

## Target architecture

### Recommended split

Keep evaluation and rendering separate, but change rendering into two layers:

1. **Structural reconciliation**
   - Ensure persistent nodes exist for each renderable entity
   - Create/remove/rebuild only when structure changes
2. **Per-frame application**
   - Update transforms, visibility, selection state, and dynamic geometry in place

### Suggested render identities

Each renderable node should carry stable metadata in `userData`, for example:

```ts
type RenderEntityRef =
  | { kind: 'object'; objectName: string }
  | { kind: 'visual'; objectName: string; visualName: string }
  | { kind: 'span'; spanName: string }
  | { kind: 'span-visual'; spanName: string; visualName: string };
```

That metadata is the bridge for:

- Raycast hit -> scene selection
- Hover state
- Gizmo attachment
- Debugging

### What should update in place

- Object transforms
- Visual local transforms
- Visibility
- Selection/highlight state
- Camera-independent interaction metadata

### What can still trigger rebuilds

- Visual type changes
- Mesh path changes
- Text content changes
- Geometry parameter changes that are easier to recreate than mutate
- Span kind changes
- Material model changes if mutation is harder than replacement

This is still a big improvement over rebuilding the whole subtree every frame.

---

## Phased scope

### Phase 1: persistent object/span containers

Goal: stop replacing the full `sceneRoot`.

Deliverables:

- Introduce a persistent render graph manager under `frontend/src/rendering/`
- Create one stable container per object and per span
- Update object transforms and span endpoints in place on each frame
- Preserve selection metadata on stable nodes

Notes:

- This phase may still recreate child meshes when visual shape changes
- It is fine if selection only maps to object-level identity at first

### Phase 2: persistent visuals and render identity

Goal: stable visual nodes for picking.

Deliverables:

- Stable child node per visual / span visual
- `userData` identity contract for raycasting
- Clear mapping from evaluated scene entities to render nodes
- Selection highlight driven by node mutation rather than subtree rebuild

Notes:

- New agent should decide whether to key by authored names directly or introduce normalized render IDs
- If names can be blank/duplicate after normalization, fix identity before deep interaction work

### Phase 3: picking and selection integration

Goal: click rendered geometry to select it.

Deliverables:

- Pointer event handling in [`RendererPanel.tsx`](frontend/src/components/RendererPanel.tsx)
- Raycasting against persistent scene nodes
- Selection mapping back into existing app/editor state
- Selection precedence rules:
  - visual hit vs object container
  - span hit vs object hit
  - basis/grid/text behavior

Notes:

- Start with click-to-select only
- Hover and marquee selection can come later

### Phase 4: manipulation hooks

Goal: prepare for drag widgets and direct transforms.

Deliverables:

- Stable attachment point for transform controls / custom handles
- Draft update loop from interaction -> scene edit preview -> render update
- Rules for camera controls vs drag controls ownership

Notes:

- This phase does not need a full UX implementation, only the renderer/editor handshake

---

## Likely implementation shape

Suggested new modules:

- `frontend/src/rendering/renderGraph.ts`
  - Owns persistent node registry and reconciliation
- `frontend/src/rendering/renderNodeTypes.ts`
  - Shared `userData` / identity types
- `frontend/src/rendering/raycastSelection.ts`
  - Picking helpers, hit resolution

Likely existing files to refactor:

- [`frontend/src/components/RendererPanel.tsx`](frontend/src/components/RendererPanel.tsx)
- [`frontend/src/rendering/sceneGraph.ts`](frontend/src/rendering/sceneGraph.ts)
- [`frontend/src/rendering/meshFactory.ts`](frontend/src/rendering/meshFactory.ts)
- [`frontend/src/core/sceneEvaluation.ts`](frontend/src/core/sceneEvaluation.ts) only if new stable IDs are needed
- [`frontend/src/hooks/useInspectorSelectionState.ts`](frontend/src/hooks/useInspectorSelectionState.ts)
- [`frontend/src/hooks/useSceneSelectionEditor.ts`](frontend/src/hooks/useSceneSelectionEditor.ts)
- [`frontend/src/hooks/useSceneSpanEditor.ts`](frontend/src/hooks/useSceneSpanEditor.ts)

Recommended direction:

- Keep `meshFactory.ts` focused on constructing or rebuilding individual render nodes
- Move lifecycle/reconciliation responsibility out of `RendererPanel.tsx`
- Avoid putting more render diffing logic directly in the React component

---

## Design choices the next agent should resolve

### 1. Identity source

Question:

- Are `objectName`, `visualName`, and `spanName` sufficiently stable and unique?

If not:

- introduce internal render IDs during normalization or inspection

### 2. Dynamic geometry policy

Question:

- Which geometry classes are worth mutating in place versus recreating?

Practical starting point:

- mutate transforms/visibility always
- recreate mesh geometry on structural parameter changes
- dispose old geometry/materials carefully

### 3. Text handling

Text visuals currently create a new canvas texture during construction.

Question:

- Should text visuals own a persistent canvas/texture that only redraws when text or style changes?

Recommendation:

- yes, once Phase 2 begins

### 4. Mesh asset instances

OBJ/STL visuals already have async loading and cache behavior.

Question:

- How should persistent mesh instances react when:
  - asset path changes
  - scale changes
  - selection highlight changes

Recommendation:

- keep cached source asset data
- keep one stable container node per authored visual
- rebuild only that visual’s attached mesh subtree when necessary

---

## Risks

### Selection state mismatch

If render identities do not align cleanly with editor identities, picking will feel inconsistent.

### Hidden structural rebuilds

If the refactor still recreates large parts of the tree under the hood, interaction code will remain brittle.

### Disposal regressions

Persistent nodes reduce churn, but rebuild-on-change paths still need strong disposal discipline.

### Over-coupling React and Three

Avoid making React state the owner of every low-level render node. React should drive scene intent; the render graph should own Three object lifecycle.

---

## Minimum success criteria

This work should be considered successful when all of the following are true:

1. Playback no longer replaces the entire render subtree every frame.
2. Each rendered object/visual/span has stable identity across frames.
3. Clicking a rendered mesh can be mapped back to a scene entity reliably.
4. Selection highlighting does not require full subtree rebuild.
5. Geometry/texture counts remain stable during playback except for real structural changes.

---

## Verification

Code checks:

```bash
cd frontend
npm test
npm run build
```

Manual checks after renderer refactor:

- Load `particle_pendulum`
- Play across 10+ seconds
- Confirm `Geometries` and `Textures` stay roughly flat in the FPS panel
- Confirm clicking a rendered object consistently selects the same authored entity across playback
- Confirm selection survives playback without flicker
- Confirm mesh/text/span visuals do not disappear or duplicate during scene edits

Good sample scenes to exercise:

- `particle_pendulum`
- `double_pendulum_cart`
- one scene with STL/OBJ mesh visuals
- one scene with spans
- one scene with text/basis/grid visuals

---

## Out of scope

- Full transform gizmo UX polish
- Snapping
- Multi-select
- Marquee selection
- Physics/constraint editing directly in the viewport
- Rewriting scene evaluation itself unless identity gaps force it

---

## Recommendation to next agent

Start with **Phase 1 + Phase 2 only**.

Do not start by adding click handlers to the existing rebuilt-per-frame scene. That would create a fragile interaction layer on top of the wrong renderer model.

Instead:

1. introduce a persistent render graph manager
2. stabilize render-node identity
3. update transforms in place
4. then add picking once the targets are stable
