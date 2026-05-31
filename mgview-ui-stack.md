# MGView UI Stack

**Status: implemented** (May 2026). Parent: [`mgview-in-place-modernization.md`](mgview-in-place-modernization.md).

The modern app (`frontend/`) uses Tailwind CSS v4, shadcn/ui (Radix), Lucide, and Sonner. Monolithic `styles.css` is removed; styling lives in Tailwind utilities, `index.css` tokens, and a thin [`app.css`](frontend/src/app.css).

Design rationale: [`frontend/DESIGN-NOTE.md`](frontend/DESIGN-NOTE.md).

## Stack

| Layer | Choice |
|-------|--------|
| Utilities | Tailwind CSS v4 (`@tailwindcss/vite`) |
| Components | shadcn/ui copy-in under [`components/ui/`](frontend/src/components/ui/) |
| Primitives | Radix UI (via shadcn) |
| Icons | Lucide React |
| Toasts | Sonner |
| Themes | Light + dark; `prefers-color-scheme` default; header toggle; `localStorage` key `mgview-theme`; anti-flash script in [`index.html`](frontend/index.html) |

Legacy app Bootstrap styling is unchanged and unrelated.

## Key files

| Purpose | Path |
|---------|------|
| Tailwind entry + tokens | [`frontend/src/index.css`](frontend/src/index.css) |
| Canvas / grid / scrubber / swatch CSS | [`frontend/src/app.css`](frontend/src/app.css) |
| `cn()` helper | [`frontend/src/lib/utils.ts`](frontend/src/lib/utils.ts) |
| Theme state | [`frontend/src/components/ThemeProvider.tsx`](frontend/src/components/ThemeProvider.tsx) |
| Shared editor class tokens | [`frontend/src/components/editorLayout.ts`](frontend/src/components/editorLayout.ts) |
| Dialog wrapper for overlays | [`frontend/src/components/OverlayPanel.tsx`](frontend/src/components/OverlayPanel.tsx) |

## shadcn components in use

`Button`, `Dialog`, `DropdownMenu`, `Tabs`, `Input`, `Label`, `Checkbox`, `Badge`, `ScrollArea`, `Separator`

Load/Save header actions use `DropdownMenu` (not custom split-buttons). Toasts go through Sonner via [`useToasts.ts`](frontend/src/hooks/useToasts.ts).

## Adding new UI

1. Prefer existing `components/ui/` primitives and [`editorLayout.ts`](frontend/src/components/editorLayout.ts) tokens before new one-off classes.
2. Use `cn()` for conditional classes; Lucide for icons.
3. Modals: wrap with `OverlayPanel` or compose `Dialog` directly.
4. If Tailwind is awkward (popover anchoring, drag scrubbers, canvas sizing), add minimal rules to `app.css` — do not grow another global stylesheet.

## Verification

```bash
cd frontend && npm test && npm run build && npm run build:site
./RunMGViewMac          # local editor + theme toggle
npm run preview:site    # static demo + demo notice
```
