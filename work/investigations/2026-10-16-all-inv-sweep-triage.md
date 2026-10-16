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
