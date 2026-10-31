# Deferred-work register (owner: claude; operator rule 2026-10-30: deferred work must be tracked AND finished)

RULE: a row awaiting a blind half carries ONLY the problem statement and owner (findings live in sealed files). Every hold, park, "later" or "open design item" lives here with an owner and a concrete next action. Nothing is
"parked" without a row. Review this at every batch; a row only leaves this file when DONE (commit) or CLOSED (an explicit
ruling that it needs nothing). Status: TODO / ACTIVE / BLOCKED(on X) / DONE / CLOSED.

## Design items (runtime code; full procedure: blind halves, compare, propose, review, implement, audit)
| # | Item | Status | Owner | Next action |
|---|---|---|---|---|
| D1 | Inventory hidden-parent recursion: R2 ACCEPTED (codex #5543). Code in working tree (walkVisibleDescendants hiddenRecurses); facts + harness + gate r44 in progress. | ACTIVE | claude | r44 |
| D2 | light semantics: CLOSED by consensus (codex ACCEPT): no code; light stays a heuristic key, illumination via illuminationState; 18 cells L:NC (no semantic light-emission reader). | CLOSED | claude+codex | - |
| D3 | world-map-ui 6 failures: DONE. Bisected to 8291b5f (D215 save-tied map); the reload fixture was stale (a fresh boot archives the old map by design). Harness now loads the archived slot; 52/0. | DONE | claude | - |
| D4 | Room-fixed switches: LANDED d91a422 (P4 switchableScope; Witness radio 162). | DONE | claude | - |
| D5 | Object Locked status row: codex R1 proposal; claude REVISE (D5-r1-attack-claude.md, #5550). | REVIEW | codex | R2 |
| D6 | PROFILE bits leaking into ZIL attrs: MERGED into D11 (the leak does reach rooms). | MERGED | claude | see D11 |
| D7 | Suspect transparent actors: CLOSED, correct per source. ALICIA-COAT (people.zil:1526) is TAKEBIT CONTBIT OPENBIT SEARCHBIT with an INVISIBLE LABEL inside (a clue). While worn, ALICIA-COAT-F refuses in character; once the butler has it, searching reveals the label. Open/close/search are real game actions. | CLOSED | claude | - |
| D8 | Suspended robot-addressed actions (radial never addresses robots). IN PROGRESS as codex Suspended role design R2 (#5484; REVISE #5492: exact settled-input API and submit-time signature needed); native lifecycle evidence exists (suspended-input-lifecycle-1656, suspended-v5-unforced-1305). | ACTIVE | codex | codex R3 addressing #5492; claude reviews. |
| D10 | Lock pause = locked AND closed: P10 R2 ACCEPTED (#5543). Implementing as batch-p10.diff in isolated worktree; then Suspect locked 17. Moonmist no fact. | ACTIVE | claude | p10 |
| D11 | Rooms as garments: P11a LANDED 9e461e6 (D245). P11b PARKED (codex #5678, disposition B): implemented in batch-p11b.diff + harness/zil-room-garment.js research only; 0 visible rooms/edges change (named-parent check rejects root-37 children). Reopen only on a concrete missing edge/room path. | PARKED | claude | evidence |
| D9 | Enter-form for more titles: any title whose ENTER refuses but SIT/CLIMB ON works (Hollywood plank ends?). | TODO | grok1 | Probe the Hollywood plank and Cutthroats bunk with the D242 bar. |

## Evidence items (facts; native probes)
| # | Item | Status | Owner | Next action |
|---|---|---|---|---|
| E1 | concealed: Cutthroats 30 PASS (ferry 155, hole 63; drill neg) staged r41. Borderzone NA (only globals/protagonist; no reveals). Seastalker PARTIAL (freighter 237 only; others after the collision/final battle; needs an evasive heading). Lurking Horror PASS (bolt cutter 45 + rod 231; urchin neg): staged r42 (urchin met by walking into his room; source I-URCHIN frob.zil:346). | ACTIVE | claude worker | Seastalker evasive-heading route; LH urchin timing (try other wait/approach windows). |
| E2 | inventoryHidden FLAT titles: Moonmist 19 STAGED r40 (exact source + source-proven one-level filter). Wishbringer: NA (its NDESC inventory filter is commented out; INVISIBLE is a separate key). Suspended: RECLASSIFIED as RECURSES (its i lists container contents), so it is blocked on D1. KEY FINDING: every ZIL ITAKE clears NDESCBIT, so held NDESC carriers exist only at startup or nested. inventoryHidden has small visible reach. | DONE | claude worker | Ledger: Wishbringer inventoryHidden NA. |
| E3 | locked: Spellbreaker 11, Seastalker 15, Enchanter 1 (single owner) STAGED r43. Suspect 17 meets the bar natively (BMW 134 + Mercedes 133 trunks; tool chest neg) but is HELD: codex #5491/#5493 found START-ALICIA locks real DEXIT NORTH/WEST doors without clearing OPENBIT, the game travels (OPEN first), but the D241 map would pause. It joins D10. Hollywood carrier 2 per PARKED.md. | ACTIVE | claude | Hollywood locked walk; Suspect via D10. |
| E4 | talkable: Zork3 21 PROVEN (squeeze/shake reach the generic ACTORBIT test; 3 actors + waybread) and staged r40. Infidel: NOT APPLICABLE (ACTORBIT only on player objects). Planetfall: FAIL CLOSED (Floyd intercepts every command; census not exact). | DONE | claude worker | Ledger: Infidel talkable NA, Planetfall talkable X. |
| E5 | Zork III worn custody: codex rebased prototype; claude audit REVISE (#5551: CRLF regen, Actionable:1325 guard proof). | REVIEW | codex | regen after r44 |
| E6 | Hitchhik switchable/on, enterable pilot seat | TODO | grok1 | The Hitchhik jukebox is room-fixed (D4); the pilot seat walk drifts (multi-Dark RNG). |
| E7 | Hollywood container 4 (4 natives + neg; no room) + openCapability none:[supporter] (all 7 surfaces carry CONTBIT) STAGED r43. | DONE | claude worker | - |
| E8 | DONE: Zork III ladder 23 and Starcross wall 170 read CLIMBBIT natively (bare `climb`; named climb never tests the bit: CLIMB OBJECT (FIND CLIMBBIT) only resolves a missing noun). Zork II/HHGG transparent confirmations CLOSED as optional (mapped from exact source r33). | DONE | claude worker | - |
| E9 | Death-count: default loader path proven identity-before-input (codex + claude audit ACCEPT). Residual: opt-in Emglken host has null identity; process-kill window is a durability limit. No phrase-regex change (no specimen). Journal only with exact-identity design R1 from codex. | REVIEW | codex | Emglken scope + design R1 |

## Closed (kept for the record)
- Moonmist transparent 9: DONE r28 (6bf8a98). grok1/PARKED.md row 8 is stale.
- Planetfall transparent: DONE r29. Infidel climb carrier 2: CLOSED (already mapped). Deadline climb: CLOSED L:NA.
- 41 + 17 no-reader cells: L:NC by group rule A (not complete; reopen when a reader appears).
| D12 | Hollywood close-only rule (V-CLOSE: CONTBIT && !SURFACE && CAPACITY!=0 || DOOR): CONSENSUS R2 (codex #5581). Implement after r44. | ACTIVE | claude | after r44 |
| D13 | Learning stores erase-uninstalled: LANDED (Options > Learned words Check/Erase). D13b per-store size caps still open. | DONE | claude | D13b |
| D5b | Missing Unlock: LH native radial capture (codex d5-lh-radial-native-r1) shows "Unlock with" already on both qualified targets (hatch 119, padlock 135); missing count 0. Other holders need own scope evidence before any claim. | EVIDENCE-0-MISSING | codex | per-title scope |
| D14 | Merged into D8 (Suspended robot roles): codex prior D8 halves = first half, claude-SEALED (suspended-d14/) = second; codex preparing D8 API R3. | MERGED | codex | D8 R3 |
| D15 | Suspended animate: VICBIT 24 (robots) might prove animate, reversing NA; that would let real openables (panel 80) get Open/Close. | TODO | claude | after D14 |
| D16 | Spell books: LANDED P16 37327b0 (Enchanter) + f7e1180 (Sorcerer, Spellbreaker). | DONE | claude | - |
| D17 | Stats idle rewrites: FIXED (P17, grok2 ACCEPT). 33 -> 0 writes per 3 s idle. Follow-ups logged: Tick on grid characterData; double WorldModel.tick per Refresh (efficiency). | DONE | claude | - |
