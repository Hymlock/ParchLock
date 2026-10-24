# Locked has no visible effect in ZIL - claude blind half (SEALED, 2026-10-24)

Problem statement (for the other seat, without findings): mapped ZIL `attributeMap.locked` facts
(Lurking Horror 19, Plundered Hearts 10, Stationfall 11, LGOP 9, The Witness 17, Ballyhoo 10) change nothing
the player can see, in either the radial or the map/navigation (r27 independent audit, audit-r27-independent.md).
Operator rule: a decoded flag with no visible effect is not done. What should locked do, and where?

## Findings (claude)
1. Every `isLocked` producer reads the DESTINATION object's attributes:
   js/ExitCalibrator.js:148 (D198 structural), js/ExitCalibrator.js:580, js/ZRamReader.js:2584 (D25).
   That is the Inform model (the door object IS the exit destination). In ZIL a DEXIT is
   [dest, door, msg...]: the door sits in byte 1, and the destination is the room.
2. The ZIL D214 path (js/ExitCalibrator.js:~270-296) already decodes the door (`doorObjectId`), but
   emits no `isLocked` at all; `doorObjectId` has no consumer anywhere in js/.
3. Navigator (js/Navigator.js:119) pauses a route on `ExitMeta[dir].isLocked || .locked`; MapTopology:696 and
   MapIdentity:45 copy it from payload exits. So nav would work if the ZIL path filled isLocked live.
4. In ZIL the DEXIT gate is the door's OPEN bit ("TO X IF DOOR IS OPEN"), not LOCKED. LOCKED only explains
   WHY OPEN fails. A route through a closed but unlocked door fails just like a locked one.
5. Radial: no code reads `locked` (ActionSynth/Actionable/SemanticActions/AttributeSchema). D234 Unlock
   (Actionable.js:~2887) is gated on instrumentals + unlockToolAllowed, not on locked.

## Candidate effects (for comparison, not a decision)
A. Nav (small, generic): in the D214 DEXIT branch, set `isLocked` from a LIVE read of the door object's
   locked bit (and optionally `isClosed` from open). This uses the existing Navigator pause; no new policy.
   Needs a guard that live attrs are read per payload (state changes after unlocking).
B. Radial (visible): on an object whose live locked bit is set, order Unlock before Open (both kept,
   missing-over-wrong), and show Unlock even when the key is not held? NO - D234 says Unlock needs a tool;
   keep the tool gate. So the radial gain is the ordering/label only. Weak.
C. Map: draw locked door edges distinctly (lock glyph) from the live bit. Visible, low risk.
Leaning: A + C. B is marginal.
Prior-fix guards: D25, D198, D214 (§74), D234, D134; harnesses d214-zil-exits, exit-calibrator, d23-*,
d46-room-identity, operator-regressions, d214-room-door-alias (Moonmist R3, pending commit).
