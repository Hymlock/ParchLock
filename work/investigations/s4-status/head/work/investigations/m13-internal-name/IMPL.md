# M13 — "(Library)" rejected as an internal name (Book and Volume room 64)

## Census (census.txt)
All 309 games/ Z titles (Glulx skipped; story bytes via zil-attr-analyzer story()). 1124 objects
start with "(" and matched the pre-M13 regex. Distinct names:
(Inform Library) 214, (Inform Library 6/3) 7, (Inform Parser) 221, (Library Extensions) 62,
(LibraryMessages) 195, (libraryMessages) 2, (darkness object) 221, (self object) 200,
(Darkness) 1 [dreamhold 46: parentless, childless placeholder, not a room], (Library) 1 [bookvol 64].
Only bookvol 64 "(Library)" is a real room (parentless, child 65 = shelves; player enters it via "u"
from MuseRoom 62). isPlausibleMapRoom is false for every census row (the "(" name gate), so plausibility
cannot separate them; the name can. No other real-room name is matched by inform|object|self|darkness.

## Fix (m13.diff), js/ZRamReader.js isInternalNamedLocation
`library|librarymessages` -> `library\s*messages|library\s*extensions?`. Every census internal
object stays rejected ("(Library Extensions)" is now matched explicitly; "(Inform Library...)" via inform).

## Evidence
- harness/m13-internal-room-name.js: on candidate 2251 PASS / 0 FAIL (static: every census row,
  fixed rows bookvol 64 not-internal + dreamhold 46 internal, census size 1124, enclosingRoom(player in 64)=64;
  native: teleport to 62, globals 16/43, real "u" -> payload room 64, roomSource player-containment).
  On HEAD: 3 FAIL (64 rejected, enclosingRoom=0, native room 358 "Home" roomSource none).
- harness/operator-regressions.js 13 PASS / 0 FAIL; harness/inform-layout.js 75 PASS / 0 FAIL.
- Focused regression gate (base = HEAD via git archive; cand = HEAD + this ZRamReader.js only;
  GLULX=1; bookvol, Advent, Zork1, heist, Alabaster): 5 games, 0 differences.

## Observation (not changed)
After the fix the native payload roomName in 64 is "down" (room id is correct). The display name for a
"(...)" compiled room comes from elsewhere (prose/status); worth a follow-up alongside M14.
