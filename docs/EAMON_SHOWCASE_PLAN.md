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
  transcript, by sending the engine's own menu keys. **Operator direction (2026-11-12), replacing
  the earlier "attach to the room as commands":** every Eamon menu and prompt choice (numbered
  `1. ...` lists, `N=Label;` lists, `[X]:` menus, `Press D ... or M ...`, Y/N, R/T, shop buy lists)
  is offered through ParchLock's native choice system. The number or letter key gets the native
  underline and is tapped, not the option text. The same choices appear on the existing radial and
  compass and send the engine key. Never a floating label or overlay over the controls. Underlines
  persist across map and panel return like native marks. Map edges go from the room whose menu
  offers them, labelled with that key. The conversion layer (section 2a) is first
  implemented in Grok build 90 (uncommitted), which supersedes the incomplete build 89
  wiring. Nothing in the engine changes.
  **Note (2026-11-12):** this rule and the section 11 real-input check were missed because the plan
  never stated the menu-key rule or a real-tap check, and build-87 probes injected input, so the 204
  input-relay crash and the missing choice wiring were not caught.

## 2a. Eamon conversion layer (operator direction 2026-11-12)

Eamon accepts only specific keys at each prompt, unlike a Z-machine parser. A dedicated
conversion layer sits alongside ParchLock's normal command and underlining systems and
feeds them, so the two work together.

The layer reads the current Eamon prompt or menu and derives the exact accepted keys
(`1. ...` lists, `N=Label;` lists, `[X]:` menus, `Press D ... or M ...`, Y/N, R/T, shop
buy lists), with no phrase-guessing. Those keys become the native underline targets
(the key only, never the option phrase), the radial and compass / `#exits` non-cardinal
chip entries, and map edges from the room whose menu offers them, labelled with that
key. Compass exits such as "north" stay ordinary direction exits.

It coexists with native noun and exit underlining and the first-instance rule: choice
targets are the keys and are never claimed by phrases ("desk", "Go on an adventure");
room-description nouns stay `examine X` (desk, sign, Long Fire, Shield Wall). No floating
labels. Opening the map does not drop the prompt-key marks.

Gated, Eamon-only: key derivation, key-only exit labels, prompt-key marks and the
menu-line skip (`EamonProvider`, `Actionable.isEamonStory`). Shared and unchanged:
`wrapTargets` / `wrapFirstExact` / `span.pl-act`, `retainMarks`, the first-instance
rule, the radial, the `#exits` non-cardinal chips, MapTopology, and all Z-machine
behaviour.

Build 90 is the first implementation. Acceptance is section 11 item 10 (real taps and
keypresses, including a 20 s idle; script-injected input does not count).

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

G1 measured, Windows (2026-11-13): headless installed Chrome 157 against the b93 dist folder (the folder ParchLock.exe
serves); the exe itself was not run (no visible windows); g1-win.cjs. Runtime: .NET 8
WebAssembly, untrimmed (PublishTrimmed false), interpreter (no wasm-tools AOT), engine in a Web Worker. Command round
trip, measured in the page from the real Enter keydown to the next live line input, 12 commands in The Training
Ground: median 26 ms, max 43 ms (target <= 200 ms). Main-thread long tasks during those commands: none. Cold start,
a new browser process on a profile with the campaign saved mid-adventure, to the first prompt: 2.50-2.59 s over three
runs (navigation to first prompt 2.21-2.30 s; target <= 5 s). Package 11.18 MB (advisory). Android: P7a cold start
passed on Build 87 (activity start 353 ms; library entry to first prompt 1368 ms); the Android round-trip and P7b
measurements wait for the phone session on the current build.
Open: G1 Windows through ParchLock.exe itself (it opens Chrome full screen), measured by the owner; not passed until then.

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

**One save system (owner ruling, 2026-11-13).** The player sees only ParchLock's save menus. Eamon's own save and
restore screens ("Saved games: 1-6", "Enter new name") never appear. Why there were two: ParchLock's save system
catches a game's request to Glk for a save file; Eamon is a .NET program that writes its own files (a SAVEGAME.DAT
slot list per adventure plus a numbered file set per slot) straight to its virtual disk above, so ParchLock's save
menus never saw an Eamon save and the Save / Restore panel showed "0 browser save files". Design (NOT BUILT; for
Grok's adversarial review):
- Tools > Save, Save files > Game Save and a typed SAVE all open ParchLock's save dialog, listing the current
  adventure's five slots by their Eamon names (from that adventure's SAVEGAME.DAT); the player picks a slot and
  names it. Restore (Tools, Save files, typed RESTORE) lists the same slots.
- The host runs the engine's own SaveCommand / RestoreCommand with that slot and name supplied, so the engine's
  own code writes and reads the files; its menu text is not printed, and ParchLock shows one confirmation.
- Where Eamon cannot save (the Main Hall, a nested prompt), ParchLock says so; the campaign itself is committed
  at every safe point regardless.
- Unchanged: Download / Import Package (the campaign travels inside it), maps, transcripts attached to saves.
- BUILT on PC (uncommitted, not yet in a build; Grok #3545 accepted the design with C1-C4). The dialog is ParchLock's
  own file-picking save/load dialog (lib/main.js Dialog, reached through the VM's options), not a list. The
  adventure's Eamon saves are mirrored into its store by name under the id eamonshowcase-<folder>, so the picker
  and the Save files panel show them. The dialog sends the engine's own direct forms, "save <slot> <name>"
  (EamonRT CommandParser quick save: no slot menu, no name prompt) and "restore <slot>", through the normal
  command line, so author rules apply (Firestorm and Orb restore steps, the Wayfarers SAVE gate). A new name takes
  the next free slot, an existing name replaces its slot (the dialog asks first), and when all five are in use the
  player is asked to pick one to replace. Names are cleaned to letters, digits and simple punctuation, at most 40
  characters (FsNameLen). Success is decided by the engine's own save/restore event, never by printed text; our
  command line is not echoed. When saving is not possible (the Main Hall, a pending question, or the game
  refusing), a pop-up says so: "You glance around furtively and try to save your game. There is movement in the
  corner, and it doesn't seem safe to do that right now." The game's own reason stays in the story. The per-save
  map, labels and transcript attach through the existing save event (Transcript.commitSave).
- Verified on PC with real input: Tools > Save in the Main Hall gives the pop-up; in The Training Ground,
  Tools > Save, name "At the stairs", Save: the story shows only the game's "[QUICK SAVE 1: At The Stairs] Game
  saved."; the save snapshot is stored; after moving on, a typed RESTORE opens the dialog listing "At The Stairs",
  and choosing it restores the Flight of Stairs with the map; no Eamon menu appears. The Wayfarers Inn before the
  opt-in: the game's refusal shows, then the pop-up. Existing-module regression: pass.
- Grok #3547 conditions, done and tested on PC with real input:
  F1 save names keep only letters, digits, spaces, apostrophes and hyphens (Eamon splits a command at . ! ? ; , and
  at "and", "then", "also"); a name with one of those words is refused with a plain note ("Bread and butter": refused,
  nothing ran; "Me & you!" saved as "Me You"). F2 the dialog's Edit (delete / rename) is hidden for Showcase saves.
  F3 a refusal is the prompt returning without the engine's save event (1 s grace); a wait that runs out claims
  nothing; Firestorm (its own RestoreCommand override) saves and restores with no false pop-up. F4 a new save is
  listed at once. F5 our command line is hidden on screen and kept out of the transcript (aria-hidden), and never
  a line the player typed. F6 the Main Hall gets a plain note; the owner's "movement in the corner" line is for a
  refusal inside an adventure (wording for the owner to review). (d) a new campaign deletes the Showcase's per-save
  snapshots (SaveState.removeStory) and the mirrored save names. Overwriting a named save replaces its slot.
- Found on the way: at every boot Transcript.reconcileSaves dropped each Eamon save's transcript and map snapshot
  (it looked for a Glk save file the Showcase never writes). Eamon's deleted saves are reported by the host
  (SaveEvents MarkSavesDeleted), so that check is skipped for the Showcase; after a reload the save keeps its
  transcript and map, and restoring it works.
- The engine's own slot menu (the death menu's "Restore a saved game", or RESTORE with an out-of-range slot) is
  answered through ParchLock's restore dialog: the slot list and its question line are not shown, the chosen slot
  (or "Don't restore" on Cancel) is sent as that menu's key. Tested with "restore 9": pick restores, Cancel returns.
  QUIT's Y/N questions stay as they are (single-key prompts).
- Grok #3554, done: S1 a typed SAVE whose first word is not a slot 1-5 ("save foo", "save 9 x"), which the engine
  answers with its own slot menu, opens ParchLock's dialog with the rest as the suggested name (real input: "save
  foo bar" opened the dialog with "foo bar", saved "Foo Bar", no Eamon menu). S2 the Save files panel lists the
  adventure's saves as "kept by the adventure" with no Download or Delete, and counts "saved games in this
  adventure". N1 the death menu with no saves says so before the game shows its menu again. N2 two saves with the
  same name are listed as "Name #slot". N3 a refused name is quoted as cleaned.
- Still to do: the phone with real taps (the next build), and the death menu itself in play (N4, open).

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
Checked 2026-11-12: Beginner's Forest's exit gates (artifacts 19, 20) lead to the adventure exit
(live: walking east through the room 1 gate gives the leave prompt and FinishAdventure); Escape from Mt. Moon's
Rocket boss is a single monster with courage 100, so it never flees and goes to limbo when slain, and the engine
refuses moves past a visible enemy; The Wayfarers Inn's second exit (room 10 south, after the bridge is worn and the
wall map read) is produced by the room's own GetDir override, which the world snapshot reads, so the map offers it;
A Runcible Cargo's dream snapshot (SNAPSHOT_001.DAT) is a campaign file, committed and exported with the slots.
Proven in play 2026-11-12 (one live clear per tier, Grok #3483/#3484): The Deep Canyon (tier 2, Ro == 60): a scripted
player took the author's route (silver lantern, shovel, dug up the peanuts in room 31, gave them to the elephants at
room 21, west and north to room 60), fought five enemies on the way, and left at room 60; the host recorded
FinishAdventure, die 0, quest true, credited, and the debriefing read "Cleared, and credited". The tier gate was
opened by seeding two tier 1 credits (that proof is the tier 1 route evidence above).
Escape from Mt. Moon (tier 4, all(Ro == 12, Rocket boss in limbo)): proven in play 2026-11-12 the same way (route to
the boss, 22 fights, no deaths, exit north from room 12; FinishAdventure, quest true, credited); it replaces Stronghold
of Kahr-Dur as the live multi-condition proof (Grok #3490/#3493): Kahr-Dur's portcullis needs the Dragon Spice, which
the roaming Necromancer carries, so its live route is nondeterministic. The test characters for the tier 2-5 proofs
were seeded (tiers opened, and for Mt. Moon stronger stats and spells); the proofs are the adventures' own routes and
finishes, not character progression.
Contract self-check (built, Grok #3484): at each adventure's first prompt (once per adventure per page load) every clause is evaluated with no
short-circuit and every uid a predicate names (holder container or monster, room, zone) must exist in the loaded
database, and an inContainer holder must be a container (Grok #3498 N2); a tiered adventure without a contract fails. Verified for all 20: ok.
Contract proven by injected end state (probe build only, live clear not yet played; Grok #3489): a probe-only host
build (compiled with PARCHLOCK_PROBE, never in a shipped package; the shipped build treats "#probe" as ordinary
input, verified; pack-showcase.cjs refuses any package whose _framework members carry the ProbeInject name or the "[probe]" literal unless it is packed with --probe, a version naming it and no --pin, Grok #3498 N1; the packer takes only uncompressed members, skipping .br and .gz, so the scan covers exactly what ships, Grok #3517) applies the end state each author's finish code produces, then the real finish runs; a negative run
leaves one condition out. Positive credited and negative not a clear: Beginner's Cave II, Beginner's Forest, The
Sub-Aquan Laboratory, The Tower of Eamon, The Vile Grimoire of Jaldi'al, The Temple of Ngurct, Escape from Mt. Moon;
Wrenhold's Secret Vigil (the contract turns true only when the exit hands over the bow, as its source orders);
Firestorm (positive credited; static negative, Grok #3498: placed in exit room 86 with Thorak alive, the contract reads false and the exit stays shut, the author's own lock); The Pyramid of Anharos
(KV 1 credited; KV 1 with KF 1 is the tax branch, not a clear); The Wayfarers Inn; Alternate Beginner's Cave (Nina
is a fixed Friend, so her presence is the real condition). Wrenhold's negative is the author's death ending for
leaving without the life-orb. The Wayfarers Inn disables every command except QUIT, RESTORE and SETTINGS until the
player types SET MATURECONTENT TRUE, and says so itself every turn (CommandImpl.cs:29-31, StateImpl.cs:38-40): the
author's own consent gate; ParchLock never opts in for the player, and the game's instruction reaches them as is.
Also credited positive and not a clear negative: Orb of My Life (both artifacts carried, then the spoken word); DharmaQuest (the prayer in room 68 credits; leaving from room 72 does not); Stronghold of Kahr-Dur (needs Kahr-Dur gone, the spice gone and the prisoner freed; without the spice it reads false). A Runcible Cargo: the positive is credited; with only one of the two captors gone, the contract stays false and the dream does not end. Land of the Mountain King: the adventure starts the player unarmed, so the probe hands over and readies the silver sword (artifact 25); with the king at 1 hit point, real attacks kill him and the scripted finish is credited; at full strength the king kills the player, and that ending is not a clear. Every injected-state run is done.
Live clears not yet played (for the owner's play or later sampling): every adventure except The Beginner's Cave, The
Training Ground, The Deep Canyon and Escape from Mt. Moon. Still to prove in play: one each
for tiers 1, 3, 4 and 5, chosen to cover a monster-dead, an artifact-possession and a multi-condition contract, plus a
contract self-check of all 20 against the built package's databases. Cross-checked against the authors' own hints
(HINTS.DAT, read from the built package): Stronghold of Kahr-Dur's "What do I have to do to successfully complete the
Quest?" (dispatch the Necromancer, free Lady Mirabelle, exit with her alive in your room) is its contract exactly;
Wrenhold's Secret Vigil's hint names two endings (the life-orb in the drow pedestal, or given to King Argas), and both
lead to King Argas handing over the bow (PlayerMoveCheckState.cs:176-195), which is what its contract tests. The other
adventures have no completion hint. Notes (Grok #3422): The Pyramid of Anharos zeroes all held and banked
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
normally, and the engine still pays its own rewards, but earns no second credit. Owner request (#3427, 2026-11-12): New Game+. Credit
stays once per character and adventure within a cycle; when a character has cleared every Showcase adventure (the
twenty in the tier table, the package's complete set) in the current cycle, the next cycle opens and each adventure
can be credited once again. The character is never reset (stats, inventory, gold, maps, history carry over). The
ledger keeps a cycle per character with every clear (adventure, run, cycle) as history; tier gates and the Guild rank
use clears from any cycle. Only a credit can open a cycle, so save and restore cannot; a run already credited stays
"already credited" in any cycle. The player is told in the debriefing ("New Game+: cycle N begins..."), and the
Quest Board and Trophy Wall show the cycle. A run is credited in the cycle current when it finishes (a play-through started before a new cycle
and finished after it earns a credit in the new cycle; each credit is still a distinct fresh play-through). The
cycle opens whenever the ledger finds every adventure cleared, not only on a new credit (Grok #3431). Verified live: The Training Ground
credited on the first exit, "already cleared" on a second run. Operator decision (2026-11-12): completing the adventure is
required for its credit; leaving alive is not enough. Walking into The Training Ground and straight out was a clear
under the old no-quest rule (verified live). Every adventure therefore gets a completion requirement from its own
source; the four that had none (The Training Ground, Beginner's Cave II, The Deep Canyon, Escape from Mt. Moon) are
Their requirements (2026-11-12): The Training Ground is completed by
graduating, leaving it with armour expertise above 25, the level at which its own manager turns a character away as
overqualified (operator; the only adventure whose completion is a skill level); Beginner's Cave II by bringing out
the mummy's treasure chest, the centrepiece its author's own hint leads to ("two secret passages ... that is all
there is for special events"; under review); The Deep Canyon by reaching room 60, its only exit ("Outside Main
Hall. Congratulations!"); Escape from Mt. Moon by leaving from room 12 past the beaten Rocket boss, not back through
the entrance. Verified live: walking out of The Training Ground and Beginner's Cave II is no longer a clear.

**New Game+, the beginner alternatives, and how it is offered (operator 2026-11-12).** Every adventure counts only
when completed through its own end; nothing is marked complete by training or by being turned away (an earlier
"outgrown" rule that let bought armour training mark five tier 1 adventures complete was withdrawn by the operator).
The authors present The Beginner's Cave's companions as alternatives to it (module descriptions: Beginner's Forest
and The Training Ground "an alternative to the Beginner's Cave", Beginner's Cave II "a Beginner's Cave", Alternate
Beginner's Cave "an introduction for young Eamonauts"), and their entry checks admit only a beginner, so for a
New Game+ cycle one of these five completed through its own end satisfies the group; in later cycles a veteran can
enter none of them, so the group is satisfied by one completed in an earlier cycle. Each of them still earns its own
credit when completed. New Game+ is offered from the start as the Main Hall choice "7. Seek New Game+." (also a Hall
room command): before it is earned it names exactly what remains; once earned it asks to begin the next cycle (Y/N),
and the Quest Board shows the same offer. The character is never reset. Operator decision (2026-11-12, later): an adventure whose own
entry check now refuses the character as overqualified (the four beginner caves once no longer a beginner; The
Training Ground above armour expertise 25) is marked completed for that character, in the first cycle and every
New Game+ cycle, so no character is locked out of completion for a technical reason. For the tier gates the five
beginner alternatives count as one completion at most, whether credited, overqualified or both (Grok #3439): an
overqualified beginner adventure never stands in for a second, different adventure, so neither training alone nor
one beginner clear opens tier 2; The Wayfarers Inn, which admits anyone, is always the other tier 1 completion
needed, so no character is locked out of a tier either. Training warnings (operator 2026-11-12, #3444): the Practice
Area trainers warn only when the very next session would disqualify the character: while still a beginner (Don
Diego: training axe, club or sword; the beginner check ignores spear and bow; the armour master: any session), and
for the armour master, when this visit can take armour expertise above 25 and close The Training Ground. Never
otherwise, and never once a beginner adventure is credited. Decision with Grok (#3446), for the operator's review:
one visit to the armour master is a loop of paid strikes (+2 at most each), so a "session" is one visit, the only
unit ParchLock can warn at without forking upstream's menu; the warning shows when current expertise plus twice the
number of strikes the character's gold can buy (at upstream's own price) exceeds 25. Verified live for both trainers. It earns no credit or trophy; the Quest Board shows "(overqualified: completed)". Nothing has to be visited or selected to
activate it: it is read from the character's own record whenever the progression is checked. The Trophy Wall shows
the signed-in character's shelf for the current cycle (operator 2026-11-12): the trophies earned in this cycle, plus
the latest earlier trophy of an adventure the character is overqualified for (it cannot be earned again, so it
stays); trophies of adventures that can be played again leave the shelf when a new cycle begins and return when
earned again. The full trophy record stays in the campaign files. A restored slot that has lost its
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
  Rule clarifications (owner request, Grok audit #3434, 2026-11-12):
  - A. Tree: worn gear sits under Yourself and is tagged worn; held items are listed beside Yourself (allowed
    layout). The readied weapon is tagged "readied" and matches the engine's current weapon (built).
  - B. Only real in-containers and on-containers are drop targets; no pack slot. Under and behind are never drag
    targets; a PUT UNDER/BEHIND an adventure accepts belongs on the radial, never as a silent "put in".
  - C. Drag commands for Eamon: a content onto Yourself sends REMOVE <obj> FROM <container>; a directly held item
    onto Yourself sends nothing and says it is already in your hands; onto an open in-container PUT X IN Y; onto a
    supporter PUT X ON Y. A closed, locked, cyclical or unnameable drop is refused with its reason in ParchLock's
    dialog (built); a too-big one is sent and the game's own refusal shows. Wear and Ready are radial or
    Yourself-dwell choices, never a drop.
  - D. Gestures, desktop and Android WebView alike: a click or tap on a row opens the inventory radial (built);
    right-click and a 500 ms long-press open the same radial once; a swipe on the row scrolls; a drag starts only
    from the grip; dwelling 750 ms on Yourself opens the Yourself radial. Every path resolves the same object and,
    for taking a content out, the same REMOVE ... FROM command (built: the item radial and the Yourself radial now
    send it, never bare TAKE).
  - E. Open, closed, surface and readied are shown for Eamon from its own snapshot, without Z-machine memory (built).
  - F. During a nested prompt (a yes/no, a clarification) Equipment drags, radials and travel submit nothing.
- **Stats:** real values and units; base abilities, temporary boosts, wounds, armour and encumbrance kept
  separate.
  Partial (owner, 2026-11-13; WorldSnapshot.cs). Today only, inside an adventure at its top-level command
  prompt: health (Hardiness minus DmgTaken, of maxHealth = Hardiness), agility, armour class (state.Ar),
  speed, gold and the name. Missing: base Hardiness, Agility and Charisma as abilities; weapon abilities;
  spell abilities; armour expertise; encumbrance (weight carried of the limit); temporary boosts shown
  apart from base; wounds; and any stats in the Main Hall or during character creation (the snapshot is
  built only at an adventure prompt, so the panel was empty in the Hall). Reuse ParchLock's existing
  stat monitoring; no new panel. Work and acceptance: section 11 item 11.
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

**One Showcase in the library (owner, 2026-11-13: "There should only be 310").** Installing a Showcase package
replaces any other Showcase row: its row and package files are removed, while the campaign, maps and transcripts
(keyed to the stable Showcase identity) stay. The Showcase being played at that moment is removed at the next
library load instead, and a library that already holds two keeps the most recently added. BUILT, uncommitted;
tested on PC: dev, then N+1 imported, the shelf stays at 310 with only N+1, also after a reload.

**Campaign storage across package releases (decision with Grok, #3448/#3451, for the owner's review).** The
campaign's saved files are an overlay on the package's pristine bundle (changed files plus deletion markers). A new
package release with the same engine signature carries the campaign over (B); a changed engine signature refuses
to boot the campaign and offers export (C). Dropping all data on every release (A) is rejected: progress belongs
to the character. Plain carry-over is unsafe, so B holds only with four conditions, and until they are built a
different package digest takes the C path (refuse, offer export), never a silent carry-over:
- B1 ownership split: on a stamp change every overlay entry for a package-owned path (and its deletion marker) is
  dropped so the new package wins; only an explicit campaign-owned allow-list is kept (characters file, PLCHARS,
  PLCLEARS, PLTROPHIES, PLDEBRIEF, save slots with their PLRUN_n, other host-owned per-character files), in one
  store() transaction with the new stamp. A new file type fails toward the package.
- B2 slot fingerprint: each save slot records a fingerprint of its adventure's pristine package files; RESTORE of
  a slot whose fingerprint differs (or that has none) is refused with a plain message; the character and credits
  are untouched.
- B3 stable identity: fileset uids are append-only and adventure names never change (a package-build check
  against the previous release; a rename needs an old->new alias map applied on read). Earned credits stand even
  if a later contract is stricter.
- B4 import: a save package from another digest is accepted when the engine signature matches, through B1/B2;
  otherwise refused as now.
- C never deletes: a reset is only ever the player's choice after export has been offered.
- One notice per stamp change, with the count of slots that can no longer be restored.
Probes once built: p1 (changed adventure file wins, that slot refused, credit stands, other slots restore), p2
(engine change refuses boot and keeps data), p3 (export from N imports into N+1).
Built 2026-11-12 (groundwork, no behaviour change): every commit records the installed package digest as the
campaign stamp, the campaign export carries it, and boot notes whether it changed (verified live). Findings sent to
Grok before B is built (#3453): an in-progress adventure is itself overlay state (FRESHMEAT, FRESHGEAR, EAMONCFG, its run file and slot files; measured later: play never rewrites the package's own data files),
so it needs the slot fingerprint rule too; and the interim C rule would refuse the campaign after every rebuild.
Grok #3454 (accepted, built 2026-11-12): the interim C rule is dropped; B and C have separate triggers (the package
digest drives B and changes every build; a save-format number, changed only by hand and not before the owner's
review, drives C). Eamon deletes an adventure's slots whenever its character returns to the Hall, so slots exist
only for an adventure a character is in, and the slot rule becomes the afield rule: each adventure folder has a
fingerprint (a digest of its pristine package files, computed by the engine worker); on a package change the page
compares them, keeps only campaign-owned files (rosters, PL*.DAT, each adventure's PLRUN, SAVEGAME, FRESHMEAT,
FRESHGEAR, EAMONCFG and numbered slot files; never a path the package ships except the two rosters), drops every
other entry and deletion marker so the new package wins, and does not resume into a changed adventure. At the Main
Hall's first prompt, before the registration desk (which would otherwise offer its paid recall), the host returns
that adventure's character through upstream's own inner recall, free; upstream's -dgs hop then deletes that
adventure's old game state and slots (upstream's meaning of recall; the message says so). A missing FRESHMEAT fails
closed with a plain message. A changed save format refuses the campaign and changes nothing. The package itself
ships no file in the campaign-owned patterns (checked). ParchLock's own Eamon state lives outside the campaign
files (see the finding below). Verified on Windows with three test packages: afield in a changed adventure (free
recall, gold unchanged, no desk question, slots and game state deleted, plain message); in the Hall (15 stale
deletion markers dropped, campaign kept, one notice); afield in an unchanged adventure while another changed (resumed,
the slot still restorable); a changed save format (refused, nothing changed). At this point (later resolved below): the APK path, B4 import across releases, and ParchLock's story-keyed records
were open; B4 and the keying are now built (D1, D2). "Start a new campaign" after a refusal deletes user data: owner question 6.
Grok #3456 (built 2026-11-12): an adventure the package did not change keeps every saved entry as it is; the
allow-list applies only to changed folders and System/Bin (F1). Measured: Eamon never keeps an unsaved live world
(a relaunch after moving, with no package change, starts again at the adventure's entrance; only save slots carry
state), so this is a safeguard. A failed recall now says the character is still adventuring there and the desk can
recall them (N1). Gear survives the recall (sword, leather armour and shield listed afterwards and after later
reboots, N2). A campaign saved before fingerprints existed treats every adventure as changed, so on its first boot
under this build every character afield is recalled once (N3, for the owner). Fingerprints cover adventure data
files only: a change to an adventure's compiled code that alters its saved state needs the save-format number
raised by hand (N4). Each adventure's slots exist only while its one character is afield there, so comparing
fingerprints at each package change is equivalent to per-slot fingerprints, provided campaign files are never
written without the meta record in the same transaction (accepted). D2 built: an approved Showcase package's
ParchLock records (maps, map slots, radial and sheet preferences, save-package story name) are keyed by the stable
id "eamon/showcase", so they survive a package update (verified: the Training Ground and Main Hall maps were there
after the update); other stories are unchanged; older digest-keyed maps are left in place and not read (owner
question 7). Learning and transcripts are keyed by the executable digest and story path by design and still start
fresh with each package. D1 built: a save package from another Showcase release imports when its save format
matches, then carries over at reopen. Regression 8/8.
Grok #3458: f224afde accepted. Notes for the owner: (D2-a) removing a Showcase release from the Library no longer
deletes its maps, which are now the campaign's (consistent with "campaign progress is kept"); (D2-b) removing a
release still deletes that release's transcript, so removing the old release after updating loses its transcript
(owner question 8); (D2-c) save packages exported before f224afde name the old story file and are refused as another
Showcase version (development only). Download Package round trip verified 2026-11-12 (two fresh profiles): exported
on one release with a character afield in the Training Ground; on the next release a copy marked save format 2 is
refused ("saved in a format this Showcase cannot read"), the real package imports, and on reopen the campaign is
carried over (the Training Ground had changed, so its character was recalled free), with all 20 campaign files and
both maps present. To make that work, a Showcase package from another release keeps its transcript lines and its
saves' map snapshots under the open release's digest instead of being refused for them (other stories unchanged).
Grok #3460: accepted. The update recall's -dgs hop deletes the adventure's slots outside the plugin loop, so the
host now reports those saves deleted after the commit, as on an ordinary exit (verified: the imported Training
Ground save's transcript and map snapshot were present after the import and gone after the recall). Note: an import
replaces the campaign files wholesale, but transcript, snapshot and ledger records are written per imported save
name, so records of the device's earlier campaign under other save names stay behind unshown (as for any story's
save package today). Upstream's own paid recall at the registration desk runs the same nested hop and does not
report its deleted saves either; decided with Grok (#3462): fixed the same way, because an ordinary player action
otherwise leaves transcript lines and map snapshots naming deleted slots. A ParchLock subclass of upstream's desk
(registered like the Hall's other menus; upstream source unchanged) reports the recalled adventure's saves deleted;
the update recall uses the same subclass. Saves are named by each adventure's own MODULE.DAT name, since one Main
Hall fileset name differs (Demo Adventure; all 23 checked). Verified: paid recall from the Training Ground with a
saved slot charged upstream's fee exactly (22 - 99 = -77, with upstream's lien text), and that slot's transcript and
map snapshot left ParchLock. Regression 8/8.
Grok #3464: the recall and carry-over chain (#3453 to #3463) is accepted end to end on Windows. Still to do before it is done: the APK probe (a character afield in a changed adventure on the phone build, and one save-package round trip), at the next APK build.

**Owner answers (2026-11-12, relayed by Grok #3471), replacing the parked questions.** (1) Updates carry a campaign
over whenever possible; if an update would break a campaign, the player is warned before updating and offered export.
(2) The Great Tapestry stays text; no graphic campaign map. (3) No keyboard access for the Equipment sheet; the typed
parser covers it; not a follow-up. (4) The armour-master warning judges the whole visit: it warns only when the strikes
the character can afford could take expertise above 25 (25 still qualifies; The Training Ground refuses above 25),
confirmed in code (ProgressionGate.TrainingWarning: expertise + 2 x affordable strikes > 25; Outgrown: expertise > 25).
(5) The Pyramid of Anharos: effect 51 (tomb restored, the cloud gone, no companion to testify) is a clear, so the
companion requirement is dropped (contract: KV == 1 and KF != 1); The Tower of Eamon keeps its contract (the Book of
Evil Plans carried out, contents counted); Escape from Mt. Moon stays as settled (exit room 12 past the beaten Rocket
boss). (6) "Start a new campaign" after a refused campaign: only after export has been offered, with a plain
confirmation that the old campaign and its characters will be permanently deleted. (7) No migration of maps from
earlier dev packages (development needs no backward compatibility). (8) ParchLock's save rules apply: everything
attached to a save (map snapshots, transcripts, learning) persists with that save and is deleted with it, never reset
by a new release; every Showcase system (import, inventory, saves, maps, narration, navigation, learning, transcripts)
is audited for hooking into the right ParchLock save system, and orphaned dev-build maps not attached to any save are
cleaned out.
Built 2026-11-12, item 6: a refused campaign shows the reason with Download Package and Start a new campaign side by
side; starting a new campaign asks once more ("This permanently deletes the old campaign on this device: all its
characters, their progress and their saved games. This cannot be undone.") and only then clears the campaign files and
reopens. Verified: the dialog and both buttons; Download Package carries the campaign; Cancel deletes nothing; confirm
clears it and the Showcase starts fresh at the outer chamber. Item 5 built (Pyramid contract). Item 4 confirmed in code.
Built 2026-11-12, item 1: before a new Showcase package is installed, the import computes its per-adventure
fingerprints the way the engine worker does and compares them with the campaign's record; if a character is afield in
an adventure the update changes, it says so by name ("Parch Tester is adventuring in The Training Ground"), explains
that they would return to the Main Hall as they set out and lose that adventure's progress and saves, points to
Download Package, and installs only on Yes. Verified: a package changing The Training Ground asked and, declined,
changed nothing (the campaign stayed on the old package); a package changing only Beginner's Cave II installed without
asking and carried the campaign over. A save-format change arrives with an app update, which cannot be intercepted
beforehand; that case is the refusal with Download Package and Start a new campaign (item 6).
Grok #3479: Download Package now always says what happened ("Copy saved as <name>." or why it could not be made);
Start a new campaign also forgets the deleted saves' transcripts and map snapshots (verified: none left, campaign files
0). Owner to confirm: both buttons appear together with Download Package first, and the confirmation points back to it
(read as "only after export has been offered"). A campaign that never recorded fingerprints warns for every afield
character (fails safe). The update check was also verified with a character afield in an unchanged adventure: no
warning, and after the update the game resumed in that adventure with its save. On the phone, still to check that the
WebView shows these confirmations (a WebView that answered No would cancel silently).
Built 2026-11-12, item 8 (design accepted by Grok #3479). Audit of every Showcase system: import/export, the
Equipment sheet, saves (lifecycle to transcripts, snapshots and playthroughs; deleted saves forgotten, including after
either recall), maps (stable key), navigation (live map) and narration (nothing story-keyed) already followed the save
rules; transcripts, per-save map snapshots and learning were keyed by the package digest and reset by every release.
Now an approved Showcase has one fixed identity (ModuleLibrary SHOWCASE_IDENTITY) for those three, so they follow the
campaign and leave only with their saves; the package id still names the installed files, the approval and the
campaign stamp. Every digest consumer was checked: the Z-machine and Glulx fact lookups have no Eamon entry, the save
identity needs a story header Eamon lacks, and the learning, transcript and snapshot stores are meant to carry over.
Removing a release from the Library keeps the campaign's transcripts and snapshots (it drops only that release's
pointer). At Showcase start, records of earlier builds that no save is attached to (maps and map slots under
"local/<id>.eamon.js", old transcripts and snapshots) are removed; learning is left to its own cleanup, which keeps
its index consistent. Verified: a save's transcript and snapshot survive an update to another release and the removal
of the old release; planted old-build records are removed and the campaign's own are untouched. Regression 8/8.
Grok #3481: whether a story is the Showcase is decided from what is installed (an Eamon package is approved when it
is installed), never from the current app's approval list, in all three places (the stable map key, the identity, the
cleanup); the cleanup never touches the running release or any installed one, and remembers Showcase ids it has seen.
Verified: after a simulated app update that no longer approves the installed release, two relaunches still keep
everything under the stable names (nothing written under the old id; the save's transcript and snapshot intact).
Start a new campaign now also clears the campaign's transcript, save snapshots and live maps; learning stays (it is
ParchLock's knowledge of the game's words, not campaign progress; owner to confirm). Verified: afterwards the
transcript and maps are empty and the learning record unchanged.

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
9. Equipment and inventory checks (owner request, Grok audit #3434), each a scripted, observable step on desktop
   and on the Android WebView:
   - EQ-TREE-1 Yourself and custody: with worn armour and a held weapon, Yourself is present, worn gear under it
     tagged worn, the weapon carried, no synthetic pack, and the tree equals the engine's custody after INVENTORY.
   - EQ-TREE-2 readied: readying a weapon tags it readied; readying another moves the tag.
   - EQ-TREE-3 empty and Hall: an empty inventory shows nothing invented from room objects; before a Hall character
     is chosen the sheet shows honest absence, not another character's gear.
   - EQ-TREE-4 Eamon state tags: an open and a closed in-container look different, a supporter is marked a surface,
     without Z-machine memory.
   - EQ-NEST-1 contents rule: in-container contents appear only when open, shown-when-closed, Seen or just listed;
     an under/behind find only after the game lists it (Test Adventure sapphire, Wayfarers Inn); a reload forgets an
     unseen look-under find until the player looks again.
   - EQ-DROP-SELF-1 remove from container: dragging a content onto Yourself sends REMOVE ... FROM, the engine
     accepts, the item becomes held, the tree matches.
   - EQ-DROP-SELF-2 already held: dragging a held item onto Yourself sends nothing and says why.
   - EQ-DROP-SELF-3 wear and ready via dwell: dwelling on Yourself offers Wear for a held wearable and Ready for a
     weapon; a plain drop does neither.
   - EQ-DROP-IN-1 put in: onto an open held in-container sends PUT X IN Y and nests; a too-big item shows the game's
     own refusal and the tree is unchanged.
   - EQ-DROP-IN-2 closed or locked: no command is sent and the reason shows; after opening, EQ-DROP-IN-1 works.
   - EQ-DROP-ON-1 put on: onto an on-container sends PUT X ON Y (if no Showcase adventure has one, recorded and
     skipped; no invented supporter).
   - EQ-DROP-UNDER-1 under/behind: a drag never sends "put in" to an under/behind holder; a real PUT UNDER/BEHIND is a
     named radial action, or the check is marked inapplicable.
   - EQ-DROP-ROOM-1 room container: a room chest is not an Equipment drop target; putting into it goes through the
     radial's Put... picker, and a closed one is refused by the game without moving the item.
   - EQ-GESTURE-1 click/tap: a click or tap on a row opens the inventory radial, on mouse and WebView.
   - EQ-GESTURE-2 long-press and grip (WebView): 500 ms opens the radial once and submits nothing; a swipe scrolls; a
     grip drag on a legal target submits the same command as the desktop drag.
   - EQ-GESTURE-3 nested radial: a content's radial offers Examine and a take-out that sends REMOVE ... FROM, never
     bare TAKE; the Yourself-dwell radial sends the same command.
   - EQ-GESTURE-4 held-item radial: only Eamon verbs appear; Drop sends DROP X; Give... and Put... open a target
     picker and send GIVE X TO Y / PUT X IN (ON) Y.
   - EQ-GESTURE-5 keyboard: a keyboard user can reach a row and open the same radial, or the plan states that
     keyboard access is out of scope for this release (to be decided).
   - EQ-PROMPT-1 nested prompt: at a yes/no or clarification prompt no Equipment drag, dwell or radial submits into
     the field; afterwards the tree matches the engine again.
   Done 2026-11-12 and verified live (Alternate Beginner's Cave box): EQ-TREE-2 and -4 tags, EQ-DROP-SELF-1 and -2,
   EQ-GESTURE-1 and -3, EQ-DROP-IN-1 (put in, and "It won't fit."). EQ-PROMPT-1 verified live and fixed: at the save
   dialog's "Enter new name:" fast travel had typed "north" (a game saved under that name); ParchLock's own commands
   now never type into an Eamon nested prompt (refused, "The route command was not accepted."), and the Equipment
   sheet is empty there. The player's own answers still reach a nested prompt (Grok #3441): a spoken answer goes
   through (verified live: a save named by voice), and an empty Send there is an answer, never a repeat of the last
   command; only ParchLock-originated sources are refused (an allow-list, so new callers fail closed). The unused EamonProvider.nativeCommands path is removed. Done 2026-11-12: nested-prompt clearing verified live
   (after a save at "Enter new name:" the game is back at the top level and the Equipment tree matches the engine:
   sword readied, leather armor and shield worn); recoverInventory checked from source as inert for Eamon (room
   objects are never worn and monster-held artifacts are never listed, so an empty inventory recovers nothing and no
   monster can be promoted to holder). EQ-GESTURE-5 sent to Grok (#3450): Equipment has no keyboard path for any
   engine, so out of scope for this release (Grok #3452 ACCEPT, owner question 3), on two conditions: K1 every
   Equipment action has a typed Eamon command the parser accepts (TAKE, DROP, GIVE X TO Y, PUT X IN/ON Y, REMOVE X
   FROM Y, WEAR, REMOVE), each typed and checked in the engine tree; K2 with the sheet open, Tab and Enter still reach
   the line input and Send and nothing in the sheet swallows keys (a trap would be a bug to fix now). For Eamon an
   empty Send after a reload has nothing to repeat (history is this session's top-level sends only; intended, Grok
   #3451). K1 verified live 2026-11-12 (Alternate Beginner's Cave box, typed through the keyboard path): REMOVE
   KNIFE FROM BOX, DROP, GET, PUT KNIFE IN BOX, REMOVE SHIELD, WEAR SHIELD all accepted by the engine, and the final
   tree matches it (dagger in the open box, shield worn, sword readied). GIVE verified the same way (the bird): GIVE
   5 TO BIRD reaches the game's own "Are you sure (Y/N)", GIVE SHIELD TO BIRD gets the game's refusal, and the tree
   follows (shield held after REMOVE). PUT ON verified in Test Adventure: PUT SHIELD ON STUMP ("Done."), the shield
   leaves the inventory and is listed on the rotting tree stump; K1 is complete. The Showcase's on-containers found so
   far (Test Adventure stump and chest, Wayfarers Inn furniture) are room fixtures, so EQ-DROP-ON-1's held
   on-container drop has no case yet (recorded, as its rule allows). K2 verified: the sheet has no key handlers and no positive
   tabindex, the line input stays focusable with the sheet open, and the only key the open sheet suppresses is the
   Ctrl+Shift+Arrow move; Tab on the line input is ParchLock's autocomplete for every engine (B7), unchanged by the
   sheet. Existing-module regression 8/8 after these shared JS changes.
   Verified 2026-11-12 (Test Adventure, the character's own mountain backpack, read through EquipmentUI's own model and
   rules): EQ-DROP-IN-2, closed backpack: a drop sends nothing and says "mountain backpack is closed."; after OPEN the same
   drop sends PUT SHIELD IN MOUNTAIN BACKPACK. EQ-GESTURE-4: the held-item radial lists only Eamon verbs (examine, wear for
   the shield, drop; Give... and Put... open their pickers as GIVE X TO / PUT X IN). EQ-TREE-1: Yourself with worn leather
   armour and shield, sword readied, no invented pack (the nested-prompt clearing probe). EQ-DROP-SELF-3 in part: Yourself
   offers Wear for a held shield and no Ready for the already readied sword; Ready for an unreadied weapon still needs a
   second weapon. By design, not a defect: Yourself also lists the game dictionary's verbs as typed-line suggestions
   (shared design D214 U5; they fill the line, they do not send; Grok #3466 ACCEPT). Fixed (Grok #3466): an openable
   container's radial offered both Open and Close whatever its state, a wrong option; the shared open/close filter
   (ActionSynth.authoredCommandAllowed via AttributeSchema.containerOpenState) now gets the engine's exact open state
   from the Eamon adapter, null (both, as before) unless the id is exactly one in-container; a locked container is
   closed, so Open stays and the game says it is locked. Verified: closed backpack offers only OPEN, open only CLOSE;
   Glk stories untouched (the hook is Eamon-only), regression 8/8.
   Verified 2026-11-12 (Test Adventure, scripted, read through EquipmentUI and ActionSynth): EQ-DROP-SELF-3 complete:
   the flashlight taken from the stump (a weapon, not readied) offers Ready from Yourself. EQ-TREE-3: after DROP ALL
   the sheet holds only the worn leather armour and shield, nothing from the room; at the outer chamber, before a
   character is chosen, the sheet is empty. EQ-NEST-1: the jewelry box under the stump (and the gold ring in it)
   appears only after LOOK UNDER STUMP; an unsaved find is never kept across a relaunch, since Eamon restarts an
   unsaved adventure from its module files (measured for #3456). EQ-DROP-ROOM-1: room containers (the stump, the
   iron-bound chest) are never Equipment rows or drop targets; the held sword's Put... picker lists the room's
   containers first (chest, cabinet, cube); PUT SWORD IN IRON-BOUND CHEST while it is closed gets the game's "You must
   first open it." and the sword stays held; the closed chest's own radial offers only OPEN. EQ-DROP-UNDER-1:
   inapplicable as its rule allows: no Showcase under/behind holder is ever a drop target (they are room fixtures),
   and no radial sends PUT IN to one. Grok #3468 F1 applied (open state is null unless the snapshot gives a boolean;
   it always does). All Equipment checks are done on desktop; EQ-GESTURE-2 waits for the phone build. Remaining desktop checks verified below; EQ-GESTURE-2 is phone-only.
10. Real-input acceptance (2026-11-12). Every Eamon menu and prompt is checked by real taps on the
    Android APK and by real keypresses and clicks on Windows, including an idle longer than the
    input-relay POLL_MS (20 s) before answering; script-injected input does not count for this item.
    Map exits are compared against the engine's exits across all 20 adventures (map-versus-engine
    audit), with mismatches listed.
    PC, real input, fresh load (2026-11-13, Build 90 tree plus the fix below; real pointer clicks and typing in
    Chromium, not script injection): D (click), name (typed), Y, gender 0, N, and T after a 21 s idle all answered;
    each prompt underlines exactly its own keys; Main Hall menu lines underline only 1-7 and X, the radial offers
    the same keys, no overlay. Fixed on the way: answered single-key prompts stayed underlined and on the radial
    (a single-key answer leaves no typed echo to cut at), so a stale Y could be sent to a later prompt; the engine
    now reports the waiting question's text (zvm state.promptText, everything printed since the previous answer)
    and only that question's lines carry prompt keys (Actionable.inCurrentPrompt; EamonProvider reads the same
    text for the radial). Existing-module regression 8/8. Phone rerun pending (Build 87 phone results: blocked by
    the input-relay 204 crash, fixed in Build 88).
    Grok #3513 follow-up (Build 92 tree, real input): a refused typed answer re-asks the same question and its keys
    stay underlined (D/M after Q, Y/N after q, Main Hall 1-7/X after 9; zvm appends a short re-ask with the same last
    line to promptText); opening and closing the map and Equipment keeps them; a reload reprints the question with
    its keys; at creation prompts outside any room the radial offers the prompt keys (Y, N) and a real click on Y
    answered it.
    Grok #3515 S1 (Build 93 tree, real input): a nested prompt is answered only through the prompt-key controls (the
    underline, and radial entries the prompt layer built, marked promptKey); at Y/N and at the Good Witch menu a
    one-letter Submit with no source (a compass chip), a fast-travel step and a probe were all refused and the prompt
    and its keys stayed; the underlined N, radial D and radial Y each answered. Modes (N1): D/M, the name, the Main Hall
    and the Village are line prompts at Hall safe points (room input by design, section 2: their keys are the room's
    exits); Y/N, gender 0/1, the suicide Y/N, R/T and the Good Witch 1-4 are single-key nested prompts, and an invalid
    key there prints nothing, so the keys stay. No map room exists at any creation prompt (N3). When the story ends
    the waiting question is cleared (N2). Build 93 (ParchLock-dist-b93) carries these; phone rerun on it pending.
    Map-versus-engine audit (2026-11-13, probes/map-audit.cjs, real game input): in each of the 20 adventures the walk
    follows the engine's own exits for up to 8 moves and compares, at every top-level prompt, the engine's Obvious exits
    and room with the map's current room and its exits. First run: 166 checks, 28 mismatches, of three kinds. (1) Every
    adventure's first room was missing from the map until the player left it: MapTopology's first-room gate still asked
    an Eamon room to be "announced", and Eamon's heading "[Entrance]" never matched; an Eamon room (the engine's own
    record, sent only while the player is in a room) is now admitted at once (Grok #3521 P1). (2) A Y/N question asked
    inside a room (The Temple of Ngurct, The Wayfarers Inn) put its keys on the map as exits ("y"; "n" hid inside north):
    prompt keys are now never map exits. (3) The Pyramid of Anharos had no world snapshot at all (no map, no exits, no
    underlines): its own IsDarkEnabled override reads the actor's room, which the engine sets only while a command runs;
    the host now gives each listed command the player and the current room for that read and restores them (host change,
    needs a package rebuild). After the fixes: 175 checks over all 20, 0 mismatches. Every start room is lit and has
    exits. Curses and Vespers still refuse their epigraph room until it is announced, and The Hitchhiker's Guide's dark
    Bedroom is still admitted (before and after identical). A reload mid-adventure restarts at the start room (engine
    truth) with no duplicate node.
    Start rooms (Grok #3521 P4): all lit with exits, e.g. The Pyramid of Anharos, Desert's Edge (east, west). In-adventure
    menus that move the player (Grok #3523 F1, upstream source search): only The Pyramid of Anharos's flying carpet
    (SAY SOAR WITH ALAXAR while carrying it, then "1=Pyramid; 2=Obelisk; 3=Oasis; 4=Main Hall"), an item's teleport
    offered in whichever room the player speaks, not a room's own menu; the map adds the destination as its own room
    with the engine's exits and draws no line from the room left (verified with real input: Desert's Edge to At
    Obelisk). Every other in-adventure prompt key is an answer (Leave this adventure Y/N, yes/no, press a key), never
    travel, so no prompt key is a map exit. At an in-room Y/N the direction compass shows only the engine's exits, the
    radial offers the prompt's Y and N, a compass direction sent there is refused, and the radial N answers (real
    input, Grok #3523 C1). A throwing author override now costs only that verb in the world snapshot, logged as
    "[world] verb left out" (Grok #3523 F2); the snapshot is built on the engine thread at an input wait.
    Build 95 (ParchLock-dist-b95; package 408f8bbe, contract self-check 20/20, map audit 175 checks with 0 mismatches)
    carries every fix in this item and is the build for the phone rerun (APK SHA-256 554d1c70f769871c...; the APK alone
    also trusts the N+1 update-test package b05f6e71, injected at build time through EAMON_TEST_TRUST; the desktop folder
    and source archive trust only 408f8bbe, and tools/check-trusted.cjs fails any build whose trust list differs, and any
    release build given a test trust; Grok #3525). Ready for the owner.
    Phone acceptance checklist for Build 95 (P1-P7, defined on the bus: Claude #3494 probes and pass
    criteria, #3495 APK handoff, #3497 P7 addendum; later rerun requests #3512 and #3531). Real taps
    only; script-injected input does not count. Include an idle longer than the input-relay POLL_MS
    (20 s) before answering, and confirm prompt-key underlines survive opening and closing the map and
    Equipment (this item).
    P1 EQ-GESTURE-2 (Equipment, also item 9): in any adventure with held items (e.g. Alternate
    Beginner's Cave after buying a sword): (a) long-press a row ~500 ms, the inventory radial opens
    once and nothing is submitted; (b) a vertical swipe on the list scrolls it and opens no radial;
    (c) a grip-drag of a held item onto Yourself or onto an open held container sends the same command
    as the desktop drag. Pass = a/b/c as stated.
    P2 Carry-over (the APK probe still open after Grok #3464): on N (EamonShowcase-dev.eamon, 408f8bbe),
    create a character, enter The Training Ground, SAVE once (slot 1), go back to the Android home
    screen (don't quit). Import N+1 (EamonShowcase-next.eamon, b05f6e71, changes only The Training
    Ground; trusted in this APK only) from Modules and open it. Pass = the import first warns "This
    update changes an adventure a character is in ... Update now?" (answer Yes; also checks
    window.confirm in the WebView), then an "Eamon Showcase Updated" message: the character was
    returned to the Main Hall, no fee, and READ LEDGER says "in the hall".
    P3 Save package round trip (the other half of the #3464 APK probe): on N with some play,
    Save/Restore -> Download Package, then Import Package on the same phone. Pass = "Import Complete"
    and the campaign and maps are still there after reopen.
    P4 New campaign / save records: skip unless adb devtools (chrome://inspect) is available. If it
    is: in devtools set IndexedDB parchlock-eamon meta.state.schema = 2, reload -> the "Eamon
    Campaign" dialog with Download Package and Start a new campaign; Start -> confirm -> fresh outer
    chamber.
    P5 Durable saves / offline restart: in an adventure, SAVE, then force-stop the app (adb shell am
    force-stop com.parchlock.app), turn on airplane mode, relaunch, open the Showcase. Pass = it opens
    offline, the character and the save are there (RESTORE lists the slot).
    P6 Outer chamber: at "Press D for desk or M for men", D and M are native underlined tappable keys
    (owner ruling, Grok #3500), not the words desk or men; the radial offers the same keys; no floating
    overlay label; the map shows "Outer Chamber"; "read sign" prints the sign and asks again.
    P7 Gate G1, Android leg (plan section 4): with the Build 95 APK and EamonShowcase-dev.eamon, via
    chrome://inspect on the WebView (or adb logcat if devtools are not available), record: (a) cold
    start = from app launch (adb shell am start -W com.parchlock.app/.MainActivity gives TotalTime)
    plus from opening the Eamon Showcase library entry to the first prompt ('Press D for desk or M
    for men'); (b) command round trip after 10 ordinary adventure commands (e.g. in The Training
    Ground: look, n, s, inventory...), read window.__PARCHLOCK_EAMON__.state.turns (ms per turn, page
    side). Targets: cold start <= 5 s, round trip <= 200 ms. Note anything that froze the UI. (Build
    87 already recorded activity start 353 ms and library entry to first prompt 1368 ms; the
    round-trip wait is on this build.)
    Status (2026-11-13): Build 95 installed on the phone at 5:54 AM ET after an app-data backup at
    C:\Users\hymlo\Downloads\phone-backup-pre-b95\; the run was blocked on the phone lock screen
    and has not been run (Grok #3533).
    Builds 92-94 (desktop folders and source archives) also trusted b05f6e71, from a hand edit made before that guard;
    they are superseded and are not to be shared.
    All-games regression gate against HEAD 25264d6e (work/investigations/regression-gate.cjs; 298 Z-machine games in
    three shards and 11 Glulx games, outputs outside the repository): the first run differed in the underline marks of 8
    games (Help, Inevitable, Jigsaw, Mask, cabal, jet, medusa, terror_tabby). Rerunning those 8 on both trees, the
    baseline rerun differed from its own first run in Help, Inevitable, jet, medusa and terror_tabby, the candidate rerun
    from its own in Jigsaw, Mask, cabal and medusa, and the two reruns differed only in medusa (alternating with and
    without "mirror" on both trees): every difference flips on the same tree, so none is a regression. Glulx: 0
    differences across two runs of each tree.
    Grok #3541 conditions (uncommitted, not in a build; 2026-11-13). Item 1 completeExits prune was
    already in MapTopology.isLive / applyPayloadExits: a cardinal "down" is not kept alive only because it
    shares command "d" with keyExit D. Verified live on a map seeded with a stale Down at Outer Chamber:
    after the visit prune, ExitMeta is only D and M and the Down edge is gone (b96pre-stale-down-pruned.png).
    Item 2: numbered/lettered menu patterns and "1=Label" are gated by EamonProvider.isAdventureCommandPrompt
    (an adventure's GetPlayerInputState / printed ">"), in promptKeySpans, promptChoicesFromText and
    isChoiceMenuLine. At the Main Hall, 1-7 and X stay underlined and survive opening and closing the map
    (real clicks, b96pre-main-hall.png, b96pre-hall-map-closed.png). Live walk with real clicks and typing
    (2026-11-13, about 8:00 AM ET): from the Hall list into Alternate Beginner's Cave, Space at "Press any
    key to continue", then the adventure ">" at East/West Road. No numbered or lettered prompt-key
    underlines in the room text; the compass radial offers only E and W (b96pre-adventure-prompt.png,
    b96pre-adventure-no-menu-keys.png, b96pre-adventure-radial.png). The first rooms walked (n, e, s, w,
    look around East/West Road) have no numbered or lettered description line; that is recorded, not a
    failure.
    Item 3: zvm flush no longer appends once "Enter the selection" is already in promptText (cap 8000).
    Verified with real typing: at the selection, keys 1-23 and X are live; a refused "zzzz" left promptText
    at 1537 characters and kept those keys (b96pre-selection-refused.png). A page reload mid-list does not
    keep page-1 keys: promptText is in-memory only, and the Showcase restarts at the Outer Chamber. That
    loss is acceptable and is recorded here.
    The earlier report that later runs lost the LineInput after the refused "zzzz" is a test-harness
    artifact, not a product bug, and is not caused by the promptText bound or the
    isAdventureCommandPrompt gate. After a refused "zzzz" at "Enter the selection", a visible LineInput
    remains; real typing of "hello" appears in the field (no Enter); a real click on a list key still
    enters an adventure. The same after-zzzz typing check also holds on the clean Build 95 dist, which
    does not have those edits (b96pre-zzzz-then-hello.png, b96pre-b95-zzzz-then-hello.png). Earlier
    Playwright failures were a stale locator after the engine replaced the input node, or a wait for
    LineInput at a later char prompt or after a mid-list reload.
    Phone finding (ii): EamonProvider.verbAllowedFor filters Yourself / inventory radial verbs and
    addMoreActions suggestions, Eamon only. Live inventory radial on a real held sword (already the ready
    weapon after a shop purchase) in Alternate Beginner's Cave: Eat, Drink and Wear are absent; Ready,
    Examine and Drop are present (b96pre-equip-open.png, b96pre-sword-radial.png). An extra uncommitted
    fix was needed for that last verb: attrs.readyWeapon is now set for every weapon, including one
    already readied (previously only if !o.ready, so READY was omitted for a just-bought sword). Edible /
    drinkable / wearable flags still allow those verbs (unit 11/11). Z-machine radial paths are unchanged.
    Existing-module regression 8/8 after this change (z3, z5, z8, zblorb, gblorb, ulx, plus offline z5
    and ulx). These fixes are not in a build yet; Claude owns the next build number. Phone retest waits
    for that build.
    Help-at-start remains the intended setting (owner ruling).
11. Stats completion (owner, 2026-11-13). Finish the section 7 Stats display, still partial on Build 95.
    Show, through ParchLock's existing stat monitoring (no new panel): base Hardiness, Agility and Charisma;
    weapon abilities; spell abilities; armour expertise; encumbrance (weight carried of the limit); temporary
    boosts shown apart from base; wounds; and a Hall and character-creation source for the same figures, not
    only at an adventure's top-level prompt. Acceptance: a live real-input check on PC and on the phone that
    every shown value equals the engine's own figures (for example the Hall's status or character screen).
    Design (Claude, 2026-11-13; for Grok's review): the Build 95 card already shows charisma, intellect, armour
    expertise, bank and weight carried, but by sending Eamon's STATUS behind the scenes and parsing its text (the
    generic stat probe), which works only at an adventure prompt. Replace that with data: the host's world snapshot
    carries exactly what the engine's own StatusCommand passes to StatDisplay (StatDisplayArgs): health and wounds
    (Hardiness - DmgTaken of Hardiness), Intellect and Charisma (character), Hardiness and Agility (monster; with a
    speed spell active the base Agility and the doubled value apart, with GameState.Speed turns left), the five
    weapon abilities, the four spells as current energy (GameState.Sa) of the base ability, gold and bank, the
    armour worn and armour expertise, and weight carried of GetWeightCarryableGronds(Hardiness). An adventure that
    hides skill stats in its own STATUS hides them here too. In the Main Hall (and once a character exists during
    creation) the Hall character's base values come the same way, without what only an adventure has (weight
    carried, spell energy, boosts). EamonProvider writes them into ParchLock's existing stat model as confirmed
    engine values; the Showcase no longer uses the STATUS probe. Host change: needs a package rebuild and pin.
    Each adventure's own STATUS is the presentation rule (source read 2026-11-13). Generic (EamonRT StatusCommand +
    Engine.StatDisplay): name, gender, damage taken of hardiness; intellect with "Learning: +N%"; agility, "x2" while
    a speed spell lasts; hardiness; charisma with "Charm Mon: +N%"; weapon and spell abilities unless omitSkillStats
    (ruleset 5.62 with a game state); gold, bank; armour worn and armour expertise; weight carried of the limit.
    Adventure profiles: The Vile Grimoire of Jaldi'al shows only "You are at N percent health" and the conditions
    "paralyzed" / "agility impaired" (the author hides the rest; the card shows only those); The Beginner's Cave
    adds "Trollsfire is alight!" while it burns (an effect); Alternate Beginner's Cave shows Hardiness as base "+5"
    while its magic dagger works (MagicDaggerCounter; a temporary boost); Firestorm has no spell block and its own
    health wording; The Temple of Ngurct runs the generic display under ruleset 0. The other 15 use the generic
    display. Every one is checked against its own STATUS with real input.
    Grok #3554 (accepted with): D1 the ruleset hides STATUS in more adventures: StatusCommand is not player-enabled
    under ruleset 5.62, and StatDisplay omits skill stats then; DharmaQuest (5), Orb of My Life (62) and The Pyramid
    of Anharos (62) have no STATUS at all, and The Deep Canyon (5) re-enables it without skill stats. The profile is
    read from the engine (StatusCommand.IsPlayerEnabled and omitSkillStats as STATUS would compute them), not from
    a list; where STATUS is disabled the card shows no more than the game does (health only, or nothing; the
    author's rule). Firestorm and Alternate Beginner's Cave compute omitSkillStats themselves; Firestorm and The
    Temple of Ngurct push rulesets only around certain calls. D2 also send what base StatDisplay prints: name,
    gender, damage taken, the learning bonus (GetIntellectBonusPct) and the charm factor (GetCharismaFactor), and the
    armour name (from Ar and Sh). D3 Land of the Mountain King overrides armour expertise and every weapon and spell
    ability during play and restores them on exit: the Hall values come only after that restore (in the acceptance
    list). D4 The Beginner's Cave's Trollsfire line comes from AfterPrintPlayerStatus, a host field. Retire the
    STATUS probe only after a per-field diff shows the snapshot gives every value the probe gave.
    Built (2026-11-13): host StatsSnapshot.cs (Adventure and Hall), carried in the world and Hall snapshots as
    "status"; EamonProvider.applyStatus writes it into the stat model (source "eamon-native"), and StatTracker skips
    the STATUS probe for the Showcase, so no hidden command is sent. Package 7aca797d (0.1.0-dev) is the repository
    pin; the temporary candidate trust is gone.
    Evidence: the Hall and The Training Ground card values equal the engine's STATUS, with no hidden STATUS sent
    (stats-card check). The map-audit STATUSCHECK=1 run types STATUS for real at the first room of all 20
    adventures and compares the card field by field: 20 of 20 match. That covers damage and health, intellect,
    hardiness, agility, charisma, gold, bank, weight of the limit, and weapon and spell presence. 15 adventures use
    the full display, The Vile Grimoire of Jaldi'al shows its health percentage, and 4 show health only. The 4 are
    DharmaQuest, Orb of My Life, The Pyramid of Anharos and The Temple of Ngurct. In each of those the game itself
    answers STATUS with its command list, so the engine read is right; the Temple line above was wrong on that.
    Still open:
    - States that appear only in play: the speed spell's x2 agility, Alternate Beginner's Cave's dagger +5, The
      Beginner's Cave Trollsfire, Jaldi'al's two conditions, and the Land of the Mountain King Hall values after the
      restore (D3). These are built from the same engine reads but not yet driven live. Checked against the source
      (2026-11-13): the reads use the same tests as each author's own STATUS. Those are Jaldi'al's
      ParalyzedTargets and ClumsyTargets keyed on Cm, The Beginner's Cave's artifact 10 carried with Trollsfire == 1,
      and Alternate Beginner's Cave's MagicDaggerCounter > 0 showing Hardiness - 5 "+5". All are public GameState
      properties.
    - The phone check, on Build 98.
    Grok #3558 accepted the design and the value mapping, with fixes. Done:
    - F1: the status read can no longer cost the world snapshot. StatsSnapshot.Adventure and Hall catch any failure,
      leave the status out, and log "[world] status left out (<type>)".
    - F2: applyStatus re-applies whenever StatTracker has swapped its model or unconfirmed the rows (restart,
      restore, story change), even when the values are unchanged. PC check (f2-check.cjs):
      - a RESTORE of a save with the same values keeps every row present and confirmed;
      - after leaving for a Z story and returning, the rows come back confirmed at the adventure's first prompt.
      Before that prompt they show as unconfirmed last-known values, as for every story.
    - N1: the four adventure-specific profiles are chosen by the adventure's own namespace, not its title.
    - N2: the comments now name The Temple of Ngurct as health-only.
    - N3: health is clamped at 0, where the engine's figure can go below 0 (seen only at death).
    - N4: make-dist runs check-trusted.
    Proven by injected state (C1; probe build only: probes/contracts/run-contracts.sh status, mkstatus.py,
    check-status.py). Each run has a positive and a negative case, and STATUS is typed for real and compared with
    the card. All 8 match:
    - Alternate Beginner's Cave, magic dagger: base Hardiness "+5", with the counter at 0 as the negative.
    - The Beginner's Cave, "Trollsfire is alight!": the flag set but the sword not carried as the negative.
    - The Training Ground, speed spell: "x2" agility.
    - The Vile Grimoire of Jaldi'al: paralyzed and agility impaired. The card shows the state after the whole turn,
      so a paralysis the game ends in the same turn ("Your paralysis has worn off prematurely.") is gone from it.
    C2: after a typed STATUS there are no duplicate rows, and no engine figure comes from another source.
    On the rebuilt release package 6d6eb49a (the repository pin, 0.1.0-dev), STATUSCHECK is still 20 of 20.
    Phone checklist (Build 98):
    - the status card in the Hall and in one adventure;
    - Land of the Mountain King Hall values after its restore (D3). PC check done (2026-11-13, probe build).
      The scripted finish killed the King, then the run returned to the Hall. The Hall card showed armour
      expertise 0 and axe 5, bow -10, club 20, spear 10, sword 0: the new character's own abilities, not the
      adventure's 79 and 10%. Gold showed 2372 after the reward. Grok #3561 accepted item 11 and noted a gap. This
      proves the overrides did not leak, but not a return to a character's own values when those differ from
      the starting ones. Phone D3 step: note the Hall card before entering Land of the Mountain King, then compare
      it with the card after the return.
    Build 98 (ParchLock-dist-b98): APK SHA-256 121590c96054974280367d6d318e8ece6c450a91d5f1226b70c585a4be905d05,
    versionCode 73, shell cache 198. The dist and APK trust only 6d6eb49a, and the package is at
    eamon-test/EamonShowcase-dev.eamon.

## 12. Still to be evidenced (not disputes)

Owner decisions locked 2026-11-14 (grok2 sole seat): (1) Hall X → ParchLock Exit game (implemented). (2) Eamon settings section in Options only when Showcase installed (implemented; SETTINGS button when live at top-level). (3) Pyramid carpet = destination rooms only, no teleport edge (status quo). (4) Learning remains per module install, not campaign. (5) Campaign refusal: Download Package first when that dialog is shown.

Owner review items (2026-11-13, historical): whether The Pyramid of Anharos's flying carpet (an item teleport offered in any room)
should be drawn as a labelled map line; G1 Windows through ParchLock.exe itself; the phone run P1-P7 on Build 95
(steps now listed under section 11 item 10); stats completion (section 11 item 11).
Parallel-systems audit (owner rule, 2026-11-13: adapt Eamon into ParchLock's existing systems, never run Eamon's own
UI beside them). Saves: done (section 5, one save system). Stats: section 11 item 11. For the owner's decision:
(1) The Hall's "X. Temporarily leave the universe" ends the engine on a dead-end line ("[You have left the universe.
Reopen the module to return to the Main Hall.]"); ParchLock's own Exit game already leaves a story for the library.
Proposal: X goes through Exit game (the campaign is committed as now). (2) Eamon's SETTINGS command (verbose rooms,
monsters and artifacts, enhanced combat, combat pauses, pronoun options, mature content) is a second options system
beside ParchLock's Options. Proposal: a Showcase section in Options whose switches send Eamon's own SETTINGS command
behind the scenes; a typed SETTINGS still works; The Wayfarers Inn's mature-content opt-in stays the player's own
choice. Not parallel systems (game content, kept): HINTS, the death menu's Start over / Accept death, QUIT's
"return to the Main Hall?", the Hall's "Examine your abilities", paging prompts.

Later (not blocking): the regression gate's underline-marks column was nondeterministic on 8 of 298 Z-machine games
across identical runs. Cause for most: the gate read the marks 1.3 s after LOOK, before the underline pass finished.
Fixed in the gate (gate-tools/regression-gate.cjs beside the repo, Grok #3532): marks are taken as a set once three
reads agree for at least 900 ms, UNSETTLED after 6 s, settle time logged (median about 0.6 s); MAPTOGGLE=1 covers
underline restore after the map closes (0 differences). Still flipping on the same tree after settling: jet (identical
text; the object "dragon's wing" is underlined as "dragon's" in one run and "wing" in another, a ParchLock word-choice
nondeterminism), Inevitable (5 or 9 marks under load) and cabal ("table"); to examine. Build 98 gate (2026-11-13,
16 processes) added two more load flips, both gone in 3 paired reruns. permagic: "of junk" instead of "papers".
suvehnux: two different underline sets, 3 of 6 runs on the same tree. The game text was identical in a text
capture, so the cause is ParchLock-side timing, not the game.

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
