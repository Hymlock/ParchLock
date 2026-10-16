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

- [x] October 8-9 underlining (Treasures, Hitchhiker's) and Yourself breadth: D214, consensus #1925. Marks follow their words to the newest occurrence instead of expiring with each refresh (U1); latest replies are observed (U2, which also reveals the concealed Gravel Pit banners on EXAMINE POST); dictionary-equivalent matching for truncated and punctuated aliases (U3, Treasures flashlight/space-rag/robodroid); standalone "it"/"your" never trigger a mark (U4). Codex owns Actionable.js (U1-U4), and Claude audits.
  - U5/U6 independently accepted by Codex1955 (native9 plus actual-source literal negatives4); throwing dictionary reads fail closed. Checkpoint a40f7ba.
  - Separate evidence-only residuals remain: compiler-only castlevis and DarkScope history-based verdict. NPC possession is implemented below.
- [x] October 8 Infocom room prediction: reopened from explanation to implementation by operator; D214 Z1 now decodes actual parser-linked directions/current exit forms and presents predicted rooms before travel. Decoded edges remain hint-only until actual travel; existing D134 fallback is preserved. Native17, WorldMap52 and prior guards pass; delivered APK63.
- [x] Treasures NPC-held TWO-HANDED SWORD: trusted direct actor possession overlay implemented in Actionable, independently accepted1966. Requires distinguishing observed native vocabulary, current direct containment and hidden-state exclusions; only uniquely qualified enabled Examine. Generic hyphen/base-word proofs28/15 preserve ambiguous per-object choices.

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

- **d22-holistic-scope.** Repaired real startup/unnamed/structural-empty oracle: 7/7. See D214 final self-audit.
- **Wumpus/zblorb.** Historical fixture residuals resolved by D214 E2; native controls and revised sweep pass.

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


- [x] D214 Z1: parser-linked ZIL room prediction, hint-only route authority and dotted WorldMap edges; native17, WorldMap52, prior guards green. Solo final self-audit authorized1978; report work/investigations/2026-10-08-codex-final-self-audit.md.
- [x] D214 E1/E2/E3 fixture failures: unique inanimate observed Take pick, real startup/scope oracle, genuine Inform synthetic stamp. Native d20169, scope7/7, nested60.
- [x] APK63 packaging and signature/asset verification after checkpoint.

APK63 complete: source checkpoint0e9a9faffaee3632a6f7c8b74fc294bf5cadb571; Android versionCode36/versionName2.0.0, cache140. Gradle assembleDebug succeeded17s; v2 signature verified;457 bundled asset/source byte matches. ParchLock-build63.apk 84252953 bytes, SHA256 B58A519EE590CD40D2DE55235B660F2BAFF028628AC97956DF16D82F263F2FB8. Corresponding source archive SHA256 F3A9256268CA28409B4CB45168015EB3C4AB5468743866DD42A7375CB3BF1409. APK62 preserved in Downloads/ParchLock-APK-archive. Physical Android validation remains operator-owned; no overall goal completion recorded.

- [x] HHG follow-up: noun-safe marks, nested held names, fixed-ZIL Take capability, radial latency, full inventory labels and offstage-root poisoning; peer1998/2000/2003 accepted; native22/root13; source only, shell141.

- [x] Full-app beautification sweep (preserve prior successful sweeps): Equipment surface1 accepted2051; centered grip unchanged. Bottom-exit clearance accepted2068; map presentation accepted2080; start-screen overhaul accepted2086; Directions close and desktop Menu spacing accepted2102. Remaining surfaces and About/document views inspected at phone/desktop widths without further changes (bus2107). Operator chose G3 fade-in-place; implementation accepted2138 after interrupted-touch repair, focused45/0 and independent WorldMap52/0. Handles, node geometry and route authority retained.
- [x] Death-signal loop: independent implementation audit accepted2169, with complete outcome phrases, fresh engine-output guard for native restore-like commands and positively identified authored pauses. Focused35/0, render10/0 and supplied HHG live death1; ordinary output bypasses the engine capture. Peer added tap guards35/0. See `work/investigations/2026-10-09-codex-death-implementation-audit.md`.
- [x] Icon selection: operator approved all four storybook variants (bus2125 and direct approval), with no further design examples.
- [x] Approved icon packing and independent audit: checkpoint13b101f,166 focused checks, peer ACCEPT2168. Same four approved designs; Android adaptive foregrounds stay inside the circular safe area; web and desktop formats supplied.
- [x] Native shortcut rotation implementation audit, then new APK containing all accepted current fixes. Codex is the sole builder (operator relay2089). Safe Android default uses a pinned shortcut updated in place; experimental base-icon rotation is off by default and requires a warning confirmation (operator authorization2156/2158). R3 consensus follows2167. PC uses a consented owned desktop shortcut. Physical launcher behavior remains operator-device verification.

## Queued after the current goals and APK (operator, 2026-10-09)

- [x] Begin a separate comprehensive in-code and out-of-code text/document sweep for accuracy, current information, thoroughness, permissions and attribution. Cover app interfaces, help, documentation, exported text and authored game text. Check ownership and permissions before proposing changes to third-party story text; preserve original authors' credits and licensed notices.
- [x] Add brief, accurate credits to Hymlock Groves and the AI systems actually used, including generated picture artwork, wherever relevant. Verify contribution and image provenance rather than inventing credits.
- [x] Coordinate the sweep with Claude through blind investigation, proposal review and implementation audit; keep planning and architectural records current. This work starts after the current fixes and APK, not during their completion.


APK64 verified: checkpoint85c8fee88f179b1d61510a9f9abbea20e5e775ea; BUILD64/versionCode37/versionName2.0.0/cache149. Native rotation a1e5035 independently accepted2181 after final Java compile, six real desktop shortcut checks and native-warning browser verification. Gradle assembleDebug succeeded7s; v2 signature verified;494 bundled source-byte matches and350 source-archive byte matches. Artifact C:/Users/hymlo/Downloads/ParchLock-dist/ParchLock-build64.apk:87770763 bytes, SHA256515a78786841be53ce02e3722c7a27e7309fdb8a48a93d34b672bbbf2afb460b. Source archive SHA256caf7c0fd67eba341bd20d495ac88ae401e578d4556ec920f99583cd473462805. Prior APK63 and generated directories preserved in the operator-named archive. Experimental base-icon rotation remains off by default; physical launcher checks belong to the operator after delivery. Independent final package confirmation requested from Claude2185. No operator overall completion recorded. The separate adversarial text/credits/permissions review is next.


Post-APK continuation: Claude independently confirmed APK64 in2186 and canonical closeout53ea9c8. Cleanup R2 implementation27d60e7 independently accepted2194: exact191 removals,14 cited retained probes,15 ignore controls, player data preserved and no runtime changes; focused death35/0. Both post-APK text investigations are sealed and compared (Codex8d18947/7cbbb77, Claude2195). Text proposal R1 split2196 plus dependency-notice2197/cache2198 amendments awaits peer adversarial verdict; no product text changed. APK64 remains the accepted pre-text deliverable. Unknown splash provenance and public-release rights remain recorded, not assumed. My background watcher was stopped after authenticated bus500 EMFILE; active-turn reads restored communication, shared harness untouched.


## Post-APK text and save-state loop closeout (2026-10-09)

Text implementation accepted2210/2211: owned app prose/documents/exports and attribution reviewed; census108 owned text/source files and636 candidate text sites. Third-party story bytes and original notices preserved; no claim that every dynamic story phrase was manually read or that development-catalogue inclusion grants shipping rights.

- [ ] Operator release decisions: confirm generated-art release rights and ParchLock name clearance (recorded, not inferred).
- [x] Individual native saves retain their own map and observed display labels; imported snapshots validate exact executable digest and participate in rollback. Missing snapshots give clean state.
- [x] Fresh new games reset the working map after recoverable flagged Maps archival; genuine engine autorestore retains the current state. Save A/B native Zork restores match their own maps.
- [x] Zork boot retains current actionable links without a diagnostic LOOK; actual VM hooks own successful restore/restart, with coalesced fallback for other engines.
- [x] Treasures restores all six observed full carried names from a newly created native save without another INVENTORY turn. Current descriptors and command ownership remain authoritative.
- [x] Witnessed Treasure custom death counts once and displays a nonblocking notice; isolated phrase, quote, replay and app-probe exclusions retained.

Commits8291b5f/a8364a7/36d64f6; mutual audit2235/2236. Focused SaveState34/0, native transcript15/0, command-disambiguation51/0, death40/0, label ownership and restore ordering PASS. Native Treasure save/restore and actual cliff death PASS; phone notice geometry/screenshot checked. Source shell151; APK64 is still the previously delivered shell149 binary. No new APK or operator overall completion recorded.

## Mapping research: all 309 modules (operator 2026-10-10, research and planning only)

Goal: narrow down the mapping problems (and status/inventory issues found on the way) and resolve them for every type of game, with per-module fixes allowed where no general rule exists.
- **Live catalog sweep (codex owns):** [work/mapping-research/COVERAGE.md](work/mapping-research/COVERAGE.md) and the failure classes in [work/mapping-research/OPEN_FINDINGS.md](work/mapping-research/OPEN_FINDINGS.md).
- **Independent verification and planned fixes (claude owns):** [work/investigations/2026-10-10-claude-mapping-audit.md](work/investigations/2026-10-10-claude-mapping-audit.md); prepared patches in `work/investigations/patches/`.
- **Class status** (research plus scoped implementations, D216; codex owns live routes, claude owns verification, plans and the implementations):
  - **M01 (+M03), Inform direction properties from the game's own compass:** IMPLEMENTED/AUDITED (D217, 080e51a..0dc04cb; Codex #2558): library-compass lane for Curses/Night/Moonglow/Cat's Eye/theatre/the 12-child v5 family. Unresolved (fail closed): Inevita (needs separate command/geometry fields), Gostak (invented words: learn from walks). Deja Vu needs NO fix: it is not detected as Inform, so lookAheadExits shows no predicted exits there and its map uses walked edges with the typed command (verified 2026-10-10; relaxing the lane gate changed only Deja Vu and had no visible effect, so it was not committed). Originally confirmed: Codex census: 17 Inform titles with a compass but a null runtime profile; separate claude probes add Curses, Godot, b2demo, Building and Gostak. Structural rule (shared door_dir, distinct values, holder named "compass"); geometry only from standard words, otherwise a neutral slot.
  - **M02:** a real walk must overwrite a contradicted decoded exit. Part 1 RESOLVED by D217: on the Moonglow route S,S,N,N Barn House now shows n -> Edge of Field (state-delta, walked) with no false edge. Part 2 (general walk-beats-lookahead rule) has no current reproduction; no code change without one. Grok queue item 2 is looking for one.
  - **M04:** I7 exits. PART A DONE (D218: I7 bookkeeping properties are never exits). PART B DONE for two measured titles (D223, a160b04 + feb624b + 809e02e; Codex #2804): Warbler and Facility show real Map_Storage exits before travel, validated every generation, never overriding walked or other-source edges. Other I7 titles are unchanged; extending needs per-title measured facts. The road direction is unlabelled.
  - **M05:** internal-named Inform rooms on the player's chain. IMPLEMENTED/AUDITED (eae9dd2, D216; Codex #2503), scoped: census of mixed versions at boot plus LOOK only. Actor qualification (M05b/M05c) and M07 remain open.
  - **M05b:** Facility PLAYER now from a measured digest fact (c06d56d: playerGlobal G44 = PC object 46), which replaces reliance on the "yourself" name rule there; shipped in Build 72. Earlier record: IMPLEMENTED BUT UNACCEPTED (D220, a03b6c0): the unique story-named "yourself" object is taken as the player; Facility maps Lobby/Visitor Gallery. Actor provenance is not accepted (Codex #2825): "yourself" printing is a library special case; Codex research (globals 44/50) is ongoing. Residual: player-switching games untested; the moved-object rule is not implemented.
  - **M05c:** v3 location = global0 (spec 8.2). Caution: global0 is the STATUS/display object, not proof of the semantic room (intro titles, furniture). Boot census 27/27 global0 = status room; the payload is wrong in 9 at boot, plus gameplay mismatches. Identity separate from presentation.
  - **M06:** command-labelled dotted edges (planned).
  - **M07:** CLOSED AS KNOWN LIMITATION for the map round (operator 2026-10-10: finish maps tonight). No behaviour change. Room identity is correct (391); the "No. 15 / No. 17" substate is title-specific and would need its own title-qualified overlay proposal. Earlier record: virtual addresses (Make It Good). RESEARCHED (grok #2765, Codex #2762): room identity stays 391. "Outside No. 15 / No. 17" is a title-qualified navigation substate held in the room's `number` property (7 vs 8): east/west toggle it, WAIT/LOOK leave it unchanged, west reverses it, and NORTH is allowed only at 7 (Front Porch 424). lookAheadExits lists north at both, so it is incomplete without the substate. A same-id non-virtual control exists (vehicle position: in the chevy, parent 397). No generic number rule; a future title-qualified overlay would need its own proposal. Evidence: work/investigations/grok-queue/m07-*.json.
  - **M08:** furniture minted as a room. IMPLEMENTED BUT UNACCEPTED, PARKED (D222, b51ce91; Codex #2825): a broad heuristic, tested on seeds only; the climb census (work/investigations/2026-10-10-claude-d222-climb-census.txt) is the open proof. in Inform builds, furniture or a vehicle inside a top-level room climbs to the room (bedlam, break-in, Photograph, punkpnts, SoFar, vindaloo, Inevita). 
  - **NEXT STEPS (claude, 2026-10-10 ~13:40, near session limit):**
    - (historical) M08: bedlam (bed 23 in Your Bedroom 22) and break-in (chair 34 in room 33) become map rooms because their attribute tables misdecode (bed reads edible/scenery/supporter, not enterable). Planned rule: in enclosingRoom for Inform builds, a location object whose parent is a top-level location object is not the room; climb to the top-level one. Needs a 309-game before/after census (work/investigations/2026-10-10-claude-boot-map-census-baseline.txt is the boot+LOOK baseline).
    - D222 (do not admit a fallback room while the resolved player is unparented: Vespers boot menu "Vespers: Hints and Info") was TRIED and NOT committed. The census did not show Vespers changing at boot+LOOK, and showed title-like rooms appearing in bunny and Tokyo2 (cause unproven: D222 or timing noise). Vespers' MENU/HELP command also mints the menu room (grok #2641), which D222 would not cover.
    - Review status: D221 scoped-accepted (#2702); D219, D220, D222 unaccepted.
  - **M09:** boot/intro rooms. OPERATOR DECISION 2026-10-10: every room after the first shows and saves as today (no gating; late rooms are jarring). Only the FIRST/boot location needs proof of a real player move, and only in games with no other deterministic source. IMPLEMENTED (df1d172 + 1d494a6, Build 72): the first-room gate applies to Inform only (ZIL keeps pre-M09 admission after the HHG Bedroom regression); m09-first-room 5/0; Curses/Ghost/Vespers boot rooms dropped as intended.
  - **M10:** CLOSED AS KNOWN LIMITATION for the map round (2026-10-10). No behaviour change, because the causality rule remains unproven and no false edge is shown. Earlier record: timed travel recorded as a typed direction. Observed Spirit direct-I6 contrast (compass read + room property = destination + player move, in the actual traced pc/routine sequence); the candidate causality rule remains provisional. The pattern alone is not sufficient causal proof even for one event (an incidental compass read can coincide with a timed insertion), and it is not a general exit decoder.
  - **M11:** stuck "dark (heuristic)". SCOPED-ACCEPTED (D221, e7a3ea9 + 3739c2c; Codex #2702): one verdict per tick on the finalized payload; only a full-line current-room heading (or a chain-proven positional suffix) clears. HHG in bed after TURN ON LIGHT: df1d172 tried a depth-1 clear; 804af63 removed the reply-prose part (fail closed). The in-bed case stays a DOCUMENTED LIMIT (Build 72); m11-dark-scope 14/0.
  - **M12:** a date status adopted as a room name. IMPLEMENTED (D219, a513ca5): blank-named rooms take the story's own short_name (direct packed string or [header, packed] block) before any status column. Adversarial census and the real Codex review are pending. OPEN DEFECT (Codex #2821, Grok #2822): storyShortName is NOT fail-closed today; zs() checks only himem and the terminator, so a Routine/veneer or mis-scaled value can surface as a garbage room name; the fix must qualify representation by type/provenance (no word list). The saved date-name repair (b3fc5bc) was REMOVED (fdc139a); it is not active.
  - **Wumpus dark room / multi-section rooms (operator 2026-10-10):** ACCEPTED (D224; c53337d, 185c8b3, 7b73932; Codex #3175).
    - The room is the measured real_location section; the dark-admitted name upgrades once when lit.
    - Exit 3 and objects follow the correct section.
    - Remaining:
      - the full regression-gate closeout;
      - the section map display grouped under a "Room #N" frame (operator request);
      - DONE: the census for other games with the same structure. Of 298 non-Glulx titles, only wump2ka has a compiled room index (121); a few titles have stray numbered object names (enter 10, kirby 7) but no index. No other title needs the fact (work/investigations/2026-10-10-section-feature-census.txt).
  - **M13:** stale "(on the X)" qualifier. IMPLEMENTED/AUDITED (b44d47c, D216; Codex #2495), scoped: prevents FUTURE freezes on Inform when X is on the player's chain; does not repair saved labels. The 19 display differences are candidates only.
  - **Degeneracy:** no map (wrong player). IMPLEMENTED/AUDITED via a measured playerGlobal 18 fact (0126b14, D216; Codex #2507). No generic actor change.
  - **NEXT ROUND (operator 2026-10-10): full items audit of all 309 games**, after maps, directions and room detection are finished: Equipment vs native INVENTORY, leaked probe text, internal/odd item names; root-cause fixes only. Until then, item issues seen in passing are recorded here.
  - **Item issues seen so far:** Degeneracy Equipment empty -> FIXED by the D216 player fact (five items match native INVENTORY); Facility player now resolved (D220), Equipment to recheck in the items round; Ghost Train refusal-reply leak; Make It Good inventory not yet re-checked after M05.
  - **OPERATOR ORDER (2026-10-10 evening, all three seats):** finish room detection / map display first, then a full items/inventory round including multi-descriptor base-item manipulation/display. Split is in claude #2657/#2658; claude keeps the documents.
  - **Item 2 and inventory:** Ghost Train refusal-reply leak; Facility Equipment empty (from M05b).

## Operator APK 64 issue list (2026-10-09, Wumpus and others): one at a time, standard procedure

Screenshots: `work/investigations/operator-2026-10-09b/`. The list was taken on APK 64; recheck each item against current source before fixing.

- [x] **1. The app closes when it loses focus (Android).** Fixed in source (D215 issue 1; consensus codex #2257, audit ACCEPT #2264). No icon work runs when the app is merely left. The pinned icon rotates at app start. The home-screen question is native and comes first on first launch. Add replaces ParchLock's own existing pin. The experimental launcher icon stays off and in Options, and switches only on a Back exit. On PC, rotation happens at start and Yes takes over an existing Desktop shortcut to this exe.
  - **Operator test on the next APK:** no closing on minimize or lock; the question appears first on a fresh install; the icon changes at each open.
- [ ] **2. Status and inventory probe output is visible in the story, in multiple modules at multiple times (operator: every status request must be headless and invisible)** ("You are carrying 13 lbs of stuff…" printed twice). Equipment's first status check is not headless.
  - **Partly fixed (4d6d0c0):** only the inventory load-summary grammar ("You are carrying N lbs ... It's all worth ...") is now hidden. **Still open:** the operator's "first status check not headless ... many not some!" (screenshot `operator-2026-10-09b/item2-many-not-some.jpg`) means MANY modules leak on the first status check. It is not solved by per-grammar recognisers; it needs a general deterministic fix (see the R1-R7 proposal file for the rejected routes).
- [x] **3. Commands take up to 6 seconds**, even after a phone restart. Possibly linked to item 2 (background probes queued behind commands).
- [ ] **4. Duplicate items lose their names** ("nutritiou" twice, with instance badges, instead of "food pellet"). The plural prose "two food pellets" cannot be mapped to each instance, so the name falls back to the 9-character dictionary word. A regression.
  - **Fix committed (claude; codex audit pending, #2334):**
    - reproduced on wump2ka: the pellets named "food pellet(s)" reverted to "nutritiou" after UNDO, because resync cleared the remembered text and labels;
    - a name confirmed by the game's own text is now kept in the existing display-only label store, revalidated against the object's live parser words;
    - UNDO keeps it; restart clears it; a save restore stays owned by SaveState.
    This changes the ch75 resync sequence for undo, to be recorded after the audit. Items 4 and 10 are one failure, so recheck both on the next APK.
- [x] **5. Story text is visible below the bottom protected border**, left of the input. The input position moves (x 97 on one screen, 170 on another), and the protector starts at the input.
  - **Fix candidate (claude, uncommitted, awaiting codex audit):** root cause is DarkScope's `filter: brightness(0.92)` on `#windowport`, which made the panel the containing block for its fixed children (the input, its buttons, the bottom protector), rebasing them by the panel offset: the input sat at x=70 instead of 40 and shifted between rooms, and the band started 30 px in, leaving a text gap. This is the same trap ARCHITECTURE ch. 55 records for the top protector. Fix: dim with `opacity: 0.92`, and the band reaches the top of the direction handle (112 px plus insets).
  - **Operator follow-up (separate, not yet done; screenshot `operator-2026-10-09b/item5-bottom-exit-placement.png`):** from the bottom up:
    1. the bottom exit banner at the screen's bottom edge (above the gesture bar) with its own protective spacing, mirroring the other edge banners;
    2. the input row (field, send, mic);
    3. the direction handle;
    4. the story text, which ends at the handle's top.
    When a room has bottom exits, the input, buttons, handle and protector shift up by the measured banner height (`--pl-bottom-band-h`); rooms without bottom exits are unchanged. Today the banner sits above the handle, inside the reading area.
  - **Implemented (claude, operator-directed; codex audit pending, codex was unavailable):**
    - dark rooms dim with opacity instead of a filter, so the input, buttons and protector are no longer rebased;
    - left, right and bottom borders are a fixed 26 px each, and only the top band is dynamic (operator);
    - the bottom exits sit at the screen edge under the input, on one line with an ellipsis;
    - the input row mirrors its left inset on the right;
    - the protector reaches the top of the handle.
    Screenshots: `operator-2026-10-09b/item5-after-zork.png` and `item5-after-rails.png`. exits-safe-area is 46/0 and layout-regression passes; the d96 timeout and the d105 "Arrow keys" failure were pre-existing.
  - **"Punctured boat" (found while testing): FIXED.** At Zork I West of House the east rail read "punctured boat".
    - **Cause 1, `ExitCalibrator.destFor`:** it decoded a calibrated direction property's first byte whatever the property's size, so v3's 2-byte message exit (the boarded door's text address) became room 142. Calibrations now record the property sizes they were proven on, and decode only those (fallback: b0 = 1 byte, w0 = 2 bytes).
    - **Cause 2, `Map.js` reverse display:** it drew "e North of House" from North of House's west exit. It now skips a guess that the room's own decoded exits contradict.
    - **Guards:** exit-calibrator 26/0, d214-zil-exits 17/0, d23-lookahead-labels 88/0, d46 27/0; the world-map-ui 46/6 failures were pre-existing (same on baseline).
    - **"Assume return paths" (operator decision 2026-10-09): made automatic and the option removed.**
      - Assumed returns are no longer written as real exits (`Map.js EnteredRoom`, `TranslatorUI` state-delta-reverse).
      - The map shows them dotted, via the guarded reverse display, only where the room's decoded exits do not contradict them, and never travels them until they are walked.
      - The Options "Mapping" section, the legacy `#toggle-map-2way` button, `ToggleMap2Way` and the `AssumeTwoWayConnections` pref are removed.
- [x] **6. Underlining is inconsistent and its order looks wrong:** "Exit 1" and "Exit 3" are underlined, "Exit 2" and "Exit 4" are not, and "exit 4" is unmarked everywhere. Part is the newest-occurrence rule (D214 U1), part is unexplained.
  - **Operator rule (2026-10-09), this is the spec:** within ONE reply (the output of one command), an item is underlined only at its FIRST mention; later mentions in the same reply are ignored. Only a NEW reply that mentions the item again moves the underline forward, to the first mention in that new reply. Current bug: the newest-occurrence rule (D214 U1) moves the underline forward inside the same reply, so it jumps within one paragraph.
- [x] **7. "light" is underlined although it is not an item** (fungus description). FIXED.
  - "light" was a secondary dictionary word of both the fog (354: "light fog") and the Glow Bar (284), and the main noun of neither. The shared-word rule underlined it in "the cave's main source of light", and tapping it opened the which-object chooser.
  - Now a single word shared by several objects is underlined only when it is the main noun of at least one of them (as "pellets" and "door" are).
  - Guards: underline-first-per-reply 8/0, command-disambiguation 51/0, d214-yourself-verbs 10/0, d201 22/0 and 24/0, hhg-links-live 22/0.
- [x] **8. The World Map room bar truncates long names** ("A fair-sized, polished, watery ca"). FIXED.
  - **Correction (operator screenshot `item8-panel-truncated.jpg`):** the truncation was in the World Map's selected-room panel, and the cause is the stored NAME itself. Wumpus room names come from the fixed-width status grid (about 31 columns on a phone, D170), which cuts long names ("...watery ca").
  - **Fix:** when the room heading the game prints in the story starts with the stored name and is longer, the room takes the printed full name (the game's own text; no letters guessed, so D170's concern is met). Verified: "A vast, polished, watery dead" became "A vast, polished, watery dead-end" on the next LOOK. Guards: d46 27/0, d23 88/0, exit-calibrator 26/0, underline-first-per-reply 8/0.
  - **Also done (secondary):** the top exit band's labels and pills wrap to two lines.
  - Operator choice: wrap to two lines, then end with an ellipsis (no auto-scroll or drag).
  - Top-band room names keep their 40vw cap but use two lines, and numbered-exit pills wrap to two lines.
  - Screenshot: `operator-2026-10-09b/item8-after-top.png`. Guards: exits-safe-area 46/0, layout-regression PASS; world-map-ui 46/6 pre-existing.
- [x] **9. (Withdrawn: misread.)** "Many not some!" meant that many modules have the item-2 leak, not a wording change. Merged into item 2.
- [ ] **10. Item names after loading:** fixed in source by save-tied labels (8291b5f and a8364a7, not in APK 64). Recheck on the next APK; any remainder is item 4.

- [x] **(New, 2026-10-09) Text flying past the input when opening Inventory (Treasures, phone).**
  - **Investigated on the operator's phone:** live WebView recorder plus `adb screenrecord`.
  - **Not the status checks:** their lines were hidden from insertion on the device.
  - **Cause:** the Map sheet's 0.28 s slide-out played when Equipment replaced it, and the map's rooms, controls and game info streamed through the strip below the Equipment sheet.
  - **Fix:** `EquipmentUI.Show` closes a replaced Map instantly (`pl-sheet-swap`); a normal Map close keeps its slide. Extending the sheet behind the input was tried and rejected (operator: the input row must stay usable in Inventory; the input lives in #windowport's own stacking layer).
  - **Verified live on the phone:** frames before and after are `operator-2026-10-09b/inv-flash-*-phone.png`.

Order agreed with the operator: 1, then 2 and 3, then 4 to 7, then 8 and 9.

### ZIL semantic-flag ownership (2e1455e scoped closure; Codex #3442, carried by grok2 2026-10-11)
ActionSynth keeps a semantic flag (container, open, supporter, worn, ...) only when (a) it was learned by existing AttrCalibrator calibration, OR (b) the flag is owned by a bounded digest/stable-header authenticated attributeMap fact (ModuleStatFactsClaude) AND the story decodes as a confirmed, validated ZIL family (GrammarProvider.decodeD198) AND AttributeSchema.bitFor(flag) equals the mapped bit (AttributeSchema.measuredFlagOwner). False or unmapped flags never trigger a decode; Inform stories and stories with no Z-memory are unchanged. No status-lane changes. Evidence: Codex audit #3439 (8/0) and the grok2 18-title + Glulx gate. Still open: actor/NPC gaps; batch-2 container facts that are X-only (controlled insertion) evidence.
ZIL facts after 2e1455e are added per title from native evidence (original-scene explorer, Jericho walkthrough runs, player-root check) with >=2 distinct on-device positives + >=1 negative, or the operator single-object + source rule; each carries a "Codex post-hoc review pending" label until Codex reviews it.


## ZIL constant-actor player root: playerObject (2026-10-11, grok2; Codex AUDIT PASS #3504)

Digest fact key `playerObject` (ModuleStatFactsClaude, same executableLayoutFacts registry) names a compile-time constant actor object for ZIL titles that have NO PLAYER global and whose WINNER global is mutable (orders to NPCs, chapter actors). `ZRamReader.resolvePlayer` checks it before `playerGlobal`; the object must be in range with valid parent/sibling/child links and a non-zero parent, else the result is `fact-uninitialized` (id 0, fail closed). It never reads WINNER. Malformed or absent fact: no change to the existing measured-player-global or name-based paths. Current users: Leather Goddesses (200, pinned historicalsource/leathergoddesses 17cbbc1 globals.zil 908; 19 binary stores G189<-200 = 19 source SETG WINNER ,PROTAGONIST), Spellbreaker (52, pinned historicalsource/spellbreaker 6f83ba4 globals.zil 324). Not for focus-switching titles (Suspended: per-robot focus, Codex #3505). Known follow-up: LGOP dynamic item names (payload rules/bikini vs native rulebook/brass loincloth, same object 134 transformed) - descriptors cell stays open.


## ZIL v4/v5 room: locationGlobal (2026-10-12, grok2, 5348c0f; Codex post-hoc audit pending)

Digest fact key `locationGlobal` (ModuleStatFactsClaude, executableLayoutFacts registry) names the slot of the game's source HERE global for v4/v5 ZIL, where no interpreter status-line global exists. `ZRamReader.enclosingRoom` uses it in the same status-room branch as v3 G0: the story must be a validated confirmed-zil-family (D198), not Inform-compiled, the slot must be in globals bounds, and the value must be a location object on the player's cycle-free, untruncated parent chain; otherwise the existing chain walk runs unchanged. v3 keeps G0 and the infocom-pre-v6-fixed family check; v4/v5 without the fact take the old path. Needed whenever a fixed player object starts inside furniture (Hitchhiker's: player 202 starts in bed 114). Users: Hitchhiker's locationGlobal 116 (source HERE, globals.zil 10; 125 compares in code; 60-step live replay, zil-here-global.js).
