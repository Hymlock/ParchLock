# M04: Inform 7 exits live in Map_Storage (claude research, 2026-10-10)

The rows were read live from RAM at boot; no product code was changed. Probes: scratchpad i7find/i7rows. These are reproducible: an ND-wide row whose column c holds a known destination, with the surrounding words being 0 or object ids.

## The Warbler's Nest (I7, compass holder 5, ND = 13; columns in compass-child order: n, ne, nw, s, se, sw, e, w, u, d, in, out, road)
Map_Storage row 0 is at byte 17062 (rows of 26 bytes):

| Row | Room | Exits |
|---|---|---|
| 0 | 51 Among the reeds | n -> 56, s -> 53 |
| 1 | 53 Beach | n -> 51 |
| 2 | 56 | ne -> 61, s -> 51, e -> 101 |
| 3 | 61 | s -> 51, sw -> 56 |
| 4 | 101 | w -> 56 |
| 5-7 | (rooms with no compass exits) | all 0 |

- Ground truth: SOUTH from 51 moved the player object 48 from 51 to 53, the row-0 south column.
- Reciprocity: 56 e -> 101 / 101 w -> 56, 56 ne -> 61 / 61 sw -> 56, 51 s -> 53 / 53 n -> 51.
- The row order equals the I7 kind-instance chain found earlier (prop31: 51 -> 53 -> 56 -> 61 -> 101). That is why prop31 looked like an "exit": it is the next-room-instance link, i.e. the row order, not a direction.

## Facility (I7, compass holder 5, ND = 12)
Map_Storage row 0 is at byte 30128 (rows of 24 bytes):
- row 0: room 45 Lobby, n -> 48;
- row 1: room 48 Visitor Gallery, n -> 50, s -> 45.

This matches the M05b move evidence (45 north -> 48, 48 south -> 45). Further rows hold the rest of the map, e.g. row 2 n -> 55, s -> 48, e -> 53, w -> 54.

## Shared structure
- In both games the array follows the same compiled preamble (a word pair table, then "..., 255, 13, 0, 14, 0").
- A 0 means no exit in that direction. Nonzero values are rooms (or doors, to be checked).

## Proposal outline (for adversarial review; not implemented)
1. Gate: Inform 7 build (existing I7 detection), compass holder found, ND = number of compass children; columns follow compass-child order. Geometry for each column comes from that child's canonical word (as in D217), and a child without one is unresolved.
2. Room-row mapping: row i belongs to the i-th room in I7's room instance order. Its source needs qualifying: the kind-instance chain property (prop31 in Warbler), or an I7 IK1_Count-type property if the property table decodes. No title dispatch.
3. Base location: scan for the unique address where, for the qualified room order, every row word is 0 or a room/door object, at least half the rooms have >= 1 exit, and reciprocal pairs exist. Zero or several candidates fail closed (today's behaviour).
4. Use: pre-travel exit labels and destinations for I7 rooms replace the phantom prop31 "exit-N" (M04). The D35 numbered 91+ lane (wump2ka) and the standard Inform lane (D217) are untouched, and directionDoorDirs is unaffected.
5. Actor/room source: the current room for the lookup comes from the qualified player (D204 fact / accepted resolution). Facility's player resolution (M05b) is NOT assumed; for Facility the decoder works from the room id once that is qualified.

## Open questions
- What qualifies the room order in Facility (which property forms its instance chain)?
- Are doors stored as the door object (requiring door_to resolution)?
- Is Map_Storage dynamic (I7 "change the north exit" at runtime)? If so it must be re-read per collection generation, as in D217.
