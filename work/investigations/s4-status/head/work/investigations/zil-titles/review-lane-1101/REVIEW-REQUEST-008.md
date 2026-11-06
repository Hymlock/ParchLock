# REVIEW-REQUEST-008 - M9 guard test: map "visited" only from the real location (harness only)

New harness/m9-visited-physical-only.js (no js change). Implements proposal next-items-1104/M9-seen-from-afar-proposal.md
item 2 as a static census instead of replaying the sealed Starcross/Zork II prefixes (the sealed notes say not to replay
them to relabel evidence). It asserts: one WorldVisited writer (Map.js SetCurrentRoom, sets true only), readers only in map
code, no TOUCHBIT / attrs.visited in Map.js/WorldMap.js/MapTopology.js, WorldMap.isVisited = WorldVisited || current.
Command: node harness/m9-visited-physical-only.js -> 8 PASS / 0 FAIL.