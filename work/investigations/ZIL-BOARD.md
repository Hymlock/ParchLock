# ZIL board - single source of truth for all seats (owner: claude, updated 2026-10-24 evening (r27 committed e7e7743))

Goal (operator): every ZIL flag decoded AND wired into the UI wrapper (radials, menus) - a flag with no visible
effect in the app is not done. Missing right options matter more than harmless wrong ones; no masking.

## Ledger (work/investigations/2026-10-16-zil-profile-ledger.md, regenerate: node work/investigations/zil-profile-ledger.js)
988 cells: settled 730 (74%, excludes 41 L:NC no-reader cells); open U 187; N? 3; B 27 (Sherlock).
Merged b4cd5ba: openable covered x25, transparent NA x5, wearable NA x3 (climb has no ledger key; Deadline climb NA on the board only).
Next ledger goal: settle U cells that change the radial first (below), then invisible U cells in bulk.

## Roles
- claude: lead/orchestrator; sole writer of js/ModuleStatFactsClaude.js and PLAN/ARCH docs; integrates batches;
  runs one isolated 309x2 gate per batch + independent read-only audit; commits.
- codex: design/source auditor + hard native evidence (doors), adversarial review of claude's proposals (Climb, D134).
- grok1: evidence batches by flag family (switch done; drink, enterable, transparent next).
- grok2: evidence batches + ledger bulk work (N? done -> 295 NA/59 U); doors parked except queued.
Every evidence packet: digest, 2 native positives + negative (or single owner + whole-source), ordinary commands only.

## In flight (2026-10-25 ~00:00; last commit 131f30b r37)
- claude: integrate; nothing staged. Recent: r28-r37 (enter forms, locked map D241/D242, switch x3, talk x3, moved x20 COMPLETE, transparent x8+, doors, Starcross container/door/supporter).
- codex: inventoryHiddenAttribute (18; NDESCBIT vs INVISIBLE split, genuine held hidden owners first), then concealed (22), light (18).
- grok1: probe list #5229 (Suspect worn, Spellbreaker door, Moonmist door, enterable Zork1/Zork3/Cutthroats, Hollywood openCapability, scenery source check); source batch A (worn NA x7, on fail-closed x5, Enchanter switch).
- grok2: OUT of credits.
- Group rule: no-reader cells are L:NC (not complete). Static is never TRYTAKEBIT (TAKEBIT complement). Scenery fails closed where NDESCBIT sits on takeables.

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

## Inform item 1 (queued behind ZIL): no-name-table titles read shifted flags
- work/investigations/inform-bits/SUMMARY.md: all 17 release Inform titles without a name table read wrong PROFILE bits.
  16 fall into 4 layouts (L older library x12, TOY, WIN x2, TH); sutwin has no set bits.
  Visible today: missing Open/Close/Eat/Wear on doors, containers, food and clothing.
- CORRECTION: D73 AttrCalibrator already self-corrects these bits during live play; the static read shows only the pre-calibration state. Possible refinement (start-correct layout), parked behind ZIL. Not a broken system.

## Hygiene (no visible effect today)
- AttributeSchema zilStructural fail-closed set (js/AttributeSchema.js:233-236) omits clothing/wearable/edible/light/
  scenery/static, so unmapped ZIL objects carry Inform PROFILE bits in attrs (Infidel inner door 162: clothing,
  wearable, light; audit-r29/verbs.out). The radial is protected by ActionSynth.trustworthyAttrs (SEMANTIC_FLAGS), so
  the composed menu is correct (examine|open|close). Risk only for a future direct attrs consumer. Candidate: extend
  fail-closed to those keys after a consumer inventory (full procedure).

## Open design items (need the full procedure before code)
- Fixed-object switches: switch forms are inventory-only (AttributeSchema.activationForms), so room-fixed toggles get no
  Turn on/off (e.g. the Witness radio 162 toggles natively; its state is not an attribute; grok1 #5186).
- Locked phase 2: an object "Locked" status (codex notes resume/locked-phase2-current-fit-notes.md).
- PROFILE bits leaking into ZIL attrs for unmapped keys (hygiene, no visible effect today).
- world-map-ui 6 pre-existing failures (Zork I reload/travel), identical at HEAD: investigate.
- Suspect transparent actors: actors that are container+TRANSBIT expose carried items (Alicia 80 -> wet overcoat 74 gets
  open/close/search). Harmless wrong option (audit-r33 note 2); later check. Note: transparent also makes contents of
  closed see-through containers discovered/underlined, not only Take-suppressed (audit-r33 note 1).
- Inventory-hidden subtree (codex 2026-10-25, NOT reproduced natively): Zork-family PRINT-CONT hides an NDESC parent but
  can list its visible contents, while ZRamReader.js:2808 skips the whole subtree. Precondition: no inventoryHiddenAttribute
  fact for a title whose inventory recurses into hidden parents (Zork trilogy; LGOP/Stationfall DESCRIBE-CONTENTS) until
  the reader is fixed through the full procedure. Evidence: codex resume/inventory-hidden/*.
