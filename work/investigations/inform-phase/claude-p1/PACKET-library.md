# P1 layout check: All Quiet on the Library Front (library.z5.js)

Digest b3665eaf5e30520355a1f07657ffbd69e967ecb53942f86913d044e65fa30e11. v5, release 2, serial 951204, header compiler field blank
(pre-Inform-6, so Inform 5.x with library 5/x). No attribute-name table. Existing fact row: statusPair only, no attributeMap.

Method: raw test_attr trace per command (rawops.cjs, a zil-route-ops-raw variant that prints ops per command) -> run-library-1.txt;
static object-table dump (objdump.cjs) -> objs-library.txt; PROFILE bitFor + payload attrs + radial commands in the page
(radial.cjs) -> radial-library.txt, radial-library-2.txt.

Layout found: animate 0, clothing 1, concealed 2, container 3, door 4; from light 9 onward it matches I6 (no `absent` at 1).
This is the same shift as phlegm.

| flag | PROFILE | measured | evidence | verdict |
|---|---|---|---|---|
| animate | 0 | 0 | TAKE ATTENDANT 26:0=1 ("wouldn't care for that"), ID card 74:0=0, drawer 18:0=0 | AGREE |
| clothing/wearable | 2 | 1 | WEAR CARD tests 74:1=0 right before "You can't wear that!". No wearables exist in the game (no object has bit 1) | DIVERGE (negative test only) |
| concealed | 3 | 2 | the room listing skips on 2: yourself 15:2=1, hidden grue 53:2=1, listed scenery 17..28:2=0 | DIVERGE |
| container | 4 | 3 | LOOK IN / OPEN / CLOSE DRAWER: 18:3=1 on the drawer; ID card 74:3=0 | DIVERGE |
| door | 5 | 4 (static) | rare books door 57 = 4,10,11,15,19 | DIVERGE (static only) |
| open | 14 | 14 | drawer 18:14 goes 0 -> 1 after OPEN -> 0 after CLOSE | AGREE |
| supporter | 20 | 20 (negatives) | 18:20=0, 26:20=0, room 16:20=0 tested at the supporter sites. No supporter in the game | UNMEASURED (positive) |
| light | 9 | 9 | every room 16/35/47/51:9=1; carried card 74:9=0 | AGREE |
| scenery | 17 | 17 | TAKE CATALOG 17:17=1 -> "That's hardly portable." | AGREE |
| static | 19 | 19 (static) | rare books door has 19 | AGREE (static only) |
| on/switchable | 13/21 | - | nothing switchable ("lights" are scenery, not in scope at the test point) | UNMEASURED |
| worn | 26 | 26 (negative) | inventory tests 74:26=0 at the I6 "(being worn)" site | AGREE (negative only) |
| transparent | 23 | 23 | attendant 26:23=1 on every scope pass | AGREE |

## Player-visible impact (current build)
- MISSING: the closed card-catalog drawer offers no Open, and no "put X in drawer" (it reads as concealed, not container). Open/Close appear only after typing OPEN.
- WRONG: rare books door (bit 4 = door) reads as container: "search door; empty door".
- WRONG (harmless, no Wear offered): grue and the player read as clothing/wearable (bit 2 = concealed).

## Proposed fact (add to the existing b3665eaf... row)
```js
"attributeMap": { "animate": 0, "clothing": 1, "wearable": 1, "concealed": 2, "container": 3, "door": 4,
                  "absent": null, "edible": null, "enterable": null }
```
`clothing`/`wearable` 1 rests on a negative test (no wearables exist), so null is also acceptable; either way bit 2 must not be read as
clothing. `edible`/`enterable` are left null: with the shift, PROFILE 6/7 would be misread and there is no evidence for them.
