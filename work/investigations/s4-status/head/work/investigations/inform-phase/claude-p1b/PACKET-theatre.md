# P1 layout check: Theatre (theatre.z5.js)

Digest 0fc8bdbfe929585cd0bb35883f511af5a61053f7fc8dfabdb32c7f10de5b7d80. v5 r2 s951203, compiler blank (Inform 5). No name table, no fact row (new row).
Evidence: objs-theatre.txt, run-theatre-1/2/3.txt (rawops), pageview-theatre-before/after.txt (FACT=fact-theatre.json in-page).

Fingerprint yourself 15 = 2,4,18,25. Layout = the alphabetical layout shifted uniformly +2: two game-declared attributes sit at
bits 0 and 1 (bit 0 is on every "Help ..." menu object 19-27; bit 1 unseen). Theatre intercepts every verb on the lobby doors
("doors are everywhere, just ignore them"), so the measurements use posters, desk, safe and trapdoor.

| flag | PROFILE | measured | evidence | verdict |
|---|---|---|---|---|
| animate | 0 | 2 | TAKE ME 15:2=1 -> "always self-possessed"; desk/safe 59:2=0, 60:2=0 on verbs | DIVERGE |
| concealed | 3 | 4 | listing skips yourself 15:4=1; posters/doors 4=0 | DIVERGE |
| container | 4 | 5 | LOOK IN DESK 59:5=1 -> "can't see inside, since it is closed"; LOOK IN POSTERS 50:5=0 | DIVERGE |
| door | 5 | 6 | ENTER POSTERS 50:6=0 then 50:8=0; room desc trapdoor 64:6=1 ("open trapdoor in the floor") | DIVERGE |
| edible | 6 | 7 | EAT POSTERS 50:7=0 -> "plainly inedible"; census popcorn 74-79 = 7 | DIVERGE |
| enterable | 7 | 8 | ENTER POSTERS 50:8=0 -> "not something you can enter" | DIVERGE |
| female(=absent) | 28 | 9 | per-turn floating-object loop tests 9 on doors 26,51,64,... | DIVERGE (site) |
| light | 9 | 11 | every room 49/53/57:11=1 | DIVERGE |
| open | 14 | 16 | desk 59:16=0 (closed, "since it is closed"); trapdoor 64:16=1 (open) | DIVERGE |
| openable | 15 | 17 | census desk 59, trapdoor 64 = 17 | static |
| proper | 16 | 18 | yourself 18 | static |
| scenery | 17 | 19 | TAKE POSTERS 50:19=1 -> "hardly portable"; walls 2..13 = 19 | DIVERGE |
| static | 19 | 21 | TAKE SAFE 60:19=0 then 60:21=1 -> "That's fixed in place." | DIVERGE |
| supporter | 20 | 22 | 59:22 / 60:22 scope passes; LOOK IN POSTERS 50:22=0 | DIVERGE (negatives at site) |
| transparent | 23 | 25 | safe 60:25=1 on scope passes | DIVERGE |
| visited | 24 | 26 | LOOK in cloakroom: 53:26 0 -> 1 | DIVERGE |
| worn | 26 | (28) | not measured (no wearables); 26 is visited here | wornAttribute 28 by uniform shift (PROFILE 26 would read visited) |
| clothing, lockable, locked, moved, on, switchable, general, talkable, workflag | - | null | safe locking is game code; unproven | null |

Visible radial:
- lobby doors 26 before `eat doors; drink doors` (edible/static); after door/scenery `open; close` (game intercepts both; harmless).
- trapdoor 64 before `switch on/off; eat; drink`; after `open trapdoor; close trapdoor`.
- desk 59 (shown as "manager's office", a separate naming issue) before door: `open; close`; after container `open; close; search; empty`.
- safe 60 before `take safe; switch on/off safe` (switchable/male); after examine only (static/transparent). The game itself refuses Open ("The safe is locked") and has no openable bit, so no Open is source-correct.
- office papers / posters: static -> scenery.

Proposed fact row:
```
"wornAttribute": 28,
"attributeMap": { "animate": 2, "clothing": null, "wearable": null, "concealed": 4, "container": 5, "door": 6, "edible": 7, "enterable": 8, "female": 9, "absent": null, "general": null, "light": 11, "lockable": null, "locked": null, "moved": null, "on": null, "open": 16, "isOpen": 16, "openable": 17, "proper": 18, "scenery": 19, "scored": null, "static": 21, "supporter": 22, "switchable": null, "talkable": null, "transparent": 25, "visited": 26, "workflag": null, "male": null, "neuter": null, "pluralname": null }
```
