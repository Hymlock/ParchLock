# Open work

2026-10-03

This is what is not implemented yet; ruled-out and finished items are not here.

## Glulx

- **D38.** An Inform-Glulx structural reader is still parked: the story window runs, but the map stays empty and items stay at zero until the object model is proven and a Glulx RAM provider exists. Decision log, D38; chapter check, "Glulx work remains parked."

## Commands

- **D88.** Stages 7 and 8 are not started: the held-out title-blind challenge and the legacy cleanup, which have to happen before the semantic cutover flag can default on. Decision log, D88.
- **D198.** The three new fact valves (grammar, semantic forms, and exit hints) are implemented and stay default off until each one passes its own held-out, parity, package, and lifecycle gates. D198, "Three independent activation valves."

## Map and rooms

- **D89.** A non-cardinal typed move such as "enter portal" no longer becomes a map edge after the pathing changes, and that smoke case is still open. Decision log, D89.
- **Ballyhoo "Connection".** Room identity picks the object named Connection, so no map room is created; later recovery work explicitly does not reopen this. D160, "Ballyhoo, narrowed"; D201.
- **Door `door_to`.** A door exit stays a hinted direction, not a pathable edge, until the player walks it; reading the far side from `door_to` has not been attempted. D157 and D160, "Still open."

## Inventory and objects

- [x] October 8 expanded sweep: check native inventory in all 28 bundled Infocom entries, resolve measured hidden-object and actor-layout exceptions, and obtain Claude's independent implementation audit. Preserve worn gear, nested objects, spell books and existing descriptor identities. All28 plus matching-compiler DejaVu census complete; native hidden flags measured, Border chapter/save/restore verified; independent ACCEPT1841.
- [x] October 8 character container and object state: Yourself depends on resolved character/holder identity, not worn or wearable contents. Known openable objects show open/closed; confirmed switchable objects show active/inactive. Unknown flags never invent a state. Basic suite119/0 and native umbrella/lamp transitions pass; independent implementation ACCEPT bus1841; native open/close and activation changes verified.
- [x] October 8 operator regression: Hitchhiker Equipment shows 71 offstage objects. Codex owns ZRamReader/ZRamProvider; Claude audits. Fresh executable proof identifies pseudo-player containment and an Inform-only unnamed-holder fallback incorrectly used for ZIL. Proposed compiler gates preserve confirmed native holder learning, Inform recovery and descriptor resolution. A third Inform-only takeable/light room veto rejects the real Bedroom and lets inventory prose select a gown as a room; gate that profile inference too. Focused native TAKE/WEAR/REMOVE route, compiler controls and independent audits1795/1841 pass.
- [x] October 8 WARNING footer: Claude owns StatTracker; Codex audits. Hide typing-to-close footer, retain X acknowledgement and once-per-install/probe-resume lifecycle (plan accepted bus1780); basic warning8/0 and resume/retry9/0 independently pass.
- [x] October 8 Treasures: Damage/Hit odds vanish with two swords (quest51, HP29/29, turns354). Claude investigates StatTracker; Codex adversarial review. Do not equate a synthetic two-sword pass with this state or silently present stale combat numbers as current. Actual supplied save(1) reproduces Quest76/HP35/Turns417: native PROWESS adds a parenthesized burden qualifier, rejected by both regexes. Actual save(2) unburdened passes. Bounded native burden-clause grammar implemented after1845 review; independent actual-save1 Damage5to15/82 and save2 Damage4to9/81 both complete, displayed descriptors intact. Source ACCEPT1857; unrelated parentheticals rejected.

- [ ] October 8-9 underlining (Treasures, Hitchhiker's) and Yourself breadth: D214, consensus #1925. Marks follow their words to the newest occurrence instead of expiring with each refresh (U1); latest replies are observed (U2, which also reveals the concealed Gravel Pit banners on EXAMINE POST); dictionary-equivalent matching for truncated and punctuated aliases (U3, Treasures flashlight/space-rag/robodroid); standalone "it"/"your" never trigger a mark (U4). Codex owns Actionable.js (U1-U4), and Claude audits.
  - U5 (wider editable Yourself lane) and U6 (no give/put where the dictionary lacks them) are implemented by Claude under exact claims: harness/d214-yourself-verbs.js 9/0, with Treasures, HHG, Wumpus and Glulx controls; equipment-ui 119/0; command-disambiguation 51/0. Codex's audit is pending.
  - Evidence items, not in this slice: the NPC-held TWO-HANDED SWORD (D206/D57 actor-inventory rule), the compiler-only alias castlevis, and DarkScope's history-based dark verdict.
- [x] October 8 Infocom room prediction: closed as an explanation by consensus (#1936/#1942); no runtime change. Inform games (Anchorhead) read NAMED direction properties directly, so every exit is known on arrival. ZIL has no property names, so D134 ExitCalibrator learns which property is which direction from real travel. A direction predicts once it has been proven from two DISTINCT source rooms; it then applies to every room, including unvisited destinations (Codex: north,north in Zork1 predicts the unvisited Clearing). It is persisted per executable (PM_ExitCalib_ + game identity). Early sparseness is that cold start. Decoding ZIL byte layouts stays rejected (D61 phantoms).
- [ ] Treasures NPC-held TWO-HANDED SWORD (an original report, a separate slice after D214). Object 124 is a real direct child of the Lizard Maiden (123), with aliases two-hand/sword, not concealed; native EXAMINE TWO-HANDED SWORD is accepted. A narrow visible-possession path needs a plan amending D57/D206: admitted only when the current turn prints a parser word of the exact direct child of an in-scope actor; no TAKE inference, no hidden descendants, no deeper recursion.

- **Spell search/empty.** Spell objects are read as containers from their ZIL bits, so they offer search and empty; that is noise, and it is still open because the same gate would also hide search on real ZIL containers. D160, "Still open."
- **D190.** A promoted object that the player takes still does not show up in the equipment sheet. D190, "Still open."
- **D192.** Full-reply hiding and inventory room-reset suppression (finding 5) are still deliberately untested, and the carry-equip live harness still asserts nothing. D192, "F6"; "Closing the D186-D197 arc."

## Status line and character tracker

- **D137.** On a phone, status-line fields share the same grid cells (Anchorhead's room name and "day one" overwrite each other), and that is left open rather than restyled. D137; D160, "D137, measured precisely rather than closed."
- **D149.** Sherlock's and Curses' unlabelled date and turn columns are read as text and are not modelled. D149, "Still open."
- **D149.** Hiding the game's own status row is designed as a later preference and is not built. D149, "Still open."
- **D175.** If a score announcement appears before the global is written, the pin misses it and the display runs ahead; an undo while the slot is still unpinned also leaves the score high until a later absolute. D175, "Recorded, not fixed."
- **D176.** For a story with no turn counter the replay guard falls back to the tick counter, and a carry row can keep a stale individual figure until the next inventory line. D176, "Recorded, not fixed."

## Catalog proof

- **d22-holistic-scope.** The broad live catalog walk is still 5 of 7. Phase 2 status; D201.
- **Wumpus/zblorb.** Those two fixture residuals in that same walk are still not done. The separate current Wumpus control is a different check and does pass. Phase 2 status; D201.

## Release

- [x] October 8 mobile degradation code repairs: read-aloud lag returns after playing, accompanied by substantial game slowdown, and reportedly clears only after restarting the phone. Codex and Claude perform independent blind diagnostics before comparing plans; bus1810. Investigate growing DOM scans, speech stop settlement, retained work and lifecycle handling. Known code defects repaired and independently accepted1841/1864: revision-cached current DOM reads, stable stat/condition rendering, model-owned alias badge lifecycle, and native cancelled-call settlement with durable source-checked build hook. Buffer18/0, render10/0 and native Java/JS focused checks pass.
- [ ] Physical-phone follow-up: verify sustained speech/game responsiveness on the operator device using the new APK; no connected phone was available, and these code fixes do not prove the full reboot-only symptom is resolved.
- **D99.** Product work for the ParchLock conversion is in, but the release is not signed off: story removal and inspection, the release keystore, splash-art provenance, name clearance, legal review, named real-device checks, and the `pm_vm_probe` wasm rename are still outside. Section 12, "ParchLock release program"; review residual in 12.x.
- **Phase 9.** Hardening and release is still marked open for performance, accessibility, and format fallbacks, with a full green harness as the gate. Phase 9.

## Map presentation

- **Phase 5 (D32).** Click-to-rewind is not built: clicking an already-visited room should issue the computed number of UNDO commands and land on that room. Phase 5.
- **Phase 6.** Map beautify is still open: cluster layout, crossings, floor tabs and phantom layers, docking the map when the story has its own graphics window, and collapsing panels on a very narrow viewport. The withdrawn overview/zoom is not part of this. Phase 6.

## Save and scope

- **Phase 8.** What remains after the restore/undo opcode work was superseded is still open: OffersLight and dark-room scope, Inform 7 / PunyInform / Inform 6 schema fingerprints, and the optional debug-file path. Phase 8; "Not done," which says the other Phase 8 leftovers stay open.

## Known ceiling

Not a task. Forty-three Inform modules have no attribute-name table and stay on the standard profile; AttrCalibrator is the only improvement path, and it already exists. D200.

## Operator issues 2026-10-07 (E1-E5), active: standard procedure

Blind dual investigation, then compare, propose, adversarial review to consensus, implement,
and adversarial audit until clean. The phone screenshots are the evidence.

**Current adversarial plan (Codex/Claude, bus #1683-1694):** independent findings are sealed in
`work/investigations/2026-10-07-codex-E1-E5.md` and the corresponding Claude report. Codex owns
E1/E2 (`EquipmentUI.js`, `ParchLock.js`); Claude owns E3/E4 (warning/install lifecycle and the
transcript/save owner). Runtime paths are claimed separately. E5 discovery precedes its edits.

- [x] E1: restore unique-reference ordinary Yourself interaction; keep stricter verified/opcode
  learning, object/arity/context guards, and short-drop behavior. Source candidate implemented;
  fresh Anchorhead custom-parser command check passes. Claude actual mobile gesture ACCEPT #1708.
- [x] E2: initialize the native interpreter save namespace from the authenticated immutable
  executable header (ZVM first30 bytes, Quixe first64), with same-story late-ready protection.
  Source candidate implemented; fresh Treasures imports the actual operator package without
  reload. Existing cross-story validation remains. Claude lifecycle audit ACCEPT #1708.
- [x] E3: first Equipment open per installation; persist acknowledgement and clear only upon
  uninstall/reinstall, never tutorial replay. Large WARNING and humorous bag/battle text;
  no probe executes behind the warning. Captured module/epoch and draft guard corrected;
  Codex reviewed source and basic live 6/0, ACCEPT #1713.
- [x] E4: append-only playthrough transcript including startup/clears; exclude quiet probe output.
  Associate successful saves/restores with that playthrough; preserve old package compatibility,
  import validation/rollback, and current synchronous callers or migrate them together. IndexedDB
  quota failures are explicit and never break gameplay; no silent history truncation. Claude implementation and Codex lifecycle corrections independently ACCEPTED #1736;
  focused lifecycle PASS and transcript 15/0.
- [x] E5a: actual executable fixture isolates the two-handed descriptor split into an invalid
  TWO SWORD command; distinct display labels incorrectly receive raw-name instance badges.
  General hyphen/encoding and displayed-label grouping implemented; distinct real USE commands
  and genuine duplicate badges pass. Claude #1712 functional PASS; second-module proof #1716,
  D206 structural player exclusion independently ACCEPTED #1736.
- [x] E5b: armed/unarmed PROWESS full-template recognition corrected by Claude; numeric parser
  preserved. Codex source review and targeted actual armed hidden-probe damage-confirmed check
  pass in codex-E5-live.cjs; no parser ambiguity for either sword USE form.
- [x] E5c: actual RAM remove/insert fixture updates the inventory without typed INVENTORY.
  Same-ID name/alias fingerprint and fresh structural read on Equipment open implemented.
  Actual Gina action after controlled room setup, hidden inventory full cloth label and
  transcript exclusion pass. Existing display pipeline preserved. Claude final acceptance #1736.

- [x] Options menu: scoped card layout, concise section headings, full expanded-submenu review,
  mobile dark/light presentation and unchanged preference handlers. Codex candidate implemented;
  seven expanded phone sections, toggle persistence and rate adjustment pass. Peer audit #1716.
  Operator removed legacy Map animation from Options and the hidden toolbar; no animation
  reintroduced. Linked Directions settings now has visible labels and matching presentation;
  existing Add/Edit handlers pass. Claude final acceptance #1736.

Unchecked means unresolved or awaiting independent acceptance; no APK or overall completion
is claimed by these candidate checks.

- **E1. Hold an item over Yourself is broken in all modules** (regression from recent changes).
  Long-press/drag an inventory item onto Yourself does nothing.
- **E2. Importing a save fails until the module is loaded, closed and loaded again.** The dialog
  says "Import Failed: Wait for the story identity before importing saves".
- **E3. Status-check warning: wording and frequency.**
  - Wording: a large explicit WARNING heading, then a humorous explanation. Opening the
    inventory is like rummaging through your bags: it can cost turns, and it is impolite to
    ignore enemies in battle, who get irate and attack while you're not looking.
  - Frequency: shown only on the first Equipment open after a module is installed, never again
    until the module is uninstalled and reinstalled. Today it appears on every module load.
- **E4. The transcript shows only one screen.** It must be attached to the current module's game
  instance and its saves: a running transcript per playthrough. Loading a save shows everything
  up to that point; curtailing at the save point is optional.
- **E5. Duplicate-kind items and in-place item changes (Treasures).**
  - (a) A two-handed sword and a gladius sword show as "instance 7"/"instance 6" of one
    another although their descriptors differ, so the radial cannot act on one of them.
  - (b) The damage indicator disappeared after the second sword was picked up.
  - (c) An in-place item change (USE RAG WITH GINA replaced the space-rag with a
    delicately-oiled cloth) does not refresh the Equipment list. Operator clarification: it
    did NOT update even when Equipment was opened (which runs the hidden inventory probe); only
    a typed, visible INVENTORY command updated it.

Final consensus 2026-10-07: Claude #1736 ACCEPTS E1-E5, D206 player exclusion and Options; Codex confirms #1737. Current slice closed; no APK rebuilt.

Non-blocking follow-ups:
- [ ] D201 harness: exclude animate candidates from its random TAKE fixture; an untakeable goblin can cause a false failure. Product identity checks passed 69/0 on three runs.
- [ ] Options cosmetics: Configure directions and Replay/Reset tutorial retain monospace typography.

## Export identification and filenames ? 2026-10-07

Implemented by Claude; Codex independently audited and accepted in bus1763 after repairs1752/1755/1757. Development build: the operator explicitly superseded backward-compatibility planning in bus1761; no migrations or old-format support work is required.

- [x] Shared Qol filename builder: readable story title, plain artifact kind, actual save/map label when present, local millisecond timestamp and app-managed same-session collision suffix. Known installed title collisions add a short digest.
- [x] Filesystem-safe Unicode labels preserve allowed punctuation, accents, emoji and internal spacing; bounded names preserve the full timestamp and extension. Actual saved labels 1 and 2 remain distinct.
- [x] Current/named map JSON, map text, transcript, whole save package, individual save package and Save Package As use the builder. Native Dialog raw-file links are renamed each click; Quetzal IFZS bytes distinguish Save file from Data file without scanning dialog prose or modifying lib/main.js.
- [x] Current native save keys, stored names, save/restore semantics and payload identity remain authoritative. Filename generation does not change game state or save contents. Successful named restore supplies the transcript export label; stale choices do not.
- [x] Basic validation: export-filenames18/0; targeted named-restore label/stale-choice proof; mock native filename/data pass-through and picker suggested-name/write/cancel. No catalogue sweep.

Final runtime consensus includes the Tools cosmetics from Claude1766; Codex verified both close glyphs/accessibility and real native Edit row/cancel. APK build61/versionCode34/cache138 is complete.

## Tools and submenus visual pass ? 2026-10-07

- [x] Codex implements a themed responsive Tools launcher and consistent Save files, Maps, Transcript, History, Commands, Display, Help, About/documents and Learned Words presentation. Existing Options/Modules/Equipment/Arrow controls retain their specialized behavior. Inspect each reachable submenu, including paste import/copy and expanded learned sections, at phone/desktop widths and both themes. Preserve IDs, action callbacks, scopes, hidden states, save naming work and native game commands. Minimal UI smoke checks and Claude independent audit; APK requested after consensus.

File split: Claude owns export naming in Qol/WorkspaceUI/Map/Transcript/SW until handoff; Codex initially owns ParchLock.css/ProductInfo plus docs. No shared-file edits before release.

Tools accepted by Claude bus1759 after independent codex-tools-check, export-filenames18/0 and transcript15/0. Root QA includes13 submenu screens320dark/1280light, Help8 expansions/Learned Words sections, Display adjustments, History draft reuse, actual named-map save and native SAVE/cancel. Screenshots in work/investigations/tools-*.png. Both cosmetic notes were fixed by Claude1766 and independently verified by Codex. Operator requested new APK after combined naming/Tools consensus.
- [x] Save / Restore window close button is a plain letter "x" (Tools uses ✕); align it with an aria-label of Close. Non-blocking (Tools audit 2026-10-07).
- [x] Native "Name this save file" dialog: the Edit button sits in the title row and crowds the heading. Non-blocking (Tools audit 2026-10-07).

Delivered development APK: C:/Users/hymlo/Downloads/ParchLock-dist/ParchLock-dev-build61.apk (also ParchLock-dev.apk), 84,221,371 bytes, SHA256 de5ac008231cf914777228bdf90e756c304b33c76c9f610a0b8b700989365fe4. Matching source: ParchLock-source-build61.zip (also ParchLock-source.zip), 23,527,912 bytes. Gradle assembleDebug SUCCESS, APK v2 signature verified, application com.parchlock.app code34; nine audited APK/source assets match checkout byte-for-byte. No physical-device claim.

## World Map (operator, 2026-10-07): planning, standard procedure

- [x] Full-screen "World map" view showing every discovered room, laid out once and extended as
  you explore. The existing compass map stays unchanged as the default. The 1 Oct overview (D202)
  failed because it combined the local view with zoom and auto-fill; this is a separate overlay
  instead. Amend D202 with that reason. Claude's sealed scope:
  work/investigations/2026-10-07-claude-world-map-scope.md (Codex: blind investigation first).

- [x] Independent code/document research and adversarial planning consensus (bus1878/1879).
- [x] Codex: stable pure layout and focused fixture; independent Claude ACCEPT1895 and focused fixture PASS.
- [x] Claude: separate view, controls, persistence integration and focused native UI proof; independently accepted1906 after serial corrections.
- [x] Mutual implementation consensus1908 and final canonical documentation closeout.

October 8 independent candidate checkpoint: real-layout Zork route at360/1280 gives36 PASS /2 FAIL (travelled-edge solidity after reload); isolated native pointer click also confirms broken room taps. Persistence, map export/import/removal, Travel and origin-sheet no-probe return pass. Findings1883/1885/1887-1890 and1893/1894 await Claude corrections; layout review1881 remains pending. No acceptance or overall completion is implied. Claude still owns integration paths; Codex preserves those claims.

Revised frozen candidate1895: Claude independently accepts layout; Codex confirms48/0 focused native UI checks using real layout. Remaining measured review1897/1898: unknown-target travel proof must not survive binding to a different destination, and horizontal bent arrows must end outside the target card. Claude owns both corrections; renderer/final consensus boxes remain open until independent acceptance.

Final source consensus1908 supersedes those historical candidate checkpoints. Codex corrected the two residual renderer cases under exact claims, strengthened existing assertions, and passed isolated actual-source boundary checks; Claude independently accepted the changes and ran final UI52/0 plus layout PASS. D202 and architecture66 record the implemented contract and proof limits. Map implementation loop is satisfied; no new APK was built, and APK62 remains the pre-map deliverable.


October8 cutoff: APK62 / Android versionCode35 / cache139: build succeeded; v2 signature verified;455 asset/source byte matches. ParchLock-build62.apk is84230463 bytes, SHA256479b5e438bc8fce678106c53168979f5f05d4de553d15ca956e24e1d031892d7. Source archive SHA2567809ac1c9fe3b1f33cf26757b681da33efc343ff62b7365af333b94491e22333 includes durable native TTS repair tools. Delivered before any new World Map implementation; consensus/freeze1841/1857/1864/1866, verification1869.

Post-map sampled-statistics review queue (bus1871; not regressions introduced by today's repairs):
- [ ] Make It Good: independent native SCORE reply is qualitative/no scoreboard; first Equipment fulfillment can end unavailable with no reason. Reconcile current behavior with old checklist proof before proposing changes.
- [ ] Planetfall: native labelled Time4491 currently presented as Turns; inspect existing D208 time-game rules before changing shared classification.
