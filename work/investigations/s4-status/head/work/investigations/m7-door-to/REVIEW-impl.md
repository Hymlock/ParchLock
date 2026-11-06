# M7 REVIEW-impl (adversarial stand-in reviewer) on the uncommitted IMPL-r2

**Verdict: ACCEPT.** No blocking issues. Two non-blocking notes follow.

## 1. Deviation: the fallback map-room test
I ran doorToHint over all 48 non-alias titles from doorcensus-r2.cjs. Vacation and The Temple are excluded as alias layouts. The census gives 126 hinted doors in 13 titles. I listed every target with its short name, its `isPlausibleMapRoom` result and its parent:
- **86 targets pass isPlausibleMapRoom.** All are real rooms, for example Fork 39 manhole -> 50 Sewer Junction, LASH 64 front door -> 141 Entrance Hallway, Spider And Web 178 metal door -> 328 Wiring Closet, and De Baron 134 (bosdeur) -> 135 forest path.
- **40 targets are admitted by the fallback only:**
  - 39 in Book and Volume. All are parent-0 compiled-name rooms: Facade -> shop interior, Entrance -> place, and stairway -> Library, ColossalCaveWest, F2MainFloor. Each one is a destination room. None is scenery or a holder.
  - 1 in Blue Chairs: 291 gap -> 304 "(darkened_claustrophobic)", parent 0, no children. It is a compiled-name room, a dark-room variant. Its name is blanked, so the hint shows only if the room was already admitted.

**No non-room target was found.** The fallback is wider than isPlausibleMapRoom in principle, but every case is gated on the door attribute plus a 2-byte door_to value. The empirical result over the whole corpus is clean.

## 2. REVIEW-r2 conditions
1. **Stale-field deletion.** Met. `MapTopology.link()` deletes `doorTo` and `doorToName` when the incoming meta has no `doorTo` (MapTopology.js:479). `applyPayloadExits` passes them for isDoor exits only (727-728). A grep finds doorTo only in Map.js:620-632 (display) and MapTopology 479/727-728. None of these write `toId` or `Exits`.
   - Non-blocking: line 479 dereferences `meta` without a guard, where the earlier lines use `meta &&`. All three current callers pass an object, so this does not fail today.
2. **Door-attribute gate on the i7 lane.** Met. doorToHint returns null unless `attrs.door` is set on the object. The harness checks that a room passed as a door gets no hint, and that Vacation gives no doorTo on either lane.
3. **Census corrected.** Done: 129 static values, alias titles excluded.

## 3. Display (play.html, Playwright, seeded as in regression-gate.cjs)
The run was Save Princeton, `no` to the introduction, then `look`. It reached Common Room 399. ExitMeta.sw has isDoor, toId 400 (the door), doorTo 440 and doorToName "Entryway".
- **Chips:** `dir-sw shown door-hint "probably leads to Entryway"` and `dir-out shown door-hint "probably leads to Entryway"`. The `out` chip is also the door 400 exit.
- **Screenshot:** `hint.png`, at a 390x844 viewport. `#exits` is `display:none` at desktop 1280 width (`body.map-open`), so the chip appears only in the phone layout.
- **Tapping the hint** submits the ordinary direction command `southwest`, the same as any exit chip. It does not use doorTo. I intercepted the submit so nothing was sent to the game. ParchLockMap.Rooms (3 rooms) and every room's Exits were identical before and after the tap. No Entryway room and no edge were created.
- **Non-blocking:** at phone width the SW chip truncates to "probably leads to ...", so the destination name is cut off. It appears only in a `title`, which a phone cannot show. A shorter form such as "→ Entryway?" would keep the name visible.

## 4. Harnesses
- `node harness/m7-door-to-hint.js`: 8 PASS / 0 FAIL
- `node harness/operator-regressions.js`: 13 PASS / 0 FAIL

Not run by me: the three-type regression gate. IMPL-r2 reports a 6-game focused gate with 0 differences.
