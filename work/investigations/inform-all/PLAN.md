# I7: finish flag mapping for every non-ZIL Z game (operator 11-07: all 309 minus Glulx, before I6)
Census: coverage.cjs / coverage.json. 298 Z games = 26 ZIL + 272 non-ZIL. Non-ZIL: 230 complete (name table or exact fact), 42 gaps.
Gap titles run on the assumed default layout (container 4, open 14, openable 15, supporter 20, animate 0, worn 26, light 9), unproven per title.
Method (same as I1): per title, prove each of the 7 bits from the game's own data (live object attrs vs printed text, disassembly of the
library routine that tests the bit, or a native route), record TRUST bit or fail-closed in ModuleStatFactsClaude (exact digest).
No masking: unproven = fail-closed, never "assume default".
Batches (title list order from coverage.json):
- A grok:   Adventureland b2demo bedlam booth bse catseye cheater claw curses dejavu frozen I-0 inhumane Jigsaw
- B grok2:  karn mhpquest mindelec moonglow night ninepts paperchase phlegm piece_v3 praser5 Slackerx tatctae tk1 vindaloo weather
- C codex:  release-80 partials: break-in Enemies godot Gumshoe heist library lists lost minster SoFar spirit sutwin wedding
Each seat: draft ledger in inform-all/<seat>-batch.md, peer seat reviews, Claude ACCEPTs and lands the facts. Done = coverage.cjs reports 272 complete (or each remaining cell fail-closed with evidence) + inform-layout + operator-regressions 0 FAIL.
