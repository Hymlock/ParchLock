# Deadline (Deadline.z3.js) - ZIL completion (claude lane, R3/R3.1). Auditor: codex.
Census row: lightSource U, on U, wearable UD, worn UD, animate U, edible U, takeable S, playerRoot S, status Os, rooms O,
actors U, underlineVsDict X, descriptors X, identical UD, onoff U, wornItems UD, consumed U, nested.
Static flags: ONBIT 23 (41 carriers, rooms = lit), PERSON 20 (Mr. Robner 127 only statically); no LIGHT/FOOD/DRINK/ACTOR.

## Whole-source search (historicalsource-deadline-2602bd5)
- V-EAT/V-DRINK (verbs.zil:871-900) accept FOODBIT/DRINKBIT, but NO object declares either flag and nothing FSETs them
  -> the generic path never succeeds. Object handlers (actions.zil): powder EAT "You eat some, but it is cloyingly
  sweet" (2981); cough syrup DUM-KOF DRINK consumes it (3307); LIQUOR-F DRINK (4162); pills EAT refuse (3320-3355);
  FOODS-F EAT refuses (4132).
- V-LAMP-ON/OFF (verbs.zil:637-646) refuse everything (PERSON joke). Overrides: STEREO-F LAMP-ON "The stereo is now on."
  (4177, global STEREO-ON, no bit); SINK-F LAMP-ON runs water (2842). No object carries LIGHTBIT; rooms carry ONBIT 23
  statically (lighting), never toggled.

## Proposed (native captures still needed: route to living room stereo, kitchen/bathroom items)
| key | proposed state | needs |
|---|---|---|
| edible | NO-DEDICATED-BIT + PROVEN-ALTERNATIVE (handlers: syrup/liquor DRINK, powder EAT) | native drink syrup + drink liquor (2 positives) + pills refusal |
| on | NO-DEDICATED-BIT + PROVEN-ALTERNATIVE (STEREO-F global, SINK-F) | native "turn on stereo" + refusal on another object |
| lightSource | FEATURE-ABSENT | whole source: no LIGHTBIT carrier or FSET; native: no light-giving object (rooms lit statically) |
| animate | PERSON 20 (dynamic? only Robner static) | source search for FSET PERSON / NPC FLAGS; native ASK/TALK on 2 suspects + refusal |

## Animate check (2026-10-20, boot RAM dump)
Bit 20 (PERSON) is set on every character object: 53/54 Coates, 127 Robner, 148/149 Rourke, 150/151 Mrs. Robner, 152/153 George, 154/155 Dunbar, 156/157 Baxter, 158/159 McNabb (the source-flags.json "pos=1" undercounts). Sergeant Duffy 61 has no PERSON. Native target-scoped witness available cheaply: V-LAMP-ON branches on PERSON (verbs.zil:637) - "turn on george" -> "Ahem! ... flirt with the suspects" (positive) vs "turn on <item>" -> "You can't turn that on." (negative). Needs a route to 2 suspects.
