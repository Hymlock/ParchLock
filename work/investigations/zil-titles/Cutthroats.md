# Cutthroats (Cutthroats.z3.js) - ZIL completion (claude lane). Auditor: codex.
Census row: lightSource U, on U, worn C, takeable S, playerRoot S, status U, rooms O, actors U, underlineVsDict X,
descriptors U, identical UD, onoff U, wornItems X, consumed U, nested X.
Source: ONBIT 17 (rooms lit + runtime FSET/FCLEAR on FLASHLIGHT island.zil:1700/1709, MM-COMPRESSOR boat.zil:350/355,
REDS-LAMP boat.zil:955/959, SHARK events.zil:1457/1481); LIGHTBIT none; FOODBIT 8 (meal 105 only); DRINKBIT 10 (ocean,
drink 103, liquor 102).

## Native evidence (zil-walkdiff.cjs, walkthrough 'cutthroat', z_random seed 10, fresh boot, no relocation)
- step 23 "eat food" -> "Not bad! It really hit the spot." (meal 105 +12)
- step 24 "drink drink" -> "It burns your throat on the way down." (drink 103 +12)
- step 111 "buy flashlight and repellent" -> both purchased
- "turn on flashlight" -> "The flashlight is now on." flashlight 116 +17; "turn off flashlight" -> "...now off." -17
- "eat flashlight" -> "I don't think that the flashlight would agree with you." (refusal)

## Proposed closures (codex audit)
| key | state | evidence |
|---|---|---|
| edible | NATIVE-PROVEN bit 8, single owner (meal 105) | whole-source single FOODBIT carrier (exact 1/1) + native eat; flashlight refusal |
| on | bit 17: 1 distinct object so far (flashlight set+clear) | 2nd distinct: compressor or Red's lamp on the boat (later walkthrough steps) |
| lightSource | NO-DEDICATED-BIT + PROVEN-ALTERNATIVE (light = ONBIT 17 on the flashlight) | no LIGHTBIT in source; native dark-room light effect still to capture (underwater) |
