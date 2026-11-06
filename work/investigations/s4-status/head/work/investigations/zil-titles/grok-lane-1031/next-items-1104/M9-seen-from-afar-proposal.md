# M9 seen-from-afar vs visited - read-only proposal (grok, 2026-11-04 19:20 ET)

Read-only. No js changed. Checked: git history, PRODUCTION_PLAN.md, ARCHITECTURE_UML.md, DECISION-INDEX.

## Question
When the game describes a room from a distance (look through an airlock, a window, a crystal sphere), can the map
mark that room as visited?

## What the code does today
- `WorldVisited` is set in exactly one place: `ParchLockMap.SetCurrentRoom` (js/Map.js about line 262, first added b747e425, 2026-10-08).
- Every caller of it is driven by the player's actual location (`payload.roomName/roomId`): Map.js:934 (GotoRoom),
  Map.js:1342 (reset reseed from `WorldModel.lastPayload.roomName`), MapTopology.js:646 and :698.
- `WorldMap.isVisited` = `room.WorldVisited || room === current`. The dotted-edge and "unvisited" CSS use only this.
- No js code reads the game's own "touched" flag (TOUCHBIT, schema key `visited`, default 24) to decide visited.

## Sealed evidence (codex-votes-0231.md, Starcross 1352, Zork II 1407)
- Starcross: LOOK through the airlock sets TOUCHBIT 29 on Red Hall 20 and Blue Dock 94 while the player stays put (175/106).
- Zork II: looking through window 103 and into the blue sphere sets TOUCHBIT 2 on 103 and Murky 142 while the player is elsewhere.
- So the game's own flag is NOT "the player was there". Using it for "visited" would be wrong.

## Conclusion
The product is safe by construction today: a room seen from afar is not marked visited, because visited only comes from
the real location. The remaining work is a guard so nobody adds TOUCHBIT=>visited later.

## Proposal (needs cross-seat ACCEPT before any code)
1. Rule (DECISION-INDEX entry, owner: Codex): "Visited on the map comes only from the player's real location. TOUCHBIT /
   `attrs.visited` must never set WorldVisited or the visited CSS."
2. One small test, harness only, no js: replay the two sealed prefixes (Starcross to 1352, Zork II to 1407) headless,
   then assert `WorldVisited` is false for 20, 94 (Starcross) and 103, 142 (Zork II) while TOUCHBIT is set on them.
   Reuse the sealed prefixes; no new routes, no random retries.
3. No product change unless that test fails.

Cost: one harness file, two short headless runs.