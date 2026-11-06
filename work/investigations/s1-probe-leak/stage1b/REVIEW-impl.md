# Review of the S1 stage 1b implementation (current source), 2026-11-06

Verdict: **ACCEPT**. The mutation proofs for I and J were not run. They are recommended but not blocking, because both scenarios assert the exact fault name.

## Candidate tree
The candidate is `git archive HEAD` (a66fab79) plus the working-copy js/StatTracker.js, js/ZvmCapture.js and harness/probe-action-boundary.js. It is in the reviewer's scratchpad. S4's uncommitted files are excluded.

My first candidate run was invalid. A check after the runs showed the scratchpad copy of js/StatTracker.js was still the HEAD version (no `i6DispatcherGlobal`, file time = commit time). So that run's results (24/16/119/211/13/13, gate 0 diffs) measured HEAD, not stage 1b, and are discarded. That run did give a useful control: on HEAD, MakeItGood logs `routine-without-dispatcher` for both arms and releases the "wide-brimmed hat" paragraph as an event (ev=1). With the 1b code, the run in the main repo directory gives entry 0, ret 212, bad null, and both paragraphs hidden. So the fix is real, and it depends on the 1b code, not on S4's edits.

## Code review against REVIEW.md and Amendment R2: no blocking issues
- **Shape match.** `i6DispatcherGlobal` is byte-exact to census.cjs: 0 locals; A `CF 2F ab Gk 00 AF 00 B0`; B `E0 0B V ab Gk 00 AF 00 B0`. Gk must be >= 16, and only v5/v8 are accepted (x4/x8). Any exception gives null. It is cached per packed address in the per-story cache.
- **Gk read.** `vm.m.getUint16(getUint16(0x0C) + 2k)`, which is correct.
- **Per-frame fields.** `routine` (the same packed `t` as spec.routine) and `nargs` are recorded on each frame. The 1b rule requires nargs === 0.
- **Rebase.** The fault order is:
  1. cap (`outer.length + 1 >= 2`): reentered. This allows exactly one rebase.
  2. `text != entry`: nested-pre-text.
  3. `after >= 0`: nested-pre-after.
  4. Otherwise: push the outer, rebase, reset after to -1.

  On the inner ret, ret is kept and entryDepth is restored to the outer. On the outer ret, the outer is popped and outer-printed is checked. A reentry while the outer is pending gives reentered. A prune below the restored depth gives unwound. If the outer is still pending at takeProbeBoundary, that gives outer-unreturned. After-phase detection stays gated by `ret < 0`. Every fault sets pb.bad, so probeBoundaryCut returns null and the paragraph rule applies.
- **Harness I and J are constructed correctly, not vacuous by design.** Both assert the exact fault name and cut === null, so removing a guard would make them fail. I has not run the mutation tests.

## Runs on the valid candidate (when this report was written)
- probe-action-boundary: 24 PASS / 0 FAIL
- probe-release: 16 PASS / 0 FAIL
- equipment-ui 119/0, stat-tracker 211/0, operator-regressions 13/0 (run twice).
- Focused GLULX gate (anchor, MakeItGood, Advent, Zork1, curses, Alabaster) against the HEAD base: 6 games, 0 differences.
- repro.cjs (Advent, Zork1, anchor, MakeItGood, curses, LostPig): apart from the prompt, 0 released or non-probe lines in every game. MakeItGood is now clean; on HEAD its hat paragraph leaked.

## Follow-up (not blocking)
Mutation proofs:
- remove the Gk check in `_pbDispatcherFault`: I must FAIL;
- remove the outer-printed check in `_pbRet`: J must FAIL.

## Claude closing check: mutation proofs
- Removing the Gk check in _pbDispatcherFault (ZvmCapture.js:248) makes scenario I FAIL (armed, bad null), 23/1.
- Removing the outer-printed check (:294) makes scenario J FAIL, 23/1.
- Both restored: 24/0. I and J are non-vacuous.
