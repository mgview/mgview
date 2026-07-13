# MGView UI Design Note

Stack and conventions for `frontend/` UI work.

## Stack

| Layer | Choice |
|-------|--------|
| Utilities | Tailwind CSS v4 (`@tailwindcss/vite`) |
| Components | shadcn/ui copy-in under `src/components/ui/` |
| Primitives | Radix UI (via shadcn) |
| Icons | Lucide React |
| Toasts | Sonner (`hooks/useToasts.ts`) |
| Themes | Light/dark; `prefers-color-scheme` default; `localStorage` key `mgview-theme`; anti-flash script in `index.html` |

Key files: `src/index.css` (tokens), `src/app.css` (canvas/grid/scrubber), `lib/utils.ts` (`cn()`), `components/ThemeProvider.tsx`, `components/editorLayout.ts`, `components/OverlayPanel.tsx`.

## Typography
- **UI:** IBM Plex Sans (400–700) — compact, neutral engineering sans
- **Data/code:** IBM Plex Mono for paths, JSON preview, numeric fields, performance HUD

## Radius & density
- **Radius scale:** `sm` 4px (`rounded-sm`), `md` 6px (`rounded-md`) — restrained, not pill-heavy
- **Controls:** ~28px row height (`h-7`), tight padding — information-dense desktop tool, not a marketing app

## Light / dark intent
- **Light:** cool neutral surfaces (`oklch` ~0.97 background), blue primary accent — readable in bright offices
- **Dark:** deep blue-gray surfaces, same primary hue lifted for contrast — suits the 3D viewport
- **Canvas:** `--canvas` token stays dark-adjacent in both themes so the Three.js viewport does not flash on theme toggle
- **Toggle:** header sun/moon; default follows `prefers-color-scheme`; choice persisted in `localStorage` (`mgview-theme`); inline script in `index.html` prevents flash

## shadcn/ui components in use

`Button`, `Dialog`, `DropdownMenu`, `Tabs`, `Input`, `Label`, `Checkbox`, `Badge`, `ScrollArea`, `Separator`

## Adding new UI

1. Prefer existing `components/ui/` primitives and `editorLayout.ts` tokens.
2. Use `cn()` for conditional classes; Lucide for icons.
3. Modals: `OverlayPanel` or compose `Dialog` directly.
4. Awkward Tailwind cases (popover anchoring, drag scrubbers, canvas sizing): minimal rules in `app.css` only.

## Residual custom CSS (`app.css`)

Workspace grid columns, Three.js canvas sizing, numeric scrubber drag affordance, material/color swatch popover positioning, plot panel uPlot host sizing.

## Plots

Charts sync with playback (`PlotPanel.tsx`, `PlotsPanel.tsx`). Y vs t and Y vs X modes; latching zoom-to-fit. **Square aspect** (1:1 drawable area for Y vs X) is disabled — see `todo_tracker.md`.
