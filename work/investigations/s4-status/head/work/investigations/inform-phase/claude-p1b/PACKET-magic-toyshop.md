# P1 layout check: The Magic Toyshop (magic-toyshop.z5.js)

Digest 7aea509542ba84a805a8c5cb423d3364739f19fa4cf00b1d41d3a058f410a667. v5 r1 s951018, compiler blank (Inform 5). No name table, no fact row (new row).
Evidence: objs-magic-toyshop.txt, run-magic-toyshop-1.txt (rawops), pageview-magic-toyshop-before/after.txt (FACT=fact-magic-toyshop.json in-page).

Fingerprint yourself 15 = 0,2,17,24. Layout = the alphabetical layout with ONE extra attribute at bit 4 (unidentified; no object
carries it) between container and door, so door..worn are +1. Bits 0-3 unchanged.

| flag | PROFILE | measured | evidence | verdict |
|---|---|---|---|---|
| animate | 0 | 0 | TAKE WOMAN 23:0=1 -> "wouldn't care for that"; chest 22:0=0 | AGREE |
| concealed | 2? | 2 | UNLOCK scan: yourself 15:2=1, dress 24:2=1, others 0 | measured |
| container | 4 | 3 | LOOK IN CHEST 22:3=1; box 26:3=1 every scope pass | DIVERGE |
| door | 5 | 5 | ENTER CHEST 22:5=0 then 22:7=0 (I5 Enter: door, then enterable) | site only, no doors in game |
| edible | 6 | 6 | census baguette 53, mushroom 55, egg 57 = 6 | static |
| enterable | 7 | 7 | ENTER CHEST 22:7=0 -> "not something you can enter" | site |
| female | 28 | 8 | TAKE WOMAN 23:8=1 (Catharine 0,8,24) | DIVERGE |
| light | 9 | 10 | room 21:10=1 every turn | DIVERGE |
| lockable / locked | 10 / 11 | 11 / 12 | OPEN CHEST 22:16=1, 22:12=1 -> "seems to be locked"; UNLOCK 22:11=1, 22:12=1 | DIVERGE |
| moved | 12 | 13 | box 26:13 0 -> 1 after Catharine hands it over | DIVERGE |
| open | 14 | 15 | LOOK IN CHEST 22:15=0 (closed); census hamper 52, mousehole 48 = 3,15 | DIVERGE |
| openable | 15 | 16 | OPEN CHEST 22:16=1 | DIVERGE |
| proper | 16 | 17 | yourself 17; 23:17=1 | DIVERGE |
| scenery | 17 | 18 | TAKE CHEST 22:18=0 then 22:20=1; walls 2..13 = 18 | DIVERGE |
| static | 19 | 20 | TAKE CHEST 22:20=1 -> "That's fixed in place." | DIVERGE |
| supporter | 20 | 21 | 23:21 / 26:21 on every scope pass; census sundial, Hanoi board/pegs = 21 | DIVERGE |
| switchable | 21 | 22 | X DRESS 24:22=0 at the Examine switched-on site | DIVERGE (site) |
| transparent | 23 | 24 | woman 23:24=1 every scope pass | DIVERGE |
| worn | 26 | 27 | census crinoline dress 24 (on Catharine) = 2,27 | static -> wornAttribute 27 (worn is not read from attributeMap) |
| clothing, on, general(9), talkable, visited, workflag | - | null | unproven; no player wearables/switchables | null |

Visible radial (start, Toyshop):
- oak chest before: tagged concealed/locked/proper/supporter/takeable, offers `take chest` (fixed in place), no Open/Unlock.
  After: container/lockable/locked/openable/static, offers `open; close; lock; unlock; search; empty`, no take.
- Catharine before: general/visited; after: female/transparent.

Proposed fact row:
```
"wornAttribute": 27,
"attributeMap": { "animate": 0, "clothing": null, "wearable": null, "concealed": 2, "container": 3, "door": 5, "edible": 6, "enterable": 7, "female": 8, "absent": null, "general": null, "light": 10, "lockable": 11, "locked": 12, "moved": 13, "on": null, "open": 15, "isOpen": 15, "openable": 16, "proper": 17, "scenery": 18, "scored": null, "static": 20, "supporter": 21, "switchable": 22, "talkable": null, "transparent": 24, "visited": null, "workflag": null, "male": null, "neuter": null, "pluralname": null }
```
