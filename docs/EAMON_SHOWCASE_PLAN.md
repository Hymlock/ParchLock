# ParchLock x Eamon CS: master plan

Status: accepted planning document (claude orchestrator, Codex adversarial reviewer; final planning ACCEPT
on bus #3325). It is a plan, not evidence of anything running: runtime, rights, behaviour, playtest and
release gates are all still pending, and nothing here authorises implementation by itself.
This file is an editorial consolidation of the accepted composite R3 + R4 + R5 + E1 (provenance at the end).
Pins: Eamon-CS 5db64a37afe0b5455ee477e067fca4e6d249e419 (3.1.0, 2026-10-15); ParchLock
5c4d7a4fbe8529cd1d3a11f13a45851620299601. The production app tree is unchanged.

## 1. What is being built

One Eamon module in ParchLock's library. Opening it enters the **Main Hall**; the adventures are reached
from inside it. No companion app, sidecar or separate installer. A persistent character and economy,
a tiered campaign with unlock gates, and ParchLock's map, Equipment, tappable nouns with radial actions,
stats, notes, voice and narration. Android, Windows and hosted browser, fully offline, no LLM or service
while playing. The whole collection ships in one release.

These are the operator's design requirements from his draft and are not open for removal. The draft's
factual claims (file formats, roster, fixed memory bridge, automatic transpile) were checked against
source and corrected below.

## 2. Verified scope

- 20 player adventures (Fantasy 17, Horror 1, Sci-Fi 2) + Main Hall, from upstream's catalog files.
- Engineering inventory: all 23 filesets + Main Hall. Demo, Sample and Test Adventure are support content
  only, each with a written disposition.
- Size: 1,214 rooms, 1,447 artifacts, 512 monsters, 1,484 effects; 550 adventure C# files (about 35,200
  lines, 18 of the 20 player adventures have custom code); engine about 50,000 lines; Main Hall 3,700.
- Data are gzip-compressed SharpSerializer XML `.DAT` files. 12 directions. Gold cap 999,999. Upstream, the
  Main Hall is a menu hub with no rooms. **Operator direction (2026-11-11), replacing the earlier "no map"
  line:** in ParchLock the Hall is played like any other ParchLock world. The Hall, the Village and the
  Practice Area are rooms (the engine's own menu texts already say "Head north into the Main Hall",
  "Wander south into the Practice Area"), and each place (weapons shop, wizard, banker, adventure desk,
  the Village shops, the Practice Area trainers) is a room reached from them. All of it sits on the
  Hall's map and is reached with the existing direction buttons, radial, fast travel, history and
  transcript, by sending the engine's own menu keys. Actions that are not places (examine abilities,
  leave the universe) attach to the room as commands. Nothing in the engine changes.

## 3. Fixed rules

1. Inside adventures, preserve source text, ids, synonyms, hints and authorship. The campaign framing
   (tiers, unlocks, debriefing panel) is ParchLock's added design and is labelled as such.
2. The game is the authority. ParchLock sends commands and never edits game state.
3. The engine's own shutdown path performs the character hand-off (loot sale, weapon limits, merchant).
4. Show only what the game has revealed: visited, described and hidden stay distinct.
5. Everything fits ParchLock's existing systems: adapt, never duplicate (section 8).
6. No estimate, capacity claim or fidelity claim without a measurement.

## 4. Runtime: hypothesis and the gate that tests it

Agreed research direction: run the Eamon CS engine and adventure plugins inside ParchLock as .NET
WebAssembly. This **preserves the upstream implementation; parity remains to be demonstrated.** It is a
hypothesis until gate G1 passes. It is not a proven no-conversion path, and no `.z8` conversion is promised
either. If G1 fails, the alternative is an Inform 6 capacity study; there is no silent switch.

Unchanged source: `Eamon`, `EamonRT`, `EamonMH`, the adventure plugin projects, the `.DAT` data.
Replaced by new host code: everything upstream's launcher `EamonPM` provides.

| Seam | Hosted replacement must provide |
|---|---|
| ITextWriter | Output into ParchLock's existing story window and status line |
| ITextReader (ReadLine, ReadKey, KeyPress, validated ReadField) | One pending-input request at a time, with kind, cancellation and resume without replayed side effects |
| IThread.Sleep | Non-freezing, skippable delay |
| IFile, IDirectory, IPath | The single virtual file system (section 5) |
| ISharpSerializer (upstream's wrapper opens `System.IO.FileStream` directly) | A serializer that goes through the same virtual file system |
| IMutex | Single-instance and two-tab guard |
| Plugin loading (assembly load by path, `GetTypes`, `Activator.CreateInstance`) | Loading from the bundle with reflection metadata preserved; trimmed and untrimmed behaviour recorded |
| Main Hall <-> adventure hand-off | The same hand-off inside one host |

**Gate G1** must show, measured, on Android (signed APK WebView), the Windows launcher and hosted
web/itch: exact runtime version and mode; no main-thread freeze; ordinary commands; a nested parser
clarification; a Main Hall field prompt and character creation; save and restore; host cancel; plugin
resolution for the heaviest adventure; serializer round trip. Targets, each with a stated measurement
method: cold start <= 5 s, command round trip <= 200 ms. Operator revision, November 11, 2026:
the earlier added-package-size target of 20 MB is advisory, not a blocking gate. Keep the working
untrimmed runtime as the baseline; size reduction is optional and must not compromise correctness,
importing or signed Android operation. Record actual sizes. `file://` launch is
not required. Also to verify: `Input.js` line-input gating, and that the vendor loader can start a non-Glk
engine without patching minified code.

## 5. Persistence

One authority: an IndexedDB-backed virtual file system holding the pristine bundle (read-only), working
copies, upstream save slots and config, and the campaign record.

- Upstream saves are several separate file writes. The host stages all writes between two **safe points**
  and commits them as one durable revision. Safe points: engine waiting for top-level player input; a Main
  Hall menu waiting; engine shutdown complete. Nested prompts are not safe points.
- A revision holds: file changes, character, save slot and config, campaign record revision, references to
  map, notes and transcript, playthrough counters, bundle hash, run id, transition nonce.
- "Saved" is shown only after the durable commit acknowledges. After a crash the last complete revision
  loads. Upstream loot, reward and merchant rules are not altered.
- Tests include a write-bypass detector and injected failure before and after every upstream write and
  every commit, low storage, process kill, duplicate callbacks, old-save restore, two tabs and clean
  reinstall import. Result is always the previous or the next complete revision.

## 6. Campaign progression

**Tiers (from the operator's draft):** 1 Novice Initiative (open at start), 2 Journeyman Contracts,
3 Experienced Expeditions, 4 The Strange Realms (sci-fi and high adventure), 5 Heroic Gauntlets.

**Gate:** a tier opens after two *different* adventures in the tier below are cleared. Guild Rank is the
displayed title of the highest tier opened. Score is shown and does not gate.

**Placement.** Only four of the draft's 21 titles exist in Eamon CS; their draft placements stand. The
other 16 are placed by the draft's tier themes, then by a rough difficulty figure, and are **provisional**
until each adventure's entry conditions are read from source (that figure is not validated difficulty).

| Tier | Adventures |
|---|---|
| 1 | The Beginner's Cave (draft), The Wayfarers Inn (draft), Beginner's Forest, Beginner's Cave II, Alternate Beginner's Cave, The Training Ground |
| 2 | The Deep Canyon, The Pyramid of Anharos, Land of the Mountain King, The Tower of Eamon |
| 3 | DharmaQuest, Wrenhold's Secret Vigil, Firestorm |
| 4 | Escape from Mt. Moon, The Sub-Aquan Laboratory, Orb of My Life |
| 5 | The Temple of Ngurct (draft), Stronghold of Kahr-Dur (draft), A Runcible Cargo, The Vile Grimoire of Jaldi'al |

Before the table is frozen: prove at least one source-legal route through every gate, including
adventures' own entry checks (for example The Training Ground refuses characters whose armour
expertise exceeds 25). If a
tier has no valid route, change the added placement, never the source check.

Tier 1 route evidence (source, Codex #3316): The Beginner's Cave, Beginner's Forest, Beginner's Cave II and
Alternate Beginner's Cave use the engine's Beginners entry check (a weapon carried; armour expertise 0, axe 5,
club 20, sword 0; RT IntroStory.cs:128-152). Eamon raises the weapon used and, only while armour is worn, armour
expertise in combat, so a sword or armoured character usually enters only one of them; Spear and Bow are not checked,
so an unarmoured spear or bow character can enter all four (Grok #3422; source-legal, the operator may decide whether
that is intended). Armour expertise cannot pass 25 with the gear a new character can afford (leather 10, shield 5,
chain 20). The Wayfarers Inn has no entry check and The Training Ground refuses only armour
expertise above 25 (its IntroStory.cs:28-38). A legal route to tier 2 therefore exists: one Beginners adventure
plus The Wayfarers Inn or The Training Ground. Tiers 2 to 5: no adventure refuses entry in source (the only
IntroStory refusals in the collection are the four Beginners adventures and The Training Ground; The Tower of Eamon
and Escape from Mt. Moon have no custom code and run on the stock engine), so every gate has a source-legal route.
Still to prove in play. Notes (Grok #3422): The Pyramid of Anharos zeroes all held and banked
gold on any finish without its quest (a ParchLock warning is the operator's call); A Runcible Cargo's dream can end
in ExitType.Error if its start snapshot is missing, which strands the character outside the Hall (never a clear; the
snapshot file must persist with the campaign).

**What counts as a clear.** Each adventure gets an outcome contract written from its source: returned
alive, quest success as an exact state condition, failure, death, abort. The engine's "finish adventure"
exit alone is not success (Stronghold of Kahr-Dur uses it after printing that the quest failed).
Adventures with a quest clear on the quest condition; whether an adventure has no quest is decided by
reading it; then leaving alive through its own exit clears it. A return counts only for a valid, active
expedition of that character. The quest facts are captured at the end of the adventure while its world
state is still available, then bound to the successful upstream cleanup and the durable returned-character
revision; they are never read from a freshly loaded Main Hall.

**How a clear is captured (agreed with Grok, #3400-#3402).** Each adventure's contract is data the host
evaluates over the engine's own records: monster or artifact location, in limbo or dead, carried, worn or in a
container, reaction, GameState fields, with "not" and "any of" (A Runcible Cargo's capitulation ending is a
FinishAdventure that is not a clear). The host evaluates it at every adventure prompt and keeps the latest
result, because several adventures end by script with no exit prompt (Land of the Mountain King, Dharmaquest,
A Runcible Cargo) or use their own exit prompt (Firestorm, Stronghold of Kahr-Dur, Wrenhold's Secret Vigil);
each of those has a key press just before it ends, with the world intact. A contract is written over the world as it
stands at the last prompt of that adventure's success path, cited per contract, which is not always the state
before the exit's Y answer (Wrenhold puts the orb in limbo, then asks to name the bow, so its contract tests the
bow it hands over); ten adventures override Shutdown. Clause tests follow the engine's defaults (carried, worn
and container tests are not recursive unless stated) and each clause has exactly one test.
The outcome is bound when the plugin returns: ExitType FinishAdventure and Die 0, nothing else read from the
engine then (proved by a host probe). Gold and gains come from the exported character (final minus entry
gold). Each save slot carries the run id it was saved in, and a successful RESTORE makes that run current, so
a restored or imported pre-exit save can never earn a second credit for its run; a fresh entry starts a new
run. Operator decision (2026-11-12): a clear is credited once per character and adventure; a fresh replay plays
normally, and the engine still pays its own rewards, but earns no second credit. Verified live: The Training Ground
credited on the first exit, "already cleared" on a second run. Open for the operator (found 2026-11-12): under the
no-quest rule, entering The Training Ground and leaving at once is a clear (verified live), so it can count towards
the tier 1 gate without any play; decide whether a no-quest adventure needs more than leaving alive. A restored slot that has lost its
run stamp starts an unbound run, and saves made from it stay unbound: that play-through is never credited until a
fresh entry or Start Over (fail-closed by design, not a defect). Characters are keyed by a ParchLock id per record
uid and name; a deleted character recreated with the same name at a recycled uid inherits the old id (known limit).
The credit ledger, the run stamps and the returned character are committed in one IndexedDB transaction on every
target (the Windows launcher and Android run the same page storage). Entry gates stay in the
engine (the Beginners intro check, The Training Ground's own refusal).

**Ownership.** Progress belongs to the character and is saved with it; it is lost with the character.
Restoring an older save restores that save's progress. Credits are idempotent: never granted twice. Restore
never erases installed learning or the death history. There is no "Unlock all" switch.

**Enforcement.** One progression authority. A lock gates *starting* an adventure, never resuming or
finishing one in progress. Locked adventures stay visible with the reason. The mechanism is chosen after
tracing every start, resume and restore path in source.

**Enforcement as built (2026-11-12).** The only start path is the Main Hall's own adventure selection (EamonMH
GoOnAdventureMenu.SelectAdventure; resuming is the app relaunching into an adventure, RESTORE happens inside one,
recall deletes state). The host names the locked adventures and the Guild rank with that prompt and refuses a locked
choice with its reason (ProgressionGate, credits from the clear ledger per character). Verified live: a new character
is refused The Deep Canyon with "opens once you have cleared two different tier 1 adventures; you have cleared 0";
after clearing The Training Ground and Beginner's Cave II the rank reads Journeyman Contracts and The Deep Canyon
starts. Both of those clears were walk-in, walk-out exits (see the open operator question above).

**Debriefing.** After returning to the Main Hall, a ParchLock panel shows treasure sold, gold gained,
whether a clear was credited and why, rank and any newly opened tier, using the engine's own figures. It is
not written into the story text. Built (2026-11-12): the host notes the Hall character's gold and rank at the
adventure selection and, at the Hall's first safe prompt after the return (after its commit), reports the adventure,
the credit decision, gold before and after, the Guild rank and any newly opened tier; the page shows it in ParchLock's
Message dialog. Verified live: "Cleared, and credited" and "A new tier of adventures is open: tier 2". Treasure
sold is not itemised yet (it is inside the gold difference).

## 7. ParchLock features

- **Library:** one campaign entry in the existing module library, imported from the Showcase package
  (section 9a), every member hash-validated against its manifest.
- **World data:** one coherent snapshot after each turn of what the player can perceive, fed through the
  existing provider and merge paths, whose behaviour for a new provider is verified, not assumed.
- **Actions:** offered only when applicable to that target now. Correct means right target and legal
  effect, or a deliberate game refusal.
- **Equipment:** "Yourself" is the root. Held, readied and worn are optional groups under it. Only real
  container objects hold items; there is no synthetic pack slot. The existing Equipment tree and its
  command authority are adapted. A drag sends a verified engine command or is refused with a reason.
- **Stats:** real values and units; base abilities, temporary boosts, wounds, armour and encumbrance kept
  separate.
- **Map and fast travel:** one map per adventure. Fast travel reuses the existing navigator and sends
  ordinary moves. If an encounter interrupts a route, the player stays in that room and later queued moves
  are dropped. Travel is locked only for a known, visible threat and never reveals a hidden one.
- **Saves and everything that follows them (operator, 2026-11-11):** every adventure in the package gets
  what a single-story module already gets from ParchLock's existing save systems, with nothing new built:
  each game save carries its own map and item-label snapshot (`SaveState`) and transcript marker
  (`Transcript`), restoring a save restores those, a new game archives the working map, playthrough
  history follows the save (`PlaythroughState`), saves appear in the existing save-file manager, and
  save packages export and import every adventure's maps and saves (for Eamon, the whole campaign file
  set travels with the package as one unit and the story reopens on it). Eamon's own SAVE and RESTORE
  commands drive these through the same entry points the Glk save dialog drives for Z-machine stories;
  save names identify the adventure and slot. All of it survives quit, force-stop and restart on every
  target, as it does for a regular module.
- **Narration:** existing speech settings and duplicate prevention remain authoritative. The reuse audit
  first establishes whether the draft's optional routine-miss narration policy is already supported. If a
  gap remains, only a minimal event-aware extension inside the existing read-aloud pipeline is added; the
  repeat-skipping setting is not repurposed and no parallel filter, queue or store is created. Unknown
  events are narrated normally. Eamon text reaches narration by one path only.
- **Clue bookmarks:** when the game prints an inscription or readable text, a note marker with that text
  is added to the room: only printed text, de-duplicated, never overwriting the player's notes.
- **Learning and identity:** every existing learning path is audited and marked reused, adapted or
  inapplicable. Identity is bundle hash + adventure + entity kind + id, so nothing leaks between adventures.
  Existing tracking and erase controls keep working and never erase campaign data or saves.

## 8. Reuse register (precondition for feature work)

For speech, inventory, actions, learning, maps, notes, saves and library: current owner, API, settings,
stores and tests -> the actual gap for Eamon -> the minimal adapter. No "works unchanged" claims and no
parallel systems.

## 9. Rights

A per-entry provenance and permissions ledger for all 23 + Main Hall is a release gate. Known: Eamon CS
is MIT for Michael Penner's original content; nine source files carry the older Eamon Deluxe header "ALL
NON-COMMERCIAL DISTRIBUTION ENCOURAGED". ParchLock is free and non-commercial. Ships in both builds only on
a completed ledger, with full attribution and a non-commercial statement. No blanket public-domain
wording. Contacting upstream is not a precondition and is not done automatically.

## 9a. Packaging and distribution (operator direction, relayed by Codex in bus #3327)

The Showcase is a **separate, versioned download**, not part of the app package: one ParchLock-importable
file holding the Main Hall and the complete agreed adventure collection, with a manifest and member
hashes. Its corresponding source and required notices are published with it. It is offered alongside the
app's assets on each matching release of both ParchLock repositories (public `Hymlock/ParchLock` and
private `Hymlock/ParchLock-Private`), only after the runtime, content, rights and package gates pass.
Importing it gives one module in the library with adventure selection inside; no separate app or launcher.
The complete desktop distribution still includes its matching signed APK; the Showcase download does not
replace that. Upstream Parchment/Parchmap repositories are not touched.

Trust boundary (agreed direction; the mechanism is proven in gate G1): the app owns the host adapter and
every privileged integration; the package declares only the engine, adventure and data payload with exact
manifest and member hashes. A package's own hashes prove integrity, not authenticity, so the app also
verifies a trusted release identity (a pinned approved digest or a signature, whichever fits the existing
build and import flow). The app never runs arbitrary package script or grants file, network or device
access because a manifest asks; host file access is confined to the campaign's virtual file system. No
user accounts or installers. Today's Z-machine story import does not already provide this boundary.

## 10. Work packages

A. Baseline: dispositions; rights ledger; per adventure: behaviour inventory, entry conditions, outcome
   contract, quest classification; tier route proof; adapter matrix; reuse register; learning audit;
   start/resume path trace.
B. Gate G1 and the runtime decision.
C. Host, serializer, virtual file system, transactions; Main Hall playable; reference transcripts from
   upstream's native build with a seeded generator.
D. World data, map, Equipment, actions, stats, narration, learning.
E. Lifecycle: saves, restore, hand-offs, progression, debriefing, bundle validation, uninstall versus
   campaign deletion, second-device export.
F. Full-collection acceptance.
G. Independent adversarial review, final candidate on real targets, release.

## 11. Full-collection acceptance

1. Every one of the 20 adventures has executed evidence of its principal qualifying outcome, its critical
   custom behaviours chosen by risk, and its meaningful failure and alternative paths. Scripts are tailored
   per adventure. No collection pass while any mandatory path is unexecuted.
2. Comparison with upstream's native build covers transcript, game state, generator order where meaningful
   and durable state, normalising only declared environmental differences.
3. At every scripted step, map and visible exits, Equipment and stats equal the engine's, and every offered
   action has the right target and effect.
4. Progression: every start and resume path obeys the policy; a failed quest never satisfies a gate;
   exactly one credit per qualifying clear across retry, kill, restore and two tabs.
5. Mid-route encounter: travel stops in that room, later queued moves are dropped and speech hold is
   released before encounter output is marked consumed. The encounter output remains visible; when
   read-aloud is enabled, speakable encounter narration is delivered once according to the user's speech
   preferences.
6. The same output event is never delivered twice by overlapping narration paths or redraws. Narration
   intended to be spoken under current preferences is not accidentally lost during route, flush or
   microphone transitions. Intended pass-through room suppression, noise exclusion and optional
   repeated-line suppression remain intact. Legitimate repeated events on separate turns remain distinct
   and follow the existing repeat-skipping preference.
7. Persistence, host-authority, discovery, accessibility and packaging test families all pass.
8. Shipped assemblies built from the pinned commit, hashes recorded, only host code new. Performance
   targets met on the phone. Existing ParchLock regressions unchanged. No changed candidate inherits an
   earlier pass.

## 12. Still to be evidenced (not disputes)

Gate G1 results; rights ledger content; each adventure's entry conditions, outcome contract and quest
classification; final placement of the 16 added adventures and the route proof through each gate.

## Provenance

Sealed blind inputs: Codex `codex/plan-r0.md` 58e0a5144a2be2d27d101ebd83188542ae63d07e63cc1aa82609b89644a5565a;
Claude `claude-blind/BLIND-REPORT-claude.md` e93020cde378e149c1b5a5382cd7464ba40f4c24f3cc50edf470c95d366de4fd.
Accepted composite: R3 ecf335948625bca9fa9ae52a728d1c00808b8370f1cbeb14373335106ab2f7fa; R4
7849da5b3021b3309ad1a9f2c48dc14551ae064f008d317fcdb48beb035b59c8; R5
a531e4db342e14d9352cc73d7d4bde4bbe1cb3098ac47bf47d89e8de4b20d56b; E1
e90ffcab50af8237498910f9085f24340a5ab9468d58b6dcc02f6ce1687dcec9. Codex acceptance:
`codex/planning-acceptance.md`. Earlier R1 and R2 are superseded and kept on disk.
