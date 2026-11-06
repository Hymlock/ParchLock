# S1 stage 1b implementation (no-argument ActionPrimitive dispatcher), 2026-11-06
Implements PROPOSAL.md + Amendment R2 and REVIEW.md, on top of stage 1 (49922cea). Diff: `s1b.diff` (js/StatTracker.js +33, js/ZvmCapture.js +50/-9, harness/probe-action-boundary.js). Not committed. js/WorldModel.js (M14, other worker) untouched. Bus claims could not be taken: the harness was down (`worker-client status` -> `fetch failed`).

## Code
- **StatTracker.i6DispatcherGlobal(mem, pk, actionBase)**: exact byte match of the routine at packed pk (v5 x4, v8 x8). 0 locals, then exactly
  - A `CF 2F <actionBase> Gk 00 | AF 00 | B0` (loadw #actionBase Gk -> sp; call_1n sp; rtrue), or
  - B `E0 0B <V> <actionBase> Gk 00 | AF 00 | B0` (call_vs #V #actionBase Gk -> sp; call_1n sp; rtrue; V unchecked).
  Gk must be a global (byte >= 16). Returns k or null; any exception gives null. Same bytes as census.cjs.
- **i6ProbeActionSpec** adds `actionBase` and `dispatcherGlobal(pk)`, which is cached per packed address in the per-story `_i6ActionCache`.
- **ZvmCapture**:
  - every stack frame records `routine` (packed `t`, the same form as spec.routine) and `nargs`.
  - `_pbDispatcherFault(parent)`: stage 1 rule (arg0 === action) or 1b rule (nargs 0, dispatcherGlobal(parent.routine) = k, and `vm.m` u16 at header[0x0C] + 2k === action). It returns `routine-without-dispatcher` or `dispatcher-action-mismatch`.
  - Nested rebase (R2): on a dispatcher-direct re-entry while active, it faults in this order:
    - over the cap of 2 levels: `reentered`;
    - text.length != entry: `nested-pre-text`;
    - after >= 0: `nested-pre-after`.
    Otherwise it pushes {entry, entryDepth} onto `pb.outer`, rebases entry/entryDepth to the inner call, resets after to -1, and sets `pb.nested`.
  - Inner ret: ret = the inner offset, and entryDepth is restored to the outer depth.
  - Outer ret: it pops the outer, and text.length != ret gives `outer-printed`. A non-dispatcher re-entry while the outer is pending gives `reentered`. An unwind while the outer is pending gives `unwound`. If the outer is still pending at takeProbeBoundary, that gives `outer-unreturned`.
  - Every fault keeps the paragraph rule (probeBoundaryCut returns null on pb.bad).

## Runs
- `harness/probe-action-boundary.js`: **24 PASS / 0 FAIL**. Old scenario D (MakeItGood unarmed) is replaced by F, because MakeItGood is now armed.
  - A, B, C, E (anchor): unchanged.
  - F (MakeItGood, native): armed, entry 0, ret 212. Both paragraphs are hidden; only ">" is shown.
  - G (Advent, native): the first probe is nested, entry 0 / ret 110, and the whole list is hidden. The later probe is not nested, entry 0 / ret 94, and is hidden. The harness re-enables `_carryProbeUseless` to drive the second probe, because Advent has no carry stats.
  - H (Advent, constructed print at the first (obj, react_after) call inside the stock AfterRoutines): after = 110 inside [0, 163]. The parrot line is shown as an event and the list stays hidden.
  - I (MakeItGood, constructed): the action global is poked to action+1 around the InvSub call, giving `dispatcher-action-mismatch` with cut null.
  - J (Advent, constructed): the outer InvSub prints after the nested return, giving `outer-printed` with cut null.
- probe-release 16/0, equipment-ui 119/0, stat-tracker 211/0, operator-regressions 13/0 (run twice).
- `repro.cjs` -> `run-1b.jsonl`. Lines without pl-stat-probe or with data-pl-probe-event:
  - anchor, Advent, Zork1, curses, LostPig: none (the same as run-stage1.jsonl).
  - MakeItGood: none. Stage 1 released the "wide-brimmed hat" paragraph, so MakeItGood is now clean.
  - Note: repro's own `leaked` field uses computed style and lists every line in both the stage-1 and 1b runs. It is not a usable signal here.
- Three-type gate: GLULX=1 with anchor, MakeItGood, Advent, Zork1, curses and Alabaster.gblorb. Base = `git archive HEAD` + those games (robocopy /XJ); candidate = base + the two js files. Result: **6 games, 0 differences**.

## Residuals (unchanged from proposal)
- 8 inlined-dispatcher titles stay on the paragraph rule.
- No native end-of-turn daemon proof on a stock title.
