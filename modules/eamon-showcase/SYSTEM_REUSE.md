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
