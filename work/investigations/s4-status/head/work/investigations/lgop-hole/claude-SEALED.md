# LGOP Cell hole — claude blind investigation (SEALED 2026-10-31)

Blind: read only independent-request-lgop-hole.md + lgop-hole-reveal.config.json. No codex LGOP findings opened.

## Method
- Native walk: `G1SEED=0 G1ROUTES=evidence/routes.json node work/investigations/grok1/batch/g1-batch.cjs eval lgop 185 <evidence/ev.js>`
  (config route + `look`, `examine hole`; seeded JSEED tier 0; play.html on current checkout). Output evidence/native-eval.json.
- Source: historicalsource/leathergoddesses @17cbbc1 (read-only clone in scratchpad).
- Code read: js/ZRamReader.js localScopeObjects (D232), js/ModuleStatFactsClaude.js LGOP entry (digest 103324c3...).

## Observed (native, current app)
- Event fires: "Suddenly, part of the floor collapses ... Cell / Among the new rubble, you notice a black circle". Player 200 parent = 50 (Cell).
- LOOK: "A black circle is lying on the ground amidst some rubble." `examine hole` succeeds (void description) -> parser has it in scope.
- Hole = object 83: short name "" (EMPTY), parent 40 (LOCAL-GLOBALS holder), attrs 00000000, dictionary words hole/circle, props 31,18,17,16.
- `ZRamReader.localScopeObjects(mem,50,200)` = []. Payload discoveredObjects contains no 83. => no underline mark / radial for "black circle"/"hole".

## Source
- globals.zil 1213: `<OBJECT HOLE (IN LOCAL-GLOBALS) (SDESC "black circle") (SYNONYM HOLE CIRCLE) (ADJECTIVE BLACK WHITE) (ACTION HOLE-F)>` — no DESC; name printed from SDESC property (hence empty object-table short name).
- phobos.zil 72-80: CELL (GLOBAL WIDE-CELL-DOOR HOLE CELL-OBJECT); I-CRAMPED-SPACE sets HOLE-OPEN T; HOLE-INVISIBLE (globals.zil 1314) is a ROUTINE over HOLE-OPEN / room, not an INVISIBLE flag bit.
- HOLE-F in Cell: ENTER/BOARD/WALK-TO/LOOK-INSIDE with noun "hole" -> DO-WALK UP -> "You can't reach the hole in the ceiling." (sic; the circle on the floor is the hole's identity in Cell); STAND-ON/ENTER -> FALL-THROUGH-HOLE to MAIN-HALL-OF-PALACE (cell HOLE-DESTINATION) unless the WALK-TO branch catches it first; TAKE -> "It's not liftable."
  Same object is a local global in ~12 rooms (minaret, oasis, garden, long corridor ...) — one identity, room-conditional visibility.

## Root cause (two independent blockers, both must be fixed)
1. No `localScope` fact in the LGOP ModuleStatFactsClaude entry -> D232 local-global path returns [] for every LGOP room. The hole is a LOCAL-GLOBAL, never a room child, so the ordinary room walk never sees it.
2. Even with a fact, `localScopeObjects.add()` rejects `!name`: object 83's object-table name is empty because ZIL used SDESC (property) instead of DESC. Same applies to any SDESC-only object (sheet, overalls, comic book use SDESC too but also have names? unchecked).
Also: visibility is a routine (HOLE-INVISIBLE / HOLE-OPEN global), not the INVISIBLE bit, so a bit-only admission would show the hole in Cell before the collapse (and in Garden before sod moved, Long Corridor except loc 3) — a wrong-early mark.

## Proposed fix direction (no code written)
- Add LGOP localScope fact (GLOBAL prop number, holder 40, lit bit, invisible bit) measured per D232 procedure; check Cell's GLOBAL prop bytes contain 83 (not byte-verified here).
- Name resolution for SDESC-only objects: read the measured SDESC property (one of 31/18/17/16 on obj 83; identify which via source property order) as display name — from the game's data, not a text mask.
- Gate admission on the game's own state: HOLE-OPEN global (and SOD MUNGBIT / LONG-CORRIDOR-LOC) — a per-title conditional-visibility fact, or admit only when the room text names it (story-text mention of "black circle"). Prefer the measured global over text.
- Radial for the hole in Cell: Examine; Enter/Stand on (native: FALL-THROUGH-HOLE / or up-reach refusal) — verify natively which reply Stand on gives in Cell before offering.

## Limits
- Seed 0 tier only; DOM underline selector in ev.js matched nothing (links []), so "no mark" rests on payload/localScope, not a screenshot.
- Property-number of SDESC and Cell GLOBAL bytes not measured.

## Evidence manifest (sha256)
866b6351a3ce686c8faacd895b92a1baf9316478206d4e9695b30594e939b741 *evidence/ev.js
c1380f9627b87fd2be71c7ec0a243a8844c6601fbfb58d3003f00ad49645c6f4 *evidence/native-eval.json
56d0cee8b9678b80c306f221b0efaa270f073059f188be7789726955f024d899 *evidence/routes.json
5a0bd659782f91639c54ab1034390af315eba596fc9c7eab0163a03556c14a8c *../../../games/LeatherGoddessesofPhobos.z3.js
4c7d47d956e9ec6a077e97d5e7b9c7ce57019815e253e07ffe81097082d8cecc *../../../js/ZRamReader.js
dee966f416bc5b71bee08dd953d1b952431fb82e97fccc99a5d3aaee26558d6c *../../../js/ModuleStatFactsClaude.js
