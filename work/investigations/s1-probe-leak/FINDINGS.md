# S1 probe leak - claude investigation (2026-11-05)
Repro: repro.cjs (seeded as regression-gate.cjs; Equipment opened on turn 1, first-use warning closed via #close). Raw: run1.jsonl.
Note: lines classed pl-stat-probe are clip-hidden by css/ParchLock.css:4599 (1px absolute); repro's "vis" flag over-reports them. Real leaks = unclassed lines with data-pl-probe-event="1".

| title | leaks | leaked line |
|---|---|---|
| Advent | no | - |
| Zork1 | no | - |
| anchor | YES | "The pockets of your trenchcoat are empty." |
| MakeItGood | YES | "In addition to your trenchcoat, you are wearing your wide-brimmed hat and your scuffed black shoes." |
| curses | no | - |
| LostPig | no | - |
No SCORE/DIAGNOSE reply leaked anywhere.

Cause: StatTracker.releaseProbeEvents (js/StatTracker.js ~4255-4295) treats only the FIRST paragraph of a span as reply; any later paragraph not matched by isCarrySummaryLine (4190) or isKnownProbeReplyLine (4200) is unhidden and tagged as a turn event (4287-4291). Multi-paragraph inventory replies (second paragraph = pockets/worn list) are therefore released. 4d6d0c0 only added the wump2ka carry-summary sentence forms - a pattern whitelist, hence "partial".

Fix (no masking): split reply from events by execution identity, not text. Stamp the VM output position when the probe verb's action routine (I6 grammar action / ZIL V-INVENTORY via action table) returns; output before = reply (stay hidden), after = turn-sequence events (release). Avoids the D207-rejected turns-global boundary (ZIL CLOCKER before MOVES) because it keys on routine return. Needs a call/return hook in the ZVM provider. Then retire CARRY_SENTENCES/first-paragraph heuristics for spans that have a stamp.
