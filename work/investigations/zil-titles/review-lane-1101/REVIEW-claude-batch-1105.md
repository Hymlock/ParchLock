# Adversarial review: batch 1105 (S6, M5, M4, m11 HHG). Reviewer: Claude stand-in (not the author)

Reviewed: `git diff -- js harness` against HEAD 9697acdf. The harness/m11-dark-scope.js change was already committed in fa207049 during the review, so the live diff is now StatTracker.js and ModuleStatFactsClaude.js only.

| Item | Verdict |
|---|---|
| S6 StatTracker (Make It Good score reply + finishProbe reasons) | ACCEPT |
| M5 guess playerGlobal 20 | ACCEPT |
| M4 yagwad playerGlobal 21 | ACCEPT |
| m11 HHG in-bed expects dark cleared | ACCEPT (already committed in fa207049) |

No blocking issues.

## (a) S6
- Retry conflict: none. finishProbe only sets `unavailableReason` and a `_fulfillDiag` entry. It never touches `_fulfillRetry`. Before this change these four paths also armed no retry, so retry behaviour is unchanged. noteUnavailable (StatTracker.js:3857) remains the only place that arms a retry.
- Stale reason: `unavailableReason` is cleared at the start of every fulfillment request (StatTracker.js:3959) and on story reset (:1711). Within one transaction a reason can outlive a later queued probe that ends "complete". The hint is shown only when `fulfillment === "unavailable"` (:3616), so a leftover reason is never visible. Non-blocking.
- Minor, non-blocking: inside one transaction, a finishProbe reason overwrites an earlier noteUnavailable reason. The last cause wins, which is acceptable for hover text.
- UI: the strip sets `title = UNAVAILABLE_TEXT[reason]` (:3616). All 4 new keys exist in UNAVAILABLE_TEXT, so there is no "Waiting for the game" fallback for them.
- Repro (work/investigations/s6-makeitgood/repro.cjs, re-run with output sent to the scratchpad so the repo evidence is untouched):
  - After SCORE, `scoreUnavailable: true`.
  - Opening Equipment then waiting 8s ends `fulfillment: complete`, with no unavailable hint and an empty diag.
  - finishProbe was called 0 times and the probe queue stayed empty, so no SCORE re-probe ran.
  - With no unavailable ending, Equipment no longer ends without a reason.

## (b) M5 / M4: live native probe in play.html (Playwright, seeded RNG, nov5/probe.cjs run in base and candidate worktrees)
- Slot convention: ZRamReader.js:2188-2191 reads `u16(globals + slot*2)`, consistent with the facts.
- guess, base: after NEW, playerId 20 "(self object)" (named-player), roomSource existing-resolver, 0 map rooms.
- guess, candidate:
  - After NEW, playerId 37 "(StandardPlayer)" (measured-player-global) in room 51 through player-containment.
  - The map holds 51 Verb Guessing Booth, 66 Behind the Booths and 77 The Midway.
  - The slot holds 37 across new, boy, look, z, out and look.
  - At the menu the slot holds parentless 20, so no room is admitted there. That is correct.
- 66 and 77 are real rooms. The exits payload gives southeast>66 and northeast>77. Live movement: NE printed the Midway text (room 77, CurrentRoomId 77), SW returned to "Verb Guessing Booth" (51), and SE printed the fairgrounds or behind-the-booths text (66).
- yagwad, base: 29 Treasure Cave was already admitted after SPACE, yes, yes, through existing-resolver, with player 20.
- yagwad, candidate:
  - The player is now 30 "Me" (measured-player-global), in room 29 through player-containment.
  - The map and current room are identical to base, and stay stable across look, z and look.
  - Before the game starts, the slot holds 20, so roomSource stays existing-resolver for room 143 and no room is admitted.
  - The visible effect is nil. This is a correctness or robustness gain: the room now comes from containment instead of the travel clause.

## (c) Focused gate (base = HEAD worktree, candidate = HEAD + diff, same 6 games copied in, GLULX=1)
- The games were guess.z5.js, yagwad.z5.js, MakeItGood.zblorb.js, Hitchhik.z5.js, Advent.z5.js and Alabaster.gblorb.js.
- Result: `GATE: 6 games, 0 differences`, with no error rows.
- Caveat: the gate's boot script never answers guess's NEW prompt or yagwad's start-up prompts, so both record rooms [] on both trees. The intended M5 change is therefore visible only in the (b) probe, not in the gate. For a future gate this is a coverage gap, not a regression.

## (d) Harnesses (working tree)
- operator-regressions: 13 PASS / 0 FAIL.
- m11-dark-scope: 17 PASS / 0 FAIL.
- equipment-ui: 119 PASS / 0 FAIL.
- command-disambiguation: 50 PASS / 1 FAIL ("SELF-VERIFYING ... (D61)"). The same failure occurs on the HEAD base worktree, so it predates this batch and is unrelated to it.

Worktrees pm-rv1105-base and pm-rv1105-cand were removed after the review.
