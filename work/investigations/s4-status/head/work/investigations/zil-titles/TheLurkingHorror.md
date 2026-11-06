# The Lurking Horror (TheLurkingHorror.z3.js) - ZIL completion (claude lane, R3/R3.1)

Auditor: codex. Census row (2026-10-20-zil-remaining): lightSource U, on U, wearable U, worn U, edible U,
status Os, + structural cells per census.

## Source predictions (2026-10-11-zil-source-flags.json; exact = tp/fp/fn clean)
| key | flag | bit | source witnesses | note |
|---|---|---|---|---|
| lightSource | LIGHTBIT | 22 | 132 flashlight (1 positive, 193 negatives) | exact |
| on | ONBIT | 15 | 34 positives incl. lit rooms 65 Computer Center, 137, 110 | exact; rooms carry ONBIT = lit |
| edible | FOODBIT | 1 | 58 carton, 90 Chinese food, 61 Coke bottle (4 positives) | exact; no EATBIT |
| wearable / worn | none (no WEARBIT/WORNBIT) | - | - | candidate NO-DEDICATED-BIT: check source for wear handling before FEATURE-ABSENT |
| takeable | TAKEBIT | 24 | 41 positives | for reference |

## Native proof plan (rules step 16: >=2 distinct native positives + >=1 negative, or single owner + source)
- lightSource: flashlight is the single LIGHTBIT owner -> single owner + source after whole-module search; native:
  flashlight lit in a dark room lights it (positive), an unlit non-light object does not (negative).
- on: native ON/OFF of the flashlight sets/clears bit 15 (2 transitions), plus a dark room lacking bit 15 (negative).
- edible: native EAT of 2 FOODBIT owners succeeds (Chinese food, Coke = drink?), a TAKEBIT non-food refuses.
- wearable/worn: whole-source search for WEAR handling; result NO-DEDICATED-BIT+ALTERNATIVE or FEATURE-ABSENT.
Status: predictions recorded; native runs queued after the knapsack gate frees the CPU.

## Source search: wear (2026-10-20, historicalsource-lurkinghorror-51d8060)
- syntax.zil:407/633: PUT ON / WEAR -> V-WEAR (verbs.zil:1663): only answers "You are..." if PRSO already has
  WEARBIT, else "You can't wear". So generic wear is refused; the ONLY wearable is the gloves.
- cs.zil:6925-6936 GLOVES action handler: WEAR / PUT GLOVES ON HANDS -> IWEAR -> "You put on the gloves..." and
  FSETs WEARBIT on GLOVES (state checked at cs.zil:3754, 5263-5267).
- WEARBIT exists but no object declares it statically -> absent from 2026-10-11-zil-source-flags.json (static scan).
Classification proposal:
- wearable = NO-DEDICATED-BIT + PROVEN-ALTERNATIVE: capability lives in the GLOVES handler only (owner domain = gloves).
  Native: WEAR GLOVES succeeds (positive), WEAR <another takeable> refused (negative), PUT GLOVES ON HANDS (2nd positive).
- worn = WEARBIT, bit number to MEASURE natively: snapshot gloves' attribute bits before/after WEAR GLOVES; the one
  bit set is WEARBIT (dynamic state flag). Then a second worn transition if the game allows removal.

## Native evidence 1 (2026-10-20, scratchpad walkdiff.cjs: jericho walkthrough 'lurking' steps 0-61 from fresh boot,
## seeded RNG, NO insert_obj/forcing; attribute bits snapshotted before/after the action)
- step 55 WEAR GLOVES -> "You put on the gloves. They're a little big..." ; gloves 203: +bit 3 (only change).
  => worn = WEARBIT = bit 3 (dynamic state flag, set by IWEAR frob.zil:1667). Positive 1 of 2.
- step 57 LIGHT FLASHLIGHT (in the dark Temporary Lab) -> the room description is now printed (light works);
  flashlight 132: +bit 15; room 140: +bit 6 (visit/touch flag, not light).
  => on = ONBIT 15 set natively (positive 1); lightSource: flashlight (LIGHTBIT 22, single owner) lights a dark room.
- step 60 TURN OFF FLASHLIGHT -> "The flashlight clicks off." ; flashlight 132: -bit 15.
  => on: native clear transition (positive 2).
Still needed: worn positive 2 (REMOVE/WEAR again or step 99 "WEAR THEM"), negatives (WEAR a non-glove takeable:
refused, no bit; LIGHT a non-light object: refused, no bit 15), edible (EAT 2 FOODBIT owners + 1 refusal).

## Native evidence 2 (same harness; extra commands after the given walkthrough step; replies verbatim)
After step 61: "wear crowbar" -> "You can't wear the crowbar." (no bit change); "light crowbar" -> "How do you do that
with a crowbar?" (no bit change); "remove gloves" -> "You're no longer wearing..." gloves -bit 3; "wear gloves" ->
"You put on the gloves..." gloves +bit 3; "drink coke" -> "Delicious! Contains caffeine..."; "eat crowbar" -> "The food
here is terrible, but this is ridiculous!".
After step 19 (carton held): "look in carton" -> "contains Chinese food"; "eat chinese food" -> "It's very (chemically)
hot, spicy, and hot..."; "eat carton" -> "You might find the contents more agreeable than the carton itself."

## Proposed cell closures (for codex audit)
| key | state | evidence |
|---|---|---|
| worn | NATIVE-PROVEN bit 3 (WEARBIT, dynamic) | set x2 (wear, wear again), clear x1 (remove) on gloves 203; negative: crowbar wear refused, no bit; source IWEAR frob.zil:1667 |
| wearable | NO-DEDICATED-BIT + PROVEN-ALTERNATIVE (gloves handler, cs.zil:6925-6936; V-WEAR refuses all else, verbs.zil:1663) | wear gloves x2 positive; crowbar negative |
| on | NATIVE-PROVEN bit 15 (ONBIT) | flashlight set (light) + clear (turn off); negative: light crowbar refused, no bit; source exact 34/0/0 |
| lightSource | NATIVE-PROVEN bit 22 (LIGHTBIT), single owner flashlight 132 | whole-source single owner (source-flags exact 1/0/0); lit flashlight makes the dark Temporary Lab describable |
| edible | NATIVE-PROVEN bit 1 (FOODBIT) WITH OWNER EXCEPTION | Coke (drink) + Chinese food (eat) positive; crowbar negative. Carton 58 carries FOODBIT but its eat reply refuses ("contents more agreeable"): FOODBIT marks food AND food containers here. Consumer rule needed: do not offer Eat from FOODBIT alone on a FOODBIT container (CONTBIT) - otherwise a wrong action. |

## R1 corrections after codex REVISE #4331 (2026-10-20)
- CORRECTION: "the ONLY wearable is the gloves" was wrong. IWEAR (frob.zil:1667) is called by GLOVES-F (cs.zil:6932),
  RING-F (cs.zil:5270) and BOOTS-F (frob.zil:1663). Wearable owner domain = gloves, ring, boots (handler-based,
  NO-DEDICATED-BIT + PROVEN-ALTERNATIVE).
- worn bit 3: second distinct object captured natively - step 98 GET BOOTS, step 99 "WEAR THEM" -> "Snug, but okay."
  boots 104 +3. With gloves 203 (+3/-3/+3) = 2 distinct native positives; crowbar refusal = negative. Raw record:
  work/investigations/zil-titles/raw/lurking-0-100.txt.
- on bit 15: the flashlight is one object, so not ">=2 distinct". Proposed basis instead: single dynamic item owner +
  whole-source search: the only item FSET/FCLEAR ONBIT is FLASHLIGHT (cs.zil:1383/1397/1412); every other runtime
  ONBIT change is a ROOM lit-state (TUNNEL x3 cs.zil:2608-2629, ALCHEMY-LAB 4718/4856). Static carriers are rooms (lit).
  If the reviewer rejects room/item separation, on stays OPEN.
- edible: the carton exception is identity-scoped (carton 58 only), NOT a ban on edible containers: Coke 61 is itself a
  bottle and is natively drinkable.
- CORRECTION to the R1 note: "static carriers are rooms" was incomplete - 43 rooms + GLOBAL-FLOOR-WAXER (always-on
  global scenery, never toggled). Full search artifact with file hashes:
  work/investigations/zil-titles/source-search/lurking-ONBIT.txt (rev 51d8060).
