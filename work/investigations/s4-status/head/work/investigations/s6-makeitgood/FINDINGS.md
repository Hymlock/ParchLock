# S6 - Make It Good: SCORE and first Equipment check end "unavailable" with no reason

Sealed Claude investigation (2026-11-05). Read-only; no js/ edits.

## Decision index
`grep -iE "make it good|unavailable"` in docs/DECISION-INDEX.md: no hits. "Equipment" hits D259, D204 (stat
discovery / probes, §68), D168, D131, D125, D122. None records this reply or the reasonless unavailable path.

## Repro (work/investigations/s6-makeitgood/repro.cjs, output repro-result.json, equipment.png)
regression-gate.cjs setup (seeded Math.random, splash/tutorial keys, settle loop), play.html?story=games/MakeItGood.zblorb.js.
1. Start: no prompt to answer; stats = [time].
2. Player types `score` -> game: "What score do you want? Either someone takes the rap or you do."
   StatTracker: probed=true, scoreUnavailable=false (reply not recognised).
3. `EquipmentUI.Toggle()` -> first-use inventory warning (Message). Dismiss it -> requestStatusFulfillment runs:
   hidden `inventory` (answered fine), then hidden `score` -> same quip.
4. Final: fulfillment="unavailable", unavailableReason=null, _fulfillDiag=[]; strip shows
   "Some current status is unavailable at this prompt." with NO title/reason.
   Instrumented finishProbe: one call, state "unavailable", active probe "score", from js/StatTracker.js:4339.

## Cause
- js/StatTracker.js:748-755 `parseScoreReply` does not recognise Make It Good's no-score reply, so it returns null.
  The player's own SCORE (step 2) therefore never sets scoreUnavailable, and `needsScoreProbe()` keeps
  queuing SCORE on every Equipment open (js/StatTracker.js:3984).
- js/StatTracker.js:4396-4414 `consumeProbeReply`: pending.score stays true.
- js/StatTracker.js:4339: the next prompt replaces the input, so `finishProbe("unavailable")` fires.
- finishProbe (js/StatTracker.js:~4000) sets fulfillment only; it never calls `noteUnavailable`. That's why reason is null
  and the UNAVAILABLE_TEXT title (3614) is missing. The same reasonless path exists at 4064 (Submit refused),
  4072 (5 s deadline) and 4414 (>6 turns). Only 3957/4046 (prompt guards) record a reason.
So yes: the game's own SCORE reply is the trigger. INVENTORY isn't involved (its reply parses fine).

## Proposed minimal fix (two parts)
1. Recognise the game's actual answer: in parseScoreReply, next to the existing per-title exact lines (750-752), add
   `if (/^What score do you want\? Either someone takes the rap or you do\.$/im.test(t)) return {scored:false,unavailable:true};`
   That's the game telling you it has no score. Then the player's SCORE, or the first probe, sets scoreUnavailable,
   and later opens don't re-ask (no wasted turn, no false "unavailable").
2. Give every unavailable ending a reason: have finishProbe("unavailable") callers call noteUnavailable with a
   specific reason (e.g. "unrecognisedReply" for 4339/4414, "submitRefused" 4064, "noReply" 4072). Add matching
   UNAVAILABLE_TEXT entries. Check that the one-shot retry in noteUnavailable doesn't loop on a reply that can't be
   recognised (the retry already spends its transaction once, per _retryTxn).
No-masking: part 1 resolves the state from the game's own printed reply (the same mechanism as the other three
exact-line no-score titles), so nothing is hidden. Part 2 adds diagnostics; it doesn't suppress anything. The hint
stays and gains its true cause.

Guards to run: harness/operator-regressions.js, regression-gate.cjs three-type check, D204 harnesses
(harness/command-disambiguation.js, harness/equipment-ui.js).
