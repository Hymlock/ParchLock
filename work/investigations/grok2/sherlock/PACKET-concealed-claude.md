# PACKET: Sherlock concealed (semantic) -- claude seat (grok2 lane takeover, operator 2026-10-31)
Author: claude. Tier: source + native (seeded replay, g1-batch-sherlock-yn.cjs, JSEED 0, jericho route steps 0-2).

## Question (codex challenge)
Does Sherlock have a bit-based hide-until-revealed (an FL bit that removes an object from parser scope / sight, then FSET/FCLEAR reveals it)?

## Source (work/investigations/zil-titles/sherlock-evidence/)
- No FL-INVISIBLE / FL-HIDDEN / FL-CONCEALED flag exists (census sherlock-source-flags.json).
- Parser scope ignores FL-NODESC: RT-SEARCH-LIST (parser.zil:1570-1595) and RT-THIS-IT? (parser.zil:1602-1630) test only synonyms/adjectives, INHIBIT-ROOMS, GL-P-OF, GWIMBIT and container visibility (FL-SURFACE/PERSON/CONTAINER+OPENED/TRANSPARENT). No hide bit is consulted.
- FL-NODESC (32) is read only by description/listing code: other-misc.zil:48,150,246,268-280,304; verbs.zil:3792.
- Every source FCLEAR of NODESC that "reveals" an object is paired with a MOVE (the actual reveal):
  ring bank.zil:455-460 / people.zil:815-818 (MOVE to CH-PLAYER); sapphire things2.zil:1365-1367; opal things2.zil:1522-1525;
  garnet bank.zil:606-611, 646; wax head charles.zil:635-638; Sherman gift people.zil:1197-1201; generic take parser.zil:1680-1685.
  Non-MOVE toggles are description-only: Wiggins (bank.zil:39,545,631,679; addressable while NODESC, he has a DESCFCN) and the boat
  (things2.zil:956/963, NODESC while the player sits in it). MAKE NODESC sites (charles.zil:756-767, people.zil:958) follow a MOVE.

## Native (run cache-claude/run-sherlock-20261031T141414-22024.json, plan plan-sherlock-conceal.json)
Holmes's Study, step 3, sofa 239 and mantelpiece 292 both carry bit 32:
- `look`: test_attr(239,32)=TRUE read; sofa not listed as an object (room prose only).
- `examine sofa` -> "On the sofa can be seen a morocco case and Holmes." ; `examine mantelpiece` -> lists contents. Bit 32 set, object fully in scope.

## Verdict
**concealed = NA (not bit-based).** Sherlock has no flag that hides an object from the player/parser; reveal is MOVE-based
(object kept in LOCAL-GLOBALS / a container / a statue and MOVEd to the player or room). FL-NODESC is listing suppression only
(already the scenery/inventoryHidden domain) and an object with it is examinable, so mapping concealed=32 would be wrong.
Reason string: "reveal by MOVE; FL-NODESC is list-only, parser scope does not test it (parser.zil:1570-1630)".
