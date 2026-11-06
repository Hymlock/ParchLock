# REVIEW-REQUEST-004: extra inventory rows in Blue Chairs and Tokyo2 (facts only)

Author: grok (solo). Reviewer: grok-review (stand-in while Claude/Codex are out). 2026-11-01 ~09:20 ET.

## Diff
`js/ModuleStatFactsClaude.js`, two exact-digest entries added in e643191b, one key each (+comments):
- Blue Chairs 7b50dacf...: `"inventoryHiddenAttribute": 3`
- Tokyo2 c805f56d...: `"inventoryHiddenAttribute": 17`
No shared code touched. The consumer is the existing ZRamReader inventory walk (hidden bit -> row and subtree skipped; hiddenRecurses is ZIL-only so it stays off) and the Actionable NPC-possession exclusion. Precedent: Photograph (I6) inventoryHiddenAttribute 17 (PRODUCTION_PLAN 9156).

## History check
Both entries were created by e643191b (playerGlobal only). Before it, the app followed object 20 and these inventories were the wrong character's. No earlier inventory fact exists for either digest (git log -S on both digests: only e643191b). Nothing to revert; this is a new fact.

## Evidence (inv-extra/)
Declared attribute names (inform-attribute-names, both titles): 3 = concealed, 17 = scenery, 26 = worn.
- Blue Chairs (player 100). Native i: "You are carrying your wallet, your keys and a pager." Player children: wallet 101 (container, open), keys 103, pager 104, shirt 105 (clothing, worn). Shirt bit 3 is CLEAR at boot and SET by the game's own i routine (sticky after that; p3-bluechairs-timing.json). wallet/keys/pager never carry bit 3.
- Twenty-three dollars 102 is inside the open wallet and parser-reachable (x dollars replies). The native prose list just does not recurse. Left as is: there is no bit to read, and hiding a reachable item would be invented.
- Tokyo2 (player 81). Native i: "Our man is equipped with strong hands, a nimble mind, and an oversized jaw..." (custom prose, lists nothing). Soup 33 is held, scenery (bit 17), and is the NPC's bowl. Popcorn 82 is held, takeable, bit 17 clear, and parser-reachable (x popcorn, drop popcorn reply). The game omits it only through custom prose. Left as is.
- Bit scan (scan-bit.cjs): Blue Chairs bit 3 has 21 objects, all NPCs/scenery-like or off-stage, none held by the player at boot. Tokyo2 bit 17 has 31 objects (walls, crowd, newspaper, Chickzilla...), and only soup is held by the player.

## Test
`node work/investigations/zil-titles/review-lane-1101/inv-extra/test-inv-extra.cjs`: 11 PASS / 0 FAIL, plus a NOTE that the Blue Chairs shirt still shows before the first native i. Pre-patch outputs p1/p2 show shirt and soup in the app inventory (the swap evidence).
Gate: `node harness/operator-regressions.js` 13 PASS / 0 FAIL. The full 309x2 gate was skipped for budget; the change is two exact-digest keys.

## Known gaps (not fixed)
1. Blue Chairs shirt is listed until the player first types i. A complete match would be hidden bit 26 (worn), but only one positive was measured, and it would also drop worn gear from the app. That is for Claude/Codex to decide.
2. Twenty-three dollars inside the open wallet (reachable, not hidden natively by any bit).
3. Tokyo2 popcorn (really held; omitted by the game's custom prose only).
