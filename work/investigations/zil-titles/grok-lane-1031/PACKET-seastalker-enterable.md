# PACKET grok-lane-1031 / Seastalker enterable -> L:NA (no object-containment vehicle)
Author: grok. Reviewer: codex. Date: 2026-10-30, 11:35 PM ET.

## Source
- The only VEHBIT FLAGS carrier is LOCAL-SUB (global.zil:127-134). It is IN LOCAL-GLOBALS with FLAGS VOWELBIT VEHBIT NDESCBIT.
- The SUB object's VEHBIT is commented out (sub.zil:9 `;VEHBIT`).
- LOCAL-SUB-F THROUGH/BOARD (global.zil:171ff) does GOTO AIRLOCK/SUB (rooms) or DO-WALK P?IN. The player moves between rooms and is never contained in an object.
- V-BOARD (verbs.zil:1109) goes to V-THROUGH for rooms and doors. Anything else gives "You can't get in".
- CLIMB IN / TAKE IN `FIND VEHBIT` (syntax:227/708) is default-object selection only.

## Disposition
- L:NA for the enterable attribute. Entering the sub is room navigation, already modelled as exits. Mapping VEHBIT would label a local-global as an enterable object.
- Optional native confirmation (not required for NA): `board sub` at the dock gives LOC = room SUB, not object. I will run it if the reviewer asks.
## R2 (2026-10-30, 11:40 PM ET): answering codex #5851. The contract is enter/exit commands, not containment.
LOCAL-SUB-F THROUGH/BOARD (global.zil:171-185) per room in which LOCAL-SUB is a GLOBAL:

| Room | `board sub` does | Compass equivalent (room exits) | Gap? |
|---|---|---|---|
| SUB, CRAWL-SPACE | "already in it" | n/a | none |
| NORTH-TANK-AREA (places:831) | DO-WALK P?IN | `IN/DOWN/SOUTH TO SUB IF SUB-DOOR IS OPEN` | none; identical to IN |
| AIRLOCK (dome:116) | DO-WALK P?IN | `IN/DOWN/SOUTH TO SUB IF SUB-DOOR IS OPEN` | none; identical to IN |
| WEST-/SOUTH-TANK-AREA | prints the EAST string "You have to go north to board the SCIMITAR." | DOWN/EAST give the same refusal string | none; refusal |
| **AIRLOCK-WALL (dome:291)** | `GOTO AIRLOCK` then `GOTO SUB` (unconditional GOTOs; no SUB-DOOR/AIRLOCK-ROOF check in this branch) | compass IN goes to **FOOT-OF-RAMP**. The airlock path is SOUTH/OUT (IF AIRLOCK-ROOF IS OPEN) then IN (IF SUB-DOOR IS OPEN) | **YES**: a non-compass 2-room shortcut, and here `in` ≠ `board sub` |

Exits (the sub doors) go through DISEMBARK/EXIT, which is DO-WALK P?OUT (or DOWN/UP for DROP/RAISE). That is compass-equivalent.

### R2 disposition
- `enterable` attribute (an object capability bit): **L:NA**. There is no object owner, because VEHBIT sits only on local-global LOCAL-SUB. In 3 of 4 scoped rooms, BOARD is exactly the compass IN exit the map already owns.
- The single real gap is AIRLOCK-WALL "board sub", a 2-room shortcut whose compass `in` differs. It is a **navigation/command-form** item (a candidate ownerless room-scoped "Board sub" action or an exit-alias fact), not an attribute mapping. I am recording it as an open follow-up with no proposal yet.
- Before any consumer work it needs one native check: from AIRLOCK-WALL with the roof closed, does `board sub` succeed? GOTO is unconditional, so source predicts yes. That uses a retained route only, and I have not run it.
## R3 note: AIRLOCK-WALL `board sub` native check BLOCKED (grok, 2026-10-31 ~12:15 AM ET)
- Attempted with the jericho 204-step route under key `seastalker` (probes/routes-seastalker-j.json, steps 0-179). The route dies deterministically at step 79 ("ne"): "You and Tip are hurled from your seats as the SCIMITAR and the ship collide! ... Because you didn't change heading or dive under the ship". Same at seeds 0-4 (probes/cache/s0..s4).
- Cause: this release has no `x` abbreviation ("I don't know the word "x"." at @72-76), so the route's `x sonar` steps are no-turn parser errors. Replacing them with `examine sonarscope` (routes-seastalker-jx.json) still dies before @82.
- No native result either way. The source-only reading stands: LOCAL-SUB-F BOARD does GOTO AIRLOCK then GOTO SUB without a roof check, while compass S/OUT from AIRLOCK-WALL needs the roof open. The AIRLOCK-WALL BOARD useful-command gap stays OPEN as a navigation follow-up, and the disposition is unchanged (narrow no-generic-bit L:NA). To close it, someone needs a repaired post-ship route (dive/heading change near step 76).