# Review of stage1b PROPOSAL.md (adversarial, standing in for absent seats), 2026-11-05

Verdict: **REVISE** (two small blocking specification gaps in the rebase rule; shape matching and census are sound).

## Census (item 1), 80 release titles, `census.cjs` in this folder
`node work/investigations/s1-probe-leak/stage1b/census.cjs "$PWD"`. Scans every routine-aligned 0-locals header for the exact bytes of shape A (`00 CF 2F hh ll Gk 00 AF 00 B0`) and shape B (`00 E0 0B VV VV hh ll Gk 00 AF 00 B0`), and requires the constant to equal `StatTracker.decodeI6ActionLayout(mem).actionBase`.

| Result | Titles |
|---|---|
| Shape A, constant = actionBase | 38 |
| Shape B (strict RT__ChLDW), constant = actionBase | 9 |
| Layout decodes but neither shape | 8: Delusns, Informat, LASH, spring, Tangle, awaken, edifice, doll |
| More than one matching routine | 0 |
| No layout (stage 1 already unarmed: I7, v3/v4, non-Inform) | 20 |
| Glulx | 5 |

The 8 "neither" titles use an older library that inlines `indirect(#actions_table-->action)` (`cf 2f <ab> Gk 00 af 00 0d ...`) inside a larger routine, so the parent frame is not a dispatcher. They stay unarmed under the paragraph rule. That is fail-visible, so it is a residual, not a blocker. No title has two matching routines. Across all 75 Z titles, no shape-A/B routine carries a non-actionBase constant where a layout exists. Heliopause has shape A but no layout, so it is unaffected.

Shape robustness: v5 and v8 differ only in the packing multiplier, and the census covers both (v8: MakeItGood-style A; csbb, baron_EN and saveprinceton are B). The 0-locals plus three-instruction exact body plus constant == actionBase test cannot match a non-dispatcher by accident, because such a routine *is* `indirect(actions_table-->Gk)`. The runtime Gk == spec.action check is a second guard. B's unchecked veneer is safe: an out-of-range RT__ChLDW error implies Gk != spec.action.

## Blocking issues
1. **Rebase must handle a pre-rebase `after`.** The proposal says to "set entry/entryDepth/after from the inner". The nested path InvTallSub -> R_Process -> BeforeRoutines/GamePreRoutine runs before the inner entry. If any (obj, after|react_after)-shaped call happened there (a game's own routine, RunRoutines), pb.after would already be >= 0 and outer-relative. Required: at rebase, fault `outer-printed`/`nested-after` if pb.after >= 0, else reset it to -1. Text from react_before inside the nested dispatch is already caught by `text.length === pb.entry` (fail-visible, correct). Name the fault honestly, for example `nested-pre-text`, not `outer-printed`.
2. **State machine after the inner ret is unspecified.** `_pbRet` sets ret only while `pb.ret < 0` at `entryDepth+1`, and `_pbPrune` faults `unwound` relative to entryDepth. After the inner ret, the implementation must (a) keep pb.ret = inner ret for probeBoundaryCut, (b) restore the outer entryDepth from pb.outer for the unwound check and the outer-ret detection, and (c) stop after-phase detection (it is already gated by ret < 0). It must then require text.length === inner ret at the outer ret. If the outer frame never returns before takeProbeBoundary, that is a fault, not success. Spell this out, and add a unit or constructed proof: an outer InvSub that prints after `<<Inv>>`-style delegation must give `outer-printed`, and the paragraph rule must apply.

## Non-blocking
- Item 2 (both sides): entry side `text.length === pb.entry` and exit side `== inner ret` together cover outer text before and after delegation. The only hide path left is text the inner prints before its after phase, which is the reply itself. That is correct.
- A different action dispatched inside the reply (an invent routine doing `<<Examine x>>`) stays inside [entry, after) and hidden. This predates stage 1 and arguably is reply text. Note it only.
- Item 3 (stack cost): one extra property (`routine: t`) per pushed frame, under the existing PB_STACK_CAP, only while armed. Negligible. Failure modes: `t` must be the same packed form as spec.routine (stage 1 already relies on this). `dispatcherGlobal` must be decoded outside the hot hook or cached per pk, and a decode exception there must give `routine-without-dispatcher`, not `hook-exception`. Reading Gk at the action-routine call is correct, because the dispatcher's loadw has already run. Use `vm.m` with the header globals word (0x0C) and 2*k.
- Item 4: enough. Daemons run in EndTurnSequence after the dispatcher returns, so they are post-ret by construction. Anchorhead B exercises the same post-ret cut code path. Keep it as a recorded residual. Proof H (react_after shown inside a natively armed stock InvSub) is the more valuable new proof and must stay required.

## To ACCEPT
Amend the rebase paragraph for issues 1 and 2, and add the constructed proof for 2. Adopt this census as the closed residual (47/55 layout titles armable; 8 inlined-dispatcher titles stay on the paragraph rule).
