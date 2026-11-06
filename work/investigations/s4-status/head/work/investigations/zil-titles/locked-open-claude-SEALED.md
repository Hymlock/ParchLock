# D10: D241 lock pause vs the game's travel rule - claude half (SEALED 2026-10-30)

Problem statement (for the other seat): with a mapped `locked` fact, the map pauses routes at ZIL door exits whose door
reads locked. In some games the player can still go through (or the door is unlocked automatically). Should the pause
follow a different rule?

## Findings (claude + claude workers; audit-r40-independent.md; codex #5491/#5493)
1. D241 (js/ExitCalibrator.js _d214DoorLocked plus the hint emission; Navigator.js:119) pauses on the door object's live
   LOCKED bit.
2. ZIL DEXIT travel is "TO X IF DOOR IS OPEN": the gate is the door's OPENBIT, not LOCKED. LOCKED only explains why an
   OPEN attempt fails.
3. Counter-cases:
   - Suspect: START-ALICIA locks the real NORTH/WEST DEXIT doors without clearing OPENBIT, and native travel still goes
     through (codex #5491/#5493). So locked + open = passable, and the D241 pause is false.
   - Moonmist: WALK-THRU-DOOR? / UNLOCK-DOOR? auto-unlocks from most rooms, refusing only from the driveway, a STATION
     room, the secret sitting door or the front gate (audit-r40). Here locked + closed is still passable in most cases.
4. Lurking Horror (D241 native proof): hatch 119 locked = closed, and the game refuses. Consistent with locked + closed.

## Leaning
A. The pause should require locked AND closed (OPENBIT clear on the same door object, read live). That fixes Suspect
   cleanly and keeps Lurking Horror's proven behaviour.
B. Moonmist's auto-unlock is a per-title script rule (UNLOCK-DOOR?) that no attribute can capture. Either leave Moonmist
   unmapped for locked (current state) or add a fact-level `autoUnlock` flag that suppresses the pause for that title.
   Do not hand-list doors.
Prior guards: D241 (native LH proof must still pass: locked + closed hatch pauses), D214, D240, harness/zil-locked-map.js.
