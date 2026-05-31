# MGView UI Design Note

See also [`mgview-ui-stack.md`](../mgview-ui-stack.md) for stack and file map.

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

## shadcn/ui components added
`Button`, `Dialog`, `DropdownMenu`, `Tabs`, `Input`, `Label`, `Checkbox`, `Badge`, `ScrollArea`, `Separator` — plus **Sonner** for toasts

## Residual custom CSS (`app.css`)
Workspace grid columns, Three.js canvas sizing, numeric scrubber drag affordance, material/color swatch popover positioning
