# ZIL board - single source of truth for all seats (owner: claude, updated 2026-10-24 evening (r27 committed e7e7743))

Goal (operator): every ZIL flag decoded AND wired into the UI wrapper (radials, menus) - a flag with no visible
effect in the app is not done. Missing right options matter more than harmless wrong ones; no masking.

## Ledger (work/investigations/2026-10-16-zil-profile-ledger.md, regenerate: node work/investigations/zil-profile-ledger.js)
988 cells: settled 710 (72%); open U 248; N? 3; B 27 (Sherlock). Rulings merged 2026-10-24 evening.
Merged b4cd5ba: openable covered x25, transparent NA x5, wearable NA x3 (climb has no ledger key; Deadline climb NA on the board only).
Next ledger goal: settle U cells that change the radial first (below), then invisible U cells in bulk.

## Roles
- claude: lead/orchestrator; sole writer of js/ModuleStatFactsClaude.js and PLAN/ARCH docs; integrates batches;
  runs one isolated 309x2 gate per batch + independent read-only audit; commits.
- codex: design/source auditor + hard native evidence (doors), adversarial review of claude's proposals (Climb, D134).
- grok1: evidence batches by flag family (switch done; drink, enterable, transparent next).
- grok2: evidence batches + ledger bulk work (N? done -> 295 NA/59 U); doors parked except queued.
Every evidence packet: digest, 2 native positives + negative (or single owner + whole-source), ordinary commands only.

## In flight (all 4 seats back, 2026-10-24 evening)
- claude: integrate (r28 gate running: enter-form code + Moonmist transparent; r29 staged: Planetfall transparent); reviews.
- codex: (1) confirm Moonmist R3 snapshot -> commit; (2) BLIND locked investigation (#5100).
- grok1: Witness enter-form checks (11-carrier sit-on sweep + get out of lounge) -> Witness enterForms fact; then HHGG pilot seat, Suspended.
- grok2: Inform per-title bit checks for the 17 release games without name tables (offline); blind locked half if codex has not started it.

## Radial families: status
| family (radial) | done | remaining |
|---|---|---|
| shared objects (long-press) | 18 titles | Wishbringer/LGOP/Stationfall/Sherlock (INVISIBLE unmeasured), Borderzo |
| Open/Close containers | +Spellbreaker, Suspect, Stationfall, LGOP | Starcross (blocked), Suspended (robots) |
| Open/Close doors | 18 titles (+Deadline) | Moonmist (R3 code ready, awaiting codex confirm), Infidel, Spellbreaker, Hitchhik |
| Turn on/off | Zork II, Hollywood, LGOP, Starcross, Stationfall, Moonmist, Planetfall, Zork III | no-switch titles settled |
| Enter / Get out of | LH, Zork II, Planetfall, Infidel, PH, Starcross, Stationfall, Moonmist, Suspect, Ballyhoo, Sorcerer, Enchanter, Spellbreaker | Witness/Deadline need a sit-on form; Hitchhik held (no carrier ENTER); Suspended/Hollywood route-blocked |
| Put on (surfaces) | Hollywood, Suspect, Stationfall | Starcross, Suspended |
| Eat / Drink | LH food; Planetfall eat; drink Zork I, Zork II, Cutthroats | - |
| Talk to | +6 titles (grok1) | - |
| Climb | Zork I, Enchanter, Sorcerer, Zork II, Planetfall, Zork III, Infidel, Starcross | Deadline L:NA (generic reply); Suspended parked |
| Transparent (see inside) | LH, Zork I, Stationfall, Spellbreaker, PH, Wishbringer | HHGG/Zork II held; Planetfall/Moonmist parked; 5 L:NA |

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

## Wear / worn
- wearable: LGOP 20 (+wornAttribute 21 so a worn suit offers Remove). LH/Starcross/Infidel L:NA.

## Locked (needs design before more evidence)
- Facts committed: LH 19, PH 10, Stationfall 11, LGOP 9, Witness 17, Ballyhoo 10. Hollywood 15 pulled (bit is on 5 rooms).
- NO visible effect in ZIL today (audit-r27): nav reads locked on the exit destination, ZIL doors are in the DEXIT door slot.
  Design: claude half sealed (zil-titles/locked-effect-claude-SEALED.md); codex blind half requested (#5100). No more locked probing.

## Inform next (work/investigations/inform-census/SUMMARY.md)
- 58 of 80 release games have their own attribute name table (free). 17 release Inform games need a per-title bit check. 5 release Glulx games need a reader design.
