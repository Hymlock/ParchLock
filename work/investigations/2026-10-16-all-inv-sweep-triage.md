# All-games inventory sweep triage (claude, 2026-10-16, SOLO/SELF-AUDIT)

Sweep: `work/investigations/all-inv-sweep.cjs` over all 309 games (boot, `i`, `take all`, `i`; raw replies and app
names in `2026-10-16-all-inv-sweep.json`, log `2026-10-16-all-inv-sweep.log`). The classifier is triage only; every
delta below was classified by hand from the raw text (Codex #3508).

## Harness finding
A still-open Message (once-per-install footer) makes the typed-turn capture ignore commands
(`AttrCalibrator` keypress guard `Message.IsOpen`), so in headless runs no TurnRecorder learner ever ran. The sweep now
closes an open message before each command, as a player would. Not a product defect.

## Real defects fixed (candidate, gated before commit)
| Game | Symptom | Root cause | Fix |
|---|---|---|---|
| BibleRetold | 18 room objects (hedgerows, sun, beard...) listed as inventory; native "You are carrying nothing." | `WorldModel.recoverInventory` promoted the parent of the first worn-flagged object; the beard/sandals/robe lie in the room | a room is never an inventory holder (skip worn objects whose parent is the current room) |
| Galatea, loose, djinni | an NPC's parts (Galatea's knees/ears/face...) listed | `ZRamProvider.resolveInventoryRootId` animate fallback promoted an NPC with 2+ children while the placed player was simply empty-handed | when the resolved player is placed in the current room, no other animate object is promoted |
| cabal, death | the vagrant's beard/milkshake/clothes listed instead of "your PalmPilot" | the native-`i` holder learner counted the PC named "you" (matched by "You are carrying") as a listed item, hiding the PalmPilot, and a room parent competed | animate objects named in the reply are holders/bystanders, room parents never count, one listed item suffices for an animate in-world holder |
| medusa | the girl's toga/hair/snakes listed; native lists "your costume" | the learner chose an offstage "(medus_t)" holding another object named costume | only holders placed in the world compete |
| Photograph | your coat/head/legs/arms listed; native "You are carrying the picture-frame." | native `i` omits by bit 17 (scenery here) | digest fact `inventoryHiddenAttribute: 17` (measured: TRUE on the 4 omitted, FALSE on the printed frame) |

## Classified, no fix
- Checker artifacts: AllRoads (labels now native), curves/b2demo/boothdye/doll/muse/PUTPBAA/Glass/break-in (items taken by
  `take all` but listed under different native wording or in a later reply), medusa second checkpoint (game at a menu
  prompt), csbb (yes/no prompt), Seastalker Logbook (prefix prompt), HollywoodHijinx "Uncle Buddy's" (letter label).
- Intended: Enchanter spells (D148).
- No separating native bit found (omission by library logic, not a flag), left as-is pending evidence: dumont "pair of
  hands", gamlet "genitals"/"shirt", Heroine laser beam/claws (no printed control), bluechairs, enter (pocket contents),
  deadreck wallet, Debate evidence, beneath "front of" (name).
- No input reached (startup menus): amish, BeingSteve, BlueLacuna, bookvol, Borderzo, chico.

## Gate (309 games incl. ZIL + Inform Z + Glulx, vs the 56a170f full pass): 30 differences, 0 REGRESSION
- Fixed as intended: BibleRetold, Galatea, Photograph, cabal, death, djinni, loose (inventory now matches native i;
  their marks follow).
- Newly correct (native i lists exactly the item the app now shows; the app showed nothing before because the wrong
  holder was used): bj "your penis", troll "a bloody axe", wireless "a memo", BeingAndrewPlotkin "a copier".
- tk1: false items "hole in the floor"/"glass tube" removed; native "You are carrying nothing."
- Mullmurd / School marks: inventory items now known, so "torch" / "admission letter" gain their marks.
- Noise (flip in HEAD-vs-HEAD reruns): Biscuit inv1/inv2, cycles rooms/inv2.
Guards: operator-regressions 7/0, d31-nested-inventory 60/0, attr-calibrator-inventory-root 13/0, phase2-heuristic-cutover
147/2 (the same 2 pre-existing FAILs as HEAD, unrelated Open/Use checks).

## Missing native rows (post-f304f60 recheck, 2026-10-16-all-inv-sweep-miss.json)
- Sherlock (Infocom z5, no source pin): real holder is object 232 "you" (holds black bag, whistle); the resolver picks
  168 "yourself"; payload room resolves to 172 (the black bag's id) - room detection is broken too. Needs a measured
  playerObject + room fact; deeper investigation, not guessed.
- heist: open canvas bag contents (picture frame, photo) not walked. No attribute-name table; the bag carries bits
  3/12/14/15 and native "look in bag" tests 3 and 14 TRUE on bag and frame (both containers), so this library numbering
  likely differs from the I6 default (container 4). D73 AttrCalibrator learns the container bit from play; verify on a
  live session (learners were blocked headless by the open Message) before any fact.
- Debate: the held object named "evidence" prints as "a debate file" (short_name routine) - descriptor/label column.
- beneath: the closed book shows as "front of" - label column.
- phlegm: held animate "Leo (dozing away)" not shown - check D57 animate rules before changing.
- largemac: harness timeout before input; RobinAndOrchid, Grooverland: Glulx (D38 parked).
- phlegm: Leo (37) is inside the worn overcoat 39, which decodes concealed/open/transparent/worn with no container bit;
  native i lists Leo. Same pattern as heist (bit 3 + open on objects that behave as containers): likely a library whose
  attribute numbering differs from the I6 default, with no attribute-name table to decode it. Not fixed by guessing a
  mapping: needs target-scoped native evidence per game, or a library-version detector. (Note: canSeeInside takes an
  attrs object; an earlier mem/id call in this triage was invalid and is not evidence.)
- Census (all objects, 2026-10-16): heist bit 3 = grave, black canvas bag, plain wooden box, black coffin, deep hole,
  small compartment (containers); bit 4 = jewellers store, fire exit, solid looking door, secret doorway, cabin door, cave
  entrance (doors); bits 14/15 still fit open/openable. phlegm bit 3 = overcoat, cannon, cart, feed bags, bowl,
  depression. Advent (standard I6) bit 4 = small bottle, wicker cage. So these libraries number container 3 / door 4
  (I6 default concealed 3 / container 4 / door 5) while later attributes match. A per-digest attributeMap
  {container: 3, door: 4} is the fix shape, but a name census is not acceptable evidence: needs target-scoped native
  tests (e.g. LOOK IN / OPEN on a single named container that tests 3, and on a door that tests 4).
- heist native tests (route ops): a background per-turn routine tests bits 3 and 14 on the bag 19 and frame 124 on every
  command, so those are not target-scoped. Target-scoped: "look in photo" tests 3 FALSE on photo 126 (negative). "look in
  grave" / "look in frame" are handled by object routines that never test 3. No clean positive yet; left open.

## Sherlock (follow-up commit)
Measured constant PC object 232 (digest fact playerObject) and a resolveInventoryRootId rule: a validated digest-pinned
player (playerObject / playerGlobal) outranks learned and structural roots (the native-i learner had settled on the coat
pocket 287, because the ZIL "you" object does not decode animate). Gate 309 vs the f304f60 pass: 6 differences, 0
regression - Sherlock rooms (black bag 172 -> 221-B Baker Street 38), inv1/inv2 (empty -> the held tree), marks "coat"
(INTENDED); Mullmurd / School marks are NOISE (three identical reruns, and School identical under HEAD ZRamProvider).
Remaining Sherlock extras are nested (lapel, stethoscope, the closed bag's bottles/pills): no container/open facts yet
(D148 relaxation), needs measured facts.

## Blank-named items: the story's own short_name (follow-up commit)
ZRamReader's inventory walk labels a blank-named item with its last parser word ("evidence" for Debate's debate file). It now
prefers ZRamReader.storyShortName when every content word of that decoded name is one of the object's own parser words
(junk from short_name routines - MakeItGood "that yss", dewdrops "ecsuo e" - is rejected and the parser word kept).
Gate 309 (unverified version) 26 differences; after verification the junk two are gone and every remaining change matches the
native text: Cove "purse", TCOTY "rifle", Inevita "uniform", Mask "pair of stockings", WiR1/WiR2 "pair of socks"/"undershirt"
(was "sockses"/"undershir"), gardening "gold fish in a plastic bag"/"tomato seeds" (was "small"), acorncourt "tennis ball",
sgate "unlit torch", escape "your travelling case", Debate "file" mark, huntdark "bolt" per bolt object (native groups "five
bolts"). Cosmetic: TCOTY "Shark Head" -> "shark head" (casing). Noise: Inevita/Mask/jet/largemac marks.
Guards: operator-regressions 7/0, d31 60/0, command-disambiguation 51/0, m12-room-short-name 12/0.
Confirming full gate on the committed 8ea2f66 state: 20 differences, all in the classified set above; gamlet marks once (two reruns match the baseline: noise). 0 regression.
- 288b104: inventory-row name rule (Lurking pc, Ralph teddy, Hollywood photo); gate 5 diffs, 0 regression.
