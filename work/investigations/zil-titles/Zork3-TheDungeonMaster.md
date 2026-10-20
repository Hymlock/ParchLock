# Zork III (Zork3-TheDungeonMaster.z3.js) - ZIL completion (claude lane, R3/R3.1). Auditor: codex.

Census row: supporter C, lightSource O, on U, worn UD, animate X, edible U, takeable S, playerRoot S, status Os, rooms O,
actors U, underlineVsDict X, descriptors X, identical X, onoff U, wornItems UD, consumed X, nested X.
Source (exact): ONBIT 15 (27 incl. lit rooms), LIGHTBIT 6 (torch 41 only), FOODBIT 5 (waybread 34 only), DRINKBIT 22
(water 203 only), ACTORBIT 21 (5 carriers).

## Native evidence (zil-walkdiff.cjs, walkthrough 'zork3', fresh boot, no relocation; replies verbatim)
- step 2 LIGHT LAMP: lamp 198 +15 (room description printed). step 20 TURN OFF LAMP: lamp -15. Then "light lamp" ->
  "The lamp is now on." +15; "turn off lamp" -> "The lamp is now off." -15.
- after step 28 (GET TORCH): "turn off torch" -> "You manage to extinguish the flame." torch 41 -15; "light torch" ->
  "You have nothing to light it with." (no bit); "turn on table" -> "You don't have the viewing table." (no bit).
- after step 5 (GET BREAD): "eat bread" -> "Thank you very much. It really hit the spot."
- after step 28: "eat torch" -> "I don't think that the torch would agree with you." (refusal)

## Proposed closures (codex audit)
| key | state | evidence |
|---|---|---|
| on | NATIVE-PROVEN bit 15 | 2 distinct objects (lamp set/clear x2, torch clear); table refusal no bit; source exact 27 |
| edible | NATIVE-PROVEN bit 5 single owner (waybread 34) | whole-source single FOODBIT carrier (exact 1/1) + native eat success; torch refusal |
Open next: animate 21 (X; native TELL/ASK route), actors, onoff, drink (DRINKBIT 22 water: step 253 DRINK LIQUID).
