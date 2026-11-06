# Starcross.z3.js — ZIL title work (grok2)

**Assignment:** R3 #4266 top-9\
**Source:** historicalsource starcross / `Starcross` in source-flags\
**D198:** confirmed-zil-family\

## Not-F (21)

| key | st | source | next |
|-----|-----|--------|------|
| animate | C | fact VICBIT 11 — **claude audit → F** | ModuleStatFactsClaude.js:402+ |
| container | U | CONTBIT **8** exact 27 | native put-in |
| open | U | OPENBIT **9** exact 25 | open/close transitions |
| supporter | U | SURFACEBIT **28** exact 2 | put-on natives |
| lightSource | U | no LIGHTBIT in first dump | FEATURE-ABSENT + dynamic FSET grep |
| on | U | ONBIT **18** exact 45 | device turn on/off (not rooms) |
| wearable / worn | U | no WEARBIT/WEARABLEBIT in dump | FEATURE-ABSENT + FSET grep |
| edible | U | no FOODBIT | FEATURE-ABSENT + FSET |
| takeable | S | TAKEBIT 16 exact | D214 |
| playerRoot | S | settled | confirm |
| status | Os | partial | complete |
| rooms | O | LOOK=RAM | walk record |
| underlineVsDict / descriptors | X | experimental | |
| identical | UD | closed-style | spot-audit |
| actors, onoff, wornItems, consumed, nested | U | | |

## Existing fact (C → audit)

See ModuleStatFactsClaude.js ~402 Starcross animate 11 VICBIT.

## Source exact bits to prove

CONTBIT 8, OPENBIT 9, SURFACEBIT 28, ONBIT 18, TAKEBIT 16.

## Next
1. Claude audit animate 11
2. Native open/container pair with openCapability
3. lightSource/wear FEATURE-ABSENT after full FSET grep

## Independent worn24 native audit
Starcross wornAttribute24 independently accepted from Grok4124 exact author design with NEW two-owner native proof. Normal suit144 and tattered suit176 each test24 TRUE under native REMOVE with matching replies; actual trade at route133 releases tattered suit, WEAR sets it, REMOVE clears it. Held library71/basket40 test24 FALSE. The old single-owner rationale is withdrawn; no source exception invoked. Bounded239-object census has only global11 bit24 at boot, no rooms. Current native Equipment normal suit worn+Remove then unworn agrees. No wearable capability inferred; handler-based Wear consumer remains separate. Operator13/0, complete affected-title/InformZ/Glulx3row parity0diff, semantic delta1field. Packet: work/mapping-research/items-codex/resume-20261020/starcross-worn/.
