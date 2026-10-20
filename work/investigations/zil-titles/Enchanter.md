# Enchanter (Enchanter.z3.js) - ZIL completion (claude lane). Auditor: codex.
Census row: supporter C, lightSource U, on U, wearable UD, worn UD, animate U, edible U, takeable S, playerRoot S,
status Os, rooms O, actors U, underlineVsDict X, descriptors X, identical UD, onoff ...
Source: ONBIT 8 (33, rooms), LIGHTBIT 22 (22, rooms); no FOOD/EAT/DRINK/ACTOR/PERSON flags; V-EAT refuses ("Did they
teach you to eat that in survival school?", verbs.zil:1019).

## Native evidence (zil-walkdiff.cjs, walkthrough 'enchanter', seed 0, fresh boot, no relocation)
- step 26 FROTZ LANTERN -> "There is an almost blinding flash of light..." lantern 94 +8 +22; step 139 again +8 +22
- step 134 FROTZ CANDLE -> "...the black candle begins to glow!" (no bit change seen: candle already lit or id outside
  the 1..259 scan - to check)
- step 61 "drink water" -> "The delicious spring water tasted great, and there's lots more where that came from."
- step 67 "EAT BREAD" -> "Mmm. That tasted great! There's a whole lot of it left, too."
- after 140: "eat lantern" -> "Did they teach you to eat that in survival school?" (refusal)

## Proposed
| key | state | evidence |
|---|---|---|
| lightSource | NATIVE-PROVEN bit 22 (set dynamically by FROTZ) | lantern +22 (x2 transitions); 2nd distinct object: candle (pending bit check) |
| on | NATIVE-PROVEN bit 8 | lantern +8 with FROTZ; 2nd object pending (candle) |
| edible | NO-DEDICATED-BIT + PROVEN-ALTERNATIVE (bread/water handlers) | native eat bread + drink water; lantern refusal; source has no food flag, V-EAT refuses |

Candle resolved: "black candle" = ETERNAL-FLAME (gallery.zil:205-210, FLAGS TAKEBIT LIGHTBIT ONBIT) - already lit statically, so FROTZ changes no bit. V-FROTZ (magic.zil:806-809) FSETs LIGHTBIT + ONBIT on its target, matching lantern +22/+8. Two distinct light objects: lantern (dynamic, 2 FROTZ transitions) + black candle (static carrier, glow reply). Proposed: lightSource = NATIVE-PROVEN bit 22, on = NATIVE-PROVEN bit 8 (state set by FROTZ; no TURN OFF path observed). Negative: eat lantern refusal; a non-frotzed object (e.g. bread) never carries 22.

## R1 (codex #4332): target-scoped bit reads (zil-walkdiff.cjs DUMP=candle,lantern,bread,jug; raw record
## work/investigations/zil-titles/raw/enchanter-0-140.txt; walkthrough 'enchanter', fresh boot, no relocation)
| object | step 25 | after 26 FROTZ LANTERN | step 133 | after 139 FROTZ LANTERN |
|---|---|---|---|---|
| battered lantern 94 | [15,19] | [8,15,19,22] | [15,19] (spell wore off: native CLEAR) | [8,15,19,22] |
| black candle 204 | [8,19,22] | same | [8,15,19,22] | same |
| brass lantern 175 | [8,19,22] | same | same | same |
| loaf of bread 41 | [15,19] | same | same | same |
| jug 19 | [10,12,15,19,21] | same | same | same |
Reading: bit 22 (LIGHTBIT) and bit 8 (ONBIT) are carried by exactly the light sources - battered lantern (dynamic: FROTZ
sets, wearing-off clears), black candle and brass lantern (static carriers, read directly) - and by no non-light object
read (bread, jug = target-scoped negatives on lighting, not eating). FROTZ CANDLE changes nothing because the candle
already carries 8/22 (target-read), matching V-FROTZ magic.zil:806-809.
Proposed: lightSource = NATIVE-PROVEN bit 22 (3 distinct owners: lantern set+clear+set, candle, brass lantern; bread/jug
negatives); on = bit 8 state set by FROTZ / cleared on wear-off on the lantern, carried by the lit candle/brass lantern.
