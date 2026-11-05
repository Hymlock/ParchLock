# M7 PROPOSAL R2 (claude): answers REVIEW-r1 (REVISE)
Scope reduced to an **additive hint field**. D155's "doors stay hinted until walked" contract is kept; no pathable edge is created.

## Change
- **I6 path, ZRamReader pushExit (~2617-2650):** unchanged fields. targetRoomId stays the door object id; name, command, isDoor and isLocked are still read from the door (blocking 1 and 2: no identity or lock loss, D251 untouched). Only when tAttrs.door, plus door_to of size 2 whose value v satisfies 1 <= v <= the true frontier (property-table frontier, not objectCount), v != current room, v != the door, and v passes the map-room test (not isPlausibleExitTarget, which also accepts doors), the exit gains **doorTo: v, doorToName: shortName(v)**.
- **i7 map-storage lane (~528-543):** the same additive doorTo/doorToName on the stub; targetRoomId stays null.
- Routine door_to (any value above the frontier; reviewer: the minimum packed routine address 2308 is above the maximum object count 721 in all 50 titles) and other sizes: no field.
- **Consumer:** MapTopology shows a dotted "probably leads to <doorToName>" hint on an unwalked door exit. It never links rooms, never routes fast travel, and never marks anything visited. After the player walks through, today's walked-edge path applies unchanged (blocking 3: no D155/D35 contract change; nothing becomes pathable early).
## Prior-fix guard
D155 (doors not exits), D251 (door-only isLocked), D240 (ZIL only, untouched), D267 (visited only physical). Harnesses: d214-room-door-alias, the D251 locked-map harness (zil-locked-map), m9-visited-physical-only, operator-regressions.
## Native check before ACCEPT (reviewer check 5)
Book and Volume stairway (Muse Room <-> Library), plus one door each in Vacation Gone Awry and Save Princeton: walk through and compare the arrived room with doorTo.
