# M12 Phase 6 crossings / box overlap — grok (#6186)
Automated Playwright on the owner's Windows machine, separate fresh Chromium contexts at 1600x1000, native line-input commands only. No rooms injected, no layout stub, no production edits. Not manual GUI/phone verification. HEAD began 2f0af62e and peers advanced it during runs; JSON/screenshots reflect working tree at run time, not a pinned build.

## Method
`node work/investigations/m12-crossings/grok-crossings.cjs <story>`; saved JSON includes every attempted command/from/to and replies. A move means observed WorldModel.lastPayload roomId changed, not proof that every attempted direction succeeded. At each step choose actual payload exit, favour less-used exits/unvisited targets; up to 100 attempts, stop at 25 changes or no available non-exhausted exits. Some inferred exits fail in the native parser. Route JSON provides the exact replay sequence; interactive/rand outcomes can differ.
After route: ParchLockMap.Show(); WorldMap.Open(); actual rendered `.world-lines .world-edge` line/polyline coordinates and `.world-room` getBoundingClientRect measured. Count strict interior segment intersections between distinct endpoint pairs; exclude shared-node endpoint contacts, collinear overlaps, self-intersections and arrowheads. Count node rectangle pair overlaps >1px in both dimensions. Includes dotted (hinted/unvisited) edges actually drawn; reverse duplicates drawn separately can yield duplicate visual crossings. Same-level rendered graph ONLY; not all stored floors. Numbers below are segment-pair intersections, not unique crossing coordinates.

## Results (final JSON and PNG basename = story)
| Story | room changes / attempts | rendered cards / edges | crossings | box overlaps |
|---|---:|---:|---:|---:|
| Zork1-TheGreatUndergroundEmpire.z3.js |25 /43|14 /36|3|0|
| anchor.z8.js |25 /41|18 /27|0|0|
| curses.z5.js |25 /25|9 /9|0|0|
| TheLurkingHorror.z3.js |20 /41|9 /13|0|0|
| Sherlock.z5.js (failed sample, retained) |0 /21 after prelude|2 /0|0|0|

Sherlock's initial door is locked (`open door` -> "You cannot do that. It is locked."); knock/wait/west was tried normally, but no counted route could be traversed from the resulting exit pool. Replaced by Lurking Horror, which stopped at 20 changes when its native route ceased (not a 25-move pass). Curses baseline left the house and ended the game at move5; final sample excludes House target41 and walks the safe attic component instead. This is a small component, NOT a large map stress test. Anchorhead/Zork backtrack too. No claim of 25 distinct rooms/title or complete big-game coverage.
Logs: grok-run1..4.txt. Baseline JSON/PNG retained for the first Anchorhead/Curses/Sherlock runs. Final Sherlock prelude = knock on door|wait|west; final Curses EXCLUDE=41; final Anchorhead no prelude. Screenshot paths are `<story>.png` in this directory.

## Worst three drawn crossing pairs (all Zork I)
1. edge7 South of House o:80 -> Behind House o:79 (solid bent) crosses edge14 Forest o:78 -> Forest o:76 (solid bent).
2. edge8 same South-of-House -> Behind-House endpoints (dotted bent) crosses edge14. This duplicates #1's visual crossing, not an independent location.
3. edge14 Forest o:78 -> Forest o:76 crosses edge19 Behind House o:79 -> Kitchen o:203 (dotted straight).
Thus 3 segment-pair hits but only TWO distinct visual locations. First crossing is around SVG (342,214); second is the diagonal into Kitchen against Forest's horizontal segment at y=214. The map includes ambiguous/dotted hints, so not all geometry denotes traversed paths. See JSON lines[] for exact endpoints and classes.

## Smallest change proposal (not applied)
WorldMapLayout.place preserves previous cells (:61-64); placeFree accepts the first free cell (:79-94), and extend uses the first placed neighbor (:98-104). No crossing cost is scored. For NEW nodes only, evaluate a bounded set of free cells near the suggested location and score added strict line intersections, then distance/compass deviation; deterministic tie order, keep all previous cells unchanged. Use the actual WorldMap bent routing convention (:442-454), not ideal center-to-center segments. Also consider de-duplicating same-endpoint solid/dotted strokes before geometry scoring (WorldMap reverseTwin :412-429 currently requires evidence parity). Do not move old rooms to solve crossings without a separate explicit layout-reset policy.
These samples establish an example, not proof the change improves every title. Needs existing layout invariants plus counterexamples before implementation. No code requested/applied here.
