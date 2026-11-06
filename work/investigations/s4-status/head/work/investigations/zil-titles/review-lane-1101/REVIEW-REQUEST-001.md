# REVIEW-REQUEST-001: mapzero playerGlobal facts for 5 Inform titles
Requested by: grok (solo), 2026-11-01. Reviewer: grok-review. Authorization: pt514u plus the solo-mode steering (facts edits allowed under review).

## Diff
- Working-tree patch, NOT committed: `review-lane-1101/REVIEW-001.patch`.
- Scope: js/ModuleStatFactsClaude.js only, +24 lines, 0 deletions. Patched file SHA256 C40F67886450DDC938A276622B86B594D89CD17AA6F2F5F888EA0AA37E62F68A.
- New exact-digest entries:
  - Cabal 5fe1406d…: `playerGlobal 18`
  - Blue Chairs 7b50dacf…: `playerGlobal 22`
  - Tokyo2 c805f56d…: `playerGlobal 19`
- `playerGlobal 18` added inside the existing stat entries:
  - Rameses b41ec3bd…
  - Heroine's Mantle 35f2844e…
- No code changes.

## Claim
In these 5 titles the map panel is empty because resolvePlayer picks the wrong actor:
- Cabal, Rameses, Blue Chairs and Tokyo2 pick self object 20.
- Heroine picks parser-self 114 inside "Golden Horse".

The real PC is the I6 library player/actor global pair (k, k+35), measured in Claude's sealed step 4 (inform-phase/mapzero/CLAUDE-SEALED-measure-1700.md). An exact-digest playerGlobal (the D216 Part 3 / D204 / D220 mechanism; precedents Degeneracy f77c8f21 g18 and Facility ef6530a7 g44) makes the reader return "measured-player-global". enclosingRoom then admits the correct room.

## Doc check
- PRODUCTION_PLAN D216 Part 3: header-authenticated exact digest; evidence = native INVENTORY equals the global object's children, plus the globals at measured prompts. The generic actor-scoring alternative was rejected, so I used none.
- ARCHITECTURE_UML ch76 and ch83: the fact is re-read on every call. An authenticated initialized playerGlobal outranks learned roots.
- No code path changed. This only adds data to the existing mechanism.

## Evidence
All in grok-lane-1031/mapzero-measure. Harness: measure4.cjs (Playwright).
- s6/s7/s8 inject the fact in memory via page.route.
- s9 = the real patched file.

| title | before (HEAD) | after (patched file, s9) | native i vs app inventory |
|---|---|---|---|
| Cabal | pid20, rooms 0, inventory = vagrant's beard/milkshake/clothes (WRONG) | pid221, room 32 McDonald's admitted | native "your PalmPilot" = app [your PalmPilot] |
| Rameses | pid20 named-player, rooms 0 | pid24, room 26 Dormitory Room | native "carrying nothing" = app [] |
| Heroine | pid114 parser-self, rooms 0, inventory laser beam/mechanical claws (WRONG) | pid24, room 27 Jetty | native describes the worn blazer/boots; app [school uniform] |
| Blue Chairs | pid20, rooms 0 | pid100, room 419 Stuck in an Attic (at boot) | unchanged by the fact: app [wallet; twenty-three dollars; keys; pager; shirt] vs native "wallet, keys and a pager" (a pre-existing inventory-root/nesting difference, separate) |
| Tokyo2 | pid20, rooms 0 | pid81, room 29 A Streetside Cafe | unchanged by the fact: app [soup; popcorn] vs native none (pre-existing, separate; not caused or fixed here) |
| Advent (control, no fact) | — | unchanged: 5 rooms, cur 37 | — |

- Stability: the global stays the same id on every later turn in s7 (4-5 turns per title).

## Disclosed limits
- **No cross-room travel proof.** The opening of every title blocks movement by its narrative: Cabal refuses to stand, Rameses refuses to leave bed, Heroine is drowning, Blue Chairs offers a dialogue choice, Tokyo2 won't leave the table. The room walk is the same generic player-containment used by the precedents.
- **Heroine:** the status line reads "Drowning" (a scene title). Room 27 "Jetty" comes from the containment chain; the prose describes the jetty above.
- **V34/V69:** the pair is identical in every measurement, so the lower slot is pinned by D216 precedent. Not distinguished by an NPC-order test.
- **Scope:** exact digest, so no other executable can change. The full 309x2 gate is deferred to the APK gate.

## Harness commands / results (patched)
- `node harness/operator-regressions.js`: 13 PASS / 0 FAIL
- `node harness/d46-room-identity.js`: 27/0
- `node harness/zil-direct-player-worn.js`: 20 passed
- `node harness/zil-light-unresolved-player.js`: PASS
- `node harness/d201-unnamed-identity.js`: 68/1, and `d201-unresolved-actions.js`: FAIL "real printed sword vocabulary". **Both fail identically with the HEAD facts file** (swap test), so they are pre-existing and unrelated (no Inform digest involved). Flagged for a separate queue item.
- Repro: `node work/investigations/zil-titles/grok-lane-1031/mapzero-measure/measure4.cjs cabal.z5.js "#key|look|i"` (likewise the other titles; scripts as listed in s9-*.json).

## Commit plan after ACCEPT
- `git commit -m "...mapzero playerGlobal facts (5 titles)" -- js/ModuleStatFactsClaude.js work/investigations/zil-titles/grok-lane-1031/mapzero-measure work/investigations/zil-titles/review-lane-1101`
- A SOLO-COMMITS row with the verdict id.
- An audit request to Claude/Codex.
