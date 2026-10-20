# Spellbreaker (Spellbreaker.z3.js) - ZIL completion (claude lane, R3/R3.1). Auditor: codex.

Census row (2026-10-20-zil-remaining): container X, open X, lightSource U, on C, wearable UD, worn UD, edible U,
playerRoot C, status Os, rooms O, actors U, underlineVsDict X, descriptors U, identical X, onoff U, wornItems UD,
consumed U, nested U.

Source flags (2026-10-11-zil-source-flags.json, exact): CONTBIT 27 (23 positives), OPENBIT 21 (20), ONBIT 8 (28, incl.
lit rooms); LIGHTBIT none, FOODBIT/EATBIT/DRINKBIT none (static scan only - see dynamic-flag note before any absence).

## Native evidence (work/investigations/zil-walkdiff.cjs, jericho walkthrough 'spellbrkr', Frotz/Jericho z_random seed 1,
## fresh boot, NO insert_obj; bit diffs around each action; replies verbatim)
- step 30 "open zipper" -> "Opening the zipper reveals a dimly lit hole." zipper 198 +21
- step 82 "open box" -> "Opening the gold box reveals a cube." gold box 4 +21
- step 96 "open bottle" -> "Opened." bottle 145 +21
- after 120: "close zipper" -> "The zipper now looks like an ordinary zipper." 198 -21; "open zipper" again +21
- after 120: "open burin" -> "You must tell me how to do that to a magic burin." no bit change (negative)
- step 13 "frotz burin" -> "...the magic burin is now a serviceable light source." burin 149 +8
- step 118 "frotz bottle" -> (spell effect) bottle 145 +8

## Proposed closures (codex audit)
| key | state | evidence |
|---|---|---|
| open | NATIVE-PROVEN bit 21 | 3 distinct opens (zipper, box, bottle) + close/reopen on zipper; burin refusal; source exact 20/0/0 |
| on | NATIVE-PROVEN bit 8 (ONBIT) | FROTZ sets 8 on burin and bottle (2 distinct); source exact 28 (rooms lit) |
| lightSource | NO-DEDICATED-BIT + PROVEN-ALTERNATIVE: light = ONBIT 8 via FROTZ | no LIGHTBIT in source; game reply names the frotzed burin "a serviceable light source"; consumers must read light from bit 8 for this title |
Open next: container 27 (static capability: needs a test-scoped recorder, e.g. zil-route-ops.cjs REC='look in zipper'),
edible (source search for EAT handling: bread is in the walkthrough), wearable/worn UD (spot-audit), playerRoot C
(constant PLAYER 52, ModuleStatFactsClaude.js).

## R1 (codex #4331): consumer hold retained
The bit evidence above proves OPENBIT 21 / CONTBIT 27 semantics only. Runtime Open/Close activation for this title stays HELD as recorded in ModuleStatFactsClaude.js (Spellbreaker comment ~153-164): actors Belboz 13, merchant 203, ogre 232 carry 21/27, so offering Open from the bit would put Open on people. Activation needs a separate disposition (e.g. animate exclusion) with its own consensus.
