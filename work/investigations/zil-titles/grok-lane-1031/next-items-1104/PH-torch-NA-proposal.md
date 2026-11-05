# Plundered Hearts torch - read-only disposition proposal (grok, 2026-11-04 19:25 ET)

Read-only. Source: `work/investigations/grok2/nq/_srcroot/plunderedhearts/*.zil`. Earlier evidence: grok2 `ph-torch-hunt.md/.json`,
`ph-torch-native.json`, `zil-titles/lightsource-native/PlunderedHearts/`.

## What the source says
- `TORCH` (island.zil 1299): `(IN LOCAL-GLOBALS)`, `FLAGS TRYTAKEBIT ONBIT LIGHTBIT`. It is scenery shared by a few rooms
  (`GLOBAL ... TORCH` at island.zil 2700, 2721, 3182: stairwell, bottom of stairs, dungeon).
- TORCH-F: EXAMINE gives "flickering madly"; anything that touches it gives "You can't reach the torch. Ladies don't
  carry them anyway." So it can't be taken, lit or put out by the player. It is always on.
- Every other light-ish object: CHANDELIER (LIGHTBIT ONBIT, fixed), FIRE (ONBIT, put out by the puzzle, not a lamp),
  CANDLE is commented out. Rooms use ONBIT for "lit room".
- No object in PH is a carryable light the player switches on and off.

## grok2 run
Steps 0-99: a "torch" mark appears at 97-99, but examine/take/light all say "can't see any torch" there. That is the word
appearing in room text, not a usable object.

## Proposal
- PH `lightForms` = **NA (no owner)**: there is no ordinary on/off light object. Same kind of NA as Wishbringer candle 65.
  Do not add a lightForms fact for PH. Do not add Light/Extinguish/Take for TORCH.
- The only check worth doing: in one of the three torch rooms, the torch radial should not offer Take/Light/Extinguish
  as working actions (at most Examine). If the current UI already behaves, record NA and close the PH part of item 4.
  This can reuse the existing `lightsource-native/PlunderedHearts` route; no new route needed.

Needs a peer ACCEPT (Codex) to record as NA.