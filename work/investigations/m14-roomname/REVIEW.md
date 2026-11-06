# M14 adversarial review (stand-in seat): ACCEPT

Candidate = `git archive HEAD` + working-tree js/WorldModel.js only (diff of js/ between trees: WorldModel.js, +29 lines). Other workers' ZvmCapture/StatTracker edits are excluded.

## 1. Can a real room be blanked?
- The blanking only fires when all three hold: roomId != null, the compiled name is internal (`MapTopology.isInternalRoomName`), and the decoder's grid label is invalid. A genuine room called "Up"/"North"/"Room 5" whose compiled name is not internal is never touched. "Room 5" also passes `/[A-Za-z]{2}/`.
- Census scan (census-base/cand.jsonl, 902 steps over 309 games, fields roomName/short/story). No adopted roomName or short name is invalid under the rule. The only invalid strings are storyShortName misreads: vespers "b z" (325), detective ".<<" (34/36/37), and wump2ka ".A" in the harness. The fallback correctly rejects all of them.
- Minor point, not blocking: the story fallback checks only for two letters in a row, not for a direction word. A story short_name of "Up" on an internal room would display. No instance exists.

## 2. Blank vs "|"
- D24 honest absence: an empty string is better than the grid fragment "|". This is consistent with the existing early returns of "" in refineRoomDisplayName (null payload, D219).
- Consumers: MapTopology.js:657-660, DarkScope.js:81, Map.js:1361 and MapIdentity.js:30 all guard a falsy roomName. AttrCalibrator.js:683 and TurnRecorder.js:101 call with `{roomName:"?"}` and no roomId, so the new branch cannot run for them.

## 3. Gates
- Focused regression-gate, GLULX=1, 8 games (bookvol, MakeItGood, dewdrops, vespers, wump2ka, Advent, Zork1, Alabaster gblorb): **0 differences**. bookvol returns "no-prompt" identically on both trees, so its intended "|" to "Hallway" change is covered by the harness only.
- harness/m14-room-display-name.js 8 PASS / 0 FAIL; m12-room-short-name.js 12/0; operator-regressions.js 13/0.
- The author's full census (IMPL.md): 1 INTENDED (bookvol), 0 REGRESSION, 5 start-timing noise rows. In each noise row storyShortName is "", so the new path could not have produced them.

Verdict: ACCEPT.
