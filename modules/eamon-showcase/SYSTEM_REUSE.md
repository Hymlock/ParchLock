# Existing-system reuse register — implementation precondition

Source-read baseline: local ParchLock `32890320`, plus the reviewed G1 candidates. This register records
integration obligations, not implemented features or acceptance. Runtime adoption and final import remain
open. Preserve the accepted master plan and operator decisions; no separate inventory, speech settings,
learning database or module library is authorized by the host experiment.

| Area | Existing authority | Required Eamon adaptation / verification |
| --- | --- | --- |
| Import/library | `js/ModuleLibrary.js`; `IMPORT_CONTRACT.md` | Extend its existing picker and atomic install path for one authenticated campaign package. One library row, Main Hall entry. Internal loader placeholder is never story identity. Test duplicate, malformed, tampered, quota failure, removal and Android picker. |
| Story display/input | `lib/main.js`, `js/Input.js`, `js/CharKeys.js` | App-owned Glk-compatible host is a G1 candidate. Reuse line/character input and mobile proxy. Do not patch minified vendor code or ship the standalone test page as a second application. |
| World facts | `js/WorldModel.js` provider registry and structural merge | Add an engine-neutral Eamon provider after baseline/source contracts are reviewed. Preserve source/provenance and stable room/object identity across adventures. Do not pass invented Z-machine memory to existing readers. |
| Equipment | `js/EquipmentUI.js`, world ownership payload | Yourself remains the base owner. Held/readied/worn groups, if added, are display groups under Yourself. Only real game artifacts are containers. Commands remain authoritative; verify room/custody/parity and container nesting against engine state. |
| Actions/learning | `js/SemanticActions.js`, `js/LearnedWords.js`, `js/LearningStores.js`, radial consumers | Reuse learned word/action priority and tracking/erase controls. Resolve package/adventure/object ownership explicitly; learned data persists without a game save. Engine-derived capabilities and transient state remain distinct. |
| Stats | `js/StatTracker.js`, world/status payload | Feed native Eamon character/combat facts with explicit provenance. Preserve absence versus unknown; do not fabricate Z-machine globals or overwrite user's learned display settings. |
| Maps/notes | `js/Map.js`, `js/WorldMap.js`, `js/WorldMapLayout.js` | One adventure map identity, existing note editor and `AddNoteToRoom`. Actual visited history stays separate from described/discovered room information. Main Hall is not given invented room travel. |
| Fast travel | `js/Navigator.js` (`StepQueue`, `Awaiting`, `ClearQueue`, speech hold) | Ordinary commands only. Encounter clears later queued moves in that room; release speech hold before encounter narration is consumed. No separate shortcut simulator or RNG replay. |
| Narration | `js/ReadAloud.js`, existing settings and microphone arbitration | Reuse append/dedup and repeat preference, speech generation cancellation and navigation hold. One delivery route for each event; no extra speech engine or second spam filter. Actual Android speech errors remain to investigate. |
| Saves/transcript | `js/SaveState.js`, `js/Transcript.js`, `js/UndoRestoreSync.js` | Bind native save events to existing transcript/map/display sidecars, package/adventure identity and playthrough history. The G1 file snapshot alone does not satisfy this contract. |
| Persistent knowledge erase | `js/LearningStores.js`, Options learned-word controls | Respect owner index, tombstones, locks and erase epochs. Uninstalling a module and intentionally deleting campaign progress are distinct operations. No generic clear-all as an import/remove shortcut. |
| Offline / APK | `service-worker.js`, `make-dist.bat`, `build-android.bat`, Capacitor | Extend existing staging/cache intentionally after runtime/package review. Test final signed APK, real Modules import, airplane mode, quit/force-stop/restart. The current lib copy allowlist omits `.dat`; any needed ICU/runtime data must have an explicit packaging route. Baked-in debug overlay is not final import proof. |

## Registered learning paths checked in current source

Seven `LearningStores.register` registrations were found: `attrCalib`, `exitCalib`, `dirRadial`,
`learnedWords`, `stats`, `semanticActions`, `diagonalCalib`. This is a source registration inventory,
not a claim that all learning behavior has been tested. Audit callers/fallback persistence as part of
the learning contract. The byte-layout calibrators are Z-machine-specific; they must not run on fake
Eamon RAM. For Eamon, native facts replace those measurements while shared words, actions, preferences
and ownership/erase behavior still need adaptation. Record applicability per path before feature code.

## Still required

Per-adventure behavior/entry/outcome/rights contracts, tier-route evidence, exact provider payload and
object identity, all lifecycle semantics, independent current-source review and real-target acceptance.
No row above implies those checks passed. Runtime-size reduction is optional under the operator's
November 11 decision; retain the untrimmed baseline until any optimized candidate is separately accepted.

## Detailed entries: actions, commands, history, transcript, saves, stats, identity, prompts

Source-read by Claude on 2026-11-11 against ParchLock `3247c69d`. Each entry: existing owner and the exact
input it reads -> what Eamon lacks today -> the minimal adapter (data into the existing input, never a
second mechanism) -> status. "Built" means committed and desktop-tested only, not reviewed.

Operator rule for actions (2026-11-11): Eamon accepts a small, fixed command set, unlike a Z-machine
parser. Offer only Eamon's own commands; do not add commands Eamon does not have.

| # | Existing owner and input it reads | Eamon gap today | Minimal adapter | Status |
| --- | --- | --- | --- | --- |
| R1 | **Underlines, tap, long-press radial** (`Actionable`, `TranslatorUI.applyDiscovered`) read `WorldModel.lastPayload.discoveredObjects` / `inventory` / `exits` | none for objects and exits | `js/EamonProvider.js` supplies those arrays from `WorldSnapshot.cs` | Built |
| R2 | **Radial verbs** (`ActionSynth.verbsForAttrs`): `ActionSynth.rules` keyed by object `attrs`, plus learned verbs (`AttrCalibrator.allowedVerbsFor`) and `SemanticActions` when its cutover flag is on | attrs come from Eamon categories, but some rule words are not Eamon commands ("talk to", "search", "empty", "switch on") and some Eamon commands have no attr key ("ready", "attack", "drink") | per the operator rule, only Eamon commands are offered: the vocabulary gate R4 drops every rule word Eamon lacks. Eamon commands with no attr key get attr keys in the shared `ActionSynth.rules` table (for example weapon -> ready, drinkable -> drink, hostile monster -> attack), not a per-object override. The removed `nativeCommands` early return is not reinstated | Built: rows readyWeapon/drinkable/readable/lightSource/hostile added to the shared `ActionSynth.rules` (no Z PROFILE attribute uses these names); provider sets them from Eamon facts; `verbsForAttrs` keeps only words in the Eamon vocabulary when an Eamon adventure is active. Hermit: examine, attack (no talk to); bottle: drink, drop, give, put |
| R3 | **Submit-button command radial** (`ParchLockQol` command list) and **autocomplete** (`Autocomplete`) read `payload.specialCommands` (`source: "dictionary-verb"`), plus exits and synthesized object commands | Eamon supplies no `specialCommands` | provider returns Eamon's own command words: `EamonRT IEngine.CommandList`, each `ICommand.Verb` and `Synonyms` where `IsPlayerEnabled`, as `{label, command, source: "dictionary-verb"}`, the same shape `GrammarProvider` produces from a Z dictionary | Built: snapshot exports player-enabled `CommandList` verbs/synonyms and `Preps`; provider returns the verbs as `specialCommands` (dictionary-verb) |
| R4 | **Vocabulary gate** `Actionable.isGameWord`, `ActionSynth.literalAvailable`, `Actionable.isDictionaryVerb`: Z RAM dictionary only; with no adapter, literals pass unchecked | Eamon has no Z dictionary, so every Z rule word passes | add the Eamon vocabulary (command verbs and synonyms, seen object names and synonyms) as a second dictionary source inside these three functions when payload `vmType` is "eamon"; fail closed like the Z path | Built: `ActionSynth.literalAvailable` and `Actionable.isGameWord` answer from the adventure vocabulary (verbs, synonyms, prepositions, shown object names/synonyms) when no Z memory and an Eamon adventure is active; Z path unchanged. Ordinary regression 8/8 |
| R5 | **History** (`ParchLockQol.RecordSent`): trusted Enter on the one `.Input.LineInput`, and `Input.Inject` for radial and menu sends | none: Eamon line prompts use the same Glk line input | none | Works as for any story (single-key prompts are not history, as for Z games) |
| R6 | **Turn recording and learning analyzers** (`TurnRecorder.onAcceptedSubmit` from `Input.Inject`; analyzers from AttrCalibrator, SemanticActions) | analyzers that read Z memory must not run on Eamon; word/action learners should | confirm each Z-memory analyzer returns early without `ZRamProvider.getMem()`; gate on `vmType` only where it does not | Verified empirically (imported package, Beginner's Cave session): the seven analyzers stay registered; the Z-memory ones (diag-*, inventory-root, worn-inventory) wrote no store and raised no error; the only learning store written was PM_Stats under the package identity. Same standing as Glulx |
| R7 | **Transcript** (`Transcript.js`): captures finished `BufferLine`s (works); makes lines permanent when a save is written, observed through the shared native Glk `Dialog` | Eamon's own SAVE writes inside its file system and never opens the Glk Dialog, so lines never become permanent | the host reports an Eamon save or restore (detected at the next safe point from the changed save-slot file) to the same Transcript entry points the Dialog hook calls Per adventure: the save name identifies adventure and slot (Eamon writes `<file>_<NNN>.DAT` in the adventure folder; a completed RESTORE is the `IRestoreCommand` in the engine's own `LastCommandList` at the next prompt), so each adventure's saves keep their own transcript markers. | Open |
| R8 | **Save files, sidecars, Save and Restore buttons** (`SaveState.js`, `UndoRestoreSync`, Tools Save/Restore send `save`/`restore`) | the buttons send the words, then Eamon asks for a slot (a nested prompt); sidecars (map, transcript token) are bound to Dialog saves | bind sidecars to the same Eamon save event as R7; the buttons keep sending the game's own command Per adventure: each save's `SaveState` snapshot is taken in that adventure's map scope (R16), so restoring it restores that adventure's map; a fresh entry into an adventure is its new game (archive working map). Plan section 7 "Saves and everything that follows them". | Open |
| R9 | **Stats mining** (`StatTracker`): status window columns, Z globals, and per-executable reply facts in `ModuleStatFacts` (command, reply family, fields) keyed by executable digest; replies parsed by shared parsers | no status window and no executable digest (R10), so no facts entry applies; Eamon's STATUS reply ("Damage Taken: 0/12", "Gold: 31", "Intellect: 20") is label:number text | (a) Eamon identity (R10); (b) one `ModuleStatFacts` entry with `command: "status"` and an existing reply family, measured; a new family only if none parses it | Built: `ModuleStatFacts["format:eamon"]` (command status, family eamon-status; keyed by format because the package digest changes each release and STATUS is the engine's own command), one `eamon-status` branch in `applyMeasuredMetricReply` and its `MEASURED_METRIC_REPLIES` entry. Imported package: health 22/22, attributes, gold, bank, armor expertise, weight recorded from a typed STATUS. Not yet checked: the Identify-stats button path and the HUD rendering on a phone |
| R10 | **Identity for learning, stats and erase** (`ModuleLibrary.currentExecutableIdentity`, `LearningStores.currentOwner` / `identity`): SHA-256 of the story executable, captured when the loader fetches the story | the loader fetches only the empty placeholder, so Eamon has no identity: learning and stat facts have no owner | `ModuleLibrary` reports, for a `local/<id>.eamon.js` path, identity `sha256:<package digest>`; per-adventure scoping (bundle + adventure + kind + id) rides in object ids and adventure name. Uninstall and campaign-progress deletion stay distinct | Built: identity `sha256:<package digest>`, format `eamon`; `LearningStores.identity(null, false)` accepts it like Glulx. Learned words still need Z memory (as for Glulx). Object/room ids are not yet adventure-qualified, so map and learning would collide across adventures (see R16) |
| R11 | **Single-key prompts** (`CharKeys` key proxy and arrow pad, `Input.SubmitPrompt` Enter/Space, `StatTracker.hasQuestionPrompt` guard) | none: Eamon single-key prompts use the same Glk char input | none | Works as for any story |
| R12 | **Numbered menus** (Main Hall, shops) | searched `Actionable`, `CharKeys`, `Input`, `Qol`, `DirectionalRadial`, `StatTracker`: no existing mechanism offers numbered menu choices for taps; Z menus are typed or key-proxy too | no new mechanism. Options: leave as typed (current); or offer the choice keys through the existing submit-button command radial (R3 list) while a single-key prompt is pending | Open: operator or seat decision |
| R13 | **Map, direction chips, fast travel** (`MapTopology`, `ParchLockMap`, `DirectionalRadial`, `Navigator`) read payload `roomId`, `roomName`, `exits`, `probe.roomSource` | none after two gate edits ("eamon-live", "eamon-native") | provider | Fast travel verified: map route Cave Entrance -> Large Chamber sent as ordinary moves s, s by Navigator and arrived. Encounter interrupt (queued moves dropped) not yet exercised: needs an adventure with a wandering hostile |
| R14 | **Equipment** (`EquipmentUI.model/rows`): payload `playerId`, `parentId`, `attrs.worn`, `container` | none for Yourself, worn and carried | provider | Built (drag commands and containers not yet tested) |
| R16 | **Per-adventure scope** (plan: one map per adventure). Map storage keyed by story path (`PL_Map_` + path), learning by executable identity | all 20 adventures share one story path and identity; native room/artifact numbers repeat between adventures | `ParchLockMap.Scope` / `StorageKey()` / `SetScope()` scope the existing `PL_Map_` and `PL_MapSlots_` keys (empty scope for every other story: keys unchanged; reset in `ParchLock.SetTitle`). The provider selects the adventure's map, or an empty Main Hall map. Every existing key user follows the scope: uninstall removes all `#world` keys (`ModuleLibrary.removeLocal`), the declined-restore wipe uses `StorageKey()` (`MapTopology`), save packages carry the other worlds as `ScopedMaps` (`ParchLock.GetSaveData`) and import restores them inside the existing rollback (`ParchLockQol.ImportPackageData`). Ids = adventure code x 1,000,000 + kind base + native number. Plan identity is bundle + adventure + kind + id: the bundle part is the R10 owner (package digest) that every learning/stats store is keyed under, not a field inside the id | Built with callers fixed after Grok audit #3367 (candidate, not accepted): Beginner's Cave map kept across Main Hall and Vile Grimoire; uninstall leaves no map keys; export/import round-trips the Cave map from the Main Hall |
| R15 | **Read-aloud** (`ReadAloud`: BufferWindow observer) | reflow joins lines so narration reads whole sentences; three "Failed to read text" errors were seen on the phone | none known; trace the errors | Open: trace |

Order of work: R10 identity (unblocks R6, R9 and learning) -> R3/R4 vocabulary -> R2 rules entries -> R9 stats
facts -> R7/R8 save events -> R12 decision. Each change goes into the named existing function or data table;
nothing here adds a parallel menu, store, parser or UI.

### R16 adventure codes (from each adventure's own MODULE.DAT, which is what `GetModule().Name` returns; runtime ids observed: Beginner's Cave 30,000,00x, Vile Grimoire scope name matches)

| Folder | `GetModule().Name` (MODULE.DAT) | Adventure code |
| --- | --- | --- |
| ARuncibleCargo | A Runcible Cargo | 1863 |
| AlternateBeginnersCave | Alternate Beginner's Cave | 1025 |
| BeginnersCaveII | Beginner's Cave II | 1097 |
| BeginnersForest | Beginner's Forest | 1527 |
| DemoAdventure | Eamon Deluxe 5.0 Demo Adventure | 711 |
| Dharmaquest | DharmaQuest | 931 |
| EscapeFromMtMoon | Escape from Mt. Moon | 1561 |
| Firestorm | Firestorm | 1435 |
| LandOfTheMountainKing | Land of the Mountain King | 157 |
| OrbOfMyLife | Orb of My Life | 284 |
| SampleAdventure | Sample Adventure | 188 |
| StrongholdOfKahrDur | Stronghold of Kahr-Dur | 169 |
| TestAdventure | Test Adventure | 1638 |
| TheBeginnersCave | The Beginner's Cave | 30 |
| TheDeepCanyon | The Deep Canyon | 1251 |
| ThePyramidOfAnharos | The Pyramid of Anharos | 1742 |
| TheSubAquanLaboratory | The Sub-Aquan Laboratory | 1127 |
| TheTempleOfNgurct | The Temple of Ngurct | 1474 |
| TheTowerOfEamon | The Tower of Eamon | 1543 |
| TheTrainingGround | The Training Ground | 378 |
| TheVileGrimoireOfJaldial | The Vile Grimoire of Jaldi'al | 72 |
| TheWayfarersInn | The Wayfarers Inn | 1336 |
| WrenholdsSecretVigil | Wrenhold's Secret Vigil | 428 |
| (Main Hall) | Main Hall: map scope name only; the Hall has no rooms, so no ids | 308 |

Collisions: none (24 names, 24 distinct codes).
