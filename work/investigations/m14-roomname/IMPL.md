# M14 implementation (round 2: narrowed gate): an invalid status-grid label on an internal room yields to storyShortName

Not committed. The diff is in `m14.diff`.

## Change (js/WorldModel.js only)
- The D219 branch is unchanged. It still asks storyShortName only when `!payload.roomName`.
- New helper `WorldModel._validGridRoomLabel(label)`. A label is valid when it contains `/[A-Za-z]{2}/` and, trimmed and lowercased, is not a direction word (n s e w ne nw se sw u d up down in out north south east west northeast northwest southeast southwest).
- In the StatusGridDecoder branch: if the compiled name is internal (`MapTopology.isInternalRoomName`, guarded) and the decoder's roomLabel is invalid, the code returns the trimmed storyShortName when it contains 2 letters in a row. Otherwise it returns "" (honest absence). A valid grid label keeps winning, as before.
- No StatusGridDecoder change.

Round 1 (broad widening of the D219 gate) was rejected. It garbled MakeItGood, dewdrops and vespers, because storyShortName misreads those games. That census is kept at the bottom of `census-diff.txt`.

## Census (same base/cand trees, cand updated; GLULX=1, all 309 games, 6 shards)
| game | step | roomId | base | cand | storyShortName | class |
|---|---|---|---|---|---|---|
| kirby.z5.js | start | 102 | "John And Your's Room" | "Room 201" | "" | noise (start timing; 0 diffs in 2 reruns) |
| rameses.zblorb.js | start | 26 | "" | "Dormitory Room" | "" | noise (as above) |
| sherbet.z5.js | start | - | "cushioned basket" | "" | "" | noise (also seen in round 1; as above) |
| spring.z8.js | start | 72 | "Aspen Grove" | "Campsite" | "" | noise (as above) |
| theatre.z5.js | start | 49 | "" | "Theatre Lobby" | "" | noise (also seen in round 1; as above) |
| bookvol.z5.js | - | 365 | "\|" | "Hallway" | - | INTENDED (harness; the probe gets no-prompt at its key menu) |

The new path could not have fired in any of the 5 noise rows: each has storyShortName "" and differs only at the start snapshot. Two reruns per tree of these 5 plus the watch list (MakeItGood, dewdrops, vespers, selection, WiR1, WiR2, anchor, Treasures, wump2ka) gave 0 roomName differences each time. Degeneracy (degen.z5.js) is unchanged in the full census.

**Totals: INTENDED 1, REGRESSION 0, noise 5.**

## Harnesses (working tree)
- harness/m14-room-display-name.js: 8 PASS / 0 FAIL. Cases:
  - bookvol 365 "Hallway", both payload and map, with no grid-fragment room.
  - MakeItGood 391 "Broken Top Boulevard, Outside No. 15" and 424 "Front Porch".
  - dewdrops 39 "Stage (A German Forest)".
  - vespers 325 "Your Bedroom".
  - wump2ka label kept ("A tiny, polished cavern").
- harness/m12-room-short-name.js: 12 PASS / 0 FAIL.
- harness/operator-regressions.js: 13 PASS / 0 FAIL.
- harness/d201-unnamed-identity.js: 68 PASS / 1 FAIL (taken LLR "reaver"). The HEAD base tree fails identically, so this predates M14.
- harness/d201-unresolved-actions.js: 24 PASS / 0 FAIL this round. In round 1 it threw the "sword vocabulary" error on both base and cand, so it is flaky, not M14.
