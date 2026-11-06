# S1 stage 1 adversarial review (stand-in reviewer, 2026-11-05)
Verdict: **REVISE** (one blocking point, the rest pass).

Candidate tree: HEAD via git archive, plus js/StatTracker.js and js/ZvmCapture.js only. The M6 WIP is excluded.

## Runs (candidate)
- harness/probe-action-boundary.js: 11 PASS / 0 FAIL
- harness/probe-release.js: 16/0. harness/equipment-ui.js: 119/0. harness/operator-regressions.js: 13/0.
- repro.cjs, base vs candidate. Released lines are those without pl-stat-probe, excluding ">".
  - anchor: base releases "The pockets of your trenchcoat are empty."; the candidate releases nothing. **Clean.**
  - MakeItGood: same on both (shoes line, routine-without-dispatcher).
  - Advent, Zork1, curses, LostPig: nothing released on either. **Unchanged.**
- Focused regression-gate, GLULX=1 (anchor, MakeItGood, Advent, Zork1, curses, Alabaster.gblorb): 6/6 identical to base.
  The gate does not open Equipment, so this only shows there is no collateral change.

## Attack results
- **Cost and safety when disarmed: PASS.** Each wrapper does `ZvmCapture._pb` null test, then `apply`. The install is guarded once by `_origCall`. Hook bodies are wrapped in try/catch and set `bad`, and `bad` gives null, so today's rule runs.
- **Genericity: PASS.** decodeI6ActionLayout uses only header staticMem, the GV2 structure, ENDIT=15, and the routine-header check. Every pointer must equal the parse position. i6ProbeActionSpec uses dictionary byte 6 bit 0 and 255-byte7, with a unique bare non-reversed line. No addresses are hard-coded; anchor's 0x2d1c/27 is derived.
- **Failure paths: PASS.** routine-without-dispatcher, reentered, unwound (@throw prune), hook-exception, text mismatch, a straddling line, and reply-not-on-screen all return null, and the unchanged paragraph loop runs.
- **I7/ZIL exclusion: PASS.** ZIL is v3 (or non-Inform) and fails the v5/v8 + isInformCompiled gate. I7 is rejected by ik1_count/ik1_link. Glulx is never patched (ZVM only).
- **"Real events can never be hidden": FAIL (blocking).** PROPOSAL-r2 and IMPL rest on "react_after/after run after the action returns". That is not true of the standard I6 library. In 6/10-6/11 verblibm.h, InvSub (and InvTallSub/InvWideSub) ends by calling `AfterRoutines()` itself. That runs react_after over scope, the actor's/location's after, and GamePostRoutine, so all of that output lies between entry and ret and is classed **reply (hidden)**. Today's paragraph rule would show it as a later paragraph. That is exactly REVIEW-r1 blocking 3.
  - The anchor trace (trace-r2) does not show this, because Anchorhead replaces InvSub: its only direct callees are 2x routine 11144 (list writer), and there is no AfterRoutines.
  - Untested genericity: any standard-library I6 release game with a non-empty inventory gets the hidden after-phase.
  - Required, one of:
    - (a) End the reply at the entry of the action routine's after-phase call. This needs a generic identification of AfterRoutines, e.g. a direct callee of the action routine that is also called directly by the dispatcher for other actions, with proof.
    - (b) Arm only when the located routine provably makes no such call. Check this per story, from the trace or a static scan of the routine body for a call to the library's after routine.
    - (c) A census proving that no release I6 game prints in the Inv after-phase, plus a harness scenario with a constructed react_after on ##Inv that must stay visible.
  - Before choosing, verify on a stock-library game (e.g. curses or Advent with an item carried): list InvSub's direct callees.

## Minor (fix with the revision)
- `_pbCall` keeps pushing after `bad="stack-overflow"`. Stop recording once `bad` is set, which also bounds `pb.text`.
- If a probe span ever ends without `endProbeOwnership`, `_pb` stays armed and `pb.text` grows until the next begin. Disarm on any ownership reset, or cap the text length.
- IMPL says text "after its return (react_after, daemons, timers)". Correct the wording to daemons/timers/EndTurnSequence only.

## Re-review (rev 2), 2026-11-05: **ACCEPT**
Candidate: a fresh git archive of current HEAD (51bef06e), plus only js/StatTracker.js and js/ZvmCapture.js. The M6 work-in-progress files are excluded.

**File sanity.** `git diff --stat HEAD` shows StatTracker.js +158/-0 and ZvmCapture.js +105/-0. Neither file has any deleted or changed HEAD line. Every ZvmCapture hunk is S1 code: the hooks, PB caps, arm/take/_pbLive/_pbPrune/_pbCall/_pbRet. `node --check` passes. The rebuild from HEAD is clean.

**Runs (candidate):**
| Check | Result |
|---|---|
| probe-action-boundary | 14/0 |
| probe-release | 16/0 |
| equipment-ui | 119/0 |
| operator-regressions | 13/0, twice |
| stat-tracker | 211/0 |

The earlier stat-tracker crash was the stale harness, fixed at HEAD f0e6c484 (S8). It passes on both base and candidate.

**repro.cjs:** anchor releases nothing, where base leaked the pockets line. MakeItGood is unchanged (the shoes line). Advent, Zork1, curses and LostPig release nothing.

**Focused gate (GLULX=1; anchor, MakeItGood, Advent, Zork1, curses, Alabaster.gblorb):** 6/6 identical to base.

**Blocking point 1 is resolved.** Reply = [entry, after-or-ret). The after phase begins at the entry of the action routine's direct callee that makes the first (obj in 1..objMax, after|react_after) call. Scenario E proves the shape. IMPL records a native trace of Advent's AfterRoutines with calls (obj,27) and (37,5).

**Attacks on the after-phase detection:**
- **False triggers can only show text, never hide it.** An early `after` widens the event region. The objMax bound blocks the coincidental `(17648,5)` call. A stock InvSub that delegates to InvTallSub/InvWideSub would set `after` at that helper's entry, which shows the whole list. That leaks, matching today's behaviour, but it cannot mask.
- **AfterRoutines shapes are covered:**
  - react_after on the player, or on any object in scope, compiles to (obj, prop) with obj in range.
  - The location's `after` is reached through stock RunRoutines(location, after), which is called unconditionally when location ~= 0.
  - GamePostRoutine runs inside AfterRoutines after those calls, so the outer-callee offset covers it.
- **Residual misses (not blocking):** a Replaced AfterRoutines with no (obj, prop) call, or location == 0, would hide GamePostRoutine output. No release title that the cut currently arms has such a library. Today only Anchorhead arms. Advent and MakeItGood fail the dispatcher test (routine-without-dispatcher).
- **Property-name reliance is fail-safe.** A title without names, or without both `after` and `react_after`, or where they are equal, is never armed and keeps today's rule.

**Minor points are fixed:** after any fault, recording stops. Stack (4096) and text (20000) caps drop their state and mark `bad`. `_pbLive` disarms once `_statProbeOwned` is false. The IMPL wording is corrected.

**Stage 1b, for when a no-argument dispatcher is armed:** re-check the InvTallSub delegation (it leaks only), and prove a native, armed, stock-library title.
