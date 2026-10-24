# ZIL board - single source of truth for all seats (owner: claude, updated 2026-10-24 13:15 ET)

Goal (operator): every ZIL flag decoded AND wired into the UI wrapper (radials, menus) - a flag with no visible
effect in the app is not done. Missing right options matter more than harmless wrong ones; no masking.

## Ledger (work/investigations/2026-10-16-zil-profile-ledger.md, regenerate: node work/investigations/zil-profile-ledger.js)
988 cells (26 titles x 38 keys): settled 648 (F 134, C 124, L:NA 279, L:S 38, L:UD 29, L:U 39, L:O/L:X 5) = 66%;
open U 310 (flag exists in source, no fact yet); N? 3; blocked B 27 (Sherlock, no source).
Next ledger goal: settle U cells that change the radial first (below), then invisible U cells in bulk.

## Roles
- claude: lead/orchestrator; sole writer of js/ModuleStatFactsClaude.js and PLAN/ARCH docs; integrates batches;
  runs one isolated 309x2 gate per batch + independent read-only audit; commits.
- codex: design/source auditor + hard native evidence (doors), adversarial review of claude's proposals (Climb, D134).
- grok1: evidence batches by flag family (switch done; drink, enterable, transparent next).
- grok2: evidence batches + ledger bulk work (N? done -> 295 NA/59 U); doors parked except queued.
Every evidence packet: digest, 2 native positives + negative (or single owner + whole-source), ordinary commands only.

## In flight
- r20b (claude): D238 Drink owners with mapped edible + Zork I water; doors Stationfall 27, Seastalker 27. Gate running.
- Climb (claude+codex): proposal R1 climb-compare-proposal-r1.md under codex review; operator ruling needed on fatal climbs.
- Moonmist doors: BLOCKED by D134 room rule (DOORBIT on ~20 rooms); codex investigating a general rule change.

## Radial families: status
| family (radial) | done | remaining |
|---|---|---|
| shared objects (long-press) | 18 titles | Wishbringer/LGOP/Stationfall/Sherlock (INVISIBLE unmeasured), Borderzo |
| Open/Close containers | +Spellbreaker, Suspect, Stationfall, LGOP | Starcross (blocked), Suspended (robots) |
| Open/Close doors | 15 titles (+2 in r20b) | Moonmist (D134), Infidel/Deadline/Spellbreaker/Hitchhik (1 door each) |
| Turn on/off | Zork II, Hollywood, LGOP, Starcross, Stationfall, Moonmist, Planetfall, Zork III | no-switch titles settled |
| Enter / Get out of | LH, Zork II, Planetfall, Infidel | ~10 titles (grok1) |
| Put on (surfaces) | Hollywood, Suspect (+existing) | Starcross, Stationfall, Suspended |
| Eat / Drink | LH food (D235); Zork I water (r20b) | Zork II, Cutthroats drink (grok1) |
| Talk to | +6 titles (grok1) | - |
| Climb | none | rule + facts after consensus |
| Transparent (see inside) | LH | Enchanter proven but held |

## Rules of the road
One batch = one frozen diff + one isolated gate (copies, hidden processes) + independent audit + operator 13/0.
Read this board before starting work; post a bus message to claude when a packet is ready.
