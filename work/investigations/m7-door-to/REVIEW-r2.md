# M7 REVIEW R2 (adversarial stand-in reviewer) on PROPOSAL-r2.md

**Verdict: ACCEPT.** There are two required wording or test additions, listed under Conditions. Neither is a design change.

## R1 blocking items: resolved
1. I6 path: targetRoomId, name, command, isDoor and isLocked all stay on the door object. Only doorTo and doorToName are added. Door identity and the travel command are kept.
2. D251: tAttrs still comes from the door, so lock and door bits are not read from the room.
3. D155/D35: no edge is created and nothing becomes pathable before a walk. This holds in the code (see Consumers).
Non-blocking R1 notes: R2 uses the property-table frontier and the room predicate, and leaves other sizes alone. All addressed.

## Native check (play.html, Playwright, seeded as in regression-gate.cjs)
Values are read in the page through `informPropertyNames(mem).names.door_to` and `listProps`. "Arrived" means the player's RAM parent after the move, cross-checked against the game's printed room heading.

| Game | From | Door (id) | static door_to | Arrived |
|---|---|---|---|---|
| Book and Volume | Muse Room 62 | stairway 61, `up` | 64 Library | 64 Library (heading "Library"). MATCH |
| Book and Volume | Library 64 | stairway 61, `down` | 64 (= current room, so no hint by rule) | 62 Muse Room. Suppression correct |
| Save Princeton | Common Room 399 | door 400, `southwest` | 440 Entryway | 440 Entryway. MATCH |
| Save Princeton | Entryway 440 | metal door 444, `northeast` | 399 Common Room | 399 Common Room. MATCH |
| Save Princeton | Entryway 440 | wooden door 443, `west` | 464 Archway | not passable at game start (stayed in 440). A hint only, so this is harmless |
| Vacation Gone Awry | (all) | 41 objects with the door attribute, e.g. bedroom door 148 | all routines (23350, 31805, 31946, 33373...) or absent | N/A: **no static-door_to door exists** |

How the Book and Volume check was run: after the boot menu (`b`), the Muse Room is far into the game. I moved the player object in RAM to 62 and set the two globals that held Home (16 and 43, location/real_location) to 62. Then I walked `up` and `down` natively. The game's own door_to resolution did the travel.

## Findings
- **Vacation census entries are false positives.** In Vacation, `informPropertyNames` gives door_to = 7 = n_to and door_dir = 10 = w_to. That is the old-library `alias` layout. The census's Vacation "static door_to" hits (Driveway->front door, Workshop->door, and so on) are rooms' n_to values. No door object has a static value. R2's `tAttrs.door` gate stops these on the I6 path, so the design is safe. The census totals ("16/16") and the Vacation sample are wrong, though, and need correcting.
- **The Save Princeton wooden door 443 cannot be walked at game start, but door_to says Archway.** This is fine for a "probably leads to" hint. It must not be presented as a confirmed edge, and R2 already rules that out.
- Pre-existing and unrelated to M7: in the Library after `up`, the payload roomId read was 329 "pager" although the RAM parent was 64. This may be caused by the teleport. It is not caused by this proposal. A separate look is advised.

## Consumers (can a doorTo field become an edge?)
- `MapTopology.applyPayload` (~701-724) calls `link()` with an **explicit meta literal**. A new raw `doorTo` reaches `classifyExit`'s copy but **not** `link()` or ExitMeta unless it is added there on purpose. Edges come only from `room.Exits[dir]`. Those are written by `link()` from `toId`/dest, and by Map.js:925 on a walked move.
- Routing and fast travel: Navigator.js:259-282 and Map.js:1367-1372 read `room.Exits` only. DirectionalRadial:491 uses `room.Exits` keys. Map.js:565-605 (the reverse-edge inference) reads `ExitMeta.toId` only. reconcileI7MapStorage reads `targetRoomId`/`toId` only. **No consumer reads doorTo**, and none would treat it as an edge.

## Conditions (required in the implementation)
1. If doorTo is carried into ExitMeta for the dotted hint, the implementation must delete it when a later observation lacks it. The `Object.assign` merge at MapTopology:460 otherwise keeps stale fields, the same pattern as the lines 473-479 cleanups. It must never be copied into `toId` or `Exits`.
2. The i7 lane decides isDoor by "has a door_to property". In an alias-layout story (door_to == n_to), that test would also match rooms. Before adding doorTo there, gate it on the door attribute, or state that the lane is inactive for alias layouts. Add a test using the Vacation layout (door_to == n_to, room n_to -> object), and assert that no doorTo is emitted.
3. Correct the census tally to exclude alias-layout titles. Run the harnesses listed in R2's prior-fix guard, plus operator-regressions and the three-type gate.
