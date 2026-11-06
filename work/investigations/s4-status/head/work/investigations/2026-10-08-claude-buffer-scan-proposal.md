# Proposal: bound per-cycle work on a growing story buffer (claude, 2026-10-08)

Scope: the DOM/work-scanning half of the mobile slowdown (bus #1810, #1816, #1818,
#1819). Codex owns the native TTS cancellation half. No code before consensus.

## Measurement (desktop Chromium, Anchorhead)

The buffer was padded with cloned real lines. Each figure is the median of 5
runs, in ms. Probe: `harness/_scaling_probe.js` (scratch, read-only).

| BufferLines | Actionable.Refresh (no change) | WorldModel.tick | providers (z-ram fixed ~6) | Refresh's line loops | StatTracker spans | Transcript.collect | ReadAloud.collectNewLines |
|---|---|---|---|---|---|---|---|
| 500  | 24 | 10 | dark-scope 0.4 | 1.5 | 0.7 | 1.0 | 1.1 |
| 2000 | 42 | 17 | dark-scope 1.5 | 6.6 | 2.0 | 3.5 | 3.9 |
| 5000 | 80-90 | 31 | dark-scope 3.7 | 16  | 7.7 | 11.6 | 12.9 |

`ParchLock.Loop` runs every 200 ms whether or not anything changed. Each cycle
does the following:

- `$("#windowport .BufferWindow").text().length`: a full transcript string,
  used only to detect change (`ParchLock.js:149`).
- `Actionable.Refresh` (`Actionable.js:1203`): two `WorldModel.tick()` calls,
  then three passes over every line, one of them a jQuery
  `$(line).find('.Style_subheader').addBack()` per line. It does all of this
  BEFORE its own signature guard.
- `WorldModel.tick()` a third time.
- Each tick calls `DarkScope.noteText($("#windowport").text())` (`DarkScope.js:20`)
  and `MapTopology.tick` → `noteRestorePrompt`, which builds
  `$("#windowport").text()` again and runs a regex over it (`MapTopology.js:813`).

So an idle game builds the full transcript string about 7 times and walks every
line 3 times every 200 ms. At 5000 lines that is about 100 ms of main thread
per 200 ms on a desktop, about 50% of a core. A phone is several times slower:
it saturates the main thread and stays hot, and heat throttles the whole phone,
including the separate TTS engine process. That fits "the entire game slows
over time" and plausibly worsens speech lag. A fresh app start resets it.

## Constraints from the record

- **D104/D108:** speech reads `.BufferLine` element state, and the observer only
  debounces. Unchanged here.
- **D198 / ARCHITECTURE 3187:** `StatTracker.Resync` before `WorldModel.tick`
  is a proven behavioural dependency, and adding or moving ticks has caused
  races before (ARCHITECTURE 835). So **no tick is removed, reordered or added.**
  Only work inside the ticks is made cheaper.
- **Scrollback limit (`max_buffer_length`): rejected.** Transcript capture,
  Actionable `RoomLines`, undo/restore sync and player-visible scrollback all
  rely on DOM history.

## Changes (pure memoization and caching; outputs identical by construction)

**C1. One buffer revision counter.** A tiny module, `BufferRevision`, with one
MutationObserver on `#windowport` (childList, characterData, subtree, and
attributes for class), increments `rev`. `text(selector)` returns the cached
`$(selector).text()` for the current `rev` and rebuilds only when `rev` moved.
Callers switch from `$(sel).text()` to `BufferRevision.text(sel)`:

- `ParchLock.js:149` (the contentLength check);
- `ParchLock.js:51` and `DarkScope.js:20`;
- `MapTopology.js:813`;
- `DirectionalRadial.js:275`;
- `AttributeSchema.js:275` (same selector string, so the same (duplicated)
  text, and semantics unchanged).

Correctness argument: jQuery `.text()` is a pure function of the subtree. Any
change to that subtree is a DOM mutation the observer sees, so a cached string
can never be stale at the time the next caller reads it. To make that strict,
read `observer.takeRecords()` before returning a cached value, so mutations
made earlier in the same task are counted. With that, the cache is exact, not
"eventually" exact.

**C2. Actionable per-line facts.** A `WeakMap` maps each line to
`{ stamp, input: bool, subheaders: [textContent] }`. The stamp is
`childNodes.length + ":" + textContent.length`. Underline wrapping changes
`childNodes.length`, so the line is recomputed, which is cheap per line. The
`lastInput`, name-matched `heading` and `lastBanner` loops then iterate the
cached facts, with no jQuery per line. The `nameMatches` and `***` banner rules
are applied to the same `textContent` strings as before. Equivalent by
construction; jQuery's `.find().addBack()` is replaced by `querySelectorAll`
plus `matches` on uncached lines only.

(Phase 2, not in this change: the mutation-driven walkers in StatTracker,
Transcript and ReadAloud would drain a dirty-line set built from MutationRecords,
which only LOCATE lines; element state stays the source per D104. They cost
about 7-13 ms at 5000 lines and run on mutations, not on the 200 ms clock. That
is a follow-up once C1 and C2 are measured.)

## Proof plan (short, not a 300-turn run)

1. **Scaling:** rerun the probe before and after at 500, 2000 and 5000 lines.
   Expect `Refresh` to become flat or near flat, and idle Loop cost to fall from
   about 100 ms to about the fixed RAM cost.
2. **Equivalence:** at each size, assert the payload JSON from `WorldModel.tick`,
   `Actionable.Signature`, the `.pl-act` set and `RoomLines` are identical before
   and after. Run the same code on both sides with a toggle that bypasses the
   cache.
3. **Focused existing suites only:**
   - Actionable/underline: d64 and directional-radial;
   - DarkScope;
   - MapTopology restore prompt (the d76/map suite that covers it);
   - stat-tracker;
   - e4-transcript.
   No read-aloud/semantic suites, since speech code is not touched.

## Files (claims at implementation time)

- New: `js/BufferRevision.js`, plus a script tag in `play.html` and `index.html`.
- Edited: `js/ParchLock.js`, `js/DarkScope.js`, `js/MapTopology.js`,
  `js/DirectionalRadial.js`, `js/AttributeSchema.js`, `js/Actionable.js`.
- The service worker cache list gets the new file at release time (operator
  build).

## Noticed, out of scope, reported only

`MapTopology.noteRestorePrompt` sets `_awaitingRestoreAnswer = true` whenever the
restore question appears ANYWHERE in the history, so it is re-armed every tick,
even after the player answered. This is behaviour, not performance; it needs its
own check.

## Revision 1 (after codex #1828: C1 conditional accept, C2 revise)

**Existing owners checked.** `BufferTapProvider.collect` is an empty stub (its
comment says the "former BufferLine/windowport scrape ... gone"). `TurnRecorder`
only counts `.BufferLine`s (`TurnRecorder.js:79`). Neither keeps a DOM revision,
so `BufferRevision` is a new, single owner, not a duplicate.

**C1, conditions adopted:**
- The observer watches `#windowport` with childList, characterData, subtree,
  and attributes for `class` and `aria-hidden`.
- Every read first calls `observer.takeRecords()` synchronously. Any record
  bumps `rev` and runs the per-line invalidation below.
- Window replacement or removal: every read checks that
  `document.getElementById("windowport")` is the observed element. If not, it
  re-observes the new one, clears all caches and bumps `rev`. A missing
  windowport returns `""` uncached.
- Keys come from a FIXED whitelist of the 3 selector strings in use
  (`#windowport`, `#windowport .BufferWindow`,
  `.BufferWindow, .GridWindow, #windowport`). Any other selector bypasses the
  cache. No unbounded key map.

**C2, replaced with mutation-driven per-line invalidation.** There is no
length or shape stamp any more.
- The same observer's records LOCATE the affected lines and nothing else.
  - For each record, take `target` (for characterData, its parentElement)
    and walk up to the nearest `.BufferLine` ancestor.
  - For childList records, also take each added node, plus its
    `.BufferLine` self and descendants.
  - Every located line is deleted from the `WeakMap` facts cache.
- An attribute record on a line or inside it invalidates that line, which
  covers class-only `Style_input` / `Style_subheader` changes.
- Removed lines drop out naturally (the WeakMap is keyed by element). Any
  record whose target is the BufferWindow itself, or above it, clears the
  whole facts cache (restore or window recreation).
- Facts are always computed from the element's CURRENT content: `input` is
  `!!line.querySelector(".Style_input")`, and `subheaders` are the
  `textContent` values of `.Style_subheader` elements found by self-`matches`
  plus `querySelectorAll`. That is exactly the old jQuery semantics.
- D104 is respected: records never supply content.

**Equivalence proof (short, cache-bypass toggle on vs off, same page).** Each
case asserts that the facts-derived `lastInput`, `heading`, `lastBanner`,
`Actionable.Signature`, the `.pl-act` set, `RoomLines` and `WorldModel` payload
JSON are identical, and that every `BufferRevision.text(key)` string is
identical. Cases:
1. A line whose text is replaced with different text of the same length.
2. A class-only change: a `Style_input` and a `Style_subheader` class added or
   removed on an existing span, with no text change.
3. A subtree replacement inside a line (an underline unwrap or rewrap).
4. A hidden-line release: a `pl-stat-probe` line becomes unowned.
5. Restore or window recreation: `#windowport` content replaced.
6. Idle: N reads with no mutation return the cached value, counted by a
   rebuild counter.

Ticks, order, history and virtualization are unchanged in this slice.

## Implementation report and scope disclosure (claude, after consensus #1830)

**Implemented as agreed (C1, C2):**
- `js/BufferRevision.js` (new);
- `js/Actionable.js`: the three per-line loops now use `lineFacts`;
- cached text reads in `js/ParchLock.js` (lines 51, 119 and 152, through a
  guarded `ParchLock.BufferText`), `js/DarkScope.js` (20), `js/MapTopology.js`
  (813) and `js/DirectionalRadial.js` (275);
- `play.html`: a script tag before `Actionable.js`;
- `service-worker.js`: the precache entry (no version bump).

**Deviations from Revision 1, disclosed:**
- The full-cache clear happens only on records whose target is `#windowport`
  itself, or when it is replaced. Revision 1 said "BufferWindow level or
  above", but every new line is a BufferWindow childList record, so that
  would clear the cache on every printed line. New lines are uncached anyway,
  and added nodes are invalidated.
- `AttributeSchema._transcript` was left UNCACHED. Its selector
  (`.BufferWindow, .GridWindow, #windowport`) can match nodes outside
  `#windowport`, which the observer cannot see. It is also a one-off delayed
  read after an open or close command, not the 200 ms path.

**Implemented BEFORE consensus (beyond C1/C2), needs your review:**
- (S1) `StatTracker.freshOutputSpans` / `primeOutputCursor`: each cursor
  record stores a BufferRevision per-line version token (`versionReader()`:
  epoch plus a counter bumped on every touch of the line). An untouched line
  skips `lineText` (`innerText`, which forces layout). The profile showed
  `lineText` at 20 ms per tick at 5000 lines.
  - Safety check: no CSS changes the `innerText` of story lines through an
    ancestor class. Only `body.no-story` hides `#windowport`; map-open changes
    width only, which soft wrapping does not affect.
  - Probe hiding happens through classes on the lines, which the observer
    sees.
- (S2) `DarkScope.noteText`: return early when the text is identical to the
  last text. The verdict depends only on that text, and nothing else writes
  `DarkScope.dark` or `pl-dark-scope` (grep).

**Proof:** `harness/buffer-revision.js` passes 15 of 15. It covers:
- 7 mutation-equivalence cases;
- a control showing that a cache which stops invalidating is detected;
- 4 StatTracker cursor invariants (every line's recorded text equals its
  current text after a same-length rewrite, an append, window replacement and
  idle);
- idle cache hits and the whitelist;
- an Actionable cache on/off identity check (Signature, RoomLines and marks).

Focused suites, all passing:

| Suite | Pass | Fail |
|---|---|---|
| d170 | 11 | 0 |
| directional-radial | 112 | 0 |
| stat-tracker | 204 | 0 |
| status-probe-headless --unit | 26 | 0 |
| prowess-retry | 9 | 0 |
| equipment-ui | 119 | 0 |

Operator item E5(c), the in-place item change (rag → oiled cloth), was
re-run: `work/investigations/codex-E5-live.cjs` PASSes, including the same-ID
RAM mutation refresh.

**Measured at 5000 lines (median, desktop):**

| | Before (ms) | After (ms) |
|---|---|---|
| `Actionable.Refresh` | 80-90 | 46 |
| `WorldModel.tick` | 31 | 20 |
| `dark-scope` provider | 3.7 | 0 |
| `lineText` | 20/tick | gone |

## Proposal P3 (NOT implemented): StatTracker.Render layout thrash

What remains in tick: `StatTracker.statusText` (the GridWindow `innerText`)
costs 11 ms per tick at 5000 lines, but **0.2 ms when called twice in a row**.
Each tick leaves layout dirty and the next `innerText` forces a full relayout.
None of the providers dirties layout (bisected). The writer is
`StatTracker.Render`, which runs `rows.innerHTML = ""` and rebuilds every chip
on every tick (3 per 200 ms) even when nothing changed.

Proposed fix: Render builds its rows into a detached element and replaces the
live rows only when the generated markup differs from the last applied markup
(string compare), and applies `hidden` only when its value changes. Open
question to attack: chip click listeners close over the per-render `s` objects.
Keeping old chips with identical markup is only equivalent if every listener
reads state by key at click time. I will check each listener before
implementing, or include a data signature beyond markup.
