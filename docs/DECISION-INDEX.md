# Decision index

One line per decision in PRODUCTION_PLAN.md, newest first. **Search here before
measuring anything.**

This exists because the plan itself is not greppable: 159 decisions across
3804 lines, with single lines over 20,000 characters, so one grep match
returns more text than anyone can read. Searching the full plan directly is how
prior answers get missed and re-derived.

## How to use it

    grep -i wumpus docs/DECISION-INDEX.md        # what has been decided about a game
    grep -i "player\|room id" docs/DECISION-INDEX.md   # about a subsystem
    grep -n "ZRamReader.js" docs/DECISION-INDEX.md      # about a file

Then open the full entry in PRODUCTION_PLAN.md for the one or two D-numbers that
match, e.g. `grep -n "^| D79 \|^### D79" PRODUCTION_PLAN.md`.

Regenerate after adding decisions: `node tools/decision-index.js`

| D | claim | files | games |
|---|-------|-------|-------|
| D171 | The compiled room index: why Wumpus underlined nothing |  | wump2ka |
| D170 | addendum: the locator's second guard, from an adversarial pass |  | wump2ka |
| D169 | Carried value and weight, tracked headlessly |  | wump2ka |
| D168 | Desktop sheet reflow, the mislaid mic button, and collapsible equipment options |  |  |
| D167 | Nine operator-reported items, and a wumpus investigation | css/ParchLock.css |  |
| D166 | Four operator-reported UI and probe defects |  |  |
| D165 | The status row is a fallback, not the preferred source |  | wump2ka Anchorhead |
| D164 | The duplicate room, and the corrupted room name |  |  |
| D163 | A step that moves you WITHIN a room |  | Anchorhead |
| D162 | Multi-word commands can be travel again |  | wump2ka Anchorhead |
| D161 | Restoring what the v27 build did, verified against the real APK | harness/d162-travel-commands.js | Anchorhead |
| D160 | Follow-ups: what closed, and what the remaining items really are |  |  |
| D159 | Read-aloud followed the route instead of the destination | js/ReadAloud.js | Zork 1 |
| D158 | Provider registration lost to a navigation race -- the real cause |  |  |
| D157 | The payload death, and read-aloud during fast travel | harness/d158-provider-recovery.js | anchorhead |
| D156 | Two mobile-only gaps |  |  |
| D155 | Doors stopped being exits |  | Anchorhead |
| D154 | An error reporter that threw, and hid everything behind it | js/ParchLock.js |  |
| D153 | The only way to ask was hidden behind having already succeeded |  | Anchorhead Planetfall Deadline |
| D152 | The status grid is too narrow to print stats on a phone |  | Planetfall |
| D151 | The player can be standing on the furniture |  | 905 |
| D150 | Post-APK sweep: mark-derived commands, drink, and the player on the furniture |  | Anchorhead |
| D149 | addendum: the v3 path, relevance-gated filters, and the tour |  |  |
| D148 | Held containers whose bits do not decode | harness/d31-nested-inventory.js | Enchanter |
| D147 | The instrumental verb has to exist in the game |  | Zork 1 Planetfall Enchanter |
| D146 | One mark per object, dictionary-verified instrumental verbs, and the spell path | tools/highlight-scope-regression.js | Anchorhead |
| D142 | Object vocabulary, text decoding, and verb trust across compilers |  | Zork1 Planetfall |
| D141 | Adjective+noun command disambiguation |  |  |
| D138 | Mapping and auto-travel across the catalog |  | Anchorhead |
| D137 | (OPEN, not fixed) status line fields collide on a phone |  | Anchorhead |
| D136 | Tutorial card placement and coverage |  |  |
| D134 | ExitCalibrator: pre-travel exits for the whole non-Inform catalog | js/ExitCalibrator.js | Zork1 Zork 1 Planetfall |
| D133 | Desktop microphone |  |  |
| D132 | follow-up: splash verified cold on the library screen too |  |  |
| D131 | Equipment grab handle floats instead of interrupting the name |  |  |
| D130 | Tutorial: library phase, readiness gate, and the wash-out fix |  |  |
| D129 | Save to device (Storage Access Framework) | harness/qol-download-text.js |  |
| D126 | Drag ghost, auto-scroll, tutorial example items |  |  |
| D125 | Equipment grab handle, scrollable sheet, sheets never stack |  |  |
| D124 | Live tutorial restored | js/Tutorial.js css/Tutorial.css js/MainMenu.js |  |
| D122 | Equipment sheet | js/EquipmentUI.js |  |
| D121 | Android file export + top reflow band | js/Qol.js harness/qol-download-text.js |  |
| D120 | follow-up: persona-based tutorial review + live-reported real-app directional-handle bugs | js/Tutorial.js css/Tutorial.css lib/jquery.min.js js/ProductInfo.js |  |
| D119 | codex D117/D118 audit fixes (bus #786) + settings-merge follow-up + desktop arrow overlay |  |  |
| D118 | merge D111's arrow pad into DirectionalRadial | js/CharKeys.js |  |
| D117 | directional radial overlay -- PROTOTYPE (exits-only, not the full design) | js/DirectionalRadial.js |  |
| D116 | top compass strip untouchable under the status bar |  |  |
| D115 | hardware back must never silently exit/minimize the app |  |  |
| D114 | real file export on Android (Filesystem + Share) |  |  |
| D113 | no relative link may ever navigate the app away | js/ProductInfo.js |  |
| D112 | map panel: search placement, collapsible controls, unified notation |  |  |
| D111 | automatic arrow pad for native grid menus |  |  |
| D110 | deterministic adaptive radial usage |  |  |
| D109 | shared pronunciation correction |  | Anchorhead |
| D108 | complete-turn deterministic narration |  |  |
| D107 | Parser-owned command nouns, 2026-09-22 (operator report: clicking long-handled shovel generated a compound phrase the module rejected). | harness/d107-compound-noun.js |  |
| D106 | visible state after native file restore |  |  |
| D105 | Mobile input contract, 2026-09-21 (operator device report: no keyboard/text entry at startup and menu screens, Inform HELP menu not navigable, no... | js/CharKeys.js harness/d105-input-contract.js harness/d105-review-fixes.js harness/d100-live-turns.js |  |
| D104 | D100 read-aloud rework and skip-repeats option, 2026-09-21 (operator device report: intro never read, room text re-read every turn). | js/ReadAloud.js harness/d100-live-turns.js harness/d100-read-aloud.js | Anchorhead |
| D103 | One-time mobile gesture tutorial and documentation repair, 2026-09-21. |  |  |
| D102 | Mobile menu simplification, 2026-09-21. | harness/d96-menu-handle-map-tab.js |  |
| D101 | Display text size and duplicate Tools repair, 2026-09-21. | harness/d94-cell-and-boot.js harness/d96-menu-handle-map-tab.js |  |
| D100 | Read aloud (automatic on-device TTS for new story text) — IMPLEMENTED 2026-09-21. | js/ReadAloud.js harness/d100-read-aloud.js |  |
| D99 | ParchLock release program -- MASTER LEDGER of retained scope (FINAL PLAN, submitted to codex for implementation; not yet implemented). |  |  |
| D98 | In-app Module Manager (operator directive 2026-09-20; FINAL DESIGN, submitted to codex for implementation, not yet implemented). |  |  |
| D97 | (Subordinate to D99 / section 12.2 -- story policy only; canonical text in section 12.2.) Release/legal planning decision (operator, 2026-09-20;... | js/GameList.js |  |
| D96 | Mobile chrome: the Menu chip covered the command input; it is now a retractable bottom handle, plus a faint right-edge Map tab (operator request,... | js/MobileLayout.js harness/d96-menu-handle-map-tab.js | Anchorhead |
| D95 | Mobile microphone: hold-to-talk did not show a held state and did not work (operator report, 2026-09-20). Reproduced with a faithful model of the... | js/Input.js css/Parchmap.css harness/d95-mic-hold.js |  |
| D94 | Two mobile defects reported from a real phone (2026-09-20): an intermittent blank game screen (worst on Anchorhead) and misaligned/hard-wrapped text.... | js/ZvmCapture.js js/UndoRestoreSync.js harness/audit-restore-sync.js tools/ui-regression.js | Anchorhead Zork1 |
| D93 | Mobile: portrait-primary rewrite, correcting D92's landscape-lock as an operator-identified mistake, 2026-09-20 (operator: "I was wrong about... | css/Parchmap.css js/Parchmap.js harness/mobile-fullscreen-landscape.js js/Actionable.js | Zork1 Anchorhead |
| D92 | Mobile: real fullscreen+landscape lock, a PWA app shell, and a self-contained native Android app conversion, 2026-09-19/20 (operator: "runnable... | js/MobileLayout.js harness/mobile-fullscreen-landscape.js |  |
| D91 | Pre-existing bug found via the D88 regression sweep, unrelated to D88, fixed with operator authorization, 2026-09-19: js/GrammarProvider.js's... | js/GrammarProvider.js js/Qol.js js/Actionable.js harness/d34-dictionary-verbs.js | Advent |
| D90 | Two more stale/incorrect fixtures found and fixed via the same discipline as D33/D46/D61's "verify against the real string, not an assumption,"... | harness/d31-known-topics.js js/Actionable.js harness/command-consistency-regression.js js/Input.js |  |
| D89 | Critical, whole-catalog RAM-reading outage found and fixed, 2026-09-19 -- ZRamReader.scopeObjects/attrsFromObject/lookAheadExits/destIsMapRoom and... | js/ZRamReader.js js/ZRamProvider.js js/GrammarProvider.js js/ActionSynth.js | Anchorhead Zork1 |
| D88 | Stages 1-6 of 8 SHIPPED, 2026-09-19/20 (codex authored the plan/architecture then ran out of credits before writing any product code -- verified:... | js/SemanticActions.js harness/d31-known-topics.js harness/command-consistency-regression.js tools/d88-baseline-capture.js | Zork1 |
| D86 | FULLY SHIPPED, 2026-09-14 (stage 1, TurnRecorder substrate, all three analyzer ports, full cutover, and legacy-code cleanup all complete and... | lib/zvm.js js/AttrCalibrator.js js/Input.js js/TurnRecorder.js | Anchorhead wump2ka anchorhead |
| D85 | SHIPPED, 2026-09-14 (standalone verification complete, codex-reviewed): per-game learned verb-disablement + substitute-verb calibration -... | tools/d85-verb-disablement-proof.js harness/attr-calibrator-verb-disablement.js | AOTYRZ |
| D84 | Real fix for D83 (and the same underlying gap in D79's findLocationGlobal fallback generally): a per-game LEARNED location-global calibration, using... | lib/zvm.js harness/attr-calibrator-location-global.js | Anchorhead wump2ka Zork1 |
| D83 | RESOLVED by D84 (see below) - originally found, documented, NOT fixed (honest limitation, not a forced guess): Bronze.zblorb.js (Inform 7 build 3K27,... |  | wump2ka |
| D82 | js/ZRamProvider.js's room-scope discoveredObjects walk could surface the player's own object as an "interactive room item" - found via real UI-driven... | js/ZRamProvider.js | Deadline Anchorhead Zork1 |
| D81 | js/Actionable.js's room-scope tracking (Refresh(), RoomLines/RoomHeading/Scope.roomName) was still name-keyed, not RAM-id-keyed - the same category... | js/Actionable.js | wump2ka Zork1 Anchorhead |
| D80 | wump2ka's map/Known-Rooms panel showed generic "Room #N"/"CROOMSN" labels instead of the game's own real descriptive room title, even for an... | js/WorldModel.js harness/d46-room-identity.js | wump2ka Anchorhead Zork1 |
| D79 | The actual root cause behind the entire session's recurring Wumpus mapping complaints - js/ZRamReader.js findLocationGlobal's scored heuristic was... | js/ZRamReader.js harness/_longplay_wumpus.js lib/zvm.js js/ZvmCapture.js | wump2ka |
| D78 | "Take umbrella out of trenchcoat" (the ONLY command synthesized for a nested-in-held-container item, D31) never actually completes a take on a real,... | js/ActionSynth.js harness/d31-nested-inventory.js | Anchorhead |
| D77 | "Put in trenchcoat" missing from umbrella's radial but present for the (removed) wedding ring - operator investigation question, root-caused live to... | js/Actionable.js js/Qol.js | Anchorhead |
| D76 | Closed the "Reset Map" loose end D74 explicitly left open - operator asked directly whether Reset Map is now safe for the repeated, heavy real-world... | tools/map-pathing-regression.js | wump2ka Anchorhead Zork1 |
| D75 | "Inventory did not work at all" (operator report, A Bear's Night Out worked correctly, wump2ka.z5.js did not) - root-caused to the SAME... | js/ZRamProvider.js js/AttrCalibrator.js harness/attr-calibrator-inventory-root.js | wump2ka |
| D74 | Root cause of "after Reset Map + continuing to play, mapping just simply didn't work" (operator report, screenshot showing 0 map boxes rendered... |  | wump2ka |
| D73 | Correction of D34 and D58: lib/zvm.js is a pure-JS, JIT-compiling Z-machine interpreter whose opcode implementations are ordinary, live,... | lib/zvm.js js/ZvmCapture.js js/AttrCalibrator.js harness/attr-calibrator-phase-b.js | wump2ka Anchorhead Zork1 |
| D72 | The real root cause behind the map "feeling messed up"/duplicating rooms across ALL THREE games, not a per-game issue - TWO separate, uncoordinated... | js/TranslatorUI.js js/Map.js js/MapIdentity.js | wump2ka Anchorhead Zork1 |
| D71 | Follow-on to D63/D66, found in the same real click-driven pass: a compass-slot's small corner label ("N"/"NE"/etc) never reflected the REAL... |  | wump2ka |
| D70 | Minor follow-on refinement to D64, found in the same real click-driven Anchorhead pass as D69, 2026-09-13: an object's VerifiedNouns entry could be... |  | Anchorhead |
| D69 | A follow-on bug from D65 itself, found via a fresh real click-driven playtest pass on Anchorhead (untouched by this session's Zork/Wumpus work),... | js/TranslatorUI.js | Anchorhead |
| D68 | The actual root cause of "Glow Bar incorrectly shows as worn" - a worn item leaking into room-scope discovery through the SAME... | js/ZRamReader.js | wump2ka Anchorhead |
| D67 | The actual root cause of "the map doesn't update correctly until you travel back and forth a couple of times" - a real, pre-existing CSS/render bug... | js/Map.js | Zork1 |
| D66 | A room's own confirmed Exits map only ever records the direction the player actually typed FROM that room - arriving at a brand-new room from... | js/Map.js | Zork1 |
| D65 | Zork1's radial never offered a compass direction, even long after it had been confirmed by real travel and was already visibly linked on the map -... | js/WorldModel.js | Zork1 |
| D64 | An object's structural short-name (the Z-machine object-header text ZRamReader.shortName decodes) is not guaranteed to be real parser vocabulary at... |  | wump2ka |
| D63 | Root architecture gap: the map's compass grid has physical DOM slots ONLY for the 12 fixed direction words - a game whose exits are NOT compass words... | js/Map.js | wump2ka |
| D62 | A confirmed live counter-example broke the D47 assumption that a room's display Name should always update to the latest reading - found live-testing... | js/MapTopology.js harness/d46-room-identity.js | wump2ka |
| D61 | Root-cause fix, not per-module patching: the entire direction-property scanning apparatus was an Inform-only assumption that misfired on non-Inform... | js/ZRamReader.js harness/d23-lookahead-labels.js | Zork 1 Zork1 curses |
| D60 | Numbered I7 doordir exits were never clickable/underlined in the room text at all (only reachable via the general input-line radial) - found via real... | harness/d23-lookahead-labels.js | wump2ka Anchorhead |
| D59 | A held-but-not-worn wearable item's radial showed both "Wear" and "Remove" simultaneously (contradictory) - found via real radial-driven playtest,... | js/ActionSynth.js |  |
| D58 | Correction of an earlier same-session finding: wump2ka.z5.js's "nonsensical" attribute combos are NOT an attribute-schema mismatch - the standard I6... | js/ZRamProvider.js | wump2ka Anchorhead |
| D57 | A room's own worn/held items were leaking into ROOM-scope discoveredObjects (duplicating them out of inventory, offering "take"/"open" on things... | js/ZRamReader.js js/WorldModel.js js/ZRamProvider.js | Anchorhead |
| D56 | Takeable world objects never offered a "Take" verb, in any game - found via live holistic play (operator screenshot, real gameplay), 2026-09-12. | js/AttributeSchema.js | Anchorhead |
| D55 | Numbered I7 doordir exits were completely non-functional via click/radial/route-navigation - a real, high-impact bug found via the D52 holistic... | js/ZRamReader.js js/Actionable.js js/Qol.js js/Navigator.js | wump2ka |
| D54 | Room display names garbled ("CROOMS3" etc.) throughout the map and Known Rooms panel for wump2ka.z5.js, a procedurally-generated dungeon crawl -... |  | wump2ka Anchorhead |
| D53 | Nested-container item vanished from inventory entirely instead of nesting (D31 regression), found via real holistic playtest, 2026-09-12. | js/ZRamProvider.js | Anchorhead wump2ka |
| D52 | Grok's bus seat confirmed non-functional (weekly usage limit reached, screenshot evidence, resets 2026-09-18) - holistic dual-agent audit reduced to... |  | Anchorhead wump2ka |
| D51 | D49's "neutral placeholder" fix for the nw/se diagonal ambiguity was itself rejected on further live testing -- hiding an uncertain real exit is not... | tools/layout-regression.js js/ZRamReader.js js/MapTopology.js js/Map.js |  |
| D50 | In-game native help/menu text unreadable (near-black on near-black) - investigated and fixed generically, 2026-09-12 (operator, live screenshot:... | css/Parchmap.css | Anchorhead |
| D49 | D40's diagonal-swap bug (northwest/southeast mislabeled, text word not underlined) fixed with a real per-story self-calibration mechanism, plus a... | js/ZRamReader.js js/MapTopology.js | Anchorhead |
| D48 | D46's cross-reference label ("= E") still read as a second room to a real user - superseded, 2026-09-12 (operator, live-tested: "now it is actually... | js/Map.js harness/d48-map-single-room-per-destination.js | Anchorhead |
| D47 | Room map identity was still name-keyed underneath, not RAM-id-keyed - this is Phase 5/D32's long-flagged gap, closed generically, 2026-09-12... | js/MapTopology.js js/Map.js harness/d46-room-identity.js | Anchorhead |
| D46 | Map "duplicate door" fix strengthened - a dimmed second box still read as "a duplicate" to a real user, 2026-09-12 (operator, live-tested, same repo,... | js/Map.js | Anchorhead |
| D45 | Radial fill showing items ~100% filled with zero real usage - investigated and fixed generically, 2026-09-12 (operator, direct follow-up on D41: "how... | js/Qol.js js/Actionable.js |  |
| D44 | The stray "pill" UI artifact - investigated and fixed generically, 2026-09-12 (operator reported it in multiple screenshots, unclickable/immovable,... | js/TranslatorUI.js css/Parchmap.css | Advent |
| D43 | "Put in" radial defaulted to a wrong target ("sky") instead of listing real containers - investigated and fixed generically, 2026-09-12 (operator... | js/Actionable.js js/Qol.js | Anchorhead |
| D42 | "Real estate office door" listed twice on the map - investigated and fixed generically, 2026-09-12 (operator live-test report on Anchorhead). | js/Map.js css/Parchmap.css harness/d23-lookahead-labels.js harness/d23-topology-smoke.js | Anchorhead anchorhead |
| D41 | Radial usage-fill percentage was already a real, wired feature - found broken, root-caused, and fixed generically (applies to every radial),... | js/Qol.js css/Parchmap.css js/Actionable.js tools/ui-regression.js | Anchorhead |
| D40 | Real bugs found via operator live-testing on a separate copy, 2026-09-12 (Anchorhead). | js/WorldModel.js js/ZRamReader.js | Anchorhead |
| D39 | Hugo/TADS/Adrift removed from the plan entirely, 2026-09-12 (operator directive). |  |  |
| D38 | Glulx structural provider, Phase A researched 2026-09-12 - memory access is real, object-model research is blocked on missing catalog content. | lib/main.js lib/zvm.js lib/quixe.js js/LiveHeapProvider.js | Anchorhead |
| D37 | Gap found and fixed 2026-09-12, while scoping Glulx work: | js/RemGlkTapProvider.js harness/phase2-heuristic-cutover.js harness/_fix_remglk_collect.js |  |
| D36 | Sequencing (does not reorder anything already committed): |  |  |
| D35 | 2026-09-12 attempt 1 (rejected/reverted): | js/ZRamReader.js harness/d23-lookahead-labels.js harness/phase2-heuristic-cutover.js harness/d22-post-move.js | wump2ka |
| D34 | 2026-09-12 Phase A researched and CLOSED (not viable as originally stated): | js/GrammarProvider.js harness/_d34_phase_a_probe.js js/Qol.js js/TranslatorUI.js | Zork1 Hitchhik Borderzo |
| D33 | Plan-vs-actual-code reconciliation pass (2026-09-12, distinct from the earlier TXT-vs-plan pass): fixed six stale/contradictory doc claims found by... |  |  |
| D32 | Two more requirements restored after being dropped entirely from the original conversion: (1) click-a-historical-map-node computes and issues N real... |  |  |
| D31 | Three requirements from the conversion guide restored after being dropped entirely (not just compressed) during the original TXT-to-plan conversion:... |  |  |
| D30 | Phase 6 map-beautification mechanics restored to full fidelity from Full Stack Engine Level Conversion.txt (rigid-cluster/soft-spring physics, named... |  |  |
| D29 | Docs-completeness gate, every phase: |  |  |
| D28 | SUPERSEDED BY D39 - REMOVED FROM PLAN, 2026-09-12. |  |  |
| D27 | Any actionable/map/radial UI change must be proven with real browser gameplay against a catalog story (screenshots as evidence via the existing... |  |  |
| D26 | Ranking correction (2026-09-12, firm requirement): FIXED and independently verified by claude. | js/Qol.js js/Actionable.js harness/phase2-heuristic-cutover.js |  |
| D25 | Object attributes an actionable/radial decision depends on MUST come from a documented, sourced attribute-bit profile (js/AttributeSchema.js, Inform... | js/AttributeSchema.js harness/phase1-closed-container.js |  |
| D24 | No heuristic/text-mining fallback, ever, for actionable items/map identity/left-right-click radial commands - for every VM format, not only Inform. |  |  |
| D23 | Non-compass topological mapping first-class \| [yes] \| |  |  |
| D20 | Conversion-guide gaps in ?6B are in-scope; guide remains advisory where it conflicts with D8-D12/D15-D16 \| [yes] \| |  |  |
| D19 | Player/location cascade is mandatory for P2: player object id ? parent(player)=location ? child walk for scope \| [yes] \| |  |  |
| D18 | Actionable words bind to VM Object IDs via RAM dictionary/short-name tables (Word<->ObjectID); no orphan underlines without an id when P2 live \|... |  |  |
| D17 | primary |  |  |
| D16 | Only Parchmap play.html UI is player-visible; engines/Translator metrics hidden unless user enables debug \| [yes] \| |  |  |
| D15 | Product UX is play.html only for all catalog modules; Emglken special URLs are experimental/off \| [yes] \| |  |  |
| D14 | BUILD 44 completes O1-O4 chrome consumers; HEAP remains optional accelerator \| [yes] \| |  |  |
| D13 | Ship as a self-contained static package (DISTRIBUTE.md); runtime has no SKSEDevKit/emsdk/user-home absolutes; DevKits are build-only \| [yes] \| |  |  |
| D12 | WorldModel Translator (L2.5) is mandatory; providers ranked P0 behavioral (HUD/meta), P2 Z RAM, P3 Inform-Glulx (P1 heuristic dropped from the... |  |  |
| D11 | In-place original module updates (O1-O5); not clean-room \| [yes] \| |  |  |
| D10 | Overlay outside #windowport; generation-aware caches \| [yes] \| |  |  |
| D9 | Dual-pipeline merge with confidence (behavioral + structural) \| [yes] \| |  |  |
| D8 | Protocol-first; RAM behind Emglken exports \| [yes] \| |  |  |
| D7 | WASM layout only after perf gate \| [yes] \| |  |  |
| D6 | Platform migration before deep RAM \| [yes] \| |  |  |
| D5 | DevKits/harnesses first-class \| [yes] \| |  |  |
| D4 | Spoiler shield on by default \| [yes] \| |  |  |
| D3 | structural RAM target first |  |  |
| D2 | TS-first for new engine code; minimal L1 C exports as needed \| [yes] \| |  |  |
| D1 | Plan is authority; conversion TXT is advisory \| [yes] \| |  |  |
