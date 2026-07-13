# Y vs X “Square” plot aspect — handoff

**Status:** Broken / disabled in UI (March 2026). Parent: [`mgview-plotting-scope.md`](mgview-plotting-scope.md).

This document is for the next agent (or human) picking up **1:1 drawable plot area** for Y vs X panels. Do not rely on chat history.

---

## Goal

For **Y vs X** (`xMode: 'channel'`) panels, a **Square** header control (and keyboard **`1`**) should make the **data drawable region** visually square: equal physical width and height for the plot area where lines are drawn, so circular parametric paths look circular.

Requirements from scope:

- Latching toggle (like zoom-to-fit); turns off on zoom/pan pointer-down.
- **Not persisted** in `scene.json` (UI-only state in `PlotPanel.tsx`) unless we add `squareAspect` later.
- Must **not** remount uPlot on toggle — use `chart.setSize()` only (see dedicated `useEffect` on `squareAspect`).
- Pan/zoom math in `attachScrubHandlers` is **correct** today — it uses `chart.rect` (CSS `getBoundingClientRect` on `.u-over`) for pointer position and as the divisor in `panDataShiftFromPixelDelta`. Any square sizing solution should keep pan feeling the same.

---

## What “square” is not

- **Not** `chart.width === chart.height` (total uPlot size includes Y-axis, X-axis ticks, and X channel label).
- **Not** `host.clientWidth` as total height (that ignored axis chrome and was the first broken approach).
- **Not** `host.clientWidth + PLOT_XY_X_LABEL_GUTTER` (double-counted axes; uPlot `height` already includes axis bands).

The target is **`chart.bbox` in CSS pixels** (or equivalent): uPlot’s drawable plot region inside axes, i.e. `bbox.width / pxRatio` ≈ `bbox.height / pxRatio`.

---

## Layout context (read before coding)

| Piece | Location | Notes |
|-------|----------|--------|
| Plot host | `hostRef` → `.plot-panel-host` | `w-full`, `minHeight` for XY default; no fixed height unless square experiments set one |
| uPlot mount | `PlotPanel.tsx` `useEffect` | `ResizeObserver` on host; `ensurePlotSize()` |
| Pan divisors | `plotAreaPointerFromClient` → `chart.rect` | User confirmed pan feels right |
| XY axis label | X axis `labelSize` / `labelGap` | `PLOT_XY_AXIS_LABEL_SIZE`, `PLOT_XY_AXIS_LABEL_GAP`; `labelGap` draws inside reserved `labelSize` in uPlot |
| CSS | [`frontend/src/app.css`](../frontend/src/app.css) `.plot-panel-host .uplot` | Had `width: 100% !important` (now removed); scope warns **do not override uPlot `canvas` positioning** |
| Square helpers | `PlotPanel.tsx` top | `plotAreaBboxCss`, `plotAxisChromeHeight`, `applySquarePlotSize`, `applyPlotSize`, `plotSizeNeedsUpdate` |
| Square UI flag | `SQUARE_ASPECT_UI_ENABLED` | `false` — button and `1` key hidden |

**uPlot sizing model (v1.6):** `setSize({ width, height })` sets **total** chart CSS size including axes. Internally `calcPlotRect()` subtracts axis `_size + labelSize` from width/height to get `plotWidCss` / `plotHgtCss`, then `bbox` is that region in device pixels. `.u-over` is explicitly sized to `plotWidCss × plotHgtCss` in JS (not `width: 100%` of root).

**Smoke scene:** Robot Arm → Circle Step, Y vs X e.g. `P_No_Eo[1]` vs `P_No_Eo[3]` (closed loop should look round when square works).

---

## Symptom timeline (user reports)

1. **Original:** Square didn’t look square — height ≈ host width + gutter, treating full panel width as plot width.
2. **After `chart.rect` convergence:** Clicking square expanded plot to ~full inspector viewport height; still not square visually.
3. **After bbox + ResizeObserver width-only + removed `width: 100% !important`:** Lifecycle (toggle on/off) OK but again ~full vertical bar, obvious not square.
4. **After bbox-only + `hostWidth + 64` cap + removed `squareHostHeight`:** User reports square **does nothing** again (toggle may highlight but no visible resize).

---

## Approaches tried

### 1. `resolvePlotHeight(hostWidth, square) = hostWidth + gutter`

- Added `PLOT_XY_X_LABEL_GUTTER` on top of default body height.
- **Problem:** Confused total uPlot height with drawable size; drawable width is `hostWidth − Y-axis`, not `hostWidth`.

### 2. Converge using `chart.rect` (`getBoundingClientRect` on `.u-over`)

- Loop: `nextHeight = chart.height + (rect.width − rect.height)`.
- **Problem:** Runaway height — `ResizeObserver` on host refired when host grew; each pass added more height until ~viewport tall. `rect` may not match internal layout when CSS stretches `.uplot`.

### 3. ResizeObserver only on host **width** change (`hostLayoutWidthRef`)

- Stopped height-only feedback loop from square resize.
- **Partial fix** for runaway; still wrong aspect or no-op depending on measurement.

### 4. `chart.bbox / pxRatio` instead of `rect` for sizing

- Aligns with uPlot’s layout math (same basis as paths/axes).
- Pan still uses `rect` (intentional).

### 5. Mixed `bbox` + `rect` fallback per dimension

- If `bbox.width` missing, use `rect.width`; if `bbox.height` missing, use `rect.height`.
- **Problem:** Could pair huge `rect.width` with small `bbox.height` → enormous positive `diff` → viewport-scale height.

### 6. `squareHostHeight` state on host

- Set explicit `height` on `.plot-panel-host` to `chart.height` when square on.
- **Problem:** May have fed bad layout / measurement feedback; removed in later iteration.

### 7. Reset to `PLOT_XY_DEFAULT_HEIGHT` before converging when enabling square

- **Problem:** User saw “nothing happens” when combined with `plotSizeNeedsUpdate` guard (see #8).

### 8. `plotSizeNeedsUpdate` gate on square `useEffect`

- Skipped `applyPlotSize` when chart looked “already square”.
- **Problem:** Stale/zero `bbox` read as 1×1 or equal → skip resize; user sees no change.

### 9. Always `applyPlotSize` on `squareAspect` change

- Fixed “nothing happens” briefly.

### 10. Bbox-only + `targetHeight = plotW + axisChrome` + cap `hostWidth + 64`

- `axisChrome = chart.height − plotAreaHeight`.
- Removed `width: 100% !important` on `.uplot`.
- **User report:** Back to doing nothing (likely cap too aggressive vs bad `plotW`, or `plotAreaBboxCss` returns null and early-exits, or `targetHeight === chart.height` immediately).

---

## Current code (disabled UI)

With `SQUARE_ASPECT_UI_ENABLED = false`:

- Square **button** and **`1`** shortcut are not rendered / not handled.
- `squareAspect` state and `applySquarePlotSize` remain in `PlotPanel.tsx` for the next fix.
- Re-enable by setting `SQUARE_ASPECT_UI_ENABLED` to `true` after sizing works.

---

## Suggested directions for next agent

1. **Instrument in browser** (one XY panel): log after `setSize` — `chart.width`, `chart.height`, `bbox/pxRatio`, `rect`, `host.clientWidth`, `host.clientHeight`. Confirm whether `plotAreaBboxCss` is null or `targetHeight` equals current height when user clicks square.

2. **Prefer one-shot analytic sizing** after a stable layout pass:
   - `setSize(hostWidth, PLOT_XY_DEFAULT_HEIGHT)`; wait for uPlot `commit` / `setSize` hook;
   - read `plotW = bbox.w/pxRatio`;
   - `totalH = plotW + (chart.height - bbox.h/pxRatio)`;
   - `setSize(hostWidth, round(totalH))`; optional second pass if axis `_size` shifts.

3. **Do not mix `rect` and `bbox` for sizing** unless you prove they agree within ε.

4. **ResizeObserver:** keep ignoring height-only host resizes during square, or observe a **width-only wrapper** around the plot so square-driven height changes never retrigger sizing.

5. **CSS:** keep `max-width: 100%` only on `.uplot`; avoid forcing width/height on canvas or root in ways uPlot doesn’t set.

6. **Visual verification:** closed-loop XY path + compare `bbox` aspect to screen ruler or screenshot pixel check.

7. **Tests:** unit-test pure height helper given mocked `bbox` + `chart.height`; optional Playwright pixel aspect check.

8. **When fixed:** set `SQUARE_ASPECT_UI_ENABLED = true`, update [`mgview-plotting-scope.md`](mgview-plotting-scope.md) smoke steps, consider persisting `squareAspect` in JSON (optional backlog).

---

## Related files

- [`frontend/src/components/PlotPanel.tsx`](../frontend/src/components/PlotPanel.tsx) — UI, uPlot lifecycle, square helpers, `SQUARE_ASPECT_UI_ENABLED`
- [`frontend/src/app.css`](../frontend/src/app.css) — `.plot-panel-host`
- [`mgview-plotting-scope.md`](mgview-plotting-scope.md) — product behavior for plots
