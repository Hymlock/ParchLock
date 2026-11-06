# Release-80 audit: first pass (claude, 2026-10-17)

Source: gate rows for the 80 GAMES_INCLUDED.md games (gate-bf-base1.jsonl, HEAD-equivalent tree).
Release mix: 50 z5, 17 z8, 8 zblorb (Inform Z) and 5 gblorb (Glulx). No Infocom/ZIL titles.

## Triage

- **"no-prompt" (BlueLacuna, bookvol, chico): startup menus, not app failures.** They need a specific key ("N", "B", a
  number); the gate only presses Space. Fix: per-game start keys in the gate, so the audit sees the real game.
- **0 rooms in Glulx (Alabaster, AndromedaApocalypse, CounterfeitMonkey, RoversDayOut, BlueLacuna):** the known parked
  Glulx structural reader (D38). Map stays empty.
- **0 rooms in Inform (Heroine, KoA, LASH, Mask, Tokyo2, bluechairs, cabal, gostak, guess, rameses, saveprinceton,
  sutwin, windhal1, yagwad, csbb, HugeCave):** check each for a menu or intro first, then for a real room-reading gap.
- **"1 room / 0 exits / empty inventory"** at boot is normal for many games (single-room openings, nothing carried yet).

## Next

1. Per-game start keys in regression-gate.cjs.
2. Rerun the 80.
3. Real gaps, ranked by player impact.

## PRIORITY 1: empty map in about 17 release games (player-visible)

Measured on device at boot plus one LOOK (`page-probe`). The map panel has 0 rooms although the game is in a room.

### Pattern A (about 11 games): player resolves to a parentless placeholder

- The player resolves to an Inform placeholder with no parent, usually 20 "(self object)" (`playerSource: named-player`).
  The story has moved the player to another object.
- Player containment therefore fails. The room source falls back to "existing-resolver", and the M09 admission in
  `js/MapTopology.js:85-97` (Inform: only player-containment or measured-fact rooms that are announced) keeps every
  room off the map.
- Affected: gostak, cabal, Tokyo2, bluechairs, rameses, saveprinceton, csbb, HugeCave, KoA, guess, yagwad.
- The inventory learner already knows the real holder in Tokyo2 (81, in room 29), bluechairs (100, in 419) and
  cabal (42), but the room path does not use it.

### Pattern B (Heroine, LASH, windhal1): player-containment works, but the map is still 0

- Heroine also reports the wrong room: "Golden Horse" (112) while the game prints "Drowning (in the Atlantic ocean)".
- Suspect: the M09 isRoomAnnounced check, or the name source.

### Fix direction (needs claims on js/ZRamReader.js / ZRamProvider.js / MapTopology.js; grok2's claims are held)

- **A:** when the resolved player is parentless and a placed inventory root or story player object exists, resolve
  containment from that object instead of the placeholder.
- **B:** trace why an announced, player-contained room is still rejected.
