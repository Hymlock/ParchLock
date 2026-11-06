# PACKET: Sherlock lamp FL-LAMP 42 / lightForms -- claude seat (grok2 lane takeover)
Author: claude. Tier: native, seeded replay (g1-batch-sherlock-yn.cjs, JSEED 0, jericho route 0-13 incl. "GET LAMP, GLASS AND AMPOULE";
Y/N prompts answered n), plan cache-claude/plan-sherlock-lamp3.json, run cache-claude/run-sherlock-20261031T141321-47844.json.

## Source
- TH-LAMP things1.zil:1045-1053: FLAGS FL-LAMP FL-ASLEEP FL-TAKEABLE FL-HAS-DESCFCN; starts OFF (FL-ASLEEP 24).
- RT-AC-TH-LAMP things2.zil:772-792: LAMP-ON/LIGHT-WITH/TURN-UP/LIGHT -> UNMAKE ASLEEP, MAKE LIGHTED; LAMP-OFF/TURN-DOWN -> MAKE ASLEEP, UNMAKE LIGHTED.
- Syntax (syntax.zil): LAMP-ON = TURN ON, START (870,961); LAMP-OFF = TURN OFF, EXTINGUISH/DOUSE/QUENCH/SNUFF (FIND FL-LAMP, 283-284),
  PUT OUT, BLOW OUT, SHUT OFF, CLOSE OFF, STOP; LIGHT X (491) is handled by the lamp action before V-LIGHT, so "light lamp" needs no WITH
  (the earlier hang was "light knife" -> "[What do you want to light the knife with?]").
- FL-LAMP 42's only consumer: EXTINGUISH's (FIND FL-LAMP) GWIM default.

## Native (lamp 166 held, parent 232 = player)
| cmd | output | bits set/cleared on 166 | test_attr(166,42) |
|---|---|---|---|
| turn off lamp | "The lamp is already off." | - | - |
| turn on lamp | "You turn up the wick. The lamp emits a warm glow..." | +38 -24 | - |
| light lamp | "The lamp is already on." | - | - |
| extinguish (bare) | "[the lamp]" "You turn down the wick. The lamp goes dark." | +24 -38 | **TRUE** (pc 37439) |
| light lamp | turns up the wick | +38 -24 | - |
| extinguish lamp | "...The lamp goes dark." | +24 -38 | - |
Negatives (knife 151): "turn on knife" -> "You couldn't turn that on."; "extinguish knife" -> "You couldn't extinguish that." No state change.

## Verdict
- **FL-LAMP 42 = capability bit confirmed natively** (GWIM read selects the lamp for bare EXTINGUISH; 1/1 exact owner 166).
- **On/off state bit = FL-LIGHTED 38** (set on, cleared off), FL-ASLEEP 24 is its inverse (off) on the lamp only; 38 is shared room/object lit-state, so lightForms must be owner-scoped.
- Proposed lightForms entry: `{ owners: [166], stateBit: 38, on: ["turn on","light","start"], off: ["turn off","extinguish","put out","blow out"] }`
  (all from syntax.zil; turn on/light/turn off/extinguish natively verified). Do not map switchable to 38 globally.
