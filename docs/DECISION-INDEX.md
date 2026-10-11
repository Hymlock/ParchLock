# Decision index

One line per decision in PRODUCTION_PLAN.md, newest first. **Search here before
measuring anything.**

This exists because the plan itself is not greppable: 108 decisions across
9062 lines, with single lines over 20,000 characters, so one grep match
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
| D224 | Wumpus multi-section rooms: measured reallocation fact; a dark-admitted name upgrades once | js/ModuleStatFactsClaude.js js/ZRamReader.js js/ZRamProvider.js js/DarkScope.js | wump2ka |
| D223 | Inform 7 exits from MapStorage for measured titles (M04-B) | js/ZRamReader.js js/ModuleStatFactsClaude.js js/MapTopology.js js/WorldModel.js |  |
| D222 | Furniture and vehicles inside a top-level Inform room are not the room (M08) | js/ZRamReader.js |  |
| D221 | DarkScope judges only the latest reply (M11) | js/DarkScope.js js/WorldModel.js js/ParchLock.js harness/m11-dark-scope.js |  |
| D220 | The unique story-named "yourself" object is the I7 player (M05b); date-named saved rooms repair (D219) | js/ZRamReader.js js/MapTopology.js harness/m12-room-short-name.js |  |
| D219 | Rooms with a blank compiled name take the story's own shortname (M12) | js/ZRamReader.js js/WorldModel.js harness/m12-room-short-name.js |  |
| D218 | Inform 7 compiler bookkeeping properties are never exits (M04 part A) | js/ZRamReader.js harness/d218-i7-metadata.js |  |
| D217 | Library-compass lane: exit labels from the game's own compass (M01/M03) | js/ZRamReader.js js/ZRamProvider.js harness/m01-library-compass.js |  |
| D216 | Mapping research fixes: internal-named rooms, positional heading suffix, Degeneracy player fact | js/ZRamReader.js js/Actionable.js js/ModuleStatFactsClaude.js |  |
| D215 | Full-app beautification sweep, surface by surface, preserving functional reserves | js/SaveState.js js/StatTracker.js js/IconRotation.js harness/death-terminal.js |  |
| D214 | Underlines follow their words; replies are observed; dictionary-equivalent and pronoun-safe triggers; Yourself breadth |  |  |
| D213 | Enemy interactions and in-room steps need RAM or grammar evidence (Step 5) |  |  |
| D212 | Pronunciation catalogue gathered from all projects | js/PronunciationCatalog.js js/ReadAloud.js |  |
| D211 | Voice input lifecycle: settle barrier, bounded waits, backoff, diagnostics |  |  |
| D210 | Hold that opens a radial never starts native text selection |  |  |
| D209 | One row when a status metric IS the score (Treasures "Quest Rate") |  |  |
| D208 | Time-game score: header time flag, clock detection, stale status score | js/StatTracker.js |  |
| D207 | Status probes are headless: span ownership, released turn events, META provenance |  |  |
| D206 | Actors are discoverable: unnamed animate candidates, particle-free triggers, no Take on people | js/ZRamReader.js js/Actionable.js |  |
| D205 | Drag-and-hold on Yourself: inventory/RPG action radial |  |  |
| D204 | Holistic statistics discovery and repeatable event monitoring — IMPLEMENTED | harness/command-disambiguation.js js/EquipmentUI.js harness/equipment-ui.js | Zork1 deadline Enchanter |
| D203 | Mobile left exit-rail readable-content safety |  |  |
| D202 | Original Map Controls |  |  |
| D201 | Early Inform unnamed identity and inventory recovery |  |  |
| D200 | Inform Z3 declaration reader | js/ZRamReader.js | catseye gussdeath moonglow |
| D199 | The citation now reproduces the conclusion |  |  |
| D198 | ZIL/Infocom capability completion through existing systems |  |  |
| D197 | A verifier that only runs here is not a verifier | tools/carry-probe-lifecycle-live.js |  |
| D196 | The 46 fallback modules: what is actually missing |  |  |
| D195 | One probe transaction at a time |  | wump2ka |
| D194 | A refused probe must put the model back |  | wump2ka |
| D193 | item 2: the required subset, measured instead of argued | tools/attribute-declaration-ab.js | LostPig wump2ka anchor |
| D192 | Four leftovers from the second audit round |  |  |
| D191 | The carry probe's lifecycle: a draft, a queued submit, and a permission |  |  |
| D190 | Take on a promoted object, gated by the module's own declaration |  |  |
| D188 | An injected command is not headless |  | Anchorhead |
| D186 | First-query compiled attribute declarations and audit repairs | harness/attr-calibrator-phase-cd.js |  |
| D185 | examineOnly was a flag with no consumers |  |  |
| D184 | An object the compiler never named |  | wump2ka |
| D183 | The badge does not read the event stream |  |  |
| D182 | Declining the restore prompt is a new game, and only one place knew it |  |  |
| D181 | A restore is not a score |  |  |
| D180 | The stats were not part of the undo/restore/restart resync |  |  |
| D178 | A persisted READING is not a persisted FACT |  | wump2ka |
| D176 | The pin baseline stuck too LOW, which D175 created |  |  |
| D175 | Two defects the audit found in D173, one of them in its own test |  |  |
| D174 | A pinned figure that cannot answer this turn must not freeze |  | wump2ka |
| D173 | An announced score change has to be COUNTED, not only used to pin |  |  |
| D172 | The command line ran under the send and mic buttons |  |  |
| D171 | addendum: D84 kept its precedence, and three claims verified |  | wump2ka |
| D170 | addendum: the locator's second guard, from an adversarial pass |  | wump2ka |
| D169 | Carried value and weight, tracked headlessly |  | wump2ka |
| D168 | Desktop sheet reflow, the mislaid mic button, and collapsible equipment options |  |  |
| D167 | Nine operator-reported items, and a wumpus investigation | css/ParchLock.css |  |
| D166 | Four operator-reported UI and probe defects |  |  |
| D165 | The status row is a fallback, not the preferred source |  | wump2ka Anchorhead |
| D164 | The duplicate room, and the corrupted room name |  |  |
| D163 | A step that moves you WITHIN a room |  |  |
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
| D129 | Save to device (Storage Access Framework) |  |  |
| D126 | Drag ghost, auto-scroll, tutorial example items |  |  |
| D125 | Equipment grab handle, scrollable sheet, sheets never stack |  |  |
| D124 | Live tutorial restored | js/Tutorial.js css/Tutorial.css js/MainMenu.js |  |
| D122 | Equipment sheet |  | Anchorhead |
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
| D107 | parser-owned command nouns |  |  |
| D106 | visible state after native file restore |  |  |
| D93 | mobile follow-up (operator live APK, grok) |  |  |
| D88 | invariants |  |  |
