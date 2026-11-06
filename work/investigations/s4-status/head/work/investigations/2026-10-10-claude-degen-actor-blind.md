# Degeneracy (degen.z5.js): no map through real travel — claude blind findings

Sealed before reading codex's degen-actor-sealed.md / degen.z5-parent-deltas.json.

## Observed
- After boot, LOOK/EAST/NORTH/SOUTH/WEST print Reception Chamber, Wait Chamber, Dining Hall, Wait Chamber, Reception Chamber.
- Payload: room null / source "none" on most turns, then wrong rooms 79 "long Table" (existing-resolver) and 81 "Perpetuum Mobile". The map's current room ends up as "long Table".
- The resolved player is 20 "(self object)" with NO parent (it is not in play).

## Object-parent and global diffs across real moves
| cmd | moved objects | location-like globals |
|---|---|---|
| east | 157 "(StandardPlayer)" 34->37; 93 Sun-Light 34->37 | g0, g21, g22, g25: 34->37 |
| north | 157 37->38; Sun-Light 37->0 | g0 ... 37->38 |
| south | 157 38->37; Sun-Light 0->37 | g0 ... 38->37 |
| west | 157 37->34; Sun-Light 37->34 | g0 ... 37->34 |

- 157 "(StandardPlayer)": animate, parser word "harpo", NO "yourself". Globals 18 and 53 hold 157 (the I6 player/actor pair); no global holds 20.
- Rooms 34/37/38 have BLANK short names (the D201 unnamed-room lane).
- Sun-Light 93 is a floating (found_in) inanimate object, so it moves too.

## Why resolution fails (ZRamReader.resolvePlayer, js/ZRamReader.js:1733-1820)
- 157's name starts with "(", so isMetaName() rejects it. It is not parserSelf, because it has no "yourself" alias.
- 20 "(self object)" gets +40 from isSelfObjectName and wins, although it is parentless and referenced by no global.
- With a parentless player, enclosingRoom = 0, so the fallback resolvers pick furniture (long Table, Perpetuum Mobile).

## Deterministic actor proof available (no name guessing)
1. Two globals (18, 53) both reference 157; none reference 20. This is the I6 player/actor pair, the same pattern as M05b Facility (globals 44 and 50).
2. On every successful move, 157's new parent equals the new value of g0 (the location global), and so do g21/g22/g25.
3. 157 is animate; Sun-Light is the only other mover, and it is inanimate (excluded per the M05b negative-control rule).
4. 20 has parent 0 and zero global references: not in play (ChangePlayer).

## Candidate rule (research only, for comparison)
- In resolvePlayer, a parentless "(self object)" must not win over an animate object that is referenced by >= 2 globals and has a sane parent. Cheapest gate: drop the self-name bonus when the candidate has parent 0 and no global reference.
- Admit an internal-named animate object when it is referenced by >= 2 globals and its parent equals a location-global value (g0 here). Or use the M05b moved-object rule, persisted after 2 moves.
- Rooms then resolve through enclosingRoom and the D201 blank-name lane, with names from the printed heading.
