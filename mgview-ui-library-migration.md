# MGView UI Library Migration

Handoff for moving the **modern React app** (`frontend/`) from a single custom stylesheet to **Tailwind CSS** with a **refreshed cohesive look** and **light/dark mode**. This is **not** a pixel-parity exercise.

Related docs:

- [mgview-in-place-modernization.md](mgview-in-place-modernization.md) — product status, architecture, run commands
- [BUILD.md](BUILD.md) — build outputs and deploy constraints

## Decisions (locked)

| Topic | Decision |
|-------|----------|
| **CSS stack** | **Tailwind CSS v4** — utility-first; avoid pre-canned Bootstrap component look |
| **Components** | **shadcn/ui** (copy-in React components) on **Radix UI** primitives for dialogs, dropdowns, tabs, etc. |
| **Theme** | **Light and dark mode** — cohesive palettes for both; user toggle + respect `prefers-color-scheme` as default |
| **Icons** | **Lucide React** — tree-shakeable; default for shadcn/ui; replace inline SVGs where equivalents exist |

Bootstrap and other full component libraries are **not** in scope — they read too “pre-canned” for this tool UI.

## Goal

Replace the hand-rolled global CSS in [`frontend/src/styles.css`](frontend/src/styles.css) with Tailwind + a small set of shared UI components so future panels inherit consistent patterns.

**In scope**

- Main app: [`frontend/src/App.tsx`](frontend/src/App.tsx) and its component tree (26 files under [`frontend/src/components/`](frontend/src/components/))
- Layout shell, header, overlays, inspector, playback strip, toasts, file browser, editor forms
- Theme toggle and light/dark token setup

**Out of scope**

- Legacy app under [`legacy/`](legacy/) (Bootstrap 2.3.1; leave as-is)
- Three.js viewport rendering internals ([`frontend/src/rendering/`](frontend/src/rendering/))
- New product features (plotting, keyboard shortcuts, etc.) unless needed to validate migrated UI

**Success looks like**

- Tailwind + shadcn/ui wired through Vite; semantic design tokens for light and dark
- UI reads as one coherent desktop tool in **both** themes — not a Tailwind demo page
- Main app no longer depends on monolithic `styles.css` (residual `app.css` for canvas/swatch/scrubber quirks is fine)
- Theme preference persists (e.g. `localStorage`) and initializes from system preference
- `npm test`, `npm run build`, `npm run build:site`, and `npm run build:release` still pass
- Manual smoke on local server and static preview: load sample, inspector, load/save overlay, playback, About, diagnostics, theme toggle

## Current state (baseline)

| Area | Today |
|------|--------|
| Styling | One global file: [`frontend/src/styles.css`](frontend/src/styles.css) (~2,140 lines, ~100+ class selectors) |
| Import | [`frontend/src/main.tsx`](frontend/src/main.tsx) → `import './styles.css'` |
| Components | 26 `.tsx` files under `components/` plus `App.tsx` |
| Dependencies | React 18, Three.js only — no Tailwind or UI libs in [`frontend/package.json`](frontend/package.json) |
| Class usage | Semantic names (`scene-header`, `overlay-card`, `inspector-item-active`) + conditional `className` templates |
| Icons | Inline SVGs in header, playback, editors (~20 instances across 5 files) |
| Inline styles | Minimal — dynamic swatch colors in pickers/gallery |
| Responsive | Single breakpoint `@media (max-width: 900px)` |
| Legacy | Vendored Bootstrap 2.3.1 in `legacy/bootstrap/` — unrelated to modern app |

The existing theme is a dark, glassy, compact desktop-tool aesthetic. **Treat as reference for information density and layout intent, not as a design target.**

## Design direction for the refresh

Build a **new** look on Tailwind tokens — do not port current hex values.

### Principles

1. **Desktop-first tool UI** — dense but readable; editor/viewer, not marketing
2. **Light + dark** — both polished; dark suits the 3D viewport; light for bright environments
3. **Clear hierarchy** — header (document + actions), workspace (sidebar / canvas / drawer), overlays (modals)
4. **Accessible controls** — visible focus rings, dialog semantics, keyboard-friendly targets
5. **Restraint** — no heavy motion or oversized padding; usable down to ~900px width

### Theme implementation (Tailwind + shadcn)

- Use shadcn’s CSS-variable theme pattern (`background`, `foreground`, `muted`, `border`, `primary`, `destructive`, etc.) with `.dark` on a root element (typically `<html>` or app wrapper)
- Define **both** light and dark token sets in [`frontend/src/index.css`](frontend/src/index.css) (or equivalent entry)
- Default: `prefers-color-scheme`; user override via header toggle (sun/moon icon from Lucide)
- Persist choice in `localStorage` (shadcn convention: key like `mgview-theme`)
- Three.js canvas area may stay neutral/dark-adjacent in light mode if full canvas re-theme is awkward — document the choice

Deliver a short **design note** in the PR: font stack, radius scale, light/dark palette intent, and which shadcn components were added.

### Recommended shadcn components (initial set)

Add only what migration needs; expand as tiers progress:

| Need | shadcn component |
|------|------------------|
| Overlays | `Dialog`, optionally `Sheet` for drawer-like panels |
| Header menus | `DropdownMenu` (replaces split-button menus) |
| Inspector tabs | `Tabs` |
| Forms | `Input`, `Label`, `Select`, `Checkbox`, `Button` |
| Lists | `ScrollArea` + styled rows (custom list item markup) |
| Toasts | `Sonner` or shadcn `Toast` |
| Badges / pills | `Badge` |
| Theme toggle | `Button` variant ghost + Lucide `Sun` / `Moon` |

Install via shadcn CLI into e.g. `frontend/src/components/ui/`.

## Stack setup (Tier 0)

### Packages (expected)

```text
tailwindcss @tailwindcss/vite          # Tailwind v4 Vite plugin
class-variance-authority clsx tailwind-merge
@radix-ui/react-*                      # pulled in by shadcn components
lucide-react
```

Optional: `tailwindcss-animate` if shadcn init adds it.

### Vite

- Add `@tailwindcss/vite` to [`frontend/vite.config.ts`](frontend/vite.config.ts)
- Replace `import './styles.css'` in [`main.tsx`](frontend/src/main.tsx) with `import './index.css'` (Tailwind entry)
- Delete migrated selectors from `styles.css` as each tier completes; end state is no legacy class names in the main app tree

### cn helper

Standard shadcn `lib/utils.ts` with `cn()` for conditional classes.

### Icons (Lucide)

Replace inline SVGs with Lucide where names match. Current app icons map roughly to:

| Usage | Lucide icon |
|-------|-------------|
| Undo / redo | `Undo2`, `Redo2` |
| Play / pause | `Play`, `Pause` |
| Chevron (split menus) | `ChevronDown` |
| Visibility toggle | `Eye`, `EyeOff` |
| Theme toggle | `Sun`, `Moon` |
| Folder / file browser | `Folder`, `File`, `ChevronRight` |
| Add / delete visual | `Plus`, `Trash2` |

Keep inline SVG only if Lucide has no suitable glyph; prefer one icon style throughout.

## UI surface inventory

Migration checklist. Shell first, then shared primitives, then heavy editors.

### Tier 0 — Foundation

- [ ] Tailwind v4 + Vite plugin
- [ ] shadcn init; light/dark CSS variables
- [ ] Theme provider + toggle in header
- [ ] Lucide + `cn` helper
- [ ] Spike: restyle About overlay + header actions

### Tier 1 — App shell & layout

| Component / area | File(s) | Notes |
|------------------|---------|-------|
| App grid shell | [`App.tsx`](frontend/src/App.tsx) | CSS grid / flex via Tailwind; collapsible left rail, resize handles |
| Header | [`SceneHeaderBar.tsx`](frontend/src/components/SceneHeaderBar.tsx) | Brand, path, unsaved dot, undo/redo, **DropdownMenu** for Load/Save actions, theme toggle |
| Playback | [`PlaybackStrip.tsx`](frontend/src/components/PlaybackStrip.tsx) | Transport + scrubber |
| Demo notice | [`DemoNotice.tsx`](frontend/src/components/DemoNotice.tsx) | Alert-style banner |
| Toasts | [`ToastStack.tsx`](frontend/src/components/ToastStack.tsx) | Replace with Sonner/toast primitive |

### Tier 2 — Shared patterns

| Pattern | File(s) | Notes |
|---------|---------|-------|
| Modal overlay | [`OverlayPanel.tsx`](frontend/src/components/OverlayPanel.tsx) → shadcn `Dialog` |
| Load / save | [`LoadSceneOverlay.tsx`](frontend/src/components/LoadSceneOverlay.tsx), [`LoadScenePathPanel.tsx`](frontend/src/components/LoadScenePathPanel.tsx) | |
| File browser | [`LocalFileBrowser.tsx`](frontend/src/components/LocalFileBrowser.tsx) | Breadcrumbs + list |
| Workspace picker | [`WorkspacePickerOverlay.tsx`](frontend/src/components/WorkspacePickerOverlay.tsx) | |
| Samples | [`SamplesOverlay.tsx`](frontend/src/components/SamplesOverlay.tsx), [`SampleSceneGallery.tsx`](frontend/src/components/SampleSceneGallery.tsx) | Tile grid |
| About | [`AboutOverlay.tsx`](frontend/src/components/AboutOverlay.tsx) | Description list / grid |
| Diagnostics | [`DiagnosticsOverlay.tsx`](frontend/src/components/DiagnosticsOverlay.tsx) | Severity badges |
| Sim files | [`SimulationDataOverlay.tsx`](frontend/src/components/SimulationDataOverlay.tsx) | Large form |

### Tier 3 — Inspector & editors

| Component | File(s) | Notes |
|-----------|---------|-------|
| Drawer tabs | [`InspectorDrawer.tsx`](frontend/src/components/InspectorDrawer.tsx) | `Tabs` |
| Object list | [`ObjectList.tsx`](frontend/src/components/ObjectList.tsx) | Active row states |
| Visual editor | [`VisualEditorPanel.tsx`](frontend/src/components/VisualEditorPanel.tsx) | Largest surface |
| Span editor | [`SpanEditorPanel.tsx`](frontend/src/components/SpanEditorPanel.tsx) | |
| Scene settings | [`SceneSettingsPanel.tsx`](frontend/src/components/SceneSettingsPanel.tsx) | |
| JSON preview | [`SavePreviewPanel.tsx`](frontend/src/components/SavePreviewPanel.tsx), [`JsonEditorPanel.tsx`](frontend/src/components/JsonEditorPanel.tsx) | Monospace `pre` |
| Shared widgets | [`editorShared.tsx`](frontend/src/components/editorShared.tsx) | Numeric scrubbers — likely custom Tailwind + tiny CSS |
| Color / material | [`ColorPicker.tsx`](frontend/src/components/ColorPicker.tsx), [`MaterialPicker.tsx`](frontend/src/components/MaterialPicker.tsx) | Swatch grids, popovers |
| Renderer | [`RendererPanel.tsx`](frontend/src/components/RendererPanel.tsx) | Canvas sizing only |

### Tier 4 — Residual custom CSS (keep small)

Tailwind covers most layout; keep a thin file for:

- Three.js canvas container sizing
- Material/texture swatch grids (if awkward in utilities)
- Numeric scrubber drag affordances
- Workspace pane resize handles ([`useWorkspaceShell`](frontend/src/hooks/useWorkspaceShell.ts))

Target: **`frontend/src/app.css`** imported from `index.css` (≤200–400 lines), not another monolith.

## Pattern mapping (Tailwind / shadcn)

| Current pattern | Replacement |
|-----------------|-------------|
| `overlay-backdrop` + `overlay-card` | shadcn `Dialog` |
| `secondary-button` | `Button variant="outline"` or `secondary` |
| `icon-button` | `Button variant="ghost" size="icon"` + Lucide |
| `split-button` + menu | `DropdownMenu` with primary trigger + chevron |
| `tag-button` / `-active` | `Tabs` or toggle `Button` group |
| `inspector-item` / `-active` | Tailwind row + `bg-accent` / `data-[active]` |
| `panel`, `panel-subtitle` | `Card` or bordered `div` + typography utilities |
| `toast-stack` | Sonner |
| `pill`, `pill-warning` | `Badge` variants |
| `loader-form`, `editor-grid` | Tailwind grid/flex + form components |
| `scene-header-*` | Tailwind layout utilities + semantic structure |

Prefer **replacing** split-button custom JS menus with Radix `DropdownMenu` (focus trap, keyboard nav) rather than re-styling the old pattern.

## Migration strategy

### Incremental strangler (recommended)

1. **Spike** — Tailwind + shadcn init, light/dark tokens, theme toggle, About dialog + header buttons
2. **Shell** — App layout, header, playback, toasts, demo notice; delete migrated `styles.css` rules
3. **Overlays** — `OverlayPanel` → `Dialog`; all overlay consumers
4. **Inspector** — drawer, lists, editors
5. **Cleanup** — Main app free of legacy classes; slim `app.css`; remove `styles.css`

## Technical checklist

### Setup

- [ ] Add Tailwind v4, shadcn, Lucide to `frontend/package.json`
- [ ] Configure `@tailwindcss/vite` in `vite.config.ts`
- [ ] Add `components/ui/`, `lib/utils.ts`, `index.css` with `@theme` / CSS variables
- [ ] Theme toggle + persistence

### Code

- [ ] Migrate components per tier; use `cn()` for conditional classes
- [ ] Replace inline SVGs with Lucide in migrated files
- [ ] Small shared wrappers only where duplication is real (`IconButton` is optional — shadcn `Button size="icon"` may suffice)
- [ ] Preserve behavior: Escape on dialogs, disabled states, unsaved indicator, workspace flows
- [ ] Keep [`RendererPanel`](frontend/src/components/RendererPanel.tsx) canvas stable

### CSS cleanup

- [ ] Remove migrated selectors from `styles.css` as each tier completes
- [ ] End state for main app: no legacy class names in `App.tsx` tree

### Verification

- [ ] `cd frontend && npm test`
- [ ] `cd frontend && npm run build && npm run build:site`
- [ ] Manual: `./RunMGViewMac` — full editor smoke + **toggle light/dark**
- [ ] Manual: static preview — samples, demo notice, theme toggle
- [ ] Note bundled CSS/JS size delta in PR

## Risks and mitigations

| Risk | Mitigation |
|------|------------|
| shadcn copy-in drift | Pin component versions; only add components you use |
| Light mode + Three.js canvas | Document canvas background choice; optional always-dark viewport |
| Split-button behavior regression | Use Radix `DropdownMenu` instead of porting custom menus |
| Bundle size | Tree-shake Lucide imports; avoid unused shadcn components |
| Theme flash on load | Inline script in `index.html` to set `.dark` before paint (shadcn pattern) |

## Non-goals

- Bootstrap or other pre-canned component-library aesthetic
- Pixel match to current `styles.css`
- Storybook / design-system program
- Rewriting hooks/core business logic

## Suggested agent prompt (copy-paste)

```
Read mgview-in-place-modernization.md and mgview-ui-library-migration.md.

Migrate the main MGView app (App.tsx tree) from styles.css to Tailwind CSS v4 +
shadcn/ui (Radix) + Lucide icons. Implement cohesive light AND dark themes with
a header toggle and system-default detection. Refresh the design — do NOT
preserve the old look.

Follow the tier order in the migration doc. Replace split-buttons with DropdownMenu
where practical. Run npm test and npm run build. Leave a short design note.
Smoke-test RunMGViewMac, static preview, and theme toggle.
```

---

*Last updated: Tailwind + light/dark + Lucide locked; SimpleApp removed.*
