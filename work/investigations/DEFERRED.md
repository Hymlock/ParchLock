# Deferred-work register (owner: claude; operator rule 2026-10-30: deferred work must be tracked AND finished)

Every hold, park, "later" or "open design item" lives here with an owner and a concrete next action. Nothing is
"parked" without a row. Review this at every batch; a row only leaves this file when DONE (commit) or CLOSED (an explicit
ruling that it needs nothing). Status: TODO / ACTIVE / BLOCKED(on X) / DONE / CLOSED.

## Design items (runtime code; full procedure: blind halves, compare, propose, review, implement, audit)
| # | Item | Status | Owner | Next action |
|---|---|---|---|---|
| D1 | Inventory reader: an NDESC-hidden held parent must still list its visible contents (ZRamReader.js ~2808 skips the subtree). Blocks 16 inventoryHidden cells (15 + Suspended). Low visible reach (ITAKE clears NDESC; only startup or nested carriers). | ACTIVE | claude | grok1 blind half requested (#5526); claude writes the proposal after. |
| D2 | `light` key semantics: capability (LIGHTBIT) vs state (ONBIT); Zork I 31, Enchanter 22. 18 light cells wait on it. No live hazard (post-seal check). | ACTIVE | claude+codex | claude half sealed (light-semantics-claude-SEALED.md); codex blind half tonight. |
| D3 | world-map-ui 6 failures: DONE. Bisected to 8291b5f (D215 save-tied map); the reload fixture was stale (a fresh boot archives the old map by design). Harness now loads the archived slot; 52/0. | DONE | claude | - |
| D4 | Room-fixed switches: activationForms is inventory-only (3f1fd5d conservative scope, not a ruling). Witness radio toggles natively, stateless. | ACTIVE | claude | claude half SEALED (fixed-switch-claude-SEALED.md); blind request to codex tonight. |
| D5 | Locked phase 2: an object "Locked" status row (no status row exists in the radial). | TODO | codex | codex fit notes exist (resume/locked-phase2-current-fit-notes.md); proposal. |
| D6 | PROFILE bits leaking into ZIL attrs: MERGED into D11 (the leak does reach rooms). | MERGED | claude | see D11 |
| D7 | Suspect transparent actors: CLOSED, correct per source. ALICIA-COAT (people.zil:1526) is TAKEBIT CONTBIT OPENBIT SEARCHBIT with an INVISIBLE LABEL inside (a clue). While worn, ALICIA-COAT-F refuses in character; once the butler has it, searching reveals the label. Open/close/search are real game actions. | CLOSED | claude | - |
| D8 | Suspended robot-addressed actions (radial never addresses robots). IN PROGRESS as codex Suspended role design R2 (#5484; REVISE #5492: exact settled-input API and submit-time signature needed); native lifecycle evidence exists (suspended-input-lifecycle-1656, suspended-v5-unforced-1305). | ACTIVE | codex | codex R3 addressing #5492; claude reviews. |
| D10 | LOCKED on rooms: RULED (claude, source). A room carrying LOCKED is valid when the room is itself a door (DOORBIT; D240 room-as-door): Moonmist locks sleepers' rooms and the player is refused, so locked 8 is staged (r40). Hollywood 15 sits on 5 rooms with NO DOORBIT (verbs.zil 1368 uses HERE LOCKEDBIT for something else), so it stays excluded. | DONE | claude | - |
| D11 | ROOM REJECTION by clothing/wearable/worn. Cause: PROFILE clothing bit 2 leaks into ZIL (Suspended 63, Planetfall 39 rooms; = D6), and Moonmist reuses WEARBIT 29 on rooms as WING-ROOMS (18). No vanished room natively (Planetfall walk; containmentProven/look-ahead keep them); latent edge risk on gated paths. | ACTIVE | claude | claude half SEALED (room-garment-claude-SEALED.md); blind request to codex; then proposal: zilStructural fail-closed for clothing/wearable + garment test not on room-shaped objects. |
| D9 | Enter-form for more titles: any title whose ENTER refuses but SIT/CLIMB ON works (Hollywood plank ends?). | TODO | grok1 | Probe the Hollywood plank and Cutthroats bunk with the D242 bar. |

## Evidence items (facts; native probes)
| # | Item | Status | Owner | Next action |
|---|---|---|---|---|
| E1 | concealed: Cutthroats 30 PASS (ferry 155, hole 63; drill neg) staged r41. Borderzone NA (only globals/protagonist; no reveals). Seastalker PARTIAL (freighter 237 only; others after the collision/final battle; needs an evasive heading). Lurking Horror PARTIAL: route fix found (TURN ON PC, LOGIN 872325412, PASSWORD UHLERSOTH before CLICK ON EDIT), but the urchin flees in this RNG so SHOW HAND TO URCHIN never lands. | ACTIVE | claude worker | Seastalker evasive-heading route; LH urchin timing (try other wait/approach windows). |
| E2 | inventoryHidden FLAT titles: Moonmist 19 STAGED r40 (exact source + source-proven one-level filter). Wishbringer: NA (its NDESC inventory filter is commented out; INVISIBLE is a separate key). Suspended: RECLASSIFIED as RECURSES (its i lists container contents), so it is blocked on D1. KEY FINDING: every ZIL ITAKE clears NDESCBIT, so held NDESC carriers exist only at startup or nested. inventoryHidden has small visible reach. | DONE | claude worker | Ledger: Wishbringer inventoryHidden NA. |
| E3 | locked: Moonmist meets 2+1 natively (gate 52, great hall 136; neg front door 120) but LOCKED sits on ROOMS by design (goal.zil:536/1654 locks rooms for NPC movement) -> needs D10. Spellbreaker 1 carrier (cabinet 107); the walk drifts at 367-370 before cabinet 67. Seastalker: the walk never docks at the Aquadome (steps 85-94). Enchanter/Hollywood/Suspect per PARKED.md. | ACTIVE | claude worker | Route fixes: Spellbreaker 367-370, Seastalker 85-94. claude-probe/locked/packet-e3.json. |
| E4 | talkable: Zork3 21 PROVEN (squeeze/shake reach the generic ACTORBIT test; 3 actors + waybread) and staged r40. Infidel: NOT APPLICABLE (ACTORBIT only on player objects). Planetfall: FAIL CLOSED (Floyd intercepts every command; census not exact). | DONE | claude worker | Ledger: Infidel talkable NA, Planetfall talkable X. |
| E5 | Zork III wornAttribute (codex REVISE: custody relation required) | TODO | codex | Follow codex #5514 R2 path. |
| E6 | Hitchhik switchable/on, enterable pilot seat | TODO | grok1 | The Hitchhik jukebox is room-fixed (D4); the pilot seat walk drifts (multi-Dark RNG). |
| E7 | Hollywood openCapability: needs a Hollywood container fact first | TODO | grok1 | Probe the Hollywood container (CONTBIT) with 2+neg, then openCapability. |
| E8 | Zork II / HHGG transparent holds; Zork III ladder, Starcross tree climb carrier 2 | TODO | grok1 | Walk extensions (PARKED.md rows). Low radial value but owed. |
| E9 | Death-count follow-ups: harness output-path crash FIXED (default temp path; 14 rows PASS). Remaining: late-identity startup loss window; DEATH_PHRASE false positive in non-death text. | ACTIVE | codex | Small source fixes, with the full procedure if behaviour changes. |

## Closed (kept for the record)
- Moonmist transparent 9: DONE r28 (6bf8a98). grok1/PARKED.md row 8 is stale.
- Planetfall transparent: DONE r29. Infidel climb carrier 2: CLOSED (already mapped). Deadline climb: CLOSED L:NA.
- 41 + 17 no-reader cells: L:NC by group rule A (not complete; reopen when a reader appears).
