# Inform/Glulx attribute-flag census (2026-10-24, read-only)

Script: `census.cjs` (loads js/ZRamReader.js + js/AttributeSchema.js in a vm, decodes games/*.js base64, unwraps blorb ZCOD/GLUL). Per-title table: `census.csv`.
Scope: 280 non-ZIL titles (z5/z8/zblorb/gblorb; z3 and the ZIL source-flags keys excluded). Release column = listed in GAMES_INCLUDED.md.

| Group | Titles | In release 80 |
|---|---|---|
| (a) `informAttributeNames` returns a table with all 20 standard names | 225 | 58 |
| (b) Inform-compiled, no name table | 43 | 17 |
| (c) Glulx | 11 | 5 |
| (d) unknown (Sherlock.z5 - Infocom ZIL, missing from the ZIL list) | 1 | 0 |

## Findings
1. **Name table**: every (a) title has all 20 standard names (open, openable, container, door, locked, lockable, light, edible, clothing, worn, scenery, static, supporter, enterable, transparent, switchable, on, animate, talkable, concealed) - zero missing. `bitFor` already uses the declared table first, so these get flags for free.
2. **Library order is NOT fixed**: in 52 of the 225 (a) titles the declared bits differ from AttributeSchema.PROFILE (6.12.2 linklpa order). Causes: game attributes declared before `Parser.h` shift the whole block (wump2ka: river/sink/dissolve/poison/frozen take 0-4, animate=5); older libraries order differently (Vacation/temple: no `absent` at 1, `female` aliases `absent`). So the PROFILE fallback is only right when the game adds no early attributes and uses a 6/10+ library.
3. **Version detection**: header 0x3C gives compiler version for most (6.21:80, 6.15:37, 6.31:40, 6.30:36, 6.14:19, 6.05:8, ...); 33 have non-ASCII bytes there (old compilers / serial-only). Library version (e.g. "6/11") is in Z-encoded text, not ASCII; the census did not decode it, and since early user attributes shift bits regardless of library, it would not fix (b) anyway.
4. **(b) titles** (no names; mostly compiled 6.05 and older or with names stripped): bitFor falls back to PROFILE when `_familyOf` says confirmed-inform or isInformCompiled is true. Given finding 2, about 1 in 4 of them can be expected to be wrong (ModuleStatFactsClaude `attributeMap` already exists for phlegm/heist for exactly this reason). Release (b) titles: Enemies, Gumshoe, SoFar, break-in, godot, heist, library, lists, lost, magic-toyshop, minster, spirit, sutwin, theatre, tube, wedding, windhal1.
5. **Glulx**: no attribute-name reader exists (ZRamReader is Z-machine only; AttributeSchema.js line 7 says Glulx objects are compiler-synthesized and not this table). Flags there come only from the Emglken/RemGlk providers, not attribute decoding. Release Glulx: Alabaster, AndromedaApocalypse, BlueLacuna, CounterfeitMonkey, RoversDayOut.

## Estimate
- **Free**: 225 titles (58 release) - declared names, already wired, no per-title work.
- **Per-title work**: 43 Inform (b) titles (17 release) need a measured `attributeMap` or a check that PROFILE holds; a cheap per-title test is to verify known objects (e.g. a door/container) against PROFILE bits, ~minutes each, far less than ZIL.
- **Separate design**: 11 Glulx (5 release) - no attribute path at all today.
- Fix: add Sherlock.z5 to the ZIL list.
