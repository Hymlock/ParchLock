# LLR3 blind investigation (subagent, 2026-11-06)
DECISION-INDEX: only §25/D23 (non-compass topological mapping) matched; S1/D270 probe-leak is related.

## 1 Inventory leak - NOT reproduced on desktop
- repro2.cjs (Equipment button, turn 1): the probe lines carry class pl-stat-probe. repro2's `vis` check (offsetHeight>0) reports them as leaked, but that is a false positive, because css/ParchLock.css:4599 clips them to 1px absolute. With a corrected check (position!=absolute, width>2) the only leaked line is ">".
- Typed INVENTORY (twice) and the Equipment button after "take all" (vial): no extra visible lines. _probeBoundary=null for LLR3, because the S1-1c early return in js/StatTracker.js:4511 is hit (older I7 build). So the whole span is hidden; nothing is cut out of it.
- Open: the radial path, phone layout, and mid-combat (the "Combat>" prompt) were not tested. Try Equipment during combat next.

## 2 Trapdoor not a level change
- js/WorldMapLayout.js:18-27: only u/up/d/down get a z delta. Every labelled exit ("enter trapdoor") gets a hashed same-level ring offset, so the maze lands on the same floor.
- Candidate data: I7 map_region (names.i7_map_region exists in this build) per room, or a depth global. Neither was verified for LLR3.
- A cheap structural rule, if regions are absent: an exit whose return path does not exist (one-way, never reversed) cannot be treated as a level change by itself. Needs data.
- Other release games with labelled vertical exits (enter hole, climb down) will share this.

## 3 Deaths not counted - root cause CONFIRMED
Real death (seed 12345, fighting the fat werespider): "*** You have been killed in combat ***" followed by the RESTART/RESTORE/QUIT menu.
- js/StatTracker.js:1348 DEATH_PHRASE allows only "you have been killed( by ...)" directly before [.!*]. With "in combat" in between, the test is false (node -e check: false).
- classifyEnding (1366-1377) therefore returns "unknown" and the death is never counted.
Fix ranked:
(a) Read the VM's deadflag. Inform: 1 = death, 2 = win; an I7 "end the story saying" banner sets 3 and would need the banner text. This is game data, not prose.
(b) Widen the phrase to "you have been killed( by|in ...)". This is the cheap prose fix.
