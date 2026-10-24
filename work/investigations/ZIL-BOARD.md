# ZIL board - single source of truth for all seats (owner: claude, updated 2026-10-24 (r22 committed c1bd21f))

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

## In flight (standing lanes - do not wait for replies, send packets as done)
- claude: r23 open in working tree (Suspect enterable 28, Stationfall supporter 17 so far); Witness sit-on form proposal; reviews.
- codex: OUT until 6:03 (operator). Moonmist R3 code is in the working tree under codex claim (js/ExitCalibrator.js, harness/d214-room-door-alias.js); claude snapshotted it (moonmist-r3-snapshot.diff) for audit + gate, no edits. Infidel door second positive pending.
- grok1: PAUSED until 18:00 ET (operator). Released all PARKED rows (grok1/PARKED.md, files kept). Unvetted route drafts in grok1/routes/ (Moonmist red walk, Enchanter gate negative).
  Planetfall 9, Spellbreaker 15, Starcross 25, Stationfall 13, Suspect 7, Wishbringer 23, Witness 6); then ENTER-working VEHBIT titles.
- grok2: OUT until 5:25 (operator). Climb lane TAKEN OVER by grok1 after transparent (b): Zork2 23, Zork3 24, Enchanter 26, Sorcerer 8, Planetfall 29, Starcross 22, Suspended 27, Deadline 15, + Infidel 16.
- Operator ruling: fatal climbs ARE offered (intentional game actions). Infidel CLIMBBIT 16 joins the climb lane.

## Radial families: status
| family (radial) | done | remaining |
|---|---|---|
| shared objects (long-press) | 18 titles | Wishbringer/LGOP/Stationfall/Sherlock (INVISIBLE unmeasured), Borderzo |
| Open/Close containers | +Spellbreaker, Suspect, Stationfall, LGOP | Starcross (blocked), Suspended (robots) |
| Open/Close doors | 17 titles | Moonmist (D134), Infidel/Deadline/Spellbreaker/Hitchhik (1 door each) |
| Turn on/off | Zork II, Hollywood, LGOP, Starcross, Stationfall, Moonmist, Planetfall, Zork III | no-switch titles settled |
| Enter / Get out of | LH, Zork II, Planetfall, Infidel, PH, Starcross, Stationfall, Moonmist (+Suspect r23) | ENTER-working VEHBIT titles (grok1); Witness/Deadline need sit-on form |
| Put on (surfaces) | Hollywood, Suspect (+Stationfall r23) | Starcross, Suspended |
| Eat / Drink | LH food; drink Zork I, Zork II, Cutthroats | - |
| Talk to | +6 titles (grok1) | - |
| Climb | Zork I (D239) | 8 titles (grok2) |
| Transparent (see inside) | LH | 16 titles (grok1); Enchanter held |

## Rules of the road
One batch = one frozen diff + one isolated gate (copies, hidden processes) + independent audit + operator 13/0.
Read this board before starting work; post a bus message to claude when a packet is ready.

## Seat dropout (operator 2026-10-24: "everybody will have to be capable of adapting as seats fall off")
- State lives in files, never only in a seat's head: every packet is a file under work/investigations/<seat>/<family>/;
  lane progress is this board. Any seat can resume any lane from those files.
- Fallbacks: grok2 climb -> grok1 -> claude worker; grok1 transparent/enter -> grok2 -> claude worker;
  codex doors/Moonmist R3 -> claude (design) + grok2 (native evidence); claude (integration/facts/docs) -> grok1, which held
  the facts role this morning (it must follow this board's batch rules: frozen diff + isolated gate + independent audit + 13/0).
- Detection: `node tools/bus-throughput.cjs 1`; a seat silent for >30 min with an open lane is treated as off. Release its
  claims, post the takeover on the bus and update this board. Never wait for it to come back.
- Integration: claude runs gates through its own background worker, so integration does not depend on any bus seat.
