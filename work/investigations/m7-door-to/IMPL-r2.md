# M7 IMPL R2 (claude): additive door_to hint, per PROPOSAL-r2 + REVIEW-r2 (ACCEPT, 3 conditions)
Not committed. Full diff: `m7-impl.diff` (js/ZRamReader.js, js/MapTopology.js, js/Map.js).

## Diff summary
- **ZRamReader.doorToHint(mem, doorId, roomId)** (new). It returns `{doorTo, doorToName}` or null. A hint needs all of these:
  - the door attribute on doorId;
  - a decoded `door_to` name, with a property of size exactly 2;
  - a value v with 1 <= v <= the true property-table frontier (first object's property pointer, the same method as ~3063);
  - v != roomId and v != doorId;
  - v passes the map-room test. That test is `isPlausibleMapRoom`, never `isPlausibleExitTarget`. If isPlausibleMapRoom fails, v can still pass as a parentless, non-door, non-animate object with a populated 2-byte compass property inside the frontier. **Deviation, flagged:** Book and Volume names every room with a compiled "(Library)"/"(MuseRoom)" short name. isPlausibleMapRoom rejects that whole title, so the required 61 -> 64 case could not pass without this fallback.

  A compiled "(...)" or C_ROOMS name is returned as `doorToName: ""` (id kept).
- **I6 pushExit:** every field is unchanged. When the target has the door attribute, `doorTo`/`doorToName` are added from doorToHint.
- **i7 lane stub:** the same. doorToHint itself requires the door attribute (condition 2). targetRoomId stays null.
- **MapTopology:** `applyPayloadExits` passes `doorTo`/`doorToName` into link meta, for isDoor exits only. `link()` deletes both when the incoming observation lacks doorTo (condition 1), next to the isLocked/routeBlocked cleanups. They are never written to toId or Exits.
- **Map.js Draw:** display only. A current-room ExitMeta entry gets a hint when it is an unwalked door exit (isDoor, doorTo, no travelledTo, no Exits edge) on a free compass slot. The hint is shown on the `#exits` chip as an italic, 0.7-opacity line, "probably leads to X", also set as a title. X is doorToName, or else the admitted map room's name for that ObjectId; with neither, no hint is shown. The hint is reset on every Draw. Nothing is linked, routed or marked visited.

## Tests
- `node harness/m7-door-to-hint.js`: **8 PASS / 0 FAIL**. Checks:
  - Book and Volume: 62 -> stairway 61 gives doorTo 64; from 64, none.
  - Save Princeton: 399 -> door 400 gives 440.
  - A routine value gives none; clearing the door attribute gives none.
  - Vacation: no doorTo on any exit of any room, for both lanes.
  - The i7 gate refuses a room passed as a door.
  - MapTopology: doorTo is never in toId/Exits, and Entryway is never minted; a stale hint is deleted.
- `harness/operator-regressions.js`: 13 PASS / 0 FAIL.
- `harness/m9-visited-physical-only.js`: 8 PASS / 0 FAIL.
- `harness/zil-locked-map.js`: 37 passed.
- `harness/d214-room-door-alias.js`: 12 structural PASS, plus native PASS.

## Focused gate (GLULX=1; bookvol, saveprinceton, Vacation, Advent, Zork1, Alabaster gblorb)
Base = HEAD a64eafc2. `git worktree add` failed on a long path under work/, so the base is `git archive HEAD` (minus work/) in the scratchpad, with games/ and node_modules robocopied /E /XJ. Candidate = the working tree.
**GATE: 6 games, 0 differences.** Classification: none needed.

Caveat: bookvol records `no-prompt` on both sides (its boot menu), so the gate does not exercise it. The static harness covers it.

## Census (condition 3)
Recorded in PROPOSAL-r2.md, from `doorcensus-r2.cjs`. The Vacation and The Temple alias layouts are excluded. Corrected static count: 129 (was 198). 126 doors in 13 titles get a hint.

## Not done
- Bus claims: the worker-client failed ("claim_path_missing", then "This operation was aborted" on status), so no claims are recorded.
- No on-phone or in-browser visual check of the chip.
