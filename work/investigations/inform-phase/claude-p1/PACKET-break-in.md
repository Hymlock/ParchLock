# P1 layout check: Break-In (break-in.z5.js)

Digest 45da361177da2e073616082377ea37654bb10b8289024833f61e1422dedb6201. v5, release 9, serial 000926, compiler Inform 6.05
(early 6/x library). No attribute-name table. No fact row yet.

Method: the same as library: run-break-in-1.txt and run-break-in-2.txt (raw ops), objs-break-in.txt (static object table),
radial-break-in.txt. The opening sends you into a Banana Street flashback on the 2nd turn, so the office was measured in turn 1-2.

Layout found: animate 0, clothing 1, concealed 2, container 3, door 4, edible 5, enterable 6; light 9 onward matches I6.
This is the same layout as library and phlegm.

| flag | PROFILE | measured | evidence | verdict |
|---|---|---|---|---|
| animate | 0 | 0 | NPC 321:0=1 (flashback), door 320:0=0, rucksack 46:0=0, desk 35:0=0 | AGREE |
| clothing/wearable | 2 | 1 (static) | Hat class 30 = attrs 1 | DIVERGE (static only; hat not reachable early) |
| concealed | 3 | 2 | listing: yourself 20:2=1, flashback 320/321/324:2=1; listed rucksack/desk 2=0 | DIVERGE |
| container | 4 | 3 | rucksack 46:3=1 (look + OPEN RUCKSACK), desk 35:3=0, room 33:3=0 | DIVERGE |
| door | 5 | 4 (static) | front door 73 = 4,10,11,15,19; five-barred gate 4,19 | DIVERGE (static only) |
| edible | 6 | 5 (static) | knobbly carrot 97 = 5,36 | DIVERGE (static only) |
| enterable | 7 | 6 | sitting in chair: 34:6=1 each turn; player 20:6=0; chair/hutch/booth/hatch have 6 | DIVERGE |
| open | 14 | 14 | OPEN RUCKSACK tests 46:14=0 then opens; nest 88 static 3,14,19 | AGREE |
| openable | 15 | 15 | OPEN RUCKSACK 46:15=1 (then locked 46:11=0) | AGREE |
| supporter | 20 | 20 | chair 34:20=1, desk 35:20=1, rucksack 46:20=0 | AGREE |
| light | 9 | 9 | office 33:9=1, player 20:9=0, chair 34:9=0 | AGREE |
| scenery | 17 | 17 | office door 36:17=1 in the listing; desk 35:17=0 | AGREE |
| static | 19 | 19 | TAKE DESK 35:19=1 (after 35:17=0) | AGREE |
| on/switchable | 13/21 | 21 (static) | radio transmitter 49 = 21; on not reached | UNMEASURED |
| worn | 26 | - | no worn test was reached | UNMEASURED |

## Player-visible impact (current build, office)
- WRONG: chair offers "eat chair; drink chair" (bit 6 = enterable is read as PROFILE edible). Missing "sit on/enter" follows from the same cause.
- MISSING: rucksack (a container) offers no "put X in rucksack" / look in; it reads as concealed.
- Predicted, same cause: front door/gate read as container (bit 4), carrot reads as door (bit 5).

## Proposed fact (new row)
```js
"45da361177da2e073616082377ea37654bb10b8289024833f61e1422dedb6201": {
    "attributeMap": { "animate": 0, "clothing": 1, "wearable": 1, "concealed": 2, "container": 3, "door": 4,
                      "edible": 5, "enterable": 6, "absent": null }
}
```
door/edible/clothing are object-table (static) facts that fit the measured shift. If dynamic proof is required, set them to null
until a route reaches the gate, carrot or hat.
