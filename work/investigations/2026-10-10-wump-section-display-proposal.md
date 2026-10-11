# Wumpus section display: proposal R1 (claude; operator request 2026-10-10). NO CODE.

**Operator:** show a Wumpus room's sections on the map as separate boxes grouped inside one larger "Room #N" frame. This applies only to games with this structure; the census shows wump2ka is the only one.

## Doc check (current code)
- No grouping exists. D30's planned "sub-map boundary hulls" were never implemented: there is no hull or cluster code in Map.js, WorldMap.js, WorldMapLayout.js or MapBeautify.js.
- D54: the status-row "Room #N" is display-only and never identity. D224: identity = the section object (real_location).
- D62: an earlier claim that "the same object printed a different Room #N" was measured while identity was wrong (D224). It must be re-proven before Room #N is used as a group key.

## Proposal
1. **Prove first (research):** each section object always reports the same printed room number.
   - Sources: the game's own data (a per-object property holding N, if one exists) or the status row across repeated visits.
   - If it is not stable, stop: no grouping.
2. **Data:** a display-only `SectionGroup` on the map room, set only when the D224 measured fact is valid for the room (wump2ka digest).
   - Value: the proven number (from the object's own property if found; otherwise the status row at admission, display-only).
   - It never affects identity, exits or naming.
   - It is saved with the map (it must survive map save/reload and game restore; operator rule).
3. **Rendering:**
   - Local map and World map: rooms sharing a SectionGroup are drawn inside one rounded frame labelled "Room #N", sized to the bounding box of their boxes plus padding.
   - Layout: a mild attraction between rooms of the same group in the existing layout pass, so frames do not overlap other rooms.
   - No change for rooms without a group (every other game).
4. **Tests:**
   - a wump2ka route visiting two sections of one room plus a single-section room: one frame with two boxes; the single room has no frame;
   - the frame survives map save/reload and game restore;
   - another game's map renders byte-identically (screenshot or DOM diff);
   - the regression gate.

## Step 1 result (claude; work/investigations/wump-section-stability.cjs)
- 5 fresh random sessions x 40 moves. Each turn pairs the measured section (G37) with the status-row "Room #N".
- 25 distinct sections visited, 0 unstable (every section always showed one number). Multi-section room observed: #22 = sections 46 and 55.
- The object properties hold no plain room number (prop 3 is a per-object table address; the others are shared routines), so the stable status-row number is the group key: display-only, recorded at admission while the D224 fact is valid.
- D62's "same object printed a different Room #N" is not reproduced once identity is the measured section. Recorded as a likely artifact of the pre-D224 wrong identity, not as a proven explanation.

## R2 (operator 2026-10-10): one composite room box with sections as stacked cells and dotted interior separators
Operator: "correct algorithmic math ... interior box separators as dotted lines ... stacked correctly next to each other". This replaces R1's loose frame.

**Doc check:** MapBeautify.js and WorldMapLayout.js have no cluster, rigid or packing logic (D30's rigid-cluster physics was planned, not built). This is new layout code.

**Composite node:**
- All sections sharing a SectionGroup render as ONE map node: an outer solid border labelled "Room #N", with an internal grid of equal cells.
- The layout and path drawing treat it as one rigid node; it moves as a unit.

**Cell placement (deterministic, stable, adjacency-preserving):**
1. Every section gets a persisted integer cell (row, col) inside its group, saved with the map. It survives map save/reload and game restore.
2. The first section of a group gets (0,0).
3. A newly admitted section is placed in the free cell orthogonally adjacent to the section the player CAME FROM (the walked edge's source), if that source is in the same group.
   - Preference order: right, down, left, up.
   - If none is free: the nearest free cell by Manhattan distance, ties broken by (row, col).
   - With no same-group source, it takes the nearest free cell to (0,0).
4. Existing cells never move when sections are added: no reflow and no jumping.
5. The grid bounds are the min/max of the occupied cells. The composite size is cols x cellW by rows x cellH, where cellW and cellH are the largest section label box in the group (uniform cells).

**Drawing:**
- Outer border solid. Internal cell boundaries DOTTED (dashed stroke). Empty cells inside the bounds show no separators (they render as background).
- Each cell shows the section's own name; the current section is highlighted.
- Exits: an edge between sections of the same group is drawn as a short connector across the shared dotted wall, or omitted when they are adjacent. An edge to another room attaches at the source cell's outer border.

**Scope:** only rooms with a SectionGroup (the D224 fact, wump2ka). Every other game's map is untouched.

**Tests:**
- deterministic placement from a scripted route (cells and adjacency asserted);
- new sections never move existing ones;
- save/reload and restore keep the cells;
- dotted internal and solid outer stroke present in the DOM/SVG;
- another game's map is byte-identical;
- the regression gate.

## R3 correction (claude): REUSE the existing placement algorithm; no new placement math
- The operator is right: js/WorldMapLayout.js `place(nodes, edges, previous)` already implements:
  - stable previous cells (nothing jumps);
  - neighbour placement by exit vector (compass deltas; a deterministic hashed ring offset for labelled/numbered exits such as x1/x2/x3);
  - a deterministic square-perimeter free-cell search.
- R2's hand-written placement rules are WITHDRAWN.
- **Revised design:**
  - Inside a SectionGroup, run the SAME `WorldMapLayout.place` on the group's sections and their intra-group edges. That gives each section's internal (x, y) cell, stored like WorldX/WorldY (e.g. SectionX/SectionY) and persisted with the map.
  - The only adaptation, for "stacked next to each other": within a group, a labelled exit uses the unit orthogonal neighbour instead of the radius-2 ring offset, so connected sections touch. This must be a parameter of place() for the group call only; world-level behaviour is unchanged. To be agreed in review.
  - The outer World/local layout then treats each group as ONE node (its key), placed by the same place() exactly as today.
  - Drawing: a solid outer border sized to the group's cell bounds, dotted interior separators, one label per section, the "Room #N" caption.
- Tests: WorldMapLayout's existing tests must stay green; the group call is deterministic; previous section cells are kept; all else as in R2.

## PROCESS CORRECTION (operator 2026-10-10: "you just broke the rules")
R1 and R2 were written without the required check against the current code, PRODUCTION_PLAN and ARCHITECTURE. R2 even claimed no layout logic existed after reading two files. No code was written. The doc check below is now done; R3 stands only as amended by it.

## Doc check (current code + plan + architecture)
- **ARCH ch.26 (D30) Map Beautification Engine:** cardinal edges form Rigid Structural Clusters, each "treated as one rigid body", with "Sub-map clustering - boundary hull per Rigid Cluster" and inter-cluster bounding-box repulsion. A Wumpus room's sections are a natural instance of this planned (unbuilt) cluster/hull concept. The design should be framed as the first implementation of the D30 hull for display-only groups, not a parallel invention.
- **D202 World Map contract (bus1878/1879/1895/1906/1908):**
  - (a) Codex owns pure WorldMapLayout placement; Claude owns WorldMap rendering, controls and integration. Any place() parameter change is Codex's code and needs Codex's fixture.
  - (b) Object identity keys placement. Valid WorldX/WorldY/WorldLevel annotations stay fixed as rooms arrive; collisions are shown honestly.
  - (c) DOTTED edges already mean hinted, or touching unvisited rooms. Interior section walls must NOT reuse the dotted style; use a distinct thin dashed or low-contrast wall style, to be agreed.
  - (d) The local compass map (Map.js Draw) "stays unchanged as the default".
- **D54:** the printed Room #N is display-only. **D224:** the section object is identity. **D62:** the freeze is unaffected (grouping is display-only).
- **Code:**
  - js/WorldMapLayout.js place() is the placement algorithm (stable previous cells, vector and hashed-offset placement, perimeter free-cell search).
  - js/WorldMap.js owns WorldX/WorldY annotations and rendering.
  - js/MapBeautify.js keeps the compass map ("does not replace Draw()'s dir grid").

## R4 scope (supersedes R3 where they differ)
1. The grouping appears in the **World Map** (the D202 renderer). The local compass map keeps its D202 status as unchanged default, UNLESS the operator wants it there too: operator question.
2. **Placement:** Codex extends WorldMapLayout.place with group support. Section cells come from the same algorithm with a group-only unit adjacency; the group is placed as one node. Codex's fixture is extended. Claude renders.
3. **Walls:** a distinct style, not the dotted hinted-edge style.
4. **Everything else** as in R3: persisted with the map, survives save/reload/restore, other games unchanged, the gate.

## OPERATOR DECISION (2026-10-10): BOTH maps
- Grouped section boxes appear on the World Map AND on the local compass map. This is an explicit operator exception to D202's "local compass map stays unchanged".
- It is scoped strictly to D224 section groups; every other room and game draws exactly as today.
- The local map change needs its own doc check against Map.js Draw()'s direction grid (D30/MapBeautify "does not replace Draw()'s dir grid") and its own fixture.
