# S1 proposal R1 - adversarial review (stand-in reviewer, 2026-11-05)

Verdict: **REVISE**

## Blocking issues

1. **Stage 1 fixes nothing for the reported repro.** D207's rejection list (PRODUCTION_PLAN.md ~8047) already records the turns-global boundary as rejected because there was "no confirmed slot or banner at first open, live". Anchorhead is a v5+ I6 story, so it has no interpreter turns slot (StatTracker.js:1911, 2205-2210 "ONLY for interpreterStatus (v3)"). Its turns global comes only from `promoteTurnCounter` (StatTracker.js:2272-2290), which needs `TURN_CONFIRM_STEPS + 1` = 4 samples with 0/1 steps. The repro (FINDINGS.md) opens Equipment on turn 1, so the slot is unconfirmed, the proposal falls back to "today's rule, unchanged", and the anchor leak stays. The proposal says "Fixes: Anchorhead" without saying so. It also does not answer the D207 rejection it is reopening. That must be settled before R2: either show the slot is confirmed at first open, or drop the claim.

2. **The I6 ordering claim is unverified for the target build.** For the library source, the claim holds. In 6/10-6/11 parserm.h, `EndTurnSequence` begins with `turns++` (AdvanceWorldClock in 6/11), then RunTimersAndDaemons, RunEachTurnProperties and TimePasses. Older libraries (Anchorhead was built around 1998, library 6/7-6/8) are not checked, and the proposal shows no empirical trace: no turn where a daemon or timer line is printed after the turns write. A "verify on Anchorhead" step is required: one turn with a daemon or timer message, with print chunks logged next to the turns global value. I did not run this. The text above is from the library source only.

3. **Events printed before `turns++` would be hidden.** That is masking a real event. In I6, output before EndTurnSequence includes `react_before`/`react_after` of other objects in scope, `after` routines, `orders`/`life` reactions, and the game's own `GamePostRoutine`/`AfterRoutines` hooks. An NPC reacting to the player's action prints in that phase. Today's rule shows such a line if it is a later paragraph. Under R1 it is hidden because turns has not changed yet. The proposal needs an argument, or a census, that no release game prints an event in the pre-`turns++` phase of an INVENTORY probe. Otherwise it should limit hiding to text the action routine itself prints (see alternative A).

4. **The print hook is underspecified.** It is feasible: `lib/zvm.js` exposes `print:function(t,i)` and `_print:function(t)` on the prototype, and ZvmCapture.js already wraps prototype methods (lines 88-110). Three gaps remain:
   - `_print` diverts to `streams[3]` (memory stream, output_stream 3) when one is active, and I6 uses memory streams for PrintToBuffer and capitalisation. Those chunks never reach the screen and must be skipped, or the boundary shifts.
   - Mapping "by output order" to BufferLines is not reliable. GlkOte merges and splits chunks into styled spans. D207 itself records that the echo, and even the reply, can be written into the pre-existing prompt line (beginProbeOwnership, StatTracker.js ~4370). Whitespace and newlines are normalised differently in the DOM. A workable form is to record the character offset of the boundary in the probe's own printed stream, then cut the concatenated span text at that offset. Fail visible if the texts do not reconcile.
   - Reading the turns global per chunk at print time means a RAM read on every print call. That is cheap, but say so, and gate it on `_statProbeOwned`.

## Non-blocking notes

- **Multi-turn probes:** the comparison is "turns == pre-probe value". If the probe action advances turns more than once, or the game changes `turns` inside the action (a sleep that adds turns), reply text after that write is shown. That is fail-visible, which is acceptable, but list it explicitly.
- **A probe whose action takes no time** (game-made meta INVENTORY, or a `turns` decrement such as a no-time inventory in some games): turns never changes, so everything stays hidden. That is correct, because no turn sequence ran. META verbs already return early (StatTracker.js:4258).
- The prior-fix guard list is right. Add `harness/probe-release.js` (the D207 proof, 16/0) explicitly.

## Simpler bounded alternatives the proposal missed

- **A. The action-routine boundary (FINDINGS.md's own first proposal), I6 only.** Mark the output offset when the grammar action's routine (InvSub) returns. That covers reply vs. the after/react phase more precisely than turns, needs no confirmed slot, and so works at first open. It costs one call/return hook. For I6 alone that is bounded: the action routine is resolvable from the grammar table for the probe verb.
- **B. A boundary from candidate turns globals.** Before confirmation, use the set of globals still in promoteTurnCounter's candidate pool and take the boundary at the first +1 write to any of them during the probe. This removes the first-open gap of issue 1 with the existing data. It still carries issue 3.

R2 should either adopt A, or answer issue 1 with live evidence and issue 3 with a census.
