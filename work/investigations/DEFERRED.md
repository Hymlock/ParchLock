# Deferred-work register (owner: claude; operator rule 2026-10-30: deferred work must be tracked AND finished)

RULE: a row awaiting a blind half carries ONLY the problem statement and owner (findings live in sealed files). Every hold, park, "later" or "open design item" lives here with an owner and a concrete next action. Nothing is
"parked" without a row. Review this at every batch; a row only leaves this file when DONE (commit) or CLOSED (an explicit
ruling that it needs nothing). Status: TODO / ACTIVE / BLOCKED(on X) / DONE / CLOSED.

## Design items (runtime code; full procedure: blind halves, compare, propose, review, implement, audit)
| # | Item | Status | Owner | Next action |
|---|---|---|---|---|
| D1 | Inventory hidden-parent recursion: LANDED 9e461e6 (D244; 13 titles) + spell books P16 37327b0/f7e1180. | DONE | claude | - |
| D2 | light semantics: CLOSED by consensus (codex ACCEPT): no code; light stays a heuristic key, illumination via illuminationState; 18 cells L:NC (no semantic light-emission reader). | CLOSED | claude+codex | - |
| D3 | world-map-ui 6 failures: DONE. Bisected to 8291b5f (D215 save-tied map); the reload fixture was stale (a fresh boot archives the old map by design). Harness now loads the archived slot; 52/0. | DONE | claude | - |
| D4 | Room-fixed switches: LANDED d91a422 (P4 switchableScope; Witness radio 162). | DONE | claude | - |
| D5 | Object Locked status: LANDED 7a61fa7 (codex authored, claude integrated during absence). Domain: LH 119/135 only; other locked holders need own source census. | DONE | codex | domain extension |
| D6 | PROFILE bits leaking into ZIL attrs: MERGED into D11 (the leak does reach rooms). | MERGED | claude | see D11 |
| D7 | Suspect transparent actors: CLOSED, correct per source. ALICIA-COAT (people.zil:1526) is TAKEBIT CONTBIT OPENBIT SEARCHBIT with an INVISIBLE LABEL inside (a clue). While worn, ALICIA-COAT-F refuses in character; once the butler has it, searching reveals the label. Open/close/search are real game actions. | CLOSED | claude | - |
| D8 | Suspended robot roles: LANDED P8 (robot-addressed radial). | DONE | claude+codex | - |
| D10 | Lock pause = locked AND closed: LANDED 8b76ec8 (P10, D246) + P10b 4baf75c (D251). Suspect locked 17 landed 7ffb59e; Moonmist NC (auto-unlock). | DONE | claude+codex | - |
| D11 | Rooms as garments: P11a LANDED 9e461e6 (D245). P11b PARKED (codex #5678, disposition B): implemented in batch-p11b.diff + harness/zil-room-garment.js research only; 0 visible rooms/edges change (named-parent check rejects root-37 children). Reopen only on a concrete missing edge/room path. | PARKED | claude | evidence |
| D9 | Enter-forms: RESOLVED - plain ENTER works natively for Hollywood plank ends + Cutthroats bed/bunk (claude-probe/e1d9); enterable facts landed (7ffb59e). No override needed. | DONE | claude | - |

## Evidence items (facts; native probes)
| # | Item | Status | Owner | Next action |
|---|---|---|---|---|
| E1 | concealed: Cutthroats 30 (r41 afc7ff1), Seastalker 12 (7ffb59e). | DONE | claude | - |
| E2 | inventoryHidden FLAT titles: Moonmist 19 STAGED r40 (exact source + source-proven one-level filter). Wishbringer: NA (its NDESC inventory filter is commented out; INVISIBLE is a separate key). Suspended: RECLASSIFIED as RECURSES (its i lists container contents), so it is blocked on D1. KEY FINDING: every ZIL ITAKE clears NDESCBIT, so held NDESC carriers exist only at startup or nested. inventoryHidden has small visible reach. | DONE | claude worker | Ledger: Wishbringer inventoryHidden NA. |
| E3 | locked: Spellbreaker 11/Seastalker 15/Enchanter 1 (r43 3d20614), Suspect 17 (7ffb59e), Hollywood 15 (4baf75c). | DONE | claude | - |
| E4 | talkable: Zork3 21 PROVEN (squeeze/shake reach the generic ACTORBIT test; 3 actors + waybread) and staged r40. Infidel: NOT APPLICABLE (ACTORBIT only on player objects). Planetfall: FAIL CLOSED (Floyd intercepts every command; census not exact). | DONE | claude worker | Ledger: Infidel talkable NA, Planetfall talkable X. |
| E5 | Zork III worn custody: LANDED f5afbb3 (codex; D250). | DONE | codex | - |
| E6 | Hitchhik: switchable 32 S (7ffb59e, grok2 KEEP ruling), on NC (ONBIT = room-lit), enterable 28 S (bed 114; pilot seat/poetry chair census). | DONE | claude+grok2 | - |
| E7 | Hollywood container 4 (4 natives + neg; no room) + openCapability none:[supporter] (all 7 surfaces carry CONTBIT) STAGED r43. | DONE | claude worker | - |
| E8 | DONE: Zork III ladder 23 and Starcross wall 170 read CLIMBBIT natively (bare `climb`; named climb never tests the bit: CLIMB OBJECT (FIND CLIMBBIT) only resolves a missing noun). Zork II/HHGG transparent confirmations CLOSED as optional (mapped from exact source r33). | DONE | claude worker | - |
| E9 | Death-count: default loader path proven identity-before-input (codex + claude audit ACCEPT). Residual: opt-in Emglken host has null identity; process-kill window is a durability limit. No phrase-regex change (no specimen). Journal only with exact-identity design R1 from codex. | REVIEW | codex | Emglken scope + design R1 |

## Closed (kept for the record)
- Moonmist transparent 9: DONE r28 (6bf8a98). grok1/PARKED.md row 8 is stale.
- Planetfall transparent: DONE r29. Infidel climb carrier 2: CLOSED (already mapped). Deadline climb: CLOSED L:NA.
- 41 + 17 no-reader cells: L:NC by group rule A (not complete; reopen when a reader appears).
| D12 | Hollywood close-only rule: LANDED f5afbb3 (codex, with E5). Action-routine refusers keep options (honest refusal). | DONE | codex | - |
| D13 | Learning stores erase-uninstalled: LANDED (Options > Learned words Check/Erase). D13b per-store size caps still open. | DONE | claude | D13b |
| D5b | Missing Unlock: LH native radial capture (codex d5-lh-radial-native-r1) shows "Unlock with" already on both qualified targets (hatch 119, padlock 135); missing count 0. Other holders need own scope evidence before any claim. | EVIDENCE-0-MISSING | codex | per-title scope |
| D14 | Merged into D8 (Suspended robot roles): codex prior D8 halves = first half, claude-SEALED (suspended-d14/) = second; codex preparing D8 API R3. | MERGED | codex | D8 R3 |
| D15 | Suspended animate (VICBIT 24): NOT needed for D8 (P8 uses the exact 6-robot NAME-TBL domain; VICBIT admits 14 incl People/proxies). Animate stays NA; panel 80 Open/Close would need a separate source census of robot-only VICBIT. | PARKED | claude | reopen on evidence |
| D16 | Spell books: LANDED P16 37327b0 (Enchanter) + f7e1180 (Sorcerer, Spellbreaker). | DONE | claude | - |
| D17 | Stats idle rewrites: FIXED (P17, grok2 ACCEPT). 33 -> 0 writes per 3 s idle. Follow-ups logged: Tick on grid characterData; double WorldModel.tick per Refresh (efficiency). | DONE | claude | - |
