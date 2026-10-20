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

On negative (native): after step 114 "rent compressor" (small air compressor 120, not the boat MM-COMPRESSOR): "turn on compressor" -> "You can't turn that on."; "turn off compressor" -> "You can't turn that off." (no bit). Second positive candidates later in the walkthrough: boat MM-COMPRESSOR / REDS-LAMP (boat.zil:345-355, 955-959), step 307 "turn on magnet".

Native (seed 10, steps 299/307/308): "turn on flashlight" underwater -> "The flashlight is now on. / Underwater / You are in the sea, completely surrounded by water." flashlight 116 +17 = native light effect in a dark room (lightSource PROVEN-ALTERNATIVE via ONBIT 17 now has its native witness). "turn on magnet" -> "The portable electromagnet is now on." / "turn off magnet" -> "...now off. Everything that was on it falls off." with no bit change in ids 1..259 (handler or id outside scan). on: bit 17 natively on flashlight only (set x2, clear x1); boat MM-COMPRESSOR / REDS-LAMP remain the bit-17 second-object candidates.

Step-239 attempt (raw zil-titles/raw/cutthroats-239.txt, Storage Locker): "turn on lamp" resolves to the FLASHLIGHT (synonym) +17/-17; Red's reading lamp REDS-LAMP is IN MM-CAPT-CABIN (boat.zil:937) with a real ONBIT handler (boat.zil ~945-960); large air compressor 89 [11,12,21] is elsewhere (parent 91); small air compressor 120 refuses again. Second distinct ON object = reading lamp: needs the walkthrough position + route to the captain's cabin ("turn on reading lamp").

Captain's Cabin reached (walkthrough 239 + s|s|s|s; Johnny Red present; raw cutthroats-readinglamp*.txt): "reading" is not a game word; "lamp" resolves to the flashlight even here; no object named *lamp* in the cabin at this point (DUMP empty) - REDS-LAMP is not in scope at walkthrough step ~244 (likely placed/visible later in the story). Second on-object stays open; next try later in the walkthrough when the boat is under way.
