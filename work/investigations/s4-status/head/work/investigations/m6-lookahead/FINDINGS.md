# M6 look-ahead from climbed room / seated (claude, sealed)
Probe: probe2.cjs (seeded, regression-gate setup); output probe2-out.txt.
- Zork I climb tree: NOT reproduced. Up a Tree 88, enclosingRoom 88, exits down>75 (+ up>null hint for the "cannot climb higher" NEXIT).
- HHG in bed (chain bed 114 > Bedroom 150): exits identical seated vs standing (out/down/south, null-target ZIL hints). Game refuses: "You'll have to get out of the bed first." No marker exists.
- break-in seated in chair (chain chair 34 > Your Office 33): roomId 33 correct (D222), exits [] — but room-level, not seat-caused (unverified: east exit likely a routine). Any command ends the office scene, so standing compare impossible.
- Suspect: Library/ENTER CHAIR not reached in probe (opening at Near Bar).
Cause of residual gap: snapshot() (js/ZRamReader.js:3190,3244) passes the enclosing room to lookAheadExits, so exits ARE emitted; nothing tells the UI the player is inside a non-room parent.
Fix: payload.playerContainer {id,name} when direct parent != roomId; exits flagged needsExitFirst only after the game's own refusal is seen (or I6/ZIL library refusal), command via D236 measured parent.
