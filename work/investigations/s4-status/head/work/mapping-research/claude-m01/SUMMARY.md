# M01 native ground truth (claude, N6 evidence before code)

Probe: work/investigations/m01-direction-ground-truth.cjs (843079c). The room is the player's RAM parent; the payload is recorded separately and agreed in every row. Games without UNDO were restarted from boot between probes. Raw output is in the sibling .txt files.

| Game | Typed direction -> actual room (RAM parent) | Start-room prop | Lane geometry (#2542) | Today's label |
|---|---|---|---|---|
| Cat's Eye (v3) | north -> 20 Sitting Room | p6 | 6 = north OK | exit-6 (WRONG) |
| | south -> 31 Main Hallway | p7 | 7 = south OK | north (WRONG) |
| | east -> 23 Kitchen | p8 | 8 = east OK | south (WRONG) |
| Night (v5, Library 5/12) | northeast -> 36 Hall Outside Computer Site | p9 | 9 = northeast OK | east (WRONG) |
| | (p16 -> 36; "out" not probed) | p16 | 16 = out | down (WRONG per lane) |
| Curses (v5, Library 5/12) | north -> 103 Old Winery | p5 | 5 = north OK | exit-5 |
| | south -> 47 Old Furniture | p6 | 6 = south OK | exit-6 |
| | east -> 42 Servant's Room | p7 | 7 = east OK | north (WRONG) |
| | down -> trapdoor (door object 36; the game ends) | p14 | 14 = down OK | — |
| Advent (control, prop2 path) | n/s/e/w/u/d/in all as today | p7-p17 | prop2 path unchanged | correct |

Moonglow: south -> 17 Barn House (p7 = south), checked earlier with the same probe (no UNDO; restart used).
Limitations: one start room per game; "out" in Night and the diagonals in Curses were not exercised.
