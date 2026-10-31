# SEALED (claude): map stays empty in 14 release Inform titles. Measurement only, no hypothesis shared.
Probe: play.html, seeded, settle + LOOK; count ParchLockMap.Rooms with HasRealId. Control: Advent shows 5.
All 14 titles show 0: gostak, cabal, Tokyo2, bluechairs, rameses, saveprinceton, csbb, HugeCave, KoA, guess, yagwad, Heroine, LASH, windhal1.
payload roomId/roomName present in 12 (KoA and guess have none). playerSource is named-player, except Heroine and LASH (parser-self).
Heroine roomName "Golden Horse" (audit: the game prints "Drowning..."). saveprinceton room "Hints".
Prior record: 2026-10-17-release80-audit.md Pattern A/B. Still present at HEAD c3bdb974.

## Sealed cause analysis (claude, 17:15)
Gate: MapTopology.mayAdmitFirstCurrentRoom (js/MapTopology.js:80-97). On an empty map, an Inform room is admitted only if roomSource is player-containment or measured-fact AND isRoomAnnounced(roomName). Otherwise it waits for travel (prevRoomId change).
Three classes measured (probe.playerSource / roomSource / parent(player)):
- **A1, parentless player (parent 0) -> roomSource existing-resolver -> refused:** gostak, rameses, saveprinceton, csbb, HugeCave, yagwad. KoA and guess have roomSource none and no room at all.
- **A2, player HAS a room parent but roomSource is still existing-resolver -> refused:** cabal (42 in 32), Tokyo2 (81 in 29), bluechairs (100 in 419). Containment exists, but the room source doesn't report it.
- **B, roomSource player-containment but still 0 -> isRoomAnnounced fails:** Heroine (Golden Horse 112, status shows another name), LASH (Attic 250), windhal1 (Central Windhall 24).
Not yet tested: whether the map fills after the first move (the travel path). saveprinceton's "Hints" room suggests a hint/menu object misread as the room.

## Sealed travel test (claude, 17:25)
Two moves per title (out and back, with exits from the payload or the obvious compass direction). Rooms stay 0 and **payload roomName does not change** in all 9 tested (gostak, csbb, HugeCave, yagwad, cabal, Tokyo2, Heroine, LASH, windhal1).
So the travel path (the prevRoomId change) never fires, because the resolved room is frozen. Not yet checked: whether the moves succeeded in the game, or whether the game text named a new room.
This is not just a first-admission problem: the room resolver itself does not follow the player in these titles.
