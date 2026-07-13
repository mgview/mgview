# MGView PTY Output Normalization

Context for Motion Genesis interactive runs launched from MGView (workspace **Run Sim** and **MG Lab**). Use this if PTY output looks wrong on Windows, macOS, or Linux.

## Problem

Motion Genesis is spawned behind a native PTY (`node-pty`). Raw PTY bytes are not plain text:

1. **Terminal control sequences** — ANSI CSI/OSC/DCS, cursor show/hide, clear screen, window title (`\x1b]0;...\x07`), etc.
2. **Cursor-positioned splash screen** — Windows startup banner uses absolute cursor moves (`\x1b[15;1H`) instead of newlines between rows.
3. **80-column hard wrap** — Long equations are split across physical terminal rows. Windows ConPTY can repeat the split character across lines (e.g. `*c` + `cos` → duplicated `c` if merged naively).
4. **PTY newline artifacts** — MG intentional blank lines after `->` output can appear as `>\r\n\n` through the PTY.

The web UI should show **logical lines** (one MG output line per equation/prompt), with **visual wrapping** handled by CSS at panel width — not PTY width.

## Architecture

```
MotionGenesis.exe
    ↓ native PTY (node-pty)
motionGenesisRunner.js  →  normalizePtyOutput()
    ↓ JSON API (/mgview/api/mg-run/...)
frontend output panel   →  whitespace-pre-wrap + break-all
```

### Key files

| File | Role |
|------|------|
| `bin/motionGenesisRunner.js` | PTY spawn, output accumulation, `normalizePtyOutput()` |
| `bin/motionGenesisRunner.test.js` | Unit tests for normalization and spawn options |
| `bin/server.js` | HTTP API; uses `createMotionGenesisRunManager()` |
| `frontend/src/components/MotionGenesisRunPanel.tsx` | Workspace **Run Sim** output (textarea) |
| `frontend/src/components/MgLabPage.tsx` | MG Lab output (segmented, syntax-toned) |

## PTY configuration

| Setting | Value | Notes |
|---------|-------|-------|
| `DEFAULT_PTY_COLS` | `80` | Kept at 80 intentionally so wrap-unwrapping stays testable |
| `DEFAULT_PTY_ROWS` | `30` | |
| Windows input | `\r` line endings | `inputTerminator` in launch config |
| macOS/Linux input | `\n` | |
| Backend | native `node-pty` only | If the module cannot load, interactive Run Sim / MG Lab is unavailable (no alternate backend) |

`run.ptyCols` is stored on each run and passed into `normalizePtyOutput()` so unwrap logic matches the spawned PTY width.

### Hypothetical huge PTY width

MGView does not hard-cap `cols` beyond `Math.floor(positive number)`. Practical limits are external:

- **Windows ConPTY / node-pty**: `cols`/`rows` are 16-bit (`SHORT`) → max ~**32,767**, not millions.
- **macOS/Linux**: similar winsize limits.
- Very large widths may affect MG formatting, console buffer memory, and are unnecessary if normalization + CSS wrap work.

Wide PTY avoids hard-wrap in the byte stream but does not replace proper normalization for splash screens and cursor control sequences.

## Normalization pipeline

Implemented in `normalizePtyOutput(text, terminalColumns)`:

### 1. `stripTerminalControlSequences()`

- Convert absolute cursor moves to newlines: `\x1b[row;colH`, `\x1b[rowH`, `\x1b[rowd`
- Strip OSC (window title), DCS, remaining CSI, two-char escapes
- Strip C0 controls except `\n`, `\r`, `\t`

This fixes Windows splash preamble where rows are positioned with CSI instead of `\n`.

### 2. Newline normalization

Collapses PTY-specific `\r\n` patterns without removing MG's intentional blank lines after `->` results (lines ending with `>`).

### 3. `unwrapSoftWrappedLines()`

Rejoins 80-column PTY hard-wrap fragments into single logical lines.

**Merge when:**

- Next line is a valid continuation (see exclusions below), AND
- Previous line is a full terminal row (`length` in `[cols-1, cols+1]`), OR
- Suffix/prefix overlap ≥ 2 characters between lines

**Join with overlap deduplication:**

When line A ends `*c` and line B starts `cos`, merge to `*cos` (not `*ccos`). Implemented via `findWrapOverlap()` + `mergeWrappedLine()`.

**Never merge when either line is:**

| Pattern | Detection |
|---------|-----------|
| MG prompt | `^\s*(?:->\s*)?\(\d+\)` |
| Banner box row | starts with `██` or trimmed line is `█{10,}` |
| Separator | trimmed `[-=]{10,}` |
| Splash help | `Type QUIT`, `Type HELP`, `Type PLOT` |
| Splash note | `Note:` |

Also skip merging when the **current** line is a static screen line (prevents `---------------` + `Note:` gluing together).

## Frontend display

Logical lines from the server may still be very long. Display settings:

- `whitespace-pre-wrap`
- `break-all` — wrap at character boundaries like a terminal cell grid
- `hyphens-none` — avoid breaking at hyphens in identifiers like `IBx-Iby`

Applied in:

- `MgLabPage.tsx` (output panel)
- `MotionGenesisRunPanel.tsx` (workspace Run Sim textarea)

**Do not use `break-words`** for equation output — it treats hyphens as break opportunities and splits `IBx-Iby` visually.

Mg Lab renders each `\n`-delimited logical line as a `display: block` span with syntax toning (`parseOutputSegments()`). Workspace Run Sim uses a plain readonly textarea.

## Platform notes

| Platform | PTY path | Input terminator | Regression risk |
|----------|----------|------------------|-----------------|
| Windows | native node-pty / ConPTY | `\r` | Splash CSI, hard-wrap overlap |
| macOS | native node-pty | `\n` | Quarantine / non-executable `spawn-helper` after zip extract or npm install (mode 644 → `posix_spawnp failed`; runner + postinstall set +x) |
| Linux | native node-pty | `\n` | Lower splash complexity |

All platforms share the same `normalizePtyOutput()` on native PTY.

## Testing

```bash
node --test --test-name-pattern "normalizePtyOutput|uses native" bin/motionGenesisRunner.test.js
```

Full suite:

```bash
node --test bin/motionGenesisRunner.test.js
```

Tests cover:

- `\r\n` collapse for MG prompt lines
- ANSI/cursor stripping and splash row breaks
- Soft-wrap merge with and without character overlap
- Banner/separator/help lines not merged
- Native PTY spawn passes `cols: 80`, `rows: 30` on darwin/win32/linux

### Manual validation (Windows)

1. Restart MGView server after runner changes.
2. **Splash**: banner box rows separate; `Type QUIT` / `Note:` on their own lines; no glued `████████...██` rows.
3. **Equations**: `-> (42)`, `-> (44)`, `-> (48)` each one logical line; no `ccos`, `qqB`, `IIa` artifacts.
4. **UI wrap**: long lines wrap at panel width; no hyphen-only breaks in `IBx-Iby`.

Compare against manual run in a real terminal with the same `.al`/`.txt` file.

## Debugging tips

### Is it server data or CSS?

Copy a suspicious line from the UI. If a newline appears in the middle when pasted into a plain editor, the bug is in **normalization**. If pasted text is one long line but the UI breaks oddly, the bug is **CSS**.

### Raw PTY capture (not implemented yet)

Most useful next step for hard cases: store bytes **before** `normalizePtyOutput()` when `options.debug === true` (e.g. `run.rawOutput` or a temp file). Compare:

1. Raw PTY chunks
2. After `stripTerminalControlSequences`
3. After unwrap
4. Final `run.output`

### Debug run option

Enable **Debug output** in Run Sim / MG Lab configure panel. This appends `[mgview …]` system lines (spawn command, pid, pty mode) but does **not** currently log raw PTY bytes.

## Change history (summary)

1. Strip ANSI/OSC control sequences.
2. Convert cursor-position CSI to newlines for Windows splash.
3. Unwrap 80-column hard wraps with overlap-aware merge.
4. Exclude MG banner/separator/help lines from unwrap merge.
5. UI: `break-all hyphens-none` instead of `break-words`.
6. Kept PTY at **80×30** for validation; wide PTY is not the primary fix.

## Related options

`MotionGenesisRunOptions` (via API):

- `autoQuit` — append `QUIT` via temp input file
- `autoDefaultValues` — reserved for default-value prompts
- `debug` — system log lines in output
- `scrollbackLimit` — trim stored output by line count (`0` = unlimited)

Environment:

- `MGVIEW_MOTION_GENESIS_BIN` — executable path
