# Decision index

One line per decision in PRODUCTION_PLAN.md, newest first. **Search here before
measuring anything.**

This exists because the plan itself is not greppable: 115 decisions across
9405 lines, with single lines over 20,000 characters, so one grep match
returns more text than anyone can read. Searching the full plan directly is how
prior answers get missed and re-derived.

## How to use it

    grep -i wumpus docs/DECISION-INDEX.md        # what has been decided about a game
    grep -i "player\|room id" docs/DECISION-INDEX.md   # about a subsystem
    grep -n "ZRamReader.js" docs/DECISION-INDEX.md      # about a file

Then open the full entry in PRODUCTION_PLAN.md for the one or two D-numbers that
match, e.g. `grep -n "^| D79 \|^### D79" PRODUCTION_PLAN.md`.

The **arch** column names the ARCHITECTURE_UML.md chapter(s) whose heading cites
the decision (§56 = "## 56. ..."); open it with `grep -n "^## 56\." ARCHITECTURE_UML.md`.
An empty arch cell means no chapter HEADING cites the decision; search the architecture
body before concluding it is undocumented. The chapter list
after the table indexes the architecture itself.

Regenerate after adding decisions or chapters: `node tools/decision-index.js`

| D | claim | files | games | arch |
|---|-------|-------|-------|------|
| D231 | "Unlock with..." is offered only on a title's authored unlock tools |  |  | §88 |
| D230 | More-page object suggestions admit only letter-led, object-taking dictionary verbs |  |  | §87 |
| D229 | Open/Close follow the measured open state; authored container forms for parts-only containers |  |  | §86 |
| D228 | Authored food actions follow each owner's current game state |  |  | §85 |
| D227 | One payload pool per read-only pass; the static dictionary is decoded once per story |  |  | §84 |
| D226 | Rooms and NPCs are never the inventory holder | js/WorldModel.js js/ZRamProvider.js js/AttrCalibrator.js js/ModuleStatFactsClaude.js |  | §83 |
| D225 | Shared-word marks cover only their head-noun owners; inventory labels come only from genuine listing rows | js/Actionable.js js/ModuleStatFactsClaude.js | Enchanter | §82 |
| D224 | Wumpus multi-section rooms: measured reallocation fact; a dark-admitted name upgrades once | js/ModuleStatFactsClaude.js js/ZRamReader.js js/ZRamProvider.js js/DarkScope.js | wump2ka | §81 |
| D223 | Inform 7 exits from MapStorage for measured titles (M04-B) | js/ZRamReader.js js/ModuleStatFactsClaude.js js/MapTopology.js js/WorldModel.js |  | §80 |
| D222 | Furniture and vehicles inside a top-level Inform room are not the room (M08) | js/ZRamReader.js |  |  |
| D221 | DarkScope judges only the latest reply (M11) | js/DarkScope.js js/WorldModel.js js/ParchLock.js harness/m11-dark-scope.js |  | §79 |
| D220 | The unique story-named "yourself" object is the I7 player (M05b); date-named saved rooms repair (D219) | js/ZRamReader.js js/MapTopology.js harness/m12-room-short-name.js |  |  |
| D219 | Rooms with a blank compiled name take the story's own shortname (M12) | js/ZRamReader.js js/WorldModel.js harness/m12-room-short-name.js |  |  |
| D218 | Inform 7 compiler bookkeeping properties are never exits (M04 part A) | js/ZRamReader.js harness/d218-i7-metadata.js |  | §78 |
| D217 | Library-compass lane: exit labels from the game's own compass (M01/M03) | js/ZRamReader.js js/ZRamProvider.js harness/m01-library-compass.js |  | §77 |
| D216 | Mapping research fixes: internal-named rooms, positional heading suffix, Degeneracy player fact | js/ZRamReader.js js/Actionable.js js/ModuleStatFactsClaude.js |  | §76 |
| D215 | Full-app beautification sweep, surface by surface, preserving functional reserves | js/SaveState.js js/StatTracker.js js/IconRotation.js harness/death-terminal.js |  | §75 |
| D214 | Underlines follow their words; replies are observed; dictionary-equivalent and pronoun-safe triggers; Yourself breadth |  |  | §74 |
| D213 | Enemy interactions and in-room steps need RAM or grammar evidence (Step 5) |  |  | §73 |
| D212 | Pronunciation catalogue gathered from all projects | js/PronunciationCatalog.js js/ReadAloud.js |  | §72 |
| D211 | Voice input lifecycle: settle barrier, bounded waits, backoff, diagnostics |  |  | §72 |
| D210 | Hold that opens a radial never starts native text selection |  |  | §72 |
| D209 | One row when a status metric IS the score (Treasures "Quest Rate") |  |  | §71 |
| D208 | Time-game score: header time flag, clock detection, stale status score | js/StatTracker.js |  | §71 |
| D207 | Status probes are headless: span ownership, released turn events, META provenance |  |  | §71 |
| D206 | Actors are discoverable: unnamed animate candidates, particle-free triggers, no Take on people | js/ZRamReader.js js/Actionable.js |  |  |
| D205 | Drag-and-hold on Yourself: inventory/RPG action radial |  |  | §69 |
| D204 | Holistic statistics discovery and repeatable event monitoring — IMPLEMENTED | harness/command-disambiguation.js js/EquipmentUI.js harness/equipment-ui.js | Zork1 deadline Enchanter | §68 |
| D203 | Mobile left exit-rail readable-content safety |  |  | §67 |
| D202 | Original Map Controls |  |  | §66 |
| D201 | Early Inform unnamed identity and inventory recovery |  |  | §65 |
| D200 | Inform Z3 declaration reader | js/ZRamReader.js | catseye gussdeath moonglow | §63 |
| D199 | The citation now reproduces the conclusion |  |  |  |
| D198 | ZIL/Infocom capability completion through existing systems |  |  | §64 |
| D197 | A verifier that only runs here is not a verifier | tools/carry-probe-lifecycle-live.js |  |  |
| D196 | The 46 fallback modules: what is actually missing |  |  |  |
| D195 | One probe transaction at a time |  | wump2ka |  |
| D194 | A refused probe must put the model back |  | wump2ka |  |
| D193 | item 2: the required subset, measured instead of argued | tools/attribute-declaration-ab.js | LostPig wump2ka anchor |  |
| D192 | Four leftovers from the second audit round |  |  |  |
| D191 | The carry probe's lifecycle: a draft, a queued submit, and a permission |  |  |  |
| D190 | Take on a promoted object, gated by the module's own declaration |  |  |  |
| D188 | An injected command is not headless |  | Anchorhead |  |
| D186 | First-query compiled attribute declarations and audit repairs | harness/attr-calibrator-phase-cd.js |  | §61 |
| D185 | examineOnly was a flag with no consumers |  |  |  |
| D184 | An object the compiler never named |  | wump2ka |  |
| D183 | The badge does not read the event stream |  |  |  |
| D182 | Declining the restore prompt is a new game, and only one place knew it |  |  |  |
| D181 | A restore is not a score |  |  |  |
| D180 | The stats were not part of the undo/restore/restart resync |  |  |  |
| D178 | A persisted READING is not a persisted FACT |  | wump2ka |  |
| D176 | The pin baseline stuck too LOW, which D175 created |  |  |  |
| D175 | Two defects the audit found in D173, one of them in its own test |  |  |  |
| D174 | A pinned figure that cannot answer this turn must not freeze |  | wump2ka |  |
| D173 | An announced score change has to be COUNTED, not only used to pin |  |  |  |
| D172 | The command line ran under the send and mic buttons |  |  |  |
| D171 | addendum: D84 kept its precedence, and three claims verified |  | wump2ka |  |
| D170 | addendum: the locator's second guard, from an adversarial pass |  | wump2ka |  |
| D169 | Carried value and weight, tracked headlessly |  | wump2ka |  |
| D168 | Desktop sheet reflow, the mislaid mic button, and collapsible equipment options |  |  |  |
| D167 | Nine operator-reported items, and a wumpus investigation | css/ParchLock.css |  |  |
| D166 | Four operator-reported UI and probe defects |  |  |  |
| D165 | The status row is a fallback, not the preferred source |  | wump2ka Anchorhead |  |
| D164 | The duplicate room, and the corrupted room name |  |  |  |
| D163 | A step that moves you WITHIN a room |  |  |  |
| D162 | Multi-word commands can be travel again |  | wump2ka Anchorhead |  |
| D161 | Restoring what the v27 build did, verified against the real APK | harness/d162-travel-commands.js | Anchorhead |  |
| D160 | Follow-ups: what closed, and what the remaining items really are |  |  |  |
| D159 | Read-aloud followed the route instead of the destination | js/ReadAloud.js | Zork 1 |  |
| D158 | Provider registration lost to a navigation race -- the real cause |  |  |  |
| D157 | The payload death, and read-aloud during fast travel | harness/d158-provider-recovery.js | anchorhead |  |
| D156 | Two mobile-only gaps |  |  |  |
| D155 | Doors stopped being exits |  | Anchorhead |  |
| D154 | An error reporter that threw, and hid everything behind it | js/ParchLock.js |  |  |
| D153 | The only way to ask was hidden behind having already succeeded |  | Anchorhead Planetfall Deadline |  |
| D152 | The status grid is too narrow to print stats on a phone |  | Planetfall |  |
| D151 | The player can be standing on the furniture |  | 905 |  |
| D150 | Post-APK sweep: mark-derived commands, drink, and the player on the furniture |  | Anchorhead |  |
| D149 | addendum: the v3 path, relevance-gated filters, and the tour |  |  | §60 |
| D148 | Held containers whose bits do not decode | harness/d31-nested-inventory.js | Enchanter | §59 |
| D147 | The instrumental verb has to exist in the game |  | Zork 1 Planetfall Enchanter | §59 |
| D146 | One mark per object, dictionary-verified instrumental verbs, and the spell path | tools/highlight-scope-regression.js | Anchorhead | §59 line 2823 |
| D142 | Object vocabulary, text decoding, and verb trust across compilers |  | Zork1 Planetfall |  |
| D141 | Adjective+noun command disambiguation |  |  |  |
| D138 | Mapping and auto-travel across the catalog |  | Anchorhead |  |
| D137 | (OPEN, not fixed) status line fields collide on a phone |  | Anchorhead |  |
| D136 | Tutorial card placement and coverage |  |  |  |
| D134 | ExitCalibrator: pre-travel exits for the whole non-Inform catalog | js/ExitCalibrator.js | Zork1 Zork 1 Planetfall |  |
| D133 | Desktop microphone |  |  |  |
| D132 | follow-up: splash verified cold on the library screen too |  |  |  |
| D131 | Equipment grab handle floats instead of interrupting the name |  |  |  |
| D130 | Tutorial: library phase, readiness gate, and the wash-out fix |  |  |  |
| D129 | Save to device (Storage Access Framework) |  |  | §58 |
| D126 | Drag ghost, auto-scroll, tutorial example items |  |  |  |
| D125 | Equipment grab handle, scrollable sheet, sheets never stack |  |  |  |
| D124 | Live tutorial restored | js/Tutorial.js css/Tutorial.css js/MainMenu.js |  | §57 |
| D122 | Equipment sheet |  | Anchorhead | §56 |
| D121 | Android file export + top reflow band | js/Qol.js harness/qol-download-text.js |  | §55 |
| D120 | follow-up: persona-based tutorial review + live-reported real-app directional-handle bugs | js/Tutorial.js css/Tutorial.css lib/jquery.min.js js/ProductInfo.js |  | §54 |
| D119 | codex D117/D118 audit fixes (bus #786) + settings-merge follow-up + desktop arrow overlay |  |  | §53 |
| D118 | merge D111's arrow pad into DirectionalRadial | js/CharKeys.js |  | §52 §53 |
| D117 | directional radial overlay -- PROTOTYPE (exits-only, not the full design) | js/DirectionalRadial.js |  | §51 §53 |
| D116 | top compass strip untouchable under the status bar |  |  | §50 |
| D115 | hardware back must never silently exit/minimize the app |  |  | §49 |
| D114 | real file export on Android (Filesystem + Share) |  |  | §48 |
| D113 | no relative link may ever navigate the app away | js/ProductInfo.js |  | §47 |
| D112 | map panel: search placement, collapsible controls, unified notation |  |  | §46 |
| D111 | automatic arrow pad for native grid menus |  |  | §45 §52 |
| D110 | deterministic adaptive radial usage |  |  | §44 |
| D109 | shared pronunciation correction |  | Anchorhead | line 2003 |
| D108 | complete-turn deterministic narration |  |  | §43 |
| D107 | parser-owned command nouns |  |  | §42 |
| D106 | visible state after native file restore |  |  | §41 |
| D93 | mobile follow-up (operator live APK, grok) |  |  | §30 line 1527 |
| D88 | invariants |  |  | §28 |

## Architecture chapters (ARCHITECTURE_UML.md)

One line per chapter heading, in document order, with the decisions its heading
cites. Search here for a subsystem; the line number opens the chapter.

| chapter | line | title | decisions |
|---------|------|-------|-----------|
| line 4 | 4 | Chapter Check: Read This First |  |
| line 16 | 16 | Required Chapter-Check Procedure |  |
| line 47 | 47 | Bounded Full-Body Search |  |
| line 91 | 91 | Authority, Status, and Evidence |  |
| line 115 | 115 | Maintenance and Self-Check |  |
| line 142 | 142 | System Directory and Contract Summaries |  |
| line 163 | 163 | Scoped Corrections and Known Documentation Gaps |  |
| line 219 | 219 | Embedded Integrity Check |  |
| line 287 | 287 | Local Chapter and Decision Register |  |
| line 413 | 413 | September 16 Repair State |  |
| line 456 | 456 | Audit note |  |
| §1 | 463 | 1. Current vs target stack |  |
| §2 | 500 | 2. Layer + Translator components |  |
| §3 | 551 | 3. Per-turn sequence (Translator-centric) |  |
| §4 | 577 | 4. Provider ladder (capability) |  |
| §5 | 598 | 5. Containment matrix (structural providers only) |  |
| §6 | 624 | 6. Keep / replace / eliminated (D24) | D24 |
| §7 | 656 | 7. DevKit & harness |  |
| §8 | 671 | 8. UIPayload contract |  |
| §9 | 733 | 9. Protocol-first integration |  |
| §10 | 759 | 10. Original module migration (O1-O5) |  |
| §11 | 772 | 11. L3 geometry contract (GUI baseline) |  |
| §12 | 795 | 12. Decision anchors (must match plan section 11) |  |
| §13 | 864 | 13. Open questions (Phase 0-2) |  |
| §14 | 872 | 14. Dual-host runtime (BUILD 41) |  |
| §15 | 902 | 15. Provider map (implemented vs target) |  |
| §16 | 919 | 16. Probe ABI (shipped WASM) |  |
| §17 | 936 | 17. Open questions (updated) |  |
| §18 | 946 | 18. BUILD 45 chrome consumers (corrected, D24) | D24 |
| §19 | 967 | 19. Emglken entry (BUILD 45) |  |
| §20 | 973 | 20. Product rule (D15) | D15 |
| §21 | 979 | 21. Visible UI rule (D16) | D16 |
| §22 | 985 | 22. Deterministic RAM-primary contract (D17-D20, corrected by D24) | D17 D18 D19 D20 D24 |
| line 1003 | 1003 | Provider precedence (field-level, D24: no P1 fallback for these fields) | D24 |
| line 1015 | 1015 | Guide gaps mapped into architecture |  |
| line 1024 | 1024 | Explicit non-goals retained |  |
| §23 | 1033 | 23. Deterministic click / input commands (D21) | D21 |
| §24 | 1057 | 24. Universal coverage contract (D22) | D22 |
| §25 | 1090 | 25. Non-compass topological mapping (D23) | D23 |
| §26 | 1109 | 26. Map Beautification Engine (Phase 6, D30) | D30 |
| §27 | 1146 | 27. Live opcode calibration for attribute semantics (D73) | D73 |
| §28 | 1178 | 28. Semantic action dialect and command resolution (D88) | D88 |
| line 1231 | 1231 | Core records |  |
| line 1242 | 1242 | Deterministic resolution |  |
| line 1271 | 1271 | Evidence and persistence boundary |  |
| line 1289 | 1289 | Mobile and out-of-sample gate |  |
| §29 | 1305 | 29. RAM-reading recovery: scope/attribute/exit walk (D89) | D89 |
| §30 | 1379 | 30. Mobile: portrait-primary shell, PWA shell, and native Android conversion (D93, supersedes D92's landscape framing) | D92 D93 |
| line 1527 | 1527 | Post-D93 operator follow-ups: input, dialogs, mic (partly superseded) | D93 |
| §31 | 1537 | 31. VM restore hooks and the truthful character cell (D94) | D94 |
| §32 | 1593 | 32. Voice input state machine (D95) | D95 |
| §33 | 1626 | 33. Bottom Menu handle and right-edge Map tab (D96) | D96 |
| §34 | 1661 | 34. ParchLock release and documentation architecture (D99 -- implementation in progress) | D99 |
| §35 | 1722 | 35. Module library (D98 -- implemented) | D98 |
| §36 | 1784 | 36. Display text scaling and menu de-duplication (D101) | D101 |
| §37 | 1812 | 37. Mobile menu reachability (D102) | D102 |
| §38 | 1835 | 38. First-install mobile gesture tutorial (D103) | D103 |
| §39 | 1864 | 39. Read-aloud pipeline (D104, supersedes the D100 delta design) | D100 D104 |
| §40 | 1894 | 40. Mobile input contract: keyboard intent, character prompts and the arrow pad (D105) | D105 |
| §41 | 1919 | 41. Post-restore visible-state contract (D106) | D106 |
| §42 | 1949 | 42. Parser-owned command descriptor pipeline (D107) | D107 |
| §43 | 1988 | 43. Complete-turn narrator pipeline (D108) | D108 |
| line 2003 | 2003 | D109 pronunciation hints | D109 |
| §44 | 2012 | 44. Adaptive radial ordering (D110) | D110 |
| §45 | 2052 | 45. Automatic native-menu arrow pad (D111) | D111 |
| §46 | 2078 | 46. Map panel: search, collapsible controls, unified notation (D112) | D112 |
| §47 | 2107 | 47. App-wide navigation guard (D113) | D113 |
| §48 | 2132 | 48. Real file export on Android (D114) | D114 |
| §49 | 2155 | 49. Hardware back button never exits silently (D115) | D115 |
| §50 | 2170 | 50. Top compass strip clears the real occupied top region (D116) | D116 |
| §51 | 2186 | 51. Programmable directional radial overlay (D117) | D117 |
| §52 | 2231 | 52. Merging D111's arrow pad into the DirectionalRadial widget (D118) | D111 D118 |
| §53 | 2283 | 53. D117/D118 audit fixes (bus #786) + merged-settings gap + desktop arrow overlay (D119) | D117 D118 D119 |
| §54 | 2332 | 54. Non-live adaptive tutorial + phone-landscape portrait prompt (D120) | D120 |
| §55 | 2459 | 55. Top reflow band, and real file export on Android (D121) | D121 |
| line 2465 | 2465 | 55.1 `ParchLockQol.DownloadText` handed native a `Blob` |  |
| line 2487 | 2487 | 55.2 The top chrome is a reflow band, not an overlay |  |
| §56 | 2558 | 56. Equipment sheet (D122) | D122 |
| §57 | 2636 | 57. Live tutorial restored (D124) | D124 |
| §58 | 2690 | 58. Save to device via the Storage Access Framework (D129) | D129 |
| §59 | 2734 | 59. Commanding non-standard items: spells, instruments, and held containers (D146-D148) | D146 D147 D148 |
| line 2741 | 2741 | The dictionary as the single arbiter |  |
| line 2767 | 2767 | Instrumental verbs |  |
| line 2788 | 2788 | Qualifiers from the printed name |  |
| line 2799 | 2799 | Descending into a held container whose bits do not decode |  |
| line 2823 | 2823 | Marks versus commands (D146) | D146 |
| §60 | 2838 | 60. Character tracker (D149) | D149 |
| line 2845 | 2845 | Source precedence |  |
| line 2858 | 2858 | Why globals are a candidate and not a source |  |
| line 2868 | 2868 | The v3 seeding path |  |
| line 2886 | 2886 | Deaths |  |
| line 2896 | 2896 | Audio |  |
| line 2905 | 2905 | Relevance gating, generalised |  |
| line 2914 | 2914 | Custom status windows |  |
| §61 | 2926 | 61. Compiled attribute declarations and audit corrections (D186) | D186 |
| §62 | 2978 | 62. Attribute audit coverage and remaining decoder gaps |  |
| §63 | 3021 | 63. Inform Z3 declaration layout (D200) | D200 |
| §64 | 3062 | 64. D198 ZIL/Infocom composition architecture | D198 |
| §65 | 3288 | 65. Unnamed early-Inform identity composition (D201) | D201 |
| §66 | 3469 | 66. Original Map Controls (D202) | D202 |
| §67 | 3486 | 67. Mobile side-rail readable-content geometry (D203) — IMPLEMENTED | D203 |
| §68 | 3556 | 68. Holistic statistics evidence ledger (D204) - IMPLEMENTED | D204 |
| §69 | 3682 | 69. Yourself hold radial for inventory/RPG verbs (D205) | D205 |
| §70 | 3739 | 70. Learned words display and shared-copy repairs (2026-10-04) |  |
| line 3776 | 3776 | Observed item descriptor precedence - regression correction (2026-10-04) |  |
| §71 | 3785 | 71. Status probes, time games and the score alias (D207-D209) | D207 D208 D209 |
| §72 | 3821 | 72. Hold selection ownership, voice input lifecycle and speech (D210-D212) | D210 D211 D212 |
| §73 | 3879 | 73. In-room steps and combat actions (D213) | D213 |
| §74 | 3907 | 74. Underline lifetime, reply observation and Yourself breadth (D214) | D214 |
| §75 | 3957 | 75. Save-tied state, authored endings and the rotating icon (D215) | D215 |
| §76 | 4028 | 76. Internal-named rooms, positional suffixes and measured player facts (D216) | D216 |
| §77 | 4051 | 77. Library-compass lane for exit labels (D217) | D217 |
| §78 | 4071 | 78. Inform 7 bookkeeping properties are not exits (D218) | D218 |
| §79 | 4081 | 79. DarkScope: one heuristic darkness verdict per tick (D221) | D221 |
| §80 | 4103 | 80. Inform 7 Map_Storage look-ahead lane (D223) | D223 |
| §81 | 4122 | 81. Measured location fact and dark-admitted naming (D224) | D224 |
| line 4141 | 4141 | ZIL semantic-flag ownership (2e1455e scoped closure; Codex #3442, carried by grok2 2026-10-11) |  |
| line 4169 | 4169 | ZIL constant-actor player root: playerObject (2026-10-11, grok2; Codex AUDIT PASS #3504) |  |
| line 4175 | 4175 | ZIL v4/v5 room: locationGlobal (2026-10-12, grok2, 5348c0f; Codex post-hoc audit pending) |  |
| §82 | 4180 | 82. Mark coverage and inventory label admission (D225) | D225 |
| §83 | 4192 | 83. Inventory holder authority and recovery (D226) | D226 |
| §84 | 4210 | 84. Read-only pass pool and static dictionary cache (D227) | D227 |
| §85 | 4263 | 85. Authored state-gated food actions (D228) | D228 |
| §86 | 4277 | 86. Measured container state and authored container forms (D229) | D229 |
| §87 | 4288 | 87. More-page suggestion admission (D230) | D230 |
| §88 | 4296 | 88. Authored unlock tool domain (D231) | D231 |
