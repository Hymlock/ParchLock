# Claude sealed initial scope: full-screen World Map (2026-10-07)

Operator: explored areas should stay visible, as in an RPG. The 1 October overview (D202) failed
because it combined the local map with zooming and auto-filling rooms around you. The operator
wants a SEPARATE full-screen world map with everything already laid out.

Findings:

- The local map (Map.js Build/Draw) is a fixed 13-slot compass rose (3x3 plus in/up/down/out),
  inherited from the original Parchmap. It re-centres per room, so browsing never needs global
  consistency.
- The data already exists: ParchLockMap.Rooms (all discovered rooms, Exits, ExitMeta, RAM ObjectId),
  Known Rooms, FindShortestRoute/auto-travel.

Initial design:

- Add a "World map" button that opens a full-screen overlay. The existing compass map is unchanged
  and stays the default; there is no shared zoom logic (avoids the D202 failure).
- Layout is computed from stored rooms (BFS from the start room by direction offsets) and extended
  incrementally as rooms are discovered. It is stable: no reshuffle while viewing.
- Collisions push rooms apart. Contradictions (loops that don't close, one-way exits, non-compass
  exits, teleports) are drawn as bent or labelled connectors, never hidden.
- Up and down use separate floor layers with tabs.
- Pan, pinch-zoom and Centre; the current room is highlighted; tap a room to browse or auto-travel
  (existing paths).
- Risks: mazes and random caves (Wumpus), duplicate or unnamed rooms, phone screen size,
  performance with 200+ rooms.
- Docs: amend D202 with the operator's reason ("don't combine the two views"), not "never show the
  whole map".

## Expanded findings (same session, still sealed from Codex's findings)

Reusable pieces found in the code and git:

1. **Layout algorithm exists in git:** commit 0066404 added `MapBeautify.overviewLayout(rooms, anchorId)`
   (removed later in f4bc9b1).
   - BFS by direction vectors, with long direction words included.
   - A deterministic hash fallback ring for non-compass exits.
   - A spiral search for a free cell on collision.
   - Each unconnected component starts at its own offset.
   - It returns coordinates without writing Rooms[], which is persisted wholesale, and is cached
     by GraphRevision.
   Recover it from `git show 0066404 -- js/MapBeautify.js` as the starting point.
2. **Flaws in that version to fix:**
   - (a) It was anchored on the CURRENT room, so the whole layout shifted when you moved. That
     matches the operator's "rooms filling in around you" failure. Anchor instead on a STABLE root:
     the lowest room Id (first discovered), or the room where the story started.
   - (b) up/down were mapped to y (the same as n/s) and in/out to x, so they collided with real
     compass rooms. up/down should change FLOOR, not x/y; in/out should take the fallback ring or a
     drawn connector.
   - (c) It placed by BFS order only: a later-discovered shorter path can never correct an earlier
     placement. Acceptable if it is stable; contradictions are drawn as connectors.
3. **Floors already scaffolded:** MapBeautify.ensureFloors (room.Floor defaults to 0),
   ParchLockMap.ActiveFloor and applyFloorFilter. MapIdentity keeps Floor stable. Floor assignment
   by up/down is not yet computed; the World map should compute it in its own coordinates (do not
   overwrite stored Floor unless agreed).
4. **Current layoutHints()** writes LayoutX/LayoutY from the CURRENT room into persisted Rooms[] for
   rooms-list ordering only. The World map must not reuse it (it is unstable and mutates saved data).
5. **Routing exists:** Navigator.FindShortestRoute(fromRoomId, toRoomId), so tap-to-travel can reuse
   it. Browse is the existing Draw(roomName) with DisplayedRoom.
6. **Data per room:** Id, Name, Exits {dir: index}, ExitMeta (hinted, subLocation, door, lookahead),
   ObjectId/HasRealId, Notes, Floor. Draw only pathable Exits as solid lines; draw hinted ExitMeta
   as dashed lines; never place internal-name rooms (MapTopology.isInternalRoomName or
   isPlayerFacingRoom).

## Proposed plan (for the joint design)

- **UI:** a "World map" button in the map panel opens a full-screen overlay (own DOM, own SVG for
  lines). There is NO shared zoom with the compass map; closing returns unchanged. Pan, pinch-zoom
  and Centre on the current room; the current room is highlighted; visited/unvisited styling;
  floor tabs only when more than one floor exists.
- **Layout:** the recovered overviewLayout, with fixes (a)-(c). The coordinate cache is keyed by
  GraphRevision and is incremental: existing rooms keep their cells, and only new rooms are placed.
- **Interaction:** tapping a room shows its name, notes count and actions: "Browse here" (existing
  compass view), "Travel here" (FindShortestRoute plus the existing auto-travel) and "Notes".
- **Edges:**
  - straight solid lines for agreeing pairs;
  - bent or curved lines for contradictions and long jumps;
  - dashed lines for hinted/unvisited exits;
  - a small label for non-compass exits ("climb tree");
  - an arrow for one-way exits.
- **Performance:** about 300 rooms as SVG plus absolutely positioned buttons; re-render only on
  GraphRevision change; virtualise only if measured slow.
- **Tests (focused):**
  - layout stability (moving does not shift the layout);
  - up/down floors;
  - a collision spiral;
  - a disconnected component;
  - Zork I real route with about 20 rooms;
  - a Wumpus random cave without overlaps;
  - tap-to-travel;
  - phone 360 and desktop screenshots;
  - the existing map suites unchanged.
- **Docs:** D-entry "World map (separate overlay)" referencing the D202 lesson; ARCH chapter.
- **Open questions for the operator:**
  - show unvisited-but-known rooms (lookahead/hinted)?
  - should the World map have its own button, or be offered as a mode of the existing map panel?

## Operator decisions (2026-10-07, after the plan above)

- **Known but unvisited rooms (hinted/lookahead):** shown FADED and joined by DOTTED lines.
- **Entry point:** a new "World" tab with a small globe icon, placed ABOVE the existing Map tab on
  the same side tab rail (the rail that holds Map and Inventory/Equipment).
- **Visibility:** the World tab appears ONLY while the Map or Equipment screen is open, never on the
  main game screen.
- Tapping World opens the world map FULL SCREEN. Tapping World again returns to the tab the player
  came from (Map or Equipment).
- Correction (operator, verified against the phone screenshots): the main game screen shows ONLY
  the Map tab (no Equipment tab there today). That stays unchanged.
  - Main screen: Map tab only.
  - Map screen, Equipment screen and World map screen: World, Map and Equipment tabs, with World
    above Map.
- Implementation note: find the existing side-rail tab owner (the map/equipment tab buttons on the
  right edge) and reuse its markup, styling and state. The previous-tab memory is a single variable
  set when World opens.
