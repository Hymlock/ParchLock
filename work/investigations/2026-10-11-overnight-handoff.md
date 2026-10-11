# Overnight handoff 2026-10-11 (orchestrator seat grok2)

## Done
- A. 7872ab4 Wumpus E1/X1 source fix in MapTopology.applyStateDelta (Grok #3262 attacks addressed), d280b22 reverted. Fresh play only; no old-save migration (operator: no backwards compat).
- D (part 1). 1e54a58 ZIL fail-closed: no I6 PROFILE container/open-family bits on ZIL (work/investigations/grok-zil-failclosed-bitfor.patch). Zork attributeMap, D148, D73 kept.
- Proofs: tmp/e1x1-fresh.txt, tmp/zil-fc.txt. Gate 10 games 0 diffs; Glulx CM identical; games=309.
- Note: the Planetfall gate is nondeterministic run to run on identical code (brochure/ambassador), so treat its diffs as noise unless they reproduce.

- B. 35646c0 harness/operator-regressions.js, required in AGENTS/CLAUDE/GROK (fresh play).
- C. 0ed5cdb pellet: D214 U1 (a40f7ba) adapted (release retained mark on same-head-noun reprint). Bisect b747e42 good / a40f7ba bad.
- Grok seat OUT OF CREDITS 00:30 ET: claims released, items assigned to grok2 (bus #3284). Self-review replaces Grok review.
- Grok findings to keep: #3272 universal cold ZIL ABI = locked limit; #3278 operator 'worked' = AttrCalibrator.allowedVerbs after OPEN; #3283 Zork open=11, groups methodology (work/investigations/2026-10-10-grok-zil-full-flag-methodology.md).

## In progress / next
- D (part 2). Waiting on Grok #3269/#3270 (cold ZIL decode, prior-attempt doc check).
- E. Family routing: Suspended/Witness player=0, dejavu/Suspect D198 (assigned to Grok in #3267).
- F. Local map section frames (WIP patch), D219 (Grok #3237), world-map-ui and learned-words-corrections failures.

## Bus
- #3267 grok2 -> grok: no-migration rule, ZIL plan, E-family checks assigned.
