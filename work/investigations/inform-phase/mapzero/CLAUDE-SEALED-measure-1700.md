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

## CORRECTION (claude, 17:40): the earlier measurements were contaminated by start-up prompts
The earlier probe sent LOOK while several titles were still at an opening question ("restore a saved game?", a menu). Re-run, answering "no" first, then look and one move:
- **Map works (rooms > 0):** saveprinceton 3, csbb 4, HugeCave 6, KoA 2, windhal1 1. These are **not defects**; the earlier result was a harness artefact.
- **guess:** stuck at a NEW/RESTORE/SCRIPT/QUIT menu; needs "new". Unmeasured.
- **Still 0, real candidates:**
  - parentless player, existing-resolver: gostak (text was still at the copyright banner, so it may be in its intro), cabal, rameses, yagwad (text blank, possibly still in its intro).
  - player in the room but existing-resolver: Tokyo2, bluechairs.
  - containment present but 0: Heroine, LASH (text blank, possibly still in its intro).
Next: per-title start-up scripts until the game prompt is real, then re-measure the 8 candidates. The 2026-10-17 audit likely had the same flaw.

## Sealed diagnosis step 2 (claude, 18:00): wrong player object, per-title playerGlobal fact
After start-up (answer "no", then look), the game's player-valued globals (variable number = slot+16):
- **cabal:** V34 = V69 = 221 "you", parent 33 "your seat". The app uses 42 (named-player, parentless).
- **rameses:** V34 = V69 = 24 "myself", parent 104 "my bunkbed". The app uses 20 (parentless).
- Advent control: V38 = V79 = 20 "(self object)" in the room. heist: V24 = 15 "yourself". **The slot varies per title**, so there is no fixed library slot.
- bluechairs, Heroine, Tokyo2: no self-named global. gostak and yagwad are still pre-game (self object parentless), pending grok's start-up scripts.
Decision index: D216/D220 established exact-digest **playerObject / playerGlobal** facts (ZRamReader.js:2170-2192; playerGlobal = slot index, globals + 2*slot).
**Proposed fix class:** playerGlobal 18 for cabal and rameses (V34). Each needs one ChangePlayer/turn proof that V34 tracks the player (vs V69).
Then room = enclosingRoom(player), through the seat/bunkbed. That gives roomSource player-containment, so M09 admits.
bluechairs/Tokyo2 (player in the room, but existing-resolver) and Heroine (containment, announce fails) remain separate classes, still open.

## Sealed step 3 (claude, 18:10): player-global stability
- cabal: "stand" gives "YOU'RE STAYING PUT". The game keeps you seated, and V34 = V69 = 221 in "your seat" stays the same across turns. The app's pid flips 42 -> 20, unstable and parentless.
- rameses: "stand" and "north" are refused ("don't want to get out of bed"); V34 = 24 on "my bunkbed" is stable.
Both games hold the PC in furniture by design at the start. The library player global is the stable identity, and the app's named-player choice is not.
