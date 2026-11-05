# M7 REVIEW R1 (adversarial stand-in reviewer) on PROPOSAL-r1.md

**Verdict: REVISE.** The census and the object-vs-routine test hold. The proposal does not yet say how the I6 path changes, and that change runs into D155/D35 and D251.

## Blocking issues

1. **The I6 direction-property path already sets targetRoomId to the door object.** In `js/ZRamReader.js` ~2617-2650, `pushExit(label, prop, val)` sets `targetRoomId: val` (the door object id), `targetRoomName` = the door's name, and `isDoor`/`isLocked` from `attrsFromObject(mem, val)`. The i7 lane (ZRamReader 528-543) is different: it sets `targetRoomId: null, isDoor: true`. The proposal treats both paths as "set targetRoomId = door_to", so on the I6 path it would replace the door id with the room. R2 must state for each path what the exit carries afterwards: the target room, the door id (for example `doorObjectId`, as ExitCalibrator:330 does for ZIL), the name and the label/command. Without the door id, the travel command and the door identity are lost.
2. **D251: isLocked/isDoor would be read from the wrong object.** D251 says an exit's isLocked comes from its destination only when that destination is a door object. If the destination becomes the far room, `tAttrs` becomes the room's attributes, so the door's locked/door bits are dropped. Rooms can also carry stray "locked" bits, which is the Hollywood case D251 fixed. R2 must take isDoor/isLocked from the door object and the room's identity from door_to, and must add a D251 harness or regression check.
3. **D155/D35 contract change.** D155 says door exits are hinted directions that "become pathable map edges once actually walked" (D35 honest stubs). Giving them a look-ahead target creates a pathable edge before the door has been walked. That may be intended (M7), but R2 must say it replaces that part of D155, check MapTopology's exit-application gate (`isPlausibleMapRoom` vs `isPlausibleExitTarget`, D155), and list the D-entries and harnesses it touches (prior-fix guard rule). Fast travel through a closed or locked door also needs a stated behaviour (Navigator pause via doorObjectId?).

## Checks that passed (evidence)

- **Routine vs object test is sound.** For all 50 titles I computed the smallest possible packed routine address, floor(highMemBase / packing multiplier). The lowest is 2308 (Pick up the Phone Booth and Dye, n=30). Across all titles the minimum is far above the object count n (the largest n is 721, Save Princeton). So no routine value can fall in 1..n, and there are no false positives. (Script: %TEMP%/dc2.cjs, a modified doorcensus.cjs.)
- **Two-sided static doors exist only in Book and Volume (9).** Example: stairway, found_in [MuseRoom, Library], door_to Library. From Library the not-current-room rule leaves it a hint, which is correct. GrocemeronFacade and ParkEntrance have found_in [two street rooms] and door_to a third room, so the same target from both sides is plausibly right. No other title has a static door_to on a multi-room found_in. The far-side risk is small and handled as described.
- **D240** is ZIL-only (DEXIT door==dest), so there is no conflict. **D157/D160:** nothing relevant to door exits found.

## Non-blocking notes

- The census uses `objectCount` (a scan up to the property-table start), but the proposal says "true frontier". Use the same frontier as ZRamReader ~3063 (`(firstProps-first)/entrySize`), and state which one.
- Admission: use the room predicate (`isPlausibleMapRoom`/destIsMapRoom), not `isPlausibleExitTarget`. The latter accepts doors, so a door_to that points at another door would pass.
- Sample 5 (live game-text check of 3 titles) was **not done** in this review. Before ACCEPT, verify with Playwright, or by static found_in/room checks, for Book and Volume (stairway), Vacation Gone Awry, and Save Princeton (16/16 static).
- The census tally "3 other sizes" is unexplained (a 4-byte door_to?). R2 should say they are left unchanged.
