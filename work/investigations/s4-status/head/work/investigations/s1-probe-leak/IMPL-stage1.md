# S1 stage 1 implementation (I6 action-routine boundary), claude, 2026-11-05. Revision 2 answers REVIEW-stage1 (REVISE)
Diff: s1-impl.diff (js/StatTracker.js +158, js/ZvmCapture.js +105, new harness/probe-action-boundary.js). Not committed.

## Correction to rev 1
Rev 1 claimed that react_after/after run after the action routine returns. **That is wrong for the stock library.** The reviewer's point was verified natively on Advent.z5 (stock 6/11-era library), with `in | take all | inventory` and a call/ret/_print trace (scratch tracer, same hook points):
- The actions table gives InvSub = 0x445b. The dispatcher 0x3734() takes **no argument**.
- InvSub re-runs itself through a nested `<Inv>`. The inner InvSub runs from offset 0 to 110.
- Inside it, at o110 before return, come `0x5c8a(obj,27)` for each scope object (react_after = property 27) and `0x3811(37,5)` (RunRoutines(obj, after); after = property 5). That is AfterRoutines.
- So after-phase output **falls inside [entry, return]**. Anchorhead replaces InvSub (no such calls; entry 0, return 162), which masked this.

## Design (rev 2)
- **ZvmCapture.js** wraps ZVM `call`/`ret`/`_print` once. Disarmed, the cost is a null test. Armed with {routine, action, afterProps, objMax}, it:
  - counts main-window screen text only (not stream 3, not the status window);
  - keeps a call stack of (frames.length depth, arg0, text offset);
  - sets **entry** when the routine is called as a direct callee of a frame whose arg0 is the action number (the dispatcher);
  - sets **after** at the first call inside the routine made with args (object 1..objMax, after|react_after). The value is the text offset at entry of the routine's direct callee that contains that call (AfterRoutines), or the call's own offset when the routine makes it directly. The object bound excludes coincidences such as Advent's `0x5ca9(17648,5)`;
  - sets **ret** at the routine's own `ret`.
  - Faults (`bad`) stop all further recording: routine-without-dispatcher, reentered, unwound (@throw), stack-overflow (cap 4096; stack and text are dropped), text-cap (20000 chars), hook-exception.
  - It disarms itself whenever StatTracker no longer owns a span, so a probe that ends abnormally cannot keep recording.
- **StatTracker.js**:
  - `decodeI6ActionLayout` reads the story's own GV2 grammar and actions tables. It requires exact parsing, and every action entry must be a routine. It also requires the story's property names: no I7 ik markers, plus `after` and `react_after` numbers. Without these the after phase is unprovable, so nothing is armed.
  - `i6ProbeActionSpec(verb)` handles a single-word verb with exactly one bare, non-reversed grammar line. The spec is armed in `beginProbeOwnership` and taken in `endProbeOwnership`.
  - `probeBoundaryCut`:
    - reply = [entry, after or ret) and stays hidden;
    - text before entry, from the after phase, and after return is shown as an event (`data-pl-probe-event=1`);
    - every span line must match the VM text in order, with no line straddling a cut, and all reply text must be on screen.
    - Otherwise today's paragraph rule runs unchanged.

## Scope and fail-visible
- MakeItGood is Inform 6, not I7. Advent has the same issue. Their dispatchers pass no argument, so they are never armed (`routine-without-dispatcher`) and keep today's rule. Accepting a no-argument dispatcher is stage 1b and needs its own proof.
- ZIL and I7 are never armed. Multi-word verbs are not armed.

## Evidence item 5 (react_before before entry)
- No reachable early Anchorhead reaction prints during INVENTORY. The garbage can in the Alley is the only early react_before object; a trace of `southeast | inventory | search garbage | inventory` showed InvSub entry at 0 every time.
- Constructed equivalent (scenario C): a VM print inside the dispatcher before InvSub is shown.

## Runs (rev 2)
- `harness/probe-action-boundary.js`: **14 PASS / 0 FAIL**:
  - A: first open, no pockets leak.
  - B: the whistle daemon after return is shown.
  - C: the constructed react_before is shown.
  - **E (new)**: a constructed AfterRoutines direct callee with (player, react_after), printed just before InvSub returns. Recorded after=162 inside [0, 215]; the parrot line is shown and pockets stay hidden.
  - D: MakeItGood is unchanged.
- `harness/probe-release.js` 16/0; `harness/equipment-ui.js` 119/0; `harness/operator-regressions.js` 13/0; `harness/stat-tracker.js` **211/0**.
  - In rev 1, stat-tracker crashed at line 632. The crash reproduced with HEAD's StatTracker, so it was not this change, and it no longer occurs.
- `repro.cjs` (run-stage1.jsonl): anchor is clean. MakeItGood is unchanged (only its "wide-brimmed hat" line is released). Advent, Zork1, curses and LostPig are clean.
- The three-type regression gate (regression-gate.cjs) was **not** run. It is required before commit.

## Notes
- Scenario E drives the hook entry points by hand, because no release title reached so far arms the cut and has a stock InvSub. A native armed stock-library title would strengthen this; none was found.
- During rev 1 evidence work, trace.cjs overwrote trace-r2/anchor.z8.js.trace.json. It was restored from git. The untracked anchor.z8.js.mem.bin was rewritten with an equivalent dump.
- During rev 2, js/ZvmCapture.js was rebuilt from HEAD plus this lane's hunks after a bad scripted splice. This file had no other lane's edits.
