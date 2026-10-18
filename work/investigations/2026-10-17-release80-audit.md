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
