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
Contract self-check (built, Grok #3484): at each adventure's first prompt every clause is evaluated with no
short-circuit and every uid a predicate names (holder container or monster, room, zone) must exist in the loaded
database; a tiered adventure without a contract fails. Verified for all 20: ok.
Contract proven by injected end state (probe build only, live clear not yet played; Grok #3489): a probe-only host
build (compiled with PARCHLOCK_PROBE, never in a shipped package; the shipped build treats "#probe" as ordinary
input, verified) applies the end state each author's finish code produces, then the real finish runs; a negative run
leaves one condition out. Positive credited and negative not a clear: Beginner's Cave II, Beginner's Forest, The
Sub-Aquan Laboratory, The Tower of Eamon, The Vile Grimoire of Jaldi'al, The Temple of Ngurct, Escape from Mt. Moon;
Wrenhold's Secret Vigil (the contract turns true only when the exit hands over the bow, as its source orders);
Firestorm (positive credited; with Thorak alive its exit stays shut, the author's own lock); The Pyramid of Anharos
(KV 1 credited; KV 1 with KF 1 is the tax branch, not a clear); The Wayfarers Inn; Alternate Beginner's Cave (Nina
is a fixed Friend, so her presence is the real condition). Wrenhold's negative is the author's death ending for
leaving without the life-orb. The Wayfarers Inn disables every command except QUIT, RESTORE and SETTINGS until the
player types SET MATURECONTENT TRUE, and says so itself every turn (CommandImpl.cs:29-31, StateImpl.cs:38-40): the
author's own consent gate; ParchLock never opts in for the player, and the game's instruction reaches them as is.
Still to run: Orb of My Life, DharmaQuest, Land of the Mountain King, A Runcible Cargo, Stronghold of Kahr-Dur.
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
