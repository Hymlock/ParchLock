# LLR3 dungeon depth (operator 2026-11-06)
- g144 is a per-turn flag (2 on the fall turn, back to 1 next turn); G110/G127/G124/G194 are combat state. Neither is depth.
- Depth source (main seat, 4 walks; re-measured here): room prop 7 = map_region object. 214 (rooms 215-223), 224 (225-233), 234 (235-246), 247 (248+), 272 (273-275).
- Trapdoor Cold room 219 -> Wet room 233 crosses 214 -> 224. Rooms are not reused across levels, so room keys are unchanged.
- Fact: ModuleStatFactsClaude LLR3 (4bf1f6ea..) `regionDepth {regionProperty:7}`. Depth = 1 + rank of the region among distinct prop-7 values.
- Stat: StatTracker.seedRegionDepth -> setSeeded("depth","Depth"), read from the player's room chain.
- Map: MapTopology.levelChangeDir(from,to). WorldMap sets edge.layoutDir down/up; WorldMapLayout.vector uses layoutDir; Map.js draws in the down/up slot. dir/command keep the game's label.
- Prior: D224 (measured per-game fact; harness/wump-dark-rename.js), #1883 WorldLevel per level. Harness: harness/llr3-depth.js.
