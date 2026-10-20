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

## Native evidence: animate (zil-walkdiff.cjs, fresh boot, no relocation; route n | knock on door | n | w ...)
- Living Room (Ms. Dunbar on the sofa): "turn on dunbar" -> "Ahem! ... flirt with the suspects" (V-LAMP-ON PERSON branch);
  "turn off dunbar" -> "Your uncouth manner is certain to turn anyone off." (V-LAMP-OFF PERSON branch)
- Kitchen (route ... n | n | n; "Mrs. Rourke is here, cleaning the kitchen"): "turn on mrs robner" -> PERSON reply; the only
  person present is Mrs. Rourke, so the parser resolved "mrs" to her = second distinct person.
- Negatives: "turn on table" (Foyer) and "turn on sofa" (Living Room) -> "You can't turn that on." (non-PERSON branch)
- RAM: bit 20 on every suspect object (dump above), not on Sergeant Duffy.
Proposed: animate = NATIVE-PROVEN bit 20 (PERSON): 2 distinct persons via the PERSON-branching verb routine + 2 negatives.
Stereo not found yet (not in the living room); on/edible native captures still pending.

## Native evidence 2 (route n | knock on door | n | e | u | u | w | w | w | open door | s = George's Bedroom)
- "turn on stereo" -> "The stereo is now on."; "turn off stereo" -> "The stereo is now off." (STEREO-F, global, no bit)
- "turn on george" -> PERSON reply (third distinct person for animate).
- "open cabinet" -> Scotch + Bourbon; "drink scotch" -> "You take a small swig of the golden fluid, which burns as it goes
  down." (LIQUOR-F success); "drink bourbon" next -> "...resist the temptation to indulge too often." (DRUNK-FLAG state
  refusal, not incapability); "drink liquor" (generic word) -> "The liquor wouldn't agree with you."
Status: on = PROVEN-ALTERNATIVE (stereo on/off native + table/sofa refusals); edible needs a 2nd success (cough syrup in
Ms. Dunbar's cabinet, Corridor-1 south; or sugar powder on the tray) before closing.

Route note: DUNBAR-CABINET (cough medicine DUM-KOF / syrup) is IN DUNBAR-BATH, reached SOUTH from hall SHALL-11 via DUNBAR-BATH-DOOR (dungeon.zil:760, 873), not from Dunbar's Bedroom. Second edible positive still to capture there (or sugar powder on TRAY). Edible stays OPEN with 1 native positive (Scotch).

## Edible second witness (route n | knock on door | n | e | u | u | s [South Upstairs Hall] | s [Dunbar's Bathroom];
## raw zil-titles/raw/deadline-syrup*.txt)
"open cabinet" -> LoBlo, cough medicine, aspirin; "take medicine"; "open medicine" -> "...reveals a quantity of cough
syrup."; "drink syrup" -> "You drink the remaining cough syrup. Yuk! That was awful!" (DUM-KOF handler, actions.zil ~3307,
consumes it). Refusals: "drink medicine" (the bottle) -> "The medicine wouldn't agree with you."; "eat loblo" -> "The
loblo wouldn't agree with you."
Proposed: edible/drink = NO-DEDICATED-BIT + PROVEN-ALTERNATIVE: 2 distinct native successes via handlers (Scotch
LIQUOR-F, cough syrup DUM-KOF) + refusals (bottle, LoBlo); source: no FOODBIT/DRINKBIT carrier, V-EAT/V-DRINK never
succeed generically.

## R1 after codex #4357 - raw records + APP consumer check (walkdiff APPCMD = the app's own resolveObjectCommands)
Raw: zil-titles/raw/deadline-scotch.txt, deadline-person.txt, deadline-syrup*.txt.
1. CONSUMER GAP (drink): in George's bedroom the app offers "examine scotch | take scotch" and "examine bourbon | take
   bourbon" - NO Drink - although "drink scotch" natively succeeds ("You take a small swig..."). So edible/drink cannot
   close as PROVEN-ALTERNATIVE under R3.1 (no existing app consumer). This is a T3 consumer gap: handler-based drink/eat
   has no way into the wheel. Stays OPEN; candidate T3 item.
2. DEFECT (wrong action learned): before the test the app offers only "examine dunbar" for Ms. Dunbar 155. After a typed
   "turn on dunbar" (game reply = the PERSON flirt joke, a refusal), the app offers "examine dunbar | switch on dunbar |
   switch off dunbar". The verb learner treated the joke as a successful switch and learned a wrong action on a person.
   Player-visible: one exploratory "turn on <suspect>" puts Switch on/off on that suspect's wheel.
3. Animate consumer: the app offers no talk/ask action for Ms. Dunbar (only examine) despite PERSON 20 - check how Deadline
   talking works (ASK/TELL grammar) before calling it a gap.
