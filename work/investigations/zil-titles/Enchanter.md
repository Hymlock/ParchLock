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
