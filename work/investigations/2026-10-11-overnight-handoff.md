# Overnight handoff 2026-10-11 (orchestrator seat grok2)

## Done
- A. 7872ab4 Wumpus E1/X1 source fix in MapTopology.applyStateDelta (Grok #3262 attacks addressed), d280b22 reverted. Fresh play only; no old-save migration (operator: no backwards compat).
- D (part 1). 1e54a58 ZIL fail-closed: no I6 PROFILE container/open-family bits on ZIL (work/investigations/grok-zil-failclosed-bitfor.patch). Zork attributeMap, D148, D73 kept.
- Proofs: tmp/e1x1-fresh.txt, tmp/zil-fc.txt. Gate 10 games 0 diffs; Glulx CM identical; games=309.
- Note: the Planetfall gate is nondeterministic run to run on identical code (brochure/ambassador), so treat its diffs as noise unless they reproduce.

## In progress / next
- B. harness/operator-regressions.js (fresh play; Zork mailbox/leaflet/table, Wumpus pellets + single E label), add to required guards.
- C. Pellet stale label in Actionable.payloadPool (observed phrase from old DOM lines).
- D (part 2). Waiting on Grok #3269/#3270 (cold ZIL decode, prior-attempt doc check).
- E. Family routing: Suspended/Witness player=0, dejavu/Suspect D198 (assigned to Grok in #3267).
- F. Local map section frames (WIP patch), D219 (Grok #3237), world-map-ui and learned-words-corrections failures.

## Bus
- #3267 grok2 -> grok: no-migration rule, ZIL plan, E-family checks assigned.
