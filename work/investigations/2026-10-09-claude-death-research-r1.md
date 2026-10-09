# Death signal research, round 1 (claude): requested by codex #2088

This is research only, with no implementation; the beautification loops close first.

Scratch probes:
- `harness/_vm_probe.js` (live VM fields and globals);
- `harness/_death_frames.js` (read-site PC and frames before and after a command).

## Facts measured

1. **RAM is live.** `ZRamProvider.getMem()` returns a fresh DataView over `__PARCHLOCK_ZVM__.m`, not a snapshot. Zork I `wait` changes globals 2, 113, 115, 120, 126 and 127. My sealed report's "zero globals changed" came from the HHG save, which changes no globals on its death turn either (see 3).
2. **The VM exposes `pc`, `frames` and `stack`** (`lib/zvm.js` `call()`). `frames` is a list of frame pointers into `stack`. Each frame stores `returnPC << 8` in a Uint32 at its pointer. The current read site is `z.pc` while waiting for input, and the call depth is `frames.length`.
3. **HHG (ZIL, v5), the operator's 19-14-16 save, then `look`:**

| State | Read-site pc | Frame depth | Globals changed |
|---|---|---|---|
| Normal turn, fresh start, `look` (control) | 44202, the same before and after | 2 | 45, 65, 85, 91, 95, 114 |
| After the native Restore, before the command | 51401 | 6 | — |
| Death turn ("Better luck next life", then RESTART/RESTORE/HINTS/QUIT) | 51082 | 5 | **none** |

The death turn changes no globals, so there is no ZIL "dead" global to watch in HHG.

## What this suggests (for the proposal, not yet a decision)

- **A deterministic, family-agnostic signal: the read site.**
  - Each story has a main-loop read site, which is the pc of almost every prompt (44202 in HHG). It can be calibrated per story by frequency over normal turns, never by title.
  - The end-of-game question is read from a different routine (51082 here), at a different depth.
- **The read site alone is not enough.** The post-Restore prompt (51401) is also off the main loop, and so are YES/NO confirmations. So an off-main-loop read is a *candidate terminal state*, corroborated by text: the authored end menu (RESTART/RESTORE/QUIT in the last output span). That matches the operator's rule of a deterministic signal verified by text.
- **Death versus win needs one more cue,** because the end menu also follows a win:
  - Inform: `deadflag` (1 means dead, 2 or more means won or custom). It is to be located as the global that becomes non-zero exactly when the read moves to the end-game site, and returns to 0 after RESTART. Not yet measured: it needs a reachable Inform death (wump2ka, a pit or the wumpus, is the cheapest; its cave is random, see the memory note).
  - ZIL: no global (HHG). The authored loss text spans already exist ("Better luck next life", JIGS-UP's "**** You have died ****"), checked only inside the terminal output span before the end menu, never in free narrative. That also addresses codex's point about unguarded prose in `StatTracker.observeText`.
- **Unknown stays unknown.** An off-main-loop read plus an end menu with neither a loss cue nor `deadflag` counts nothing.

## Next measurements (bounded, per "sample until proof")

1. wump2ka (Inform): a death, `deadflag` located, its value 1, and its reset after RESTART.
2. Zork I (ZIL v3): one JIGS-UP death (the grue in the dark, or the troll), to confirm that its end-menu read site differs from the main loop as in HHG.
3. Non-fatal controls:
   - a YES/NO prompt (`quit`, then `n`), which is off the main loop with no end menu, so no count;
   - a Restore prompt, which counts nothing;
   - a win if one is cheaply reachable, otherwise the deadflag 2 path from the Inform source.
