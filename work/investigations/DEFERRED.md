# Deferred-work register (owner: claude; operator rule 2026-10-30: deferred work must be tracked AND finished)

Every hold, park, "later" or "open design item" lives here with an owner and a concrete next action. Nothing is
"parked" without a row. Review this at every batch; a row only leaves this file when DONE (commit) or CLOSED (an explicit
ruling that it needs nothing). Status: TODO / ACTIVE / BLOCKED(on X) / DONE / CLOSED.

## Design items (runtime code; full procedure: blind halves, compare, propose, review, implement, audit)
| # | Item | Status | Owner | Next action |
|---|---|---|---|---|
| D1 | Inventory reader: an NDESC-hidden held parent must still list its visible contents (ZRamReader.js:~2808 skips the whole subtree). Unblocks 15 of the 18 inventoryHiddenAttribute cells (RECURSES titles, work/investigations/claude-probe/invhidden). | ACTIVE | claude | Seal the claude blind half; blind request to codex tonight. |
| D2 | `light` key semantics: capability (LIGHTBIT) vs state (ONBIT); Zork I 31, Enchanter 22. 18 light cells wait on it. No live hazard (post-seal check). | ACTIVE | claude+codex | claude half sealed (light-semantics-claude-SEALED.md); codex blind half tonight. |
| D3 | world-map-ui: 6 failures (Zork I map restore after app reload + Travel here). BISECTED: first bad commit 8291b5f (2026-10-09, D215 save-tied map state). Either the harness reload is now a fresh start by design (stale test) or reopening the app loses the player's map (real regression). | ACTIVE | claude | Reproduce natively: play, map rooms, reload the app with no explicit save; does the map survive? Then the blind half. |
| D4 | Room-fixed switches: activationForms is inventory-only, so the Witness radio, PH chandelier and Hitchhik jukebox get no Turn on/off. | TODO | claude | Blind half after D1. |
| D5 | Locked phase 2: an object "Locked" status row (no status row exists in the radial). | TODO | codex | codex fit notes exist (resume/locked-phase2-current-fit-notes.md); proposal. |
| D6 | PROFILE bits leaking into ZIL attrs for unmapped keys (hygiene; no visible effect). | TODO | claude | Consumer inventory, then extend zilStructural fail-closed. |
| D7 | Suspect transparent actors expose carried items (Alicia 80 overcoat gets open/close/search). | TODO | claude | Check; restrict transparency exposure for animate holders if wrong per source. |
| D8 | Suspended robot-addressed actions: radial never addresses actors, so Suspended container/enterable/climb give no payoff. | TODO | claude | Design question: an "active robot" radial prefix. Blind half. |
| D10 | LOCKED on rooms (Moonmist; earlier Hollywood 15): the legacy destination-attr isLocked would pause routes into locked rooms. Rule needed: exclude room carriers from the locked label, or accept room locking as real player-visible state. | TODO | claude | Blind half; check whether a locked room actually blocks the PLAYER natively. |
| D9 | Enter-form for more titles: any title whose ENTER refuses but SIT/CLIMB ON works (Hollywood plank ends?). | TODO | grok1 | Probe the Hollywood plank and Cutthroats bunk with the D242 bar. |

## Evidence items (facts; native probes)
| # | Item | Status | Owner | Next action |
|---|---|---|---|---|
| E1 | concealed x4: Cutthroats, Borderzo, Lurking Horror, Seastalker | ACTIVE | claude worker | Probe running (work/investigations/claude-probe/concealed). |
| E2 | inventoryHidden FLAT x3: Moonmist, Wishbringer, Suspended (compatible with the current reader) | TODO | claude worker | Find 2 naturally held hidden objects per title (route walk); Suspended probe must read WINNER, not playerId. |
| E3 | locked: Moonmist meets 2+1 natively (gate 52, great hall 136; neg front door 120) but LOCKED sits on ROOMS by design (goal.zil:536/1654 locks rooms for NPC movement) -> needs D10. Spellbreaker 1 carrier (cabinet 107); the walk drifts at 367-370 before cabinet 67. Seastalker: the walk never docks at the Aquadome (steps 85-94). Enchanter/Hollywood/Suspect per PARKED.md. | ACTIVE | claude worker | Route fixes: Spellbreaker 367-370, Seastalker 85-94. claude-probe/locked/packet-e3.json. |
| E4 | talkable x3: Zork3, Infidel, Planetfall (no ACTORBIT read natively) | TODO | claude worker | Find an actor command that reaches the generic test (ASK/TELL forms), or settle from exact census + native replies (Wishbringer precedent). |
| E5 | Zork III wornAttribute (codex REVISE: custody relation required) | TODO | codex | Follow codex #5514 R2 path. |
| E6 | Hitchhik switchable/on, enterable pilot seat | TODO | grok1 | The Hitchhik jukebox is room-fixed (D4); the pilot seat walk drifts (multi-Dark RNG). |
| E7 | Hollywood openCapability: needs a Hollywood container fact first | TODO | grok1 | Probe the Hollywood container (CONTBIT) with 2+neg, then openCapability. |
| E8 | Zork II / HHGG transparent holds; Zork III ladder, Starcross tree climb carrier 2 | TODO | grok1 | Walk extensions (PARKED.md rows). Low radial value but owed. |
| E9 | Death-count follow-ups from the claude audit: harness native.cjs needs an output path; late-identity loss window; DEATH_PHRASE false positive | TODO | codex | Small fixes + a harness default path. |

## Closed (kept for the record)
- Moonmist transparent 9: DONE r28 (6bf8a98). grok1/PARKED.md row 8 is stale.
- Planetfall transparent: DONE r29. Infidel climb carrier 2: CLOSED (already mapped). Deadline climb: CLOSED L:NA.
- 41 + 17 no-reader cells: L:NC by group rule A (not complete; reopen when a reader appears).
